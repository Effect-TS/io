import * as Context from "@effect/data/Context"
import type * as Duration from "@effect/data/Duration"
import * as Equal from "@effect/data/Equal"
import { dual, pipe } from "@effect/data/Function"
import * as Hash from "@effect/data/Hash"
import * as HashSet from "@effect/data/HashSet"
import type * as Clock from "@effect/io/Clock"
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as circular from "@effect/io/internal/effect/circular"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as queue from "@effect/io/internal/queue"
import * as ref from "@effect/io/internal/ref"
import type * as Pool from "@effect/io/Pool"
import type * as Queue from "@effect/io/Queue"
import type * as Ref from "@effect/io/Ref"
import type * as Scope from "@effect/io/Scope"

/** @internal */
const PoolSymbolKey = "@effect/io/Pool"

/** @internal */
export const PoolTypeId: Pool.PoolTypeId = Symbol.for(
  PoolSymbolKey
) as Pool.PoolTypeId

const poolVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

interface PoolState {
  readonly size: number
  readonly free: number
}

interface Attempted<E, A> {
  readonly result: Exit.Exit<E, A>
  readonly finalizer: Effect.Effect<never, never, unknown>
}

/**
 * A `Strategy` describes the protocol for how a pool whose excess items are
 * not being used should shrink down to the minimum pool size.
 */
interface Strategy<S, R, E, A> {
  /**
   * Describes how the initial state of the strategy should be allocated.
   */
  initial(): Effect.Effect<R, never, S>
  /**
   * Describes how the state of the strategy should be updated when an item is
   * added to the pool or returned to the pool.
   */
  track(state: S, attempted: Exit.Exit<E, A>): Effect.Effect<never, never, void>
  /**
   * Describes how excess items that are not being used should shrink down.
   */
  run(
    state: S,
    getExcess: Effect.Effect<never, never, number>,
    shrink: Effect.Effect<never, never, void>
  ): Effect.Effect<never, never, void>
}

/**
 * A strategy that does nothing to shrink excess items. This is useful when
 * the minimum size of the pool is equal to its maximum size and so there is
 * nothing to do.
 */
class NoneStrategy implements Strategy<unknown, never, never, never> {
  initial(): Effect.Effect<never, never, void> {
    return core.unit
  }
  track(): Effect.Effect<never, never, void> {
    return core.unit
  }
  run(): Effect.Effect<never, never, void> {
    return core.unit
  }
}

/**
 * A strategy that shrinks the pool down to its minimum size if items in the
 * pool have not been used for the specified duration.
 */
class TimeToLiveStrategy implements Strategy<readonly [Clock.Clock, Ref.Ref<number>], never, never, never> {
  constructor(readonly timeToLive: Duration.Duration) {}
  initial(): Effect.Effect<never, never, readonly [Clock.Clock, Ref.Ref<number>]> {
    return core.flatMap(effect.clock, (clock) =>
      core.flatMap(clock.currentTimeMillis, (now) =>
        core.map(
          ref.make(now),
          (ref) => [clock, ref] as const
        )))
  }
  track(state: readonly [Clock.Clock, Ref.Ref<number>]): Effect.Effect<never, never, void> {
    return core.asUnit(core.flatMap(
      state[0].currentTimeMillis,
      (now) => ref.set(state[1], now)
    ))
  }
  run(
    state: readonly [Clock.Clock, Ref.Ref<number>],
    getExcess: Effect.Effect<never, never, number>,
    shrink: Effect.Effect<never, never, void>
  ): Effect.Effect<never, never, void> {
    return core.flatMap(getExcess, (excess) =>
      excess <= 0
        ? core.zipRight(
          state[0].sleep(this.timeToLive),
          this.run(state, getExcess, shrink)
        )
        : pipe(
          core.zipWith(
            ref.get(state[1]),
            state[0].currentTimeMillis,
            (start, end) => end - start
          ),
          core.flatMap((duration) => {
            if (duration >= this.timeToLive.millis) {
              return core.zipRight(shrink, this.run(state, getExcess, shrink))
            } else {
              return core.zipRight(state[0].sleep(this.timeToLive), this.run(state, getExcess, shrink))
            }
          })
        ))
  }
}

