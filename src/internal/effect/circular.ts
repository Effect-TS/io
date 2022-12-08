import * as Cause from "@effect/io/Cause"
import { getCallTrace } from "@effect/io/Debug"
import type * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRefsPatch from "@effect/io/FiberRefs/Patch"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as internalFiber from "@effect/io/internal/fiber"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as OpCodes from "@effect/io/internal/opCodes/effect"
import * as internalRef from "@effect/io/internal/ref"
import * as _schedule from "@effect/io/internal/schedule"
import * as supervisor from "@effect/io/internal/supervisor"
import type * as Synchronized from "@effect/io/Ref/Synchronized"
import type * as Schedule from "@effect/io/Schedule"
import type * as Scope from "@effect/io/Scope"
import type * as Supervisor from "@effect/io/Supervisor"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as MutableHashMap from "@fp-ts/data/mutable/MutableHashMap"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"

/** @internal */
export const unsafeMakeLock = () => {
  let running = false
  const observers: Set<() => void> = new Set()
  return <R, E, A>(self: Effect.Effect<R, E, A>) =>
    core.asyncInterrupt<R, E, A>((resume) => {
      const withFinalizer = pipe(
        self,
        ensuring(
          core.sync(() => {
            running = false
            const next = observers.values().next()
            if (!next.done) {
              next.value()
            }
          })
        )
      )
      if (!running) {
        running = true
        return Either.right(withFinalizer)
      } else {
        const observer = () => {
          if (!running) {
            running = true
            observers.delete(observer)
            resume(withFinalizer)
          }
        }
        observers.add(observer)
        return Either.left(core.sync(() => observers.delete(observer)))
      }
    })
}

/** @internal */
export const makeLock = core.sync(unsafeMakeLock)

/** @internal */
export const acquireReleaseInterruptible = <R, E, A, R2, X>(
  acquire: Effect.Effect<R, E, A>,
  release: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
): Effect.Effect<R | R2 | Scope.Scope, E, A> => {
  const trace = getCallTrace()
  return pipe(acquire, ensuring(fiberRuntime.addFinalizer(release))).traced(trace)
}

/** @internal */
export const awaitAllChildren = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  return pipe(self, ensuringChildren(fiberRuntime.fiberAwaitAll))
}

/** @internal */
export function cached(timeToLive: Duration.Duration) {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Effect.Effect<never, E, A>> => {
    return pipe(self, cachedInvalidate(timeToLive), core.map((tuple) => tuple[0])).traced(trace)
  }
}

/** @internal */
export const cachedInvalidate = (timeToLive: Duration.Duration) => {
  const trace = getCallTrace()
  return <R, E, A>(
    self: Effect.Effect<R, E, A>
  ): Effect.Effect<R, never, readonly [Effect.Effect<never, E, A>, Effect.Effect<never, never, void>]> => {
    return pipe(
      core.environment<R>(),
      core.flatMap((env) =>
        pipe(
          makeSynchronized<Option.Option<readonly [number, Deferred.Deferred<E, A>]>>(Option.none),
          core.map((cache) =>
            [
              pipe(getCachedValue(self, timeToLive, cache), core.provideEnvironment(env)),
              invalidateCache(cache)
            ] as const
          )
        )
      )
    ).traced(trace)
  }
}

/** @internal */
const computeCachedValue = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  timeToLive: Duration.Duration,
  start: number
): Effect.Effect<R, never, Option.Option<readonly [number, Deferred.Deferred<E, A>]>> => {
  return pipe(
    core.deferredMake<E, A>(),
    core.tap((deferred) => pipe(self, core.intoDeferred(deferred))),
    core.map((deferred) => Option.some([start + timeToLive.millis, deferred] as const))
  )
}

/** @internal */
const getCachedValue = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  timeToLive: Duration.Duration,
  cache: Synchronized.Synchronized<Option.Option<readonly [number, Deferred.Deferred<E, A>]>>
): Effect.Effect<R, E, A> => {
  return core.uninterruptibleMask<R, E, A>((restore) =>
    pipe(
      effect.clockWith((clock) => clock.currentTimeMillis()),
      core.flatMap((time) =>
        pipe(
          cache,
          updateSomeAndGetEffectSynchronized((option) => {
            switch (option._tag) {
              case "None": {
                return Option.some(computeCachedValue(self, timeToLive, time))
              }
              case "Some": {
                const [end] = option.value
                return end - time <= 0
                  ? Option.some(computeCachedValue(self, timeToLive, time))
                  : Option.none
              }
            }
          })
        )
      ),
      core.flatMap((option) =>
        Option.isNone(option) ?
          effect.dieMessage(
            "BUG: Effect.cachedInvalidate - please report an issue at https://github.com/Effect-TS/io/issues"
          ) :
          restore(core.deferredAwait(option.value[1]))
      )
    )
  )
}

