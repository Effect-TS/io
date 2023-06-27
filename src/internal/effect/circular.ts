import type * as Duration from "@effect/data/Duration"
import * as Either from "@effect/data/Either"
import * as Equal from "@effect/data/Equal"
import type { LazyArg } from "@effect/data/Function"
import { dual, identity, pipe } from "@effect/data/Function"
import * as Hash from "@effect/data/Hash"
import * as MutableHashMap from "@effect/data/MutableHashMap"
import * as Option from "@effect/data/Option"
import * as RA from "@effect/data/ReadonlyArray"
import { tuple } from "@effect/data/ReadonlyArray"
import type { Equivalence } from "@effect/data/typeclass/Equivalence"
import type * as Cause from "@effect/io/Cause"
import type * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRefsPatch from "@effect/io/FiberRefs/Patch"
import * as internalCause from "@effect/io/internal/cause"
import type * as Concurrency from "@effect/io/internal/concurrency"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as executionStrategy from "@effect/io/internal/executionStrategy"
import * as internalFiber from "@effect/io/internal/fiber"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as internalRef from "@effect/io/internal/ref"
import * as _schedule from "@effect/io/internal/schedule"
import * as supervisor from "@effect/io/internal/supervisor"
import type * as Ref from "@effect/io/Ref"
import type * as Synchronized from "@effect/io/Ref/Synchronized"
import type * as Schedule from "@effect/io/Schedule"
import type * as Scope from "@effect/io/Scope"
import type * as Supervisor from "@effect/io/Supervisor"

// TODO: remove once added to /data/Predicate
const isIterable = (u: unknown): u is Iterable<unknown> => typeof u === "object" && u != null && Symbol.iterator in u

/** @internal */
class Semaphore {
  public waiters = new Array<() => void>()
  public taken = 0

  constructor(readonly permits: number) {}

  get free() {
    return this.permits - this.taken
  }

  readonly take = (n: number): Effect.Effect<never, never, number> =>
    core.asyncInterruptEither<never, never, number>((resume) => {
      if (this.free < n) {
        const observer = () => {
          if (this.free >= n) {
            const observerIndex = this.waiters.findIndex((cb) => cb === observer)
            if (observerIndex !== -1) {
              this.waiters.splice(observerIndex, 1)
            }
            this.taken += n
            resume(core.succeed(n))
          }
        }
        this.waiters.push(observer)
        return Either.left(core.sync(() => {
          const observerIndex = this.waiters.findIndex((cb) => cb === observer)
          if (observerIndex !== -1) {
            this.waiters.splice(observerIndex, 1)
          }
        }))
      }
      this.taken += n
      return Either.right(core.succeed(n))
    })

  readonly release = (n: number): Effect.Effect<never, never, void> =>
    core.withFiberRuntime<never, never, void>((fiber) => {
      this.taken -= n
      fiber.getFiberRef(core.currentScheduler).scheduleTask(() => {
        this.waiters.forEach((wake) => wake())
      })
      return core.unit
    })

  readonly withPermits = (n: number) =>
    <R, E, A>(self: Effect.Effect<R, E, A>) =>
      core.uninterruptibleMask((restore) =>
        core.flatMap(
          restore(this.take(n)),
          (permits) => fiberRuntime.ensuring(restore(self), this.release(permits))
        )
      )
}

/** @internal */
export const unsafeMakeSemaphore = (leases: number) => {
  return new Semaphore(leases)
}

/** @internal */
export const makeSemaphore = (permits: number) => core.sync(() => unsafeMakeSemaphore(permits))

/** @internal */
export const awaitAllChildren = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  ensuringChildren(self, fiberRuntime.fiberAwaitAll)

/** @internal */
export const cached = dual<
  (
    timeToLive: Duration.Duration
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, Effect.Effect<never, E, A>>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    timeToLive: Duration.Duration
  ) => Effect.Effect<R, never, Effect.Effect<never, E, A>>
>(2, (self, timeToLive) => core.map(cachedInvalidate(self, timeToLive), (tuple) => tuple[0]))