class PoolImpl<E, A> implements Pool.Pool<E, A> {
  readonly [PoolTypeId] = poolVariance
  constructor(
    readonly creator: Effect.Effect<Scope.Scope, E, A>,
    readonly min: number,
    readonly max: number,
    readonly isShuttingDown: Ref.Ref<boolean>,
    readonly state: Ref.Ref<PoolState>,
    readonly items: Queue.Queue<Attempted<E, A>>,
    readonly invalidated: Ref.Ref<HashSet.HashSet<A>>,
    readonly track: (exit: Exit.Exit<E, A>) => Effect.Effect<never, never, unknown>
  ) {}

  [Hash.symbol](): number {
    return pipe(
      Hash.hash(this.creator),
      Hash.combine(Hash.number(this.min)),
      Hash.combine(Hash.number(this.max)),
      Hash.combine(Hash.hash(this.isShuttingDown)),
      Hash.combine(Hash.hash(this.state)),
      Hash.combine(Hash.hash(this.items)),
      Hash.combine(Hash.hash(this.invalidated)),
      Hash.combine(Hash.hash(this.track))
    )
  }

  [Equal.symbol](that: unknown): boolean {
    return isPool(that) &&
      Equal.equals(this.creator, (that as PoolImpl<E, A>).creator) &&
      this.min === (that as PoolImpl<E, A>).min &&
      this.max === (that as PoolImpl<E, A>).max &&
      Equal.equals(this.isShuttingDown, (that as PoolImpl<E, A>).isShuttingDown) &&
      Equal.equals(this.state, (that as PoolImpl<E, A>).state) &&
      Equal.equals(this.items, (that as PoolImpl<E, A>).items) &&
      Equal.equals(this.invalidated, (that as PoolImpl<E, A>).invalidated) &&
      Equal.equals(this.track, (that as PoolImpl<E, A>).track)
  }

  get(): Effect.Effect<Scope.Scope, E, A> {
    const acquire = (): Effect.Effect<never, never, Attempted<E, A>> =>
      core.flatMap(ref.get(this.isShuttingDown), (down) =>
        down
          ? core.interrupt
          : core.flatten(ref.modify(this.state, (state) => {
            if (state.free > 0 || state.size >= this.max) {
              return [
                core.flatMap(
                  queue.take(this.items),
                  (attempted) =>
                    core.exitMatch(
                      attempted.result,
                      () => core.succeed(attempted),
                      (item) =>
                        core.flatMap(
                          ref.get(this.invalidated),
                          (set) => {
                            if (pipe(set, HashSet.has(item))) {
                              return core.flatMap(finalizeInvalid(this, attempted), acquire)
                            }
                            return core.succeed(attempted)
                          }
                        )
                    )
                ),
                { ...state, free: state.free - 1 }
              ] as const
            }
            if (state.size >= 0) {
              return [
                core.flatMap(allocate(this), acquire),
                { size: state.size + 1, free: state.free + 1 }
              ] as const
            }
            return [core.interrupt, state] as const
          })))

    const release = (attempted: Attempted<E, A>): Effect.Effect<never, never, unknown> =>
      core.exitMatch(
        attempted.result,
        () =>
          core.flatten(ref.modify(this.state, (state) => {
            if (state.size <= this.min) {
              return [allocate(this), { ...state, free: state.free + 1 }] as const
            }
            return [core.unit, { ...state, size: state.size - 1 }] as const
          })),
        (item) =>
          core.flatMap(ref.get(this.invalidated), (set) => {
            if (pipe(set, HashSet.has(item))) {
              return finalizeInvalid(this, attempted)
            }
            return pipe(
              ref.update(this.state, (state) => ({ ...state, free: state.free + 1 })),
              core.zipRight(queue.offer(this.items, attempted)),
              core.zipRight(this.track(attempted.result)),
              core.zipRight(core.whenEffect(getAndShutdown(this), ref.get(this.isShuttingDown)))
            )
          })
      )

    return pipe(
      fiberRuntime.acquireRelease(acquire(), { release }),
      fiberRuntime.withEarlyRelease,
      fiberRuntime.disconnect,
      core.flatMap(([release, attempted]) =>
        pipe(
          effect.when(release, () => isFailure(attempted)),
          core.zipRight(toEffect(attempted))
        )
      )
    )
  }

  invalidate(item: A): Effect.Effect<never, never, void> {
    return ref.update(this.invalidated, HashSet.add(item))
  }
}