/** @internal */
const invalidateCache = <E, A>(
  cache: Synchronized.Synchronized<Option.Option<readonly [number, Deferred.Deferred<E, A>]>>
): Effect.Effect<never, never, void> => {
  return pipe(cache, internalRef.set(Option.none as Option.Option<readonly [number, Deferred.Deferred<E, A>]>))
}

/** @internal */
export const disconnect = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.uninterruptibleMask((restore) =>
    core.fiberIdWith((fiberId) =>
      pipe(
        restore(self),
        fiberRuntime.forkDaemon,
        core.flatMap((fiber) =>
          pipe(
            restore(internalFiber.join(fiber)),
            core.onInterrupt(() => pipe(fiber, internalFiber.interruptWithFork(fiberId)))
          )
        )
      )
    )
  ).traced(trace)
}

/** @internal */
export const ensuring = <R1, X>(finalizer: Effect.Effect<R1, never, X>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E, A> =>
    core.uninterruptibleMask((restore) =>
      pipe(
        restore(self),
        core.foldCauseEffect(
          (cause1) =>
            pipe(
              finalizer,
              core.foldCauseEffect(
                (cause2) => core.failCause(Cause.sequential(cause1, cause2)),
                () => core.failCause(cause1)
              )
            ),
          (a) => pipe(finalizer, core.as(a))
        )
      )
    ).traced(trace)
}

/** @internal */
export const ensuringChild = <R2, X>(
  f: (fiber: Fiber.Fiber<any, Chunk.Chunk<unknown>>) => Effect.Effect<R2, never, X>
) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E, A> => {
    return pipe(
      self,
      ensuringChildren((children) => f(fiberRuntime.fiberCollectAll(children)))
    ).traced(trace)
  }
}

/** @internal */
export const ensuringChildren = <R1, X>(
  children: (fibers: Chunk.Chunk<Fiber.RuntimeFiber<any, any>>) => Effect.Effect<R1, never, X>
) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E, A> => {
    return pipe(
      supervisor.track(),
      core.flatMap((supervisor) =>
        pipe(
          self,
          supervised(supervisor),
          ensuring(pipe(supervisor.value(), core.flatMap(children)))
        )
      )
    ).traced(trace)
  }
}

/** @internal */
export const forkAll = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, never, Fiber.Fiber<E, Chunk.Chunk<A>>> => {
  const trace = getCallTrace()
  return pipe(effects, core.forEach(fiberRuntime.fork), core.map(fiberRuntime.fiberCollectAll)).traced(trace)
}

/** @internal */
export const forkIn = (scope: Scope.Scope) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> => {
    return core.uninterruptibleMask((restore) =>
      pipe(
        scope.fork(ExecutionStrategy.sequential),
        core.flatMap((child) =>
          pipe(
            restore(self),
            core.onExit((exit) => child.close(exit)),
            fiberRuntime.forkDaemon,
            core.tap((fiber) =>
              child.addFinalizer(() =>
                core.fiberIdWith((fiberId) =>
                  Equal.equals(fiberId, fiber.id()) ? core.unit() : core.asUnit(core.interruptFiber(fiber))
                )
              )
            )
          )
        )
      )
    ).traced(trace)
  }
}

/** @internal */
export const forkScoped = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, never, Fiber.RuntimeFiber<E, A>> => {
  const trace = getCallTrace()
  return fiberRuntime.scopeWith((scope) => pipe(self, forkIn(scope))).traced(trace)
}

/** @internal */
export const fromFiber = <E, A>(fiber: Fiber.Fiber<E, A>): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  return internalFiber.join(fiber).traced(trace)
}

/** @internal */
export const fromFiberEffect = <R, E, A>(fiber: Effect.Effect<R, E, Fiber.Fiber<E, A>>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => pipe(fiber, core.flatMap(internalFiber.join))).traced(trace)
}

