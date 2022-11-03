import * as Cause from "@effect/io/Cause"
import { getCallTrace } from "@effect/io/Debug"
import type * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as internalFiber from "@effect/io/internal/fiber"
import * as OpCodes from "@effect/io/internal/opCodes/effect"
import * as internalRef from "@effect/io/internal/ref"
import * as STM from "@effect/io/internal/stm"
import * as internalTRef from "@effect/io/internal/stm/ref"
import type * as Synchronized from "@effect/io/Ref/Synchronized"
import type * as Scope from "@effect/io/Scope"
import type * as Semaphore from "@effect/io/Semaphore"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as MutableHashMap from "@fp-ts/data/mutable/MutableHashMap"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"

/** @internal */
export const acquireReleaseInterruptible = <R, E, A, R2, X>(
  acquire: Effect.Effect<R, E, A>,
  release: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
): Effect.Effect<R | R2 | Scope.Scope, E, A> => {
  const trace = getCallTrace()
  return pipe(acquire, ensuring(core.addFinalizer(release))).traced(trace)
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
    core.makeDeferred<E, A>(),
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
          restore(core.awaitDeferred(option.value[1]))
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
    pipe(
      core.fiberId(),
      core.flatMap((fiberId) =>
        pipe(
          restore(self),
          core.forkDaemon,
          core.flatMap((fiber) =>
            pipe(
              internalFiber.join(fiber),
              core.interruptible,
              core.onInterrupt(() => fiber.interruptWithFork(fiberId))
            )
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
export const forkAll = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, never, Fiber.Fiber<E, Chunk.Chunk<A>>> => {
  const trace = getCallTrace()
  return pipe(effects, core.forEach(core.fork), core.map(internalFiber.collectAll)).traced(trace)
}

/** @internal */
export const forkIn = (scope: Scope.Scope) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> => {
    return core.uninterruptibleMask((restore) =>
      pipe(
        restore(self),
        core.forkDaemon,
        core.tap((fiber) => scope.addFinalizer(() => internalFiber.interrupt(fiber)))
      )
    ).traced(trace)
  }
}

/** @internal */
export const forkScoped = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, never, Fiber.RuntimeFiber<E, A>> => {
  const trace = getCallTrace()
  return core.uninterruptibleMask((restore) =>
    core.scopeWith((scope) =>
      pipe(
        scope.fork(ExecutionStrategy.sequential),
        core.flatMap((child) =>
          pipe(
            restore(self),
            core.onExit((e) => child.close(e)),
            core.forkDaemon,
            core.tap((fiber) =>
              child.addFinalizer(() =>
                core.fiberIdWith((fiberId) =>
                  Equal.equals(fiberId, fiber.id) ?
                    core.unit() :
                    internalFiber.interrupt(fiber)
                )
              )
            )
          )
        )
      )
    )
  ).traced(trace)
}

/** @internal */
export const memoizeFunction = <R, E, A, B>(
  f: (a: A) => Effect.Effect<R, E, B>
): Effect.Effect<never, never, (a: A) => Effect.Effect<R, E, B>> => {
  const trace = getCallTrace()
  return pipe(
    core.sync(() => MutableHashMap.empty<A, Deferred.Deferred<E, B>>()),
    core.flatMap(makeSynchronized),
    core.map((ref) =>
      (a: A) =>
        pipe(
          ref.modifyEffect((map) => {
            const result = pipe(map, MutableHashMap.get(a))
            if (Option.isNone(result)) {
              return pipe(
                core.makeDeferred<E, B>(),
                core.tap((deferred) => pipe(f(a), core.intoDeferred(deferred), core.fork)),
                core.map((deferred) => [deferred, pipe(map, MutableHashMap.set(a, deferred))] as const)
              )
            }
            return core.succeed([result.value, map] as const)
          }),
          core.flatMap(core.awaitDeferred)
        )
    )
  ).traced(trace)
}

/** @internal */
export const race = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return pipe(disconnect(self), raceAwait(disconnect(that))).traced(trace)
  }
}

/** @internal */
export const raceAwait = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return core.withFiberRuntime<R | R2, E | E2, A | A2>((state) =>
      pipe(
        self,
        raceWith(
          that,
          (exit, right) =>
            pipe(
              exit,
              Exit.matchEffect(
                (cause1) =>
                  pipe(
                    internalFiber.join(right),
                    effect.mapErrorCause((cause2) => Cause.parallel(cause1, cause2))
                  ),
                (a) => pipe(right, internalFiber.interruptWith(state.id()), core.as(a))
              )
            ),
          (exit, left) =>
            pipe(
              exit,
              Exit.matchEffect(
                (cause2) =>
                  pipe(
                    internalFiber.join(left),
                    effect.mapErrorCause((cause1) => Cause.parallel(cause1, cause2))
                  ),
                (a) => pipe(left, internalFiber.interruptWith(state.id()), core.as(a))
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
  selfWins: (winner: Fiber.Fiber<E, A>, loser: Fiber.Fiber<E1, A1>) => Effect.Effect<R2, E2, A2>,
  thatWins: (winner: Fiber.Fiber<E1, A1>, loser: Fiber.Fiber<E, A>) => Effect.Effect<R3, E3, A3>
) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<
    R | R1 | R2 | R3,
    E2 | E3,
    A2 | A3
  > => {
    return core.withFiberRuntime<R | R1 | R2 | R3, E2 | E3, A2 | A3>((parentState, parentStatus) => {
      const parentRuntimeFlags = parentStatus.runtimeFlags
      const raceIndicator = MutableRef.make(true)
      const leftFiber = core.unsafeForkUnstarted(self, parentState, parentRuntimeFlags)
      const rightFiber = core.unsafeForkUnstarted(that, parentState, parentRuntimeFlags)
      leftFiber.setFiberRef(core.forkScopeOverride, Option.some(parentState.scope))
      rightFiber.setFiberRef(core.forkScopeOverride, Option.some(parentState.scope))
      return core.async((cb) => {
        leftFiber.addObserver(() => completeRace(leftFiber, rightFiber, selfWins, raceIndicator, cb))
        rightFiber.addObserver(() => completeRace(rightFiber, leftFiber, thatWins, raceIndicator, cb))
        leftFiber.startFork(self)
        rightFiber.startFork(that)
      }, FiberId.combineAll(HashSet.from([leftFiber.id(), rightFiber.id()])))
    }).traced(trace)
  }
}

/** @internal */
const completeRace = <R, R1, R2, E2, A2, R3, E3, A3>(
  winner: Fiber.Fiber<any, any>,
  loser: Fiber.Fiber<any, any>,
  cont: (winner: Fiber.Fiber<any, any>, loser: Fiber.Fiber<any, any>) => Effect.Effect<any, any, any>,
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
    const g = (b: A2, a: A) => f(a, b)
    return core.uninterruptibleMask((restore) =>
      effect.transplant((graft) =>
        core.fiberIdWith((fiberId) =>
          pipe(
            graft(restore(self)),
            raceFibersWith(
              graft(restore(that)),
              (w, l) => coordinateZipWithPar(fiberId, f, true, w, l),
              (w, l) => coordinateZipWithPar(fiberId, g, false, w, l)
            )
          )
        )
      )
    ).traced(trace)
  }
}

/** @internal */
const coordinateZipWithPar = <E, E1, B, X, Y>(
  fiberId: FiberId.FiberId,
  f: (a: X, b: Y) => B,
  leftWinner: boolean,
  winner: Fiber.Fiber<E, X>,
  loser: Fiber.Fiber<E1, Y>
): Effect.Effect<never, E | E1, B> => {
  return pipe(
    winner.await(),
    core.flatMap(Exit.match(
      (winnerCause) =>
        pipe(
          loser,
          internalFiber.interruptWith(fiberId),
          core.flatMap(Exit.match(
            (loserCause) =>
              leftWinner ?
                core.failCause(Cause.parallel(winnerCause, loserCause)) :
                core.failCause(Cause.parallel(loserCause, winnerCause)),
            () => core.failCause(winnerCause)
          ))
        ),
      (a) =>
        pipe(
          loser.await(),
          core.flatMap(Exit.match<E | E1, Y, Effect.Effect<never, E | E1, B>>(
            core.failCause,
            (b) =>
              pipe(
                winner.inheritAll(),
                core.zipRight(loser.inheritAll()),
                core.zipRight(core.sync(() => f(a, b)))
              )
          ))
        )
    ))
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
  const semaphore = unsafeMakeSemaphore(1)
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
        withPermits(1)(semaphore)
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

// circular with Semaphore

/** @internal */
const SemaphoreSymbolKey = "@effect/io/Ref/Semaphore"

/** @internal */
export const SemaphoreTypeId: Semaphore.SemaphoreTypeId = Symbol.for(
  SemaphoreSymbolKey
) as Semaphore.SemaphoreTypeId

/** @internal */
export class SemaphoreImpl implements Semaphore.Semaphore {
  readonly [SemaphoreTypeId]: Semaphore.SemaphoreTypeId = SemaphoreTypeId
  constructor(readonly permits: internalTRef.Ref<number>) {}
}

/** @internal */
export const unsafeMakeSemaphore = (permits: number): Semaphore.Semaphore => {
  return new SemaphoreImpl(new internalTRef.RefImpl(permits))
}

/** @internal */
export const acquireN = (n: number) => {
  return (self: Semaphore.Semaphore): STM.STM<never, never, void> => {
    return STM.effect((journal) => {
      if (n < 0) {
        throw new Cause.IllegalArgumentException(`Unexpected negative value ${n} passed to Semaphore.acquireN`)
      }
      const value = pipe(self.permits, internalTRef.unsafeGet(journal))
      if (value < n) {
        throw new STM.STMRetryException()
      } else {
        return pipe(self.permits, internalTRef.unsafeSet(value - n, journal))
      }
    })
  }
}

/** @internal */
export const releaseN = (n: number) => {
  return (self: Semaphore.Semaphore): STM.STM<never, never, void> => {
    return STM.effect((journal) => {
      if (n < 0) {
        throw new Cause.IllegalArgumentException(`Unexpected negative value ${n} passed to Semaphore.releaseN`)
      }
      const current = pipe(self.permits, internalTRef.unsafeGet(journal))
      return pipe(self.permits, internalTRef.unsafeSet(current + n, journal))
    })
  }
}

/** @internal */
export const withPermits = (permits: number) => {
  return (semaphore: Semaphore.Semaphore) => {
    return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
      return core.uninterruptibleMask((restore) =>
        pipe(
          restore(STM.commit(acquireN(permits)(semaphore))),
          core.zipRight(
            pipe(
              restore(self),
              ensuring(STM.commit(releaseN(permits)(semaphore)))
            )
          )
        )
      )
    }
  }
}

/** @internal */
export const withPermitsScoped = (permits: number) => {
  return (self: Semaphore.Semaphore): Effect.Effect<Scope.Scope, never, void> =>
    acquireReleaseInterruptible(
      pipe(self, acquireN(permits), STM.commit),
      () => pipe(self, releaseN(permits), STM.commit)
    )
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