/** @internal */
export const cachedInvalidate = dual<
  (
    timeToLive: Duration.Duration
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R, never, [Effect.Effect<never, E, A>, Effect.Effect<never, never, void>]>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    timeToLive: Duration.Duration
  ) => Effect.Effect<R, never, [Effect.Effect<never, E, A>, Effect.Effect<never, never, void>]>
>(
  2,
  <R, E, A>(self: Effect.Effect<R, E, A>, timeToLive: Duration.Duration) =>
    core.flatMap(
      core.context<R>(),
      (env) =>
        core.map(
          makeSynchronized<Option.Option<[number, Deferred.Deferred<E, A>]>>(Option.none()),
          (cache) =>
            [
              core.provideContext(getCachedValue(self, timeToLive, cache), env),
              invalidateCache(cache)
            ] as [Effect.Effect<never, E, A>, Effect.Effect<never, never, void>]
        )
    )
)

/** @internal */
const computeCachedValue = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  timeToLive: Duration.Duration,
  start: number
): Effect.Effect<R, never, Option.Option<readonly [number, Deferred.Deferred<E, A>]>> =>
  pipe(
    core.deferredMake<E, A>(),
    core.tap((deferred) => core.intoDeferred(self, deferred)),
    core.map((deferred) => Option.some([start + timeToLive.millis, deferred] as const))
  )

/** @internal */
const getCachedValue = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  timeToLive: Duration.Duration,
  cache: Synchronized.Synchronized<Option.Option<readonly [number, Deferred.Deferred<E, A>]>>
): Effect.Effect<R, E, A> =>
  core.uninterruptibleMask<R, E, A>((restore) =>
    pipe(
      effect.clockWith((clock) => clock.currentTimeMillis),
      core.flatMap((time) =>
        updateSomeAndGetEffectSynchronized(cache, (option) => {
          switch (option._tag) {
            case "None": {
              return Option.some(computeCachedValue(self, timeToLive, time))
            }
            case "Some": {
              const [end] = option.value
              return end - time <= 0
                ? Option.some(computeCachedValue(self, timeToLive, time))
                : Option.none()
            }
          }
        })
      ),
      core.flatMap((option) =>
        Option.isNone(option) ?
          core.dieMessage(
            "BUG: Effect.cachedInvalidate - please report an issue at https://github.com/Effect-TS/io/issues"
          ) :
          restore(core.deferredAwait(option.value[1]))
      )
    )
  )

/** @internal */
const invalidateCache = <E, A>(
  cache: Synchronized.Synchronized<Option.Option<readonly [number, Deferred.Deferred<E, A>]>>
): Effect.Effect<never, never, void> => internalRef.set(cache, Option.none())