/** @internal */
export const memoizeFunction = <R, E, A, B>(
  f: (a: A) => Effect.Effect<R, E, B>
): Effect.Effect<never, never, (a: A) => Effect.Effect<R, E, B>> => {
  const trace = getCallTrace()
  return pipe(
    core.sync(() => {
      return MutableHashMap.empty<A, Deferred.Deferred<E, readonly [FiberRefsPatch.FiberRefsPatch, B]>>()
    }),
    core.flatMap(makeSynchronized),
    core.map((ref) =>
      (a: A) =>
        pipe(
          ref.modifyEffect((map) => {
            const result = pipe(map, MutableHashMap.get(a))
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
                core.map((deferred) => [deferred, pipe(map, MutableHashMap.set(a, deferred))] as const)
              )
            }
            return core.succeed([result.value, map] as const)
          }),
          core.flatMap(core.deferredAwait),
          core.flatMap(([patch, b]) => pipe(effect.patchFiberRefs(patch), core.as(b)))
        )
    )
  ).traced(trace)
}

/** @internal */
export const race = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return core.checkInterruptible((isInterruptible) =>
      pipe(
        raceDisconnect(self, isInterruptible),
        raceAwait(raceDisconnect(that, isInterruptible))
      )
    ).traced(trace)
  }
}

/** @internal */
const raceDisconnect = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  isInterruptible: boolean
): Effect.Effect<R, E, A> => {
  return isInterruptible ?
    disconnect(self) :
    core.interruptible(disconnect(core.uninterruptible(self)))
}

/** @internal */
export const raceAwait = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return core.fiberIdWith<R | R2, E | E2, A | A2>((parentFiberId) =>
      pipe(
        self,
        raceWith(
          that,
          (exit, right) =>
            pipe(
              exit,
              core.exitMatchEffect(
                (cause) =>
                  pipe(
                    internalFiber.join(right),
                    effect.mapErrorCause((cause2) => Cause.parallel(cause, cause2))
                  ),
                (value) =>
                  pipe(
                    right,
                    core.interruptWithFiber(parentFiberId),
                    core.as(value)
                  )
              )
            ),
          (exit, left) =>
            pipe(
              exit,
              core.exitMatchEffect(
                (cause) =>
                  pipe(
                    internalFiber.join(left),
                    effect.mapErrorCause((cause2) => Cause.parallel(cause2, cause))
                  ),
                (value) =>
                  pipe(
                    left,
                    core.interruptWithFiber(parentFiberId),
                    core.as(value)
                  )
              )
            )
        )
      )
    ).traced(trace)
  }
}

/** @internal */
export const raceEither = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, Either.Either<A, A2>> => {
    return pipe(self, core.map(Either.left), race(pipe(that, core.map(Either.right)))).traced(trace)
  }
}

/** @internal */
export const raceFirst = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E2 | E, A2 | A> => {
    return pipe(
      core.exit(self),
      race(core.exit(that)),
      (effect: Effect.Effect<R | R2, never, Exit.Exit<E | E2, A | A2>>) => core.flatten(effect)
    ).traced(trace)
  }
}

/** @internal */
export const raceFibersWith = <E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  that: Effect.Effect<R1, E1, A1>,
  selfWins: (winner: Fiber.RuntimeFiber<E, A>, loser: Fiber.RuntimeFiber<E1, A1>) => Effect.Effect<R2, E2, A2>,
  thatWins: (winner: Fiber.RuntimeFiber<E1, A1>, loser: Fiber.RuntimeFiber<E, A>) => Effect.Effect<R3, E3, A3>
) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<
    R | R1 | R2 | R3,
    E2 | E3,
    A2 | A3
  > => {
    return core.withFiberRuntime<R | R1 | R2 | R3, E2 | E3, A2 | A3>((parentFiber, parentStatus) => {
      const parentRuntimeFlags = parentStatus.runtimeFlags
      const raceIndicator = MutableRef.make(true)
      const leftFiber: fiberRuntime.FiberRuntime<E, A> = fiberRuntime.unsafeMakeChildFiber(
        self,
        parentFiber,
        parentRuntimeFlags
      )
      const rightFiber: fiberRuntime.FiberRuntime<E1, A1> = fiberRuntime.unsafeMakeChildFiber(
        that,
        parentFiber,
        parentRuntimeFlags
      )
      leftFiber.startFork(self)
      rightFiber.startFork(that)
      leftFiber.setFiberRef(core.forkScopeOverride, Option.some(parentFiber.scope()))
      rightFiber.setFiberRef(core.forkScopeOverride, Option.some(parentFiber.scope()))
      return pipe(
        core.async<R | R1 | R2 | R3, E2 | E3, A2 | A3>((cb) => {
          leftFiber.unsafeAddObserver(() => completeRace(leftFiber, rightFiber, selfWins, raceIndicator, cb))
          rightFiber.unsafeAddObserver(() => completeRace(rightFiber, leftFiber, thatWins, raceIndicator, cb))
        }, pipe(leftFiber.id(), FiberId.combine(rightFiber.id()))),
        core.onInterrupt(() =>
          pipe(
            leftFiber.interruptWithFork(parentFiber.id()),
            core.zipRight(rightFiber.interruptWithFork(parentFiber.id())),
            core.zipRight(leftFiber.await()),
            core.zipRight(rightFiber.await())
          )
        )
      )
    }).traced(trace)
  }
}