const allocate = <E, A>(self: PoolImpl<E, A>): Effect.Effect<never, never, unknown> =>
  core.uninterruptibleMask((restore) =>
    core.flatMap(fiberRuntime.scopeMake(), (scope) =>
      core.flatMap(
        core.exit(restore(fiberRuntime.scopeExtend(self.creator, scope))),
        (exit) =>
          core.flatMap(
            core.succeed<Attempted<E, A>>({
              result: exit as Exit.Exit<E, A>,
              finalizer: core.scopeClose(scope, core.exitSucceed(void 0))
            }),
            (attempted) =>
              pipe(
                queue.offer(self.items, attempted),
                core.zipRight(self.track(attempted.result)),
                core.zipRight(core.whenEffect(getAndShutdown(self), ref.get(self.isShuttingDown))),
                core.as(attempted)
              )
          )
      ))
  )

/**
 * Returns the number of items in the pool in excess of the minimum size.
 */
const excess = <E, A>(self: PoolImpl<E, A>): Effect.Effect<never, never, number> =>
  core.map(ref.get(self.state), (state) => state.size - Math.min(self.min, state.free))

const finalizeInvalid = <E, A>(
  self: PoolImpl<E, A>,
  attempted: Attempted<E, A>
): Effect.Effect<never, never, unknown> =>
  pipe(
    forEach(attempted, (a) => ref.update(self.invalidated, HashSet.remove(a))),
    core.zipRight(attempted.finalizer),
    core.zipRight(
      core.flatten(ref.modify(self.state, (state) => {
        if (state.size <= self.min) {
          return [allocate(self), { ...state, free: state.free + 1 }] as const
        }
        return [core.unit, { ...state, size: state.size - 1 }] as const
      }))
    )
  )

/**
 * Gets items from the pool and shuts them down as long as there are items
 * free, signalling shutdown of the pool if the pool is empty.
 */
const getAndShutdown = <E, A>(self: PoolImpl<E, A>): Effect.Effect<never, never, void> =>
  core.flatten(ref.modify(self.state, (state) => {
    if (state.free > 0) {
      return [
        core.matchCauseEffect(
          queue.take(self.items),
          () => core.unit,
          (attempted) =>
            pipe(
              forEach(attempted, (a) => ref.update(self.invalidated, HashSet.remove(a))),
              core.zipRight(attempted.finalizer),
              core.zipRight(ref.update(self.state, (state) => ({ ...state, size: state.size - 1 }))),
              core.flatMap(() => getAndShutdown(self))
            )
        ),
        { ...state, free: state.free - 1 }
      ] as const
    }
    if (state.size > 0) {
      return [core.unit, state] as const
    }
    return [queue.shutdown(self.items), { ...state, size: state.size - 1 }] as const
  }))

/**
 * Begins pre-allocating pool entries based on minimum pool size.
 */
const initialize = <E, A>(self: PoolImpl<E, A>): Effect.Effect<never, never, void> =>
  circular.replicateEffect(
    core.uninterruptibleMask((restore) =>
      core.flatten(ref.modify(self.state, (state) => {
        if (state.size < self.min && state.size >= 0) {
          return [
            core.flatMap(fiberRuntime.scopeMake(), (scope) =>
              core.flatMap(core.exit(restore(fiberRuntime.scopeExtend(self.creator, scope))), (exit) =>
                core.flatMap(
                  core.succeed<Attempted<E, A>>({
                    result: exit as Exit.Exit<E, A>,
                    finalizer: core.scopeClose(scope, core.exitSucceed(void 0))
                  }),
                  (attempted) =>
                    pipe(
                      queue.offer(self.items, attempted),
                      core.zipRight(self.track(attempted.result)),
                      core.zipRight(core.whenEffect(getAndShutdown(self), ref.get(self.isShuttingDown))),
                      core.as(attempted)
                    )
                ))),
            { size: state.size + 1, free: state.free + 1 }
          ] as const
        }
        return [core.unit, state] as const
      }))
    ),
    self.min,
    { discard: true }
  )

/**
 * Shrinks the pool down, but never to less than the minimum size.
 */