/** @internal */
export const ensuringChild = dual<
  <R2, X>(
    f: (fiber: Fiber.Fiber<any, ReadonlyArray<unknown>>) => Effect.Effect<R2, never, X>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E, A>,
  <R, E, A, R2, X>(
    self: Effect.Effect<R, E, A>,
    f: (fiber: Fiber.Fiber<any, ReadonlyArray<unknown>>) => Effect.Effect<R2, never, X>
  ) => Effect.Effect<R | R2, E, A>
>(2, (self, f) => ensuringChildren(self, (children) => f(fiberRuntime.fiberCollectAll(children))))

/** @internal */
export const ensuringChildren = dual<
  <R1, X>(
    children: (fibers: ReadonlyArray<Fiber.RuntimeFiber<any, any>>) => Effect.Effect<R1, never, X>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E, A>,
  <R, E, A, R1, X>(
    self: Effect.Effect<R, E, A>,
    children: (fibers: ReadonlyArray<Fiber.RuntimeFiber<any, any>>) => Effect.Effect<R1, never, X>
  ) => Effect.Effect<R | R1, E, A>
>(2, (self, children) =>
  core.flatMap(supervisor.track, (supervisor) =>
    pipe(
      supervised(self, supervisor),
      fiberRuntime.ensuring(core.flatMap(supervisor.value(), children))
    )))

/** @internal */
// @ts-expect-error
export const forkAll = dual<
  {
    (options?: { readonly discard?: false }): <R, E, A>(
      effects: Iterable<Effect.Effect<R, E, A>>
    ) => Effect.Effect<R, never, Fiber.Fiber<E, ReadonlyArray<A>>>
    (options: { readonly discard: true }): <R, E, A>(
      effects: Iterable<Effect.Effect<R, E, A>>
    ) => Effect.Effect<R, never, void>
  },
  {
    <R, E, A>(
      effects: Iterable<Effect.Effect<R, E, A>>,
      options?: { readonly discard?: false }
    ): Effect.Effect<R, never, Fiber.Fiber<E, ReadonlyArray<A>>>
    <R, E, A>(
      effects: Iterable<Effect.Effect<R, E, A>>,
      options: { readonly discard: true }
    ): Effect.Effect<R, never, void>
  }
>((args) => isIterable(args[0]), (
  effects,
  options
) =>
  options?.discard ?
    core.forEachDiscard(effects, fiberRuntime.fork) :
    core.map(core.forEach(effects, fiberRuntime.fork), fiberRuntime.fiberCollectAll))

/** @internal */
export const forkIn = dual<
  (scope: Scope.Scope) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>>,
  <R, E, A>(self: Effect.Effect<R, E, A>, scope: Scope.Scope) => Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>>
>(
  2,
  (self, scope) =>
    core.uninterruptibleMask((restore) =>
      core.flatMap(scope.fork(executionStrategy.sequential), (child) =>
        pipe(
          restore(self),
          core.onExit((exit) => child.close(exit)),
          fiberRuntime.forkDaemon,
          core.tap((fiber) =>
            child.addFinalizer(() =>
              core.fiberIdWith((fiberId) =>
                Equal.equals(fiberId, fiber.id()) ?
                  core.unit :
                  core.asUnit(core.interruptFiber(fiber))
              )
            )
          )
        ))
    )
)

/** @internal */
export const forkScoped = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, never, Fiber.RuntimeFiber<E, A>> =>
  fiberRuntime.scopeWith((scope) => forkIn(self, scope))

/** @internal */
export const fromFiber = <E, A>(fiber: Fiber.Fiber<E, A>): Effect.Effect<never, E, A> => internalFiber.join(fiber)

/** @internal */
export const fromFiberEffect = <R, E, A>(fiber: Effect.Effect<R, E, Fiber.Fiber<E, A>>): Effect.Effect<R, E, A> =>
  core.suspend(() => core.flatMap(fiber, internalFiber.join))

const memoKeySymbol = Symbol.for("@effect/io/Effect/memoizeFunction.key")

class Key<A> implements Equal.Equal {
  [memoKeySymbol] = memoKeySymbol
  constructor(readonly a: A, readonly eq?: Equivalence<A>) {}
  [Equal.symbol](that: Equal.Equal) {
    if (typeof that === "object" && that !== null && memoKeySymbol in that) {
      if (this.eq) {
        return this.eq(this.a, (that as unknown as Key<A>).a)
      } else {
        return Equal.equals(this.a, (that as unknown as Key<A>).a)
      }
    }
    return false
  }
  [Hash.symbol]() {
    return this.eq ? 0 : Hash.hash(this.a)
  }
}

/** @internal */
export const memoizeFunction = <R, E, A, B>(
  f: (a: A) => Effect.Effect<R, E, B>,
  eq?: Equivalence<A>
): Effect.Effect<never, never, (a: A) => Effect.Effect<R, E, B>> => {
  return pipe(
    core.sync(() => MutableHashMap.empty<Key<A>, Deferred.Deferred<E, readonly [FiberRefsPatch.FiberRefsPatch, B]>>()),
    core.flatMap(makeSynchronized),
    core.map((ref) =>
      (a: A) =>
        pipe(
          ref.modifyEffect((map) => {
            const result = pipe(map, MutableHashMap.get(new Key(a, eq)))
            if (Option.isNone(result)) {
              return pipe(
                core.deferredMake<E, readonly [FiberRefsPatch.FiberRefsPatch, B]>(),
                core.tap((deferred) =>
                  pipe(
                    effect.diffFiberRefs(f(a)),
                    core.intoDeferred(deferred),
                    fiberRuntime.fork
                  )
                ),
                core.map((deferred) => [deferred, pipe(map, MutableHashMap.set(new Key(a, eq), deferred))] as const)
              )
            }
            return core.succeed([result.value, map] as const)
          }),
          core.flatMap(core.deferredAwait),
          core.flatMap(([patch, b]) => pipe(effect.patchFiberRefs(patch), core.as(b)))
        )
    )
  )
}

/** @internal */
export const raceFirst = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E2 | E, A2 | A>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E2 | E, A2 | A>
>(2, <R, E, A, R2, E2, A2>(
  self: Effect.Effect<R, E, A>,
  that: Effect.Effect<R2, E2, A2>
) =>
  pipe(
    core.exit(self),
    fiberRuntime.race(core.exit(that)),
    (effect: Effect.Effect<R | R2, never, Exit.Exit<E | E2, A | A2>>) => core.flatten(effect)
  ))

/** @internal */
export const scheduleForked = dual<
  <R2, Out>(
    schedule: Schedule.Schedule<R2, unknown, Out>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2 | Scope.Scope, never, Fiber.RuntimeFiber<E, Out>>,
  <R, E, A, R2, Out>(
    self: Effect.Effect<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, Out>
  ) => Effect.Effect<R | R2 | Scope.Scope, never, Fiber.RuntimeFiber<E, Out>>
>(2, (self, schedule) => pipe(self, _schedule.schedule_Effect(schedule), forkScoped))

/** @internal */
export const supervised = dual<
  <X>(supervisor: Supervisor.Supervisor<X>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A, X>(self: Effect.Effect<R, E, A>, supervisor: Supervisor.Supervisor<X>) => Effect.Effect<R, E, A>
>(2, (self, supervisor) => {
  const supervise = core.fiberRefLocallyWith(fiberRuntime.currentSupervisor, (s) => s.zip(supervisor))
  return supervise(self)
})

/** @internal */
export const timeout = dual<
  (duration: Duration.Duration) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, Option.Option<A>>,
  <R, E, A>(self: Effect.Effect<R, E, A>, duration: Duration.Duration) => Effect.Effect<R, E, Option.Option<A>>
>(2, (self, duration) =>
  timeoutTo(self, {
    onTimeout: Option.none(),
    onSuccess: Option.some,
    duration
  }))

/** @internal */
export const timeoutFail = dual<
  <E1>(
    options: {
      readonly onTimeout: LazyArg<E1>
      readonly duration: Duration.Duration
    }
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E1, A>,
  <R, E, A, E1>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onTimeout: LazyArg<E1>
      readonly duration: Duration.Duration
    }
  ) => Effect.Effect<R, E | E1, A>
>(2, (self, { duration, onTimeout }) =>
  core.flatten(timeoutTo(self, {
    onTimeout: core.failSync(onTimeout),
    onSuccess: core.succeed,
    duration
  })))

/** @internal */
export const timeoutFailCause = dual<
  <E1>(
    options: {
      readonly onTimeout: LazyArg<Cause.Cause<E1>>
      readonly duration: Duration.Duration
    }
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E1, A>,
  <R, E, A, E1>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onTimeout: LazyArg<Cause.Cause<E1>>
      readonly duration: Duration.Duration
    }
  ) => Effect.Effect<R, E | E1, A>
>(2, (self, { duration, onTimeout }) =>
  core.flatten(timeoutTo(self, {
    onTimeout: core.failCauseSync(onTimeout),
    onSuccess: core.succeed,
    duration
  })))

/** @internal */
export const timeoutTo = dual<
  <A, B, B1>(
    options: {
      readonly onTimeout: B1
      readonly onSuccess: (a: A) => B
      readonly duration: Duration.Duration
    }
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B | B1>,
  <R, E, A, B, B1>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onTimeout: B1
      readonly onSuccess: (a: A) => B
      readonly duration: Duration.Duration
    }
  ) => Effect.Effect<R, E, B | B1>
>(2, (self, { duration, onSuccess, onTimeout }) =>
  raceFirst(
    core.map(self, onSuccess),
    pipe(
      effect.sleep(duration),
      core.as(onTimeout),
      core.interruptible
    )
  ))

/** @internal */
export const validate = dual<
  <R1, E1, B>(
    that: Effect.Effect<R1, E1, B>,
    options?: { readonly parallel?: boolean }
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E | E1, [A, B]>,
  <R, E, A, R1, E1, B>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R1, E1, B>,
    options?: { readonly parallel?: boolean }
  ) => Effect.Effect<R | R1, E | E1, [A, B]>
>(
  (args) => core.isEffect(args[0]) && core.isEffect(args[1]),
  (self, that, options) => validateWith(self, that, (a, b) => tuple(a, b), options)
)

/** @internal */
export const validateWith = dual<
  <A, R1, E1, B, C>(
    that: Effect.Effect<R1, E1, B>,
    f: (a: A, b: B) => C,
    options?: { readonly parallel?: boolean }
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E | E1, C>,
  <R, E, A, R1, E1, B, C>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R1, E1, B>,
    f: (a: A, b: B) => C,
    options?: { readonly parallel?: boolean }
  ) => Effect.Effect<R | R1, E | E1, C>
>((args) => core.isEffect(args[0]) && core.isEffect(args[1]), (self, that, f, options) =>
  core.flatten(zipWith(
    core.exit(self),
    core.exit(that),
    (ea, eb) =>
      core.exitZipWith(ea, eb, f, (ca, cb) =>
        options?.parallel ? internalCause.parallel(ca, cb) : internalCause.sequential(ca, cb)),
    options
  )))

/** @internal */
export const zip = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>,
    options?: { readonly parallel?: boolean }
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, [A, A2]>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    options?: { readonly parallel?: boolean }
  ) => Effect.Effect<R | R2, E | E2, [A, A2]>
