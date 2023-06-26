import * as Duration from "@effect/data/Duration"
import * as Equal from "@effect/data/Equal"
import { dual, pipe } from "@effect/data/Function"
import * as Hash from "@effect/data/Hash"
import * as HashMap from "@effect/data/HashMap"
import * as MutableRef from "@effect/data/MutableRef"
import * as Option from "@effect/data/Option"
import type * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as circular from "@effect/io/internal/effect/circular"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as pool from "@effect/io/internal/pool"
import type * as KeyedPool from "@effect/io/KeyedPool"
import type * as Pool from "@effect/io/Pool"
import type * as Scope from "@effect/io/Scope"

/** @internal */
const KeyedPoolSymbolKey = "@effect/io/KeyedPool"

/** @internal */
export const KeyedPoolTypeId: KeyedPool.KeyedPoolTypeId = Symbol.for(
  KeyedPoolSymbolKey
) as KeyedPool.KeyedPoolTypeId

const KeyedPoolMapValueSymbol = Symbol.for("@effect/io/KeyedPool/MapValue")
type KeyedPoolMapValueSymbol = typeof KeyedPoolMapValueSymbol

const keyedPoolVariance = {
  _K: (_: unknown) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

class KeyedPoolImpl<K, E, A> implements KeyedPool.KeyedPool<K, E, A> {
  readonly [KeyedPoolTypeId] = keyedPoolVariance
  constructor(
    readonly getOrCreatePool: (key: K) => Effect.Effect<never, never, Pool.Pool<E, A>>,
    readonly activePools: () => Effect.Effect<never, never, Array<Pool.Pool<E, A>>>
  ) {}
  get(key: K): Effect.Effect<Scope.Scope, E, A> {
    return core.flatMap(this.getOrCreatePool(key), pool.get)
  }
  invalidate(item: A): Effect.Effect<never, never, void> {
    return core.flatMap(this.activePools(), core.forEachDiscard((pool) => pool.invalidate(item)))
  }
}

type MapValue<E, A> = Complete<E, A> | Pending<E, A>

class Complete<E, A> implements Equal.Equal {
  readonly _tag = "Complete"
  readonly [KeyedPoolMapValueSymbol]: KeyedPoolMapValueSymbol = KeyedPoolMapValueSymbol
  constructor(readonly pool: Pool.Pool<E, A>) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.string("@effect/io/KeyedPool/Complete"),
      Hash.combine(Hash.hash(this.pool))
    )
  }
  [Equal.symbol](u: unknown): boolean {
    return isComplete(u) && Equal.equals(this.pool, u.pool)
  }
}

const isComplete = (u: unknown): u is Complete<unknown, unknown> =>
  typeof u === "object" && u != null && KeyedPoolMapValueSymbol in u && "_tag" in u && u["_tag"] === "Complete"

class Pending<E, A> implements Equal.Equal {
  readonly _tag = "Pending"
  readonly [KeyedPoolMapValueSymbol]: KeyedPoolMapValueSymbol = KeyedPoolMapValueSymbol
  constructor(readonly deferred: Deferred.Deferred<never, Pool.Pool<E, A>>) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.string("@effect/io/KeyedPool/Pending"),
      Hash.combine(Hash.hash(this.deferred))
    )
  }
  [Equal.symbol](u: unknown): boolean {
    return isPending(u) && Equal.equals(this.deferred, u.deferred)
  }
}

const isPending = (u: unknown): u is Pending<unknown, unknown> =>
  typeof u === "object" && u != null && KeyedPoolMapValueSymbol in u && "_tag" in u && u["_tag"] === "Pending"