/** @internal */
const completeRace = <R, R1, R2, E2, A2, R3, E3, A3>(
  winner: Fiber.RuntimeFiber<any, any>,
  loser: Fiber.RuntimeFiber<any, any>,
  cont: (winner: Fiber.RuntimeFiber<any, any>, loser: Fiber.RuntimeFiber<any, any>) => Effect.Effect<any, any, any>,
  ab: MutableRef.MutableRef<boolean>,
  cb: (_: Effect.Effect<R | R1 | R2 | R3, E2 | E3, A2 | A3>) => void
): void => {
  if (pipe(ab, MutableRef.compareAndSet(true, false))) {
    cb(cont(winner, loser))
  }
}

/** @internal */
export const raceWith = <E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  that: Effect.Effect<R1, E1, A1>,
  leftDone: (exit: Exit.Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect.Effect<R2, E2, A2>,
  rightDone: (exit: Exit.Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect.Effect<R3, E3, A3>
) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1 | R2 | R3, E2 | E3, A2 | A3> => {
    return pipe(
      self,
      raceFibersWith(
        that,
        (winner, loser) =>
          pipe(
            winner.await(),
            core.flatMap((exit) => {
              switch (exit.op) {
                case OpCodes.OP_SUCCESS: {
                  return pipe(winner.inheritAll(), core.flatMap(() => leftDone(exit, loser)))
                }
                case OpCodes.OP_FAILURE: {
                  return leftDone(exit, loser)
                }
              }
            })
          ),
        (winner, loser) =>
          pipe(
            winner.await(),
            core.flatMap((exit) => {
              switch (exit.op) {
                case OpCodes.OP_SUCCESS: {
                  return pipe(winner.inheritAll(), core.flatMap(() => rightDone(exit, loser)))
                }
                case OpCodes.OP_FAILURE: {
                  return rightDone(exit, loser)
                }
              }
            })
          )
      )
    ).traced(trace)
  }
}

/** @internal */
export const scheduleForked = <R2, Out>(schedule: Schedule.Schedule<R2, unknown, Out>) => {
  const trace = getCallTrace()
  return <R, E, A>(
    self: Effect.Effect<R, E, A>
  ): Effect.Effect<R | R2 | Scope.Scope, never, Fiber.RuntimeFiber<E, Out>> => {
    return pipe(self, _schedule.schedule_Effect(schedule), forkScoped).traced(trace)
  }
}

/** @internal */
export const supervised = <X>(supervisor: Supervisor.Supervisor<X>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    const supervise = pipe(fiberRuntime.currentSupervisor, core.fiberRefLocallyWith((s) => s.zip(supervisor)))
    return supervise(self).traced(trace)
  }
}

/** @internal */
export const timeout = (duration: Duration.Duration) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, Option.Option<A>> => {
    return pipe(self, timeoutTo(Option.none, Option.some, duration)).traced(trace)
  }
}

/** @internal */
export const timeoutFail = <E1>(evaluate: () => E1, duration: Duration.Duration) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E | E1, A> => {
    return pipe(
      self,
      timeoutTo(core.failSync(evaluate), core.succeed, duration),
      core.flatten
    ).traced(trace)
  }
}

/** @internal */
export const timeoutFailCause = <E1>(evaluate: () => Cause.Cause<E1>, duration: Duration.Duration) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E | E1, A> => {
    return pipe(self, timeoutTo(core.failCauseSync(evaluate), core.succeed, duration), core.flatten)
  }
}