>((args) => core.isEffect(args[1]), (
  self,
  that,
  options
) =>
  options?.parallel ?
    zipWith(self, that, (a, b) => [a, b], options) :
    core.zip(self, that))

/** @internal */
export const zipLeft = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>,
    options?: { readonly parallel?: boolean }
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    options?: { readonly parallel?: boolean }
  ) => Effect.Effect<R | R2, E | E2, A>
>(
  (args) => core.isEffect(args[1]),
  (self, that, options) => options?.parallel ? zipWith(self, that, (a, _) => a, options) : core.zipLeft(self, that)
)

/** @internal */
export const zipRight = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>,
    options?: { readonly parallel?: boolean }
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    options?: { readonly parallel?: boolean }
  ) => Effect.Effect<R | R2, E | E2, A2>
>((args) => core.isEffect(args[1]), (self, that, options) =>
  options?.parallel ?
    zipWith(self, that, (_, b) => b, options) :
    core.zipRight(self, that))

/** @internal */
export const zipWith = dual<
  <R2, E2, A2, A, B>(
    that: Effect.Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B,
    options?: { readonly parallel?: boolean }
  ) => <R, E>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, B>,
  <R, E, A, R2, E2, A2, B>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B,
    options?: { readonly parallel?: boolean }
  ) => Effect.Effect<R | R2, E | E2, B>