const shrink = <E, A>(self: PoolImpl<E, A>): Effect.Effect<never, never, void> =>
  core.uninterruptible(
    core.flatten(ref.modify(self.state, (state) => {
      if (state.size > self.min && state.free > 0) {
        return [
          pipe(
            queue.take(self.items),
            core.flatMap((attempted) =>
              pipe(
                forEach(attempted, (a) => ref.update(self.invalidated, HashSet.remove(a))),
                core.zipRight(attempted.finalizer),
                core.zipRight(ref.update(self.state, (state) => ({ ...state, size: state.size - 1 })))
              )
            )
          ),
          { ...state, free: state.free - 1 }
        ] as const
      }
      return [core.unit, state] as const
    }))
  )

const shutdown = <E, A>(self: PoolImpl<E, A>): Effect.Effect<never, never, void> =>
  core.flatten(ref.modify(self.isShuttingDown, (down) =>
    down
      ? [queue.awaitShutdown(self.items), true] as const
      : [core.zipRight(getAndShutdown(self), queue.awaitShutdown(self.items)), true]))

const isFailure = <E, A>(self: Attempted<E, A>): boolean => core.exitIsFailure(self.result)

const forEach = <E, A, R, E2>(
  self: Attempted<E, A>,
  f: (a: A) => Effect.Effect<R, E2, unknown>
): Effect.Effect<R, E2, unknown> => core.exitMatch(self.result, () => core.unit, f)

const toEffect = <E, A>(self: Attempted<E, A>): Effect.Effect<never, E, A> => self.result

/**
 * A more powerful variant of `make` that allows specifying a `Strategy` that
 * describes how a pool whose excess items are not being used will be shrunk
 * down to the minimum size.
 */
const makeWith = <R, E, A, S, R2>(
  get: Effect.Effect<R, E, A>,
  min: number,
  max: number,
  strategy: Strategy<S, R2, E, A>
): Effect.Effect<R | R2 | Scope.Scope, never, Pool.Pool<E, A>> =>
  core.uninterruptibleMask((restore) =>
    pipe(
      effect.all(
        core.context<R>(),
        ref.make(false),
        ref.make<PoolState>({ size: 0, free: 0 }),
        queue.bounded<Attempted<E, A>>(max),
        ref.make(HashSet.empty<A>()),
        strategy.initial()
      ),
      core.flatMap(([context, down, state, items, inv, initial]) => {
        const pool = new PoolImpl<E, A>(
          core.contramapContext(get, (old) => Context.merge(old)(context)),
          min,
          max,
          down,
          state,
          items,
          inv,
          (exit) => strategy.track(initial, exit)
        )
        return pipe(
          fiberRuntime.forkDaemon(restore(initialize(pool))),
          core.flatMap((fiber) =>
            core.flatMap(
              fiberRuntime.forkDaemon(restore(strategy.run(initial, excess(pool), shrink(pool)))),
              (shrink) =>
                fiberRuntime.addFinalizer(() =>
                  pipe(
                    shutdown(pool),
                    core.zipRight(core.interruptFiber(fiber)),
                    core.zipRight(core.interruptFiber(shrink))
                  )
                )
            )
          ),
          core.as<Pool.Pool<E, A>>(pool)
        )
      })
    )
  )

/** @internal */
export const isPool = (u: unknown): u is Pool.Pool<unknown, unknown> =>
  typeof u === "object" && u != null && PoolTypeId in u

/** @internal */
export const make = <R, E, A>(
  get: Effect.Effect<R, E, A>,
  size: number
): Effect.Effect<R | Scope.Scope, never, Pool.Pool<E, A>> => makeWith(get, size, size, new NoneStrategy())

/** @internal */
export const makeWithTTL = <R, E, A>(
  get: Effect.Effect<R, E, A>,
  min: number,
  max: number,
  timeToLive: Duration.Duration
): Effect.Effect<R | Scope.Scope, never, Pool.Pool<E, A>> => makeWith(get, min, max, new TimeToLiveStrategy(timeToLive))

/** @internal */
export const get = <E, A>(self: Pool.Pool<E, A>): Effect.Effect<Scope.Scope, E, A> => self.get()

/** @internal */
export const invalidate = dual<
  <A>(value: A) => <E>(self: Pool.Pool<E, A>) => Effect.Effect<Scope.Scope, never, void>,
  <E, A>(self: Pool.Pool<E, A>, value: A) => Effect.Effect<Scope.Scope, never, void>
>(2, (self, value) => self.invalidate(value))