/** @internal */
export const timeoutTo = <A, B, B1>(def: B1, f: (a: A) => B, duration: Duration.Duration) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, B | B1> => {
    return pipe(
      self,
      core.map(f),
      raceFirst(
        pipe(
          effect.sleep(duration),
          core.as(def),
          core.interruptible
        )
      )
    ).traced(trace)
  }
}

/** @internal */
export const validatePar = <R1, E1, B>(that: Effect.Effect<R1, E1, B>) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E | E1, readonly [A, B]> => {
    return pipe(self, validateWithPar(that, (a, b) => [a, b] as const))
  }
}

/** @internal */
export const validateWithPar = <A, R1, E1, B, C>(that: Effect.Effect<R1, E1, B>, f: (a: A, b: B) => C) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E | E1, C> => {
    return pipe(
      core.exit(self),
      zipWithPar(
        core.exit(that),
        (ea, eb) => pipe(ea, core.exitZipWith(eb, f, (ca, cb) => Cause.parallel(ca, cb)))
      ),
      core.flatten
    ).traced(trace)
  }
}

/** @internal */
export const zipPar = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, readonly [A, A2]> => {
    return pipe(self, zipWithPar(that, (a, b) => [a, b] as const)).traced(trace)
  }
}

/** @internal */
export const zipParLeft = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A> => {
    return pipe(self, zipWithPar(that, (a, _) => a)).traced(trace)
  }
}

/** @internal */
export const zipParRight = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A2> => {
    return pipe(self, zipWithPar(that, (_, b) => b)).traced(trace)
  }
}

/** @internal */
export const zipWithPar = <R2, E2, A2, A, B>(
  that: Effect.Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B
) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, B> => {
    return core.uninterruptibleMask((restore) =>
      core.transplant((graft) => {
        const deferred = core.deferredUnsafeMake<void, void>(FiberId.none)
        const ref = MutableRef.make(false)
        return pipe(
          forkZipWithPar(self, graft, restore, deferred, ref),
          core.zip(forkZipWithPar(that, graft, restore, deferred, ref)),
          core.flatMap(([left, right]) =>
            pipe(
              restore(core.deferredAwait(deferred)),
              core.foldCauseEffect(
                (cause) =>
                  pipe(
                    fiberRuntime.fiberInterruptFork(left),
                    core.zipRight(fiberRuntime.fiberInterruptFork(right)),
                    core.zipRight(
                      pipe(
                        internalFiber._await(left),
                        core.zip(internalFiber._await(right)),
                        core.flatMap(([left, right]) =>
                          pipe(
                            left,
                            core.exitZipWith(right, f, Cause.parallel),
                            core.exitMatch(
                              (causes) => core.failCause(Cause.parallel(Cause.stripFailures(cause), causes)),
                              () => core.failCause(Cause.stripFailures(cause))
                            )
                          )
                        )
                      )
                    )
                  ),
                () =>
                  pipe(
                    internalFiber.join(left),
                    core.zipWith(internalFiber.join(right), f)
                  )
              )
            )
          )
        )
      })
    ).traced(trace)
  }
}

/** @internal */
const forkZipWithPar = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  graft: <RX, EX, AX>(effect: Effect.Effect<RX, EX, AX>) => Effect.Effect<RX, EX, AX>,
  restore: <RX, EX, AX>(effect: Effect.Effect<RX, EX, AX>) => Effect.Effect<RX, EX, AX>,
  deferred: Deferred.Deferred<void, void>,
  ref: MutableRef.MutableRef<boolean>
): Effect.Effect<R, never, Fiber.Fiber<E, A>> => {
  return pipe(
    graft(restore(self)),
    core.foldCauseEffect(
      (cause) =>
        pipe(
          deferred,
          core.deferredFail<void>(void 0),
          core.zipRight(core.failCause(cause))
        ),
      (value) => {
        const flag = MutableRef.get(ref)
        if (flag) {
          pipe(deferred, core.deferredUnsafeDone<void, void>(core.unit()))
          return core.succeed(value)
        }
        pipe(ref, MutableRef.set(true))
        return core.succeed(value)
      }
    ),
    fiberRuntime.forkDaemon
  )
}

// circular with Synchronized

/** @internal */
const SynchronizedSymbolKey = "@effect/io/Ref/Synchronized"

/** @internal */
export const SynchronizedTypeId: Synchronized.SynchronizedTypeId = Symbol.for(
  SynchronizedSymbolKey
) as Synchronized.SynchronizedTypeId