>((args) => core.isEffect(args[1]), <R, E, A, R2, E2, A2, B>(
  self: Effect.Effect<R, E, A>,
  that: Effect.Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B,
  options?: { readonly parallel?: boolean }
): Effect.Effect<R | R2, E | E2, B> =>
  options?.parallel ?
    core.map(
      all(self, that, { concurrency: 2 }),
      ([a, a2]) => f(a, a2)
    ) :
    core.zipWith(self, that, f))

// circular with Synchronized

/** @internal */
const SynchronizedSymbolKey = "@effect/io/Ref/Synchronized"

/** @internal */
export const SynchronizedTypeId: Synchronized.SynchronizedTypeId = Symbol.for(
  SynchronizedSymbolKey
) as Synchronized.SynchronizedTypeId

/** @internal */
export const synchronizedVariance = {
  _A: (_: never) => _
}

/** @internal */
class SynchronizedImpl<A> implements Synchronized.Synchronized<A> {
  readonly [SynchronizedTypeId] = synchronizedVariance
  readonly [internalRef.RefTypeId] = internalRef.refVariance
  constructor(
    readonly ref: Ref.Ref<A>,
    readonly withLock: <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  ) {}
  modify<B>(f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B> {
    return this.modifyEffect((a) => core.succeed(f(a)))
  }
  modifyEffect<R, E, B>(f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): Effect.Effect<R, E, B> {
    return this.withLock(
      pipe(
        core.flatMap(internalRef.get(this.ref), f),
        core.flatMap(([b, a]) => core.as(internalRef.set(this.ref, a), b))
      )
    )
  }
}

/** @internal */
export const makeSynchronized = <A>(value: A): Effect.Effect<never, never, Synchronized.Synchronized<A>> =>
  core.sync(() => unsafeMakeSynchronized(value))

/** @internal */
export const unsafeMakeSynchronized = <A>(value: A): Synchronized.Synchronized<A> => {
  const ref = internalRef.unsafeMake(value)
  const sem = unsafeMakeSemaphore(1)
  return new SynchronizedImpl(ref, sem.withPermits(1))
}

/** @internal */
export const updateSomeAndGetEffectSynchronized = dual<
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ) => (self: Synchronized.Synchronized<A>) => Effect.Effect<R, E, A>,
  <A, R, E>(
    self: Synchronized.Synchronized<A>,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ) => Effect.Effect<R, E, A>