const makeWith = <K, R, E, A>(
  get: (key: K) => Effect.Effect<R, E, A>,
  min: (key: K) => number,
  max: (key: K) => number,
  timeToLive: (key: K) => Option.Option<Duration.Duration>
): Effect.Effect<R | Scope.Scope, never, KeyedPool.KeyedPool<K, E, A>> =>
  pipe(
    circular.all(
      core.context<R>(),
      core.fiberId,
      core.sync(() => MutableRef.make(HashMap.empty<K, MapValue<E, A>>())),
      fiberRuntime.scopeMake()
    ),
    core.map(([context, fiberId, map, scope]) => {
      const getOrCreatePool = (key: K): Effect.Effect<never, never, Pool.Pool<E, A>> =>
        core.suspend(() => {
          let value: MapValue<E, A> | undefined = Option.getOrUndefined(HashMap.get(MutableRef.get(map), key))
          if (value === undefined) {
            return core.uninterruptibleMask((restore) => {
              const deferred = core.deferredUnsafeMake<never, Pool.Pool<E, A>>(fiberId)
              value = new Pending(deferred)
              let previous: MapValue<E, A> | undefined = undefined
              if (HashMap.has(MutableRef.get(map), key)) {
                previous = Option.getOrUndefined(HashMap.get(MutableRef.get(map), key))
              } else {
                MutableRef.update(map, HashMap.set(key, value as MapValue<E, A>))
              }
              if (previous === undefined) {
                return pipe(
                  restore(
                    fiberRuntime.scopeExtend(
                      pool.makeWithTTL(
                        core.provideContext(get(key), context),
                        min(key),
                        max(key),
                        Option.getOrElse(timeToLive(key), () => Duration.infinity)
                      ),
                      scope
                    )
                  ),
                  core.matchCauseEffect(
                    (cause) => {
                      const current = Option.getOrUndefined(HashMap.get(MutableRef.get(map), key))
                      if (Equal.equals(current, value)) {
                        MutableRef.update(map, HashMap.remove(key))
                      }
                      return core.zipRight(
                        core.deferredFailCause(deferred, cause),
                        core.failCause(cause)
                      )
                    },
                    (pool) => {
                      MutableRef.update(map, HashMap.set(key, new Complete(pool) as MapValue<E, A>))
                      return core.as(
                        core.deferredSucceed(deferred, pool),
                        pool
                      )
                    }
                  )
                )
              }
              switch (previous._tag) {
                case "Complete": {
                  return core.succeed(previous.pool)
                }
                case "Pending": {
                  return restore(core.deferredAwait(previous.deferred))
                }
              }
            })
          }
          switch (value._tag) {
            case "Complete": {
              return core.succeed(value.pool)
            }
            case "Pending": {
              return core.deferredAwait(value.deferred)
            }
          }
        })
      const activePools = (): Effect.Effect<never, never, Array<Pool.Pool<E, A>>> =>
        core.suspend(() =>
          core.forEach(Array.from(HashMap.values(MutableRef.get(map))), (value) => {
            switch (value._tag) {
              case "Complete": {
                return core.succeed(value.pool)
              }
              case "Pending": {
                return core.deferredAwait(value.deferred)
              }
            }
          })
        )
      return new KeyedPoolImpl(getOrCreatePool, activePools)
    })
  )

/** @internal */
export const makeSized = <K, R, E, A>(
  get: (key: K) => Effect.Effect<R, E, A>,
  size: number
): Effect.Effect<R | Scope.Scope, never, KeyedPool.KeyedPool<K, E, A>> =>
  makeWith(get, () => size, () => size, () => Option.none())

/** @internal */
export const makeSizedWith = <K, R, E, A>(
  get: (key: K) => Effect.Effect<R, E, A>,
  size: (key: K) => number
): Effect.Effect<R | Scope.Scope, never, KeyedPool.KeyedPool<K, E, A>> => makeWith(get, size, size, () => Option.none())

/** @internal */
export const makeSizedWithTTL = <K, R, E, A>(
  get: (key: K) => Effect.Effect<R, E, A>,
  min: (key: K) => number,
  max: (key: K) => number,
  timeToLive: Duration.Duration
): Effect.Effect<R | Scope.Scope, never, KeyedPool.KeyedPool<K, E, A>> =>
  makeWith(get, min, max, () => Option.some(timeToLive))

/** @internal */
export const makeSizedWithTTLBy = <K, R, E, A>(
  get: (key: K) => Effect.Effect<R, E, A>,
  min: (key: K) => number,
  max: (key: K) => number,
  timeToLive: (key: K) => Duration.Duration
): Effect.Effect<R | Scope.Scope, never, KeyedPool.KeyedPool<K, E, A>> =>
  makeWith(get, min, max, (key) => Option.some(timeToLive(key)))

/** @internal */
export const get = dual<
  <K>(key: K) => <E, A>(self: KeyedPool.KeyedPool<K, E, A>) => Effect.Effect<Scope.Scope, E, A>,
  <K, E, A>(self: KeyedPool.KeyedPool<K, E, A>, key: K) => Effect.Effect<Scope.Scope, E, A>
>(2, (self, key) => self.get(key))

/** @internal */
export const invalidate = dual<
  <A>(item: A) => <K, E>(self: KeyedPool.KeyedPool<K, E, A>) => Effect.Effect<never, never, void>,
  <K, E, A>(self: KeyedPool.KeyedPool<K, E, A>, item: A) => Effect.Effect<never, never, void>
>(2, (self, item) => self.invalidate(item))