/** @internal */
const synchronizedVariance = {
  _A: (_: never) => _
}

/** @internal */
export const makeSynchronized = <A>(value: A): Effect.Effect<never, never, Synchronized.Synchronized<A>> => {
  const trace = getCallTrace()
  return core.sync(() => unsafeMakeSynchronized(value)).traced(trace)
}

/** @internal */
export const unsafeMakeSynchronized = <A>(value: A): Synchronized.Synchronized<A> => {
  const ref = internalRef.unsafeMake(value)
  const withLock = unsafeMakeLock()
  return {
    [SynchronizedTypeId]: synchronizedVariance,
    [internalRef.RefTypeId]: internalRef.refVariance,
    modify: <B>(f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B> => {
      const trace = getCallTrace()
      return ref.modify(f).traced(trace)
    },
    modifyEffect: <R, E, B>(
      f: (a: A) => Effect.Effect<R, E, readonly [B, A]>
    ): Effect.Effect<R, E, B> => {
      const trace = getCallTrace()
      return pipe(
        internalRef.get(ref),
        core.flatMap(f),
        core.flatMap(([b, a]) => pipe(ref, internalRef.set(a), core.as(b))),
        withLock
      ).traced(trace)
    }
  }
}

/** @internal */
export const updateSomeAndGetEffectSynchronized = <A, R, E>(pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>) => {
  const trace = getCallTrace()
  return (self: Synchronized.Synchronized<A>): Effect.Effect<R, E, A> => {
    return self.modifyEffect((value) => {
      const result = pf(value)
      switch (result._tag) {
        case "None": {
          return core.succeed([value, value] as const)
        }
        case "Some": {
          return pipe(result.value, core.map((a) => [a, a] as const))
        }
      }
    }).traced(trace)
  }
}

// circular with Fiber

/** @internal */
export const zipFiber = <E2, A2>(that: Fiber.Fiber<E2, A2>) => {
  return <E, A>(self: Fiber.Fiber<E, A>): Fiber.Fiber<E | E2, readonly [A, A2]> => {
    return pipe(self, zipWithFiber(that, (a, b) => [a, b] as const))
  }
}

/** @internal */
export const zipLeftFiber = <E2, A2>(that: Fiber.Fiber<E2, A2>) => {
  return <E, A>(self: Fiber.Fiber<E, A>): Fiber.Fiber<E | E2, A> => {
    return pipe(self, zipWithFiber(that, (a, _) => a))
  }
}

/** @internal */
export const zipRightFiber = <E2, A2>(that: Fiber.Fiber<E2, A2>) => {
  return <E, A>(self: Fiber.Fiber<E, A>): Fiber.Fiber<E | E2, A2> => {
    return pipe(self, zipWithFiber(that, (_, b) => b))
  }
}

/** @internal */
export const zipWithFiber = <E2, A, B, C>(that: Fiber.Fiber<E2, B>, f: (a: A, b: B) => C) => {
  return <E>(self: Fiber.Fiber<E, A>): Fiber.Fiber<E | E2, C> => ({
    [internalFiber.FiberTypeId]: internalFiber.fiberVariance,
    id: () => pipe(self.id(), FiberId.getOrElse(that.id())),
    await: () => {
      const trace = getCallTrace()
      return pipe(
        self.await(),
        core.flatten,
        zipWithPar(core.flatten(that.await()), f),
        core.exit
      ).traced(trace)
    },
    children: () => {
      const trace = getCallTrace()
      return self.children().traced(trace)
    },
    inheritAll: () => {
      const trace = getCallTrace()
      return pipe(that.inheritAll(), core.zipRight(self.inheritAll())).traced(trace)
    },
    poll: () => {
      const trace = getCallTrace()
      return pipe(
        self.poll(),
        core.zipWith(
          that.poll(),
          (optionA, optionB) =>
            pipe(
              optionA,
              Option.flatMap((exitA) =>
                pipe(
                  optionB,
                  Option.map((exitB) => pipe(exitA, Exit.zipWith(exitB, f, Cause.parallel)))
                )
              )
            )
        )
      ).traced(trace)
    },
    interruptWithFork: (id) => {
      const trace = getCallTrace()
      return pipe(self.interruptWithFork(id), core.zipRight(that.interruptWithFork(id))).traced(trace)
    }
  })
}