>(2, (self, pf) =>
  self.modifyEffect((value) => {
    const result = pf(value)
    switch (result._tag) {
      case "None": {
        return core.succeed([value, value] as const)
      }
      case "Some": {
        return core.map(result.value, (a) => [a, a] as const)
      }
    }
  }))

// circular with Fiber

/** @internal */
export const zipFiber = dual<
  <E2, A2>(that: Fiber.Fiber<E2, A2>) => <E, A>(self: Fiber.Fiber<E, A>) => Fiber.Fiber<E | E2, readonly [A, A2]>,
  <E, A, E2, A2>(self: Fiber.Fiber<E, A>, that: Fiber.Fiber<E2, A2>) => Fiber.Fiber<E | E2, readonly [A, A2]>
>(2, (self, that) => zipWithFiber(self, that, (a, b) => [a, b] as const))

/** @internal */
export const zipLeftFiber = dual<
  <E2, A2>(that: Fiber.Fiber<E2, A2>) => <E, A>(self: Fiber.Fiber<E, A>) => Fiber.Fiber<E | E2, A>,
  <E, A, E2, A2>(self: Fiber.Fiber<E, A>, that: Fiber.Fiber<E2, A2>) => Fiber.Fiber<E | E2, A>
>(2, (self, that) => zipWithFiber(self, that, (a, _) => a))

/** @internal */
export const zipRightFiber = dual<
  <E2, A2>(that: Fiber.Fiber<E2, A2>) => <E, A>(self: Fiber.Fiber<E, A>) => Fiber.Fiber<E | E2, A2>,
  <E, A, E2, A2>(self: Fiber.Fiber<E, A>, that: Fiber.Fiber<E2, A2>) => Fiber.Fiber<E | E2, A2>
>(2, (self, that) => zipWithFiber(self, that, (_, b) => b))

/** @internal */
export const zipWithFiber = dual<
  <E2, A, B, C>(
    that: Fiber.Fiber<E2, B>,
    f: (a: A, b: B) => C
  ) => <E>(self: Fiber.Fiber<E, A>) => Fiber.Fiber<E | E2, C>,
  <E, A, E2, B, C>(
    self: Fiber.Fiber<E, A>,
    that: Fiber.Fiber<E2, B>,
    f: (a: A, b: B) => C
  ) => Fiber.Fiber<E | E2, C>
>(3, (self, that, f) => ({
  [internalFiber.FiberTypeId]: internalFiber.fiberVariance,
  id: () => pipe(self.id(), FiberId.getOrElse(that.id())),
  await: () =>
    pipe(
      self.await(),
      core.flatten,
      zipWith(core.flatten(that.await()), f, { parallel: true }),
      core.exit
    ),
  children: () => self.children(),
  inheritAll: () =>
    core.zipRight(
      that.inheritAll(),
      self.inheritAll()
    ),
  poll: () =>
    core.zipWith(
      self.poll(),
      that.poll(),
      (optionA, optionB) =>
        pipe(
          optionA,
          Option.flatMap((exitA) =>
            pipe(
              optionB,
              Option.map((exitB) => Exit.zipWith(exitA, exitB, f, internalCause.parallel))
            )
          )
        )
    ),
  interruptAsFork: (id) =>
    core.zipRight(
      self.interruptAsFork(id),
      that.interruptAsFork(id)
    )
}))

/* @internal */
export const all: Effect.All.DataFirst = function() {
  const hasOptions = arguments.length > 1 && !core.isEffect(arguments[arguments.length - 1])
  const options: {
    readonly concurrency?: Concurrency.Concurrency
    readonly discard?: boolean
  } = hasOptions ?
    arguments[arguments.length - 1] :
    {}
  const effects = hasOptions ? Array.prototype.slice.call(arguments, 0, -1) : arguments

  if (effects.length === 1) {
    if (core.isEffect(effects[0])) {
      return options.discard ? core.asUnit(effects[0]) : core.map(effects[0], (x) => [x])
    } else if (Array.isArray(effects[0]) || Symbol.iterator in effects[0]) {
      // @ts-expect-error
      return fiberRuntime.forEachOptions(effects[0], identity, options)
    } else if (options?.discard) {
      return fiberRuntime.forEachOptions(
        Object.values(effects[0] as Readonly<{ [K: string]: Effect.Effect<any, any, any> }>),
        identity,
        options as any
      )
    } else {
      const keys = Object.keys(effects[0])
      const size = keys.length
      return pipe(
        fiberRuntime.forEachOptions(
          keys.map((k) => (effects[0] as Readonly<{ [K: string]: Effect.Effect<any, any, any> }>)[k]),
          identity,
          options as any
        ),
        core.map((values) => {
          const res = {}
          for (let i = 0; i < size; i++) {
            ;(res as any)[keys[i]] = values[i]
          }
          return res
        })
      ) as any
    }
  }

  return fiberRuntime.forEachOptions(effects, identity, options as any)
}

/* @internal */
export const allWith: Effect.All.DataLast = function(options) {
  return (self) => (all as any)(self, options)
}

/* @internal */
export const allSuccesses = <R, E, A>(
  elements: Iterable<Effect.Effect<R, E, A>>,
  options?: { readonly concurrency?: Concurrency.Concurrency }
): Effect.Effect<R, never, Array<A>> =>
  core.map(
    all(Array.from(elements).map(core.exit), options),
    RA.filterMap((exit) => core.exitIsSuccess(exit) ? Option.some(exit.i0) : Option.none())
  )

/* @internal */
export const filterMap = dual<
  <A, B>(
    pf: (a: A) => Option.Option<B>
  ) => <R, E>(elements: Iterable<Effect.Effect<R, E, A>>) => Effect.Effect<R, E, Array<B>>,
  <R, E, A, B>(
    elements: Iterable<Effect.Effect<R, E, A>>,
    pf: (a: A) => Option.Option<B>
  ) => Effect.Effect<R, E, Array<B>>
>(2, (elements, pf) => core.map(all(elements), RA.filterMap(pf)))

/* @internal */
export const replicate = (n: number) =>
  <R, E, A>(self: Effect.Effect<R, E, A>): Array<Effect.Effect<R, E, A>> => Array.from({ length: n }, () => self)

/* @internal */
export const replicateEffect = dual<
  {
    (n: number, options?: {
      readonly discard?: false
    }): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, ReadonlyArray<A>>
    (n: number, options: {
      readonly discard: true
    }): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, void>
  },
  {
    <R, E, A>(self: Effect.Effect<R, E, A>, n: number, options?: {
      readonly discard?: false
    }): Effect.Effect<R, E, ReadonlyArray<A>>
    <R, E, A>(self: Effect.Effect<R, E, A>, n: number, options: {
      readonly discard: true
    }): Effect.Effect<R, E, void>
  }
>(
  (args) => core.isEffect(args[0]),
  (self, n, options) => all(replicate(n)(self), options as {})
)
