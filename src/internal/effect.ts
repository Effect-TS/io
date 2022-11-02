import * as Cause from "@effect/io/Cause"
import * as Clock from "@effect/io/Clock"
import { getCallTrace } from "@effect/io/Debug"
import type * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import { RuntimeException } from "@effect/io/internal/cause"
import * as internalClock from "@effect/io/internal/clock"
import * as core from "@effect/io/internal/core"
import * as OpCodes from "@effect/io/internal/opCodes/effect"
import type { MergeRecord } from "@effect/io/internal/types"
import * as LogLevel from "@effect/io/Logger/Level"
import * as LogSpan from "@effect/io/Logger/Span"
import * as Ref from "@effect/io/Ref"
import * as Synchronized from "@effect/io/Ref/Synchronized"
import * as Scope from "@effect/io/Scope"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import type * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import { constVoid, identity, pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"
import type { Refinement } from "@fp-ts/data/Refinement"

/** @internal */
const EffectErrorSymbolKey = "@effect/io/Effect/Error"

/** @internal */
export const EffectErrorTypeId = Symbol.for(EffectErrorSymbolKey)

/** @internal */
export type EffectErrorTypeId = typeof EffectErrorTypeId

/** @internal */
export interface EffectError<E> {
  readonly [EffectErrorTypeId]: EffectErrorTypeId
  readonly _tag: "EffectError"
  readonly cause: Cause.Cause<E>
}

/** @internal */
export const isEffectError = (u: unknown): u is EffectError<unknown> => {
  return typeof u === "object" && u != null && EffectErrorTypeId in u
}

/** @internal */
export const makeEffectError = <E>(cause: Cause.Cause<E>): EffectError<E> => ({
  [EffectErrorTypeId]: EffectErrorTypeId,
  _tag: "EffectError",
  cause
})

/** @internal */
export const absolve = <R, E, A>(self: Effect.Effect<R, E, Either.Either<E, A>>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return pipe(self, core.flatMap(fromEither)).traced(trace)
}

/** @internal */
export const absorb = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, unknown, A> => {
  const trace = getCallTrace()
  return pipe(self, absorbWith(identity)).traced(trace)
}

/** @internal */
export const absorbWith = <E>(f: (e: E) => unknown) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, unknown, A> => {
    return pipe(
      sandbox(self),
      foldEffect((cause) => core.fail(pipe(cause, Cause.squashWith(f))), core.succeed)
    ).traced(trace)
  }
}

/** @internal */
export const allowInterrupt = (): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return descriptorWith(
    (descriptor) =>
      HashSet.size(descriptor.interruptors) > 0 ?
        core.interrupt() :
        core.unit()
  ).traced(trace)
}

/** @internal */
export const asLeft = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, Either.Either<A, never>> => {
  const trace = getCallTrace()
  return pipe(self, core.map(Either.left)).traced(trace)
}

/** @internal */
export const asLeftError = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Either.Either<E, never>, A> => {
  const trace = getCallTrace()
  return pipe(self, mapError(Either.left)).traced(trace)
}

/** @internal */
export const asRight = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, Either.Either<never, A>> => {
  const trace = getCallTrace()
  return pipe(self, core.map(Either.right)).traced(trace)
}

/** @internal */
export const asRightError = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Either.Either<never, E>, A> => {
  const trace = getCallTrace()
  return pipe(self, mapError(Either.right)).traced(trace)
}

/** @internal */
export const asSome = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, Option.Option<A>> => {
  const trace = getCallTrace()
  return pipe(self, core.map(Option.some)).traced(trace)
}

/** @internal */
export const asSomeError = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Option.Option<E>, A> => {
  const trace = getCallTrace()
  return pipe(self, mapError(Option.some)).traced(trace)
}

// TODO(Max): after runtime
/** @internal */
// export const asyncEffect = <R, E, A, R2, E2, X>(
//   register: (callback: (_: Effect.Effect<R, E, A>) => void) => Effect.Effect<R2, E2, X>
// ): Effect.Effect<R | R2, E | E2, A> => {
//   const trace = getCallTrace()
//   return pipe(
//     core.makeDeferred<E | E2, A>(),
//     core.flatMap((deferred) =>
//       pipe(
//         runtime<R | R2>(),
//         core.flatMap((runtime) =>
//           core.uninterruptibleMask((restore) =>
//             pipe(
//               restore(
//                 pipe(
//                   register((cb) => runtime.unsafeRunAsync(pipe(cb, core.intoDeferred(deferred)))),
//                   core.catchAllCause((cause) => pipe(deferred, core.failCauseDeferred(cause as Cause.Cause<E | E2>)))
//                 )
//               ),
//               fork,
//               core.zipRight(core.awaitDeferred(deferred))
//             )
//           )
//         )
//       )
//     )
//   ).traced(trace)
// }

/** @internal */
export const asyncOption = <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => Option.Option<Effect.Effect<R, E, A>>,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.asyncInterrupt<R, E, A>(
    (cb) => {
      const option = register(cb)
      switch (option._tag) {
        case "None": {
          return Either.left(core.unit())
        }
        case "Some": {
          return Either.right(option.value)
        }
      }
    },
    blockingOn
  ).traced(trace)
}

/** @internal */
export const attempt = <A>(evaluate: () => A): Effect.Effect<never, unknown, A> => {
  const trace = getCallTrace()
  return core.sync(() => {
    try {
      return evaluate()
    } catch (error) {
      throw makeEffectError(Cause.fail(error))
    }
  }).traced(trace)
}

// TODO(Max): implement after Fiber
/** @internal */
export declare const awaitAllChildren: <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>

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
          Synchronized.make<Option.Option<readonly [number, Deferred.Deferred<E, A>]>>(Option.none),
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
      clockWith((clock) => clock.currentTimeMillis),
      core.flatMap((time) =>
        pipe(
          cache,
          Synchronized.updateSomeAndGetEffect((option) => {
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
          dieMessage(
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
  return pipe(cache, Synchronized.set(Option.none as Option.Option<readonly [number, Deferred.Deferred<E, A>]>))
}

/** @internal */
export const _catch = <N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => Effect.Effect<R1, E1, A1>
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, Exclude<E, { [n in N]: K }> | E1, A | A1> => {
    return pipe(
      self,
      catchAll((e) => {
        if (typeof e === "object" && e != null && tag in e && e[tag] === k) {
          return f(e as any)
        }
        return core.fail(e as any)
      })
    ).traced(trace)
  }
}

/** @internal */
export const catchAll = <E, R2, E2, A2>(f: (e: E) => Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R2 | R, E2, A2 | A> => {
    return pipe(self, foldEffect(f, core.succeed)).traced(trace)
  }
}

/** @internal */
export function catchAllDefect<R2, E2, A2>(f: (defect: unknown) => Effect.Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return pipe(self, catchSomeDefect((defect) => Option.some(f(defect))))
  }
}

/** @internal */
export const catchSome = <E, R2, E2, A2>(pf: (e: E) => Option.Option<Effect.Effect<R2, E2, A2>>) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return pipe(
      self,
      core.foldCauseEffect(
        (cause): Effect.Effect<R2, E | E2, A2> => {
          const either = Cause.failureOrCause(cause)
          switch (either._tag) {
            case "Left": {
              return pipe(pf(either.left), Option.getOrElse(core.failCause(cause)))
            }
            case "Right": {
              return core.failCause(either.right)
            }
          }
        },
        core.succeed
      )
    ).traced(trace)
  }
}

/** @internal */
export const catchSomeCause = <E, R2, E2, A2>(
  f: (cause: Cause.Cause<E>) => Option.Option<Effect.Effect<R2, E2, A2>>
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return pipe(
      self,
      core.foldCauseEffect(
        (cause): Effect.Effect<R2, E | E2, A2> => {
          const option = f(cause)
          switch (option._tag) {
            case "None": {
              return core.failCause(cause)
            }
            case "Some": {
              return option.value
            }
          }
        },
        core.succeed
      )
    ).traced(trace)
  }
}

/** @internal */
export const catchSomeDefect = <R2, E2, A2>(
  pf: (_: unknown) => Option.Option<Effect.Effect<R2, E2, A2>>
) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return pipe(self, unrefineWith(pf, core.fail), catchAll((s): Effect.Effect<R2, E | E2, A2> => s))
  }
}

/** @internal */
export const catchTag = <K extends E["_tag"] & string, E extends { _tag: string }, R1, E1, A1>(
  k: K,
  f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, Exclude<E, { _tag: K }> | E1, A | A1> => {
    return pipe(
      self,
      catchAll((e) => {
        if ("_tag" in e && e["_tag"] === k) {
          return f(e as any)
        }
        return core.fail(e as any)
      })
    ).traced(trace)
  }
}

/** @internal */
export const cause = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Cause.Cause<E>> => {
  const trace = getCallTrace()
  return pipe(self, core.foldCause(identity, () => Cause.empty)).traced(trace)
}

/** @internal */
export const clock = (): Effect.Effect<never, never, Clock.Clock> => clockWith(core.succeed)

/** @internal */
export const clockWith = Clock.clockWith

/** @internal */
export const collect = <A, R, E, B>(f: (a: A) => Effect.Effect<R, Option.Option<E>, B>) => {
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    const trace = getCallTrace()
    return pipe(elements, core.forEach((a) => unsome(f(a))), core.map(Chunk.compact)).traced(trace)
  }
}

/** @internal */
export const collectAll = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, E, Chunk.Chunk<A>> => {
  const trace = getCallTrace()
  return pipe(effects, core.forEach(identity)).traced(trace)
}

/** @internal */
export const collectAllDiscard = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  return pipe(effects, core.forEachDiscard(identity)).traced(trace)
}

/** @internal */
export const collectPar = <A, R, E, B>(f: (a: A) => Effect.Effect<R, Option.Option<E>, B>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return pipe(elements, core.forEachPar((a) => unsome(f(a))), core.map(Chunk.compact)).traced(trace)
  }
}

/** @internal */
export const collectAllPar = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, E, Chunk.Chunk<A>> => {
  const trace = getCallTrace()
  return pipe(effects, core.forEachPar(identity)).traced(trace)
}

/** @internal */
export const collectAllParDiscard = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  return pipe(effects, core.forEachParDiscard(identity)).traced(trace)
}

/** @internal */
export const collectAllWith = <A, B>(pf: (a: A) => Option.Option<B>) => {
  const trace = getCallTrace()
  return <R, E>(elements: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return pipe(collectAll(elements), core.map(Chunk.filterMap(pf))).traced(trace)
  }
}

/** @internal */
export const collectAllWithPar = <A, B>(pf: (a: A) => Option.Option<B>) => {
  const trace = getCallTrace()
  return <R, E>(elements: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return pipe(collectAllPar(elements), core.map(Chunk.filterMap(pf))).traced(trace)
  }
}

/** @internal */
export const collectAllWithEffect = <A, R, E, B>(f: (a: A) => Option.Option<Effect.Effect<R, E, B>>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    const array = Array.from(elements)
    // Break out early if there are no elements
    if (array.length === 0) {
      return core.succeed(Chunk.empty).traced(trace)
    }
    // Break out early if there is only one element
    if (array.length === 1) {
      const option = f(array[0]!)
      switch (option._tag) {
        case "None": {
          return core.succeed(Chunk.empty).traced(trace)
        }
        case "Some": {
          return pipe(option.value, core.map(Chunk.single)).traced(trace)
        }
      }
    }
    // Otherwise create the intermediate result structure
    let result: Effect.Effect<R, E, List.List<B>> = core.succeed(List.empty<B>())
    for (let i = array.length - 1; i >= 0; i--) {
      const option = f(array[i]!)
      if (option._tag === "Some") {
        result = pipe(result, core.zipWith(option.value, (list, b) => pipe(list, List.prepend(b))))
      }
    }
    return pipe(result, core.map(Chunk.fromIterable)).traced(trace)
  }
}

/** @internal */
export const collectAllSuccesses = <R, E, A>(
  as: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, never, Chunk.Chunk<A>> => {
  const trace = getCallTrace()
  return pipe(
    Array.from(as).map(core.exit),
    collectAllWith((exit) => (Exit.isSuccess(exit) ? Option.some(exit.value) : Option.none))
  ).traced(trace)
}

/** @internal */
export const collectAllSuccessesPar = <R, E, A>(
  elements: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, never, Chunk.Chunk<A>> => {
  const trace = getCallTrace()
  return pipe(
    Array.from(elements).map(core.exit),
    collectAllWithPar((exit) => (Exit.isSuccess(exit) ? Option.some(exit.value) : Option.none))
  ).traced(trace)
}

/** @internal */
export const collectFirst = <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, Option.Option<B>>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Option.Option<B>> => {
    return core.suspendSucceed(() => collectFirstLoop(elements[Symbol.iterator](), f)).traced(trace)
  }
}

/** @internal */
const collectFirstLoop = <R, E, A, B>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Effect.Effect<R, E, Option.Option<B>>
): Effect.Effect<R, E, Option.Option<B>> => {
  const next = iterator.next()
  return next.done
    ? core.succeed(Option.none)
    : pipe(
      f(next.value),
      core.flatMap((option) => {
        switch (option._tag) {
          case "None": {
            return collectFirstLoop(iterator, f)
          }
          case "Some": {
            return core.succeed(option)
          }
        }
      })
    )
}

/** @internal */
export const collectWhile = <A, R, E, B>(f: (a: A) => Option.Option<Effect.Effect<R, E, B>>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    const array = Array.from(elements)
    // Break out early if the input is empty
    if (array.length === 0) {
      return core.succeed(Chunk.empty).traced(trace)
    }
    // Break out early if there is only one element in the list
    if (array.length === 1) {
      const option = f(array[0]!)
      switch (option._tag) {
        case "None": {
          return core.succeed(Chunk.empty).traced(trace)
        }
        case "Some": {
          return pipe(option.value, core.map(Chunk.single)).traced(trace)
        }
      }
    }
    // Otherwise setup our intermediate result
    let result: Effect.Effect<R, E, List.List<B>> = core.succeed(List.empty())
    for (let i = array.length - 1; i >= 0; i--) {
      const option = f(array[i]!)
      switch (option._tag) {
        case "None": {
          return pipe(result, core.map(Chunk.fromIterable)).traced(trace)
        }
        case "Some": {
          result = pipe(result, core.zipWith(option.value, (bs, b) => pipe(bs, List.prepend(b))))
        }
      }
    }
    return pipe(result, core.map(Chunk.fromIterable)).traced(trace)
  }
}

/** @internal */
export const cond = <E, A>(predicate: () => boolean, result: () => A, error: () => E): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => predicate() ? core.sync(result) : core.failSync(error)).traced(trace)
}

/** @internal */
export const continueOrFail = <E1, A, A2>(error: E1, pf: (a: A) => Option.Option<A2>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E | E1, A2> => {
    return pipe(self, continueOrFailEffect(error, (a) => pipe(pf(a), Option.map(core.succeed)))).traced(trace)
  }
}

/** @internal */
export const continueOrFailEffect = <E1, A, R2, E2, A2>(
  error: E1,
  pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E1 | E2, A2> => {
    return pipe(
      self,
      core.flatMap((value): Effect.Effect<R2, E1 | E2, A2> => pipe(pf(value), Option.getOrElse(core.fail(error))))
    ).traced(trace)
  }
}

/** @internal */
export const descriptor = (): Effect.Effect<never, never, Fiber.Fiber.Descriptor> => {
  const trace = getCallTrace()
  return descriptorWith(core.succeed).traced(trace)
}

/** @internal */
export const descriptorWith = <R, E, A>(
  f: (descriptor: Fiber.Fiber.Descriptor) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.withFiberRuntime((state, status) => {
    return f({
      id: state.id,
      status,
      interruptors: Cause.interruptors(state.getFiberRef(core.interruptedCause))
    })
  }).traced(trace) as Effect.Effect<R, E, A>
}

/** @internal */
export const dieMessage = (message: string): Effect.Effect<never, never, never> => {
  return core.failCauseSync(() => Cause.die(new RuntimeException(message)))
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
              Fiber.join(fiber),
              core.interruptible,
              core.onInterrupt(() => pipe(fiber, Fiber.interruptAsFork(fiberId)))
            )
          )
        )
      )
    )
  ).traced(trace)
}

/** @internal */
export const Do = (): Effect.Effect<never, never, {}> => {
  const trace = getCallTrace()
  return core.succeed({}).traced(trace)
}

export const bind = <N extends string, K, R2, E2, A>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect.Effect<R2, E2, A>
) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, K>): Effect.Effect<
    R | R2,
    E | E2,
    MergeRecord<
      K,
      {
        [k in N]: A
      }
    >
  > => {
    return pipe(
      self,
      core.flatMap((k) =>
        pipe(
          f(k),
          core.map(
            (
              a
            ): MergeRecord<
              K,
              {
                [k in N]: A
              }
            > => ({ ...k, [tag]: a } as any)
          )
        )
      )
    ).traced(trace)
  }
}

/** @internal */
export const bindValue = <N extends string, K, A>(tag: Exclude<N, keyof K>, f: (_: K) => A) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, K>): Effect.Effect<
    R,
    E,
    MergeRecord<
      K,
      {
        [k in N]: A
      }
    >
  > => {
    return pipe(
      self,
      core.map(
        (
          k
        ): MergeRecord<
          K,
          {
            [k in N]: A
          }
        > => ({ ...k, [tag]: f(k) } as any)
      )
    ).traced(trace)
  }
}

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @macro traced
 * @category constructors
 * @since 1.0.0
 */
export const dropWhile = <R, E, A>(
  elements: Iterable<A>,
  f: (a: A) => Effect.Effect<R, E, boolean>
): Effect.Effect<R, E, Chunk.Chunk<A>> => {
  return core.suspendSucceed(() => {
    const iterator = elements[Symbol.iterator]()
    const builder: Array<A> = []
    let next
    let dropping: Effect.Effect<R, E, boolean> = core.succeed(true)
    while ((next = iterator.next()) && !next.done) {
      const a = next.value
      dropping = pipe(
        dropping,
        core.flatMap((d) =>
          pipe(
            d ? f(a) : core.succeed(false),
            core.map((b) => {
              if (!b) {
                builder.push(a)
              }
              return b
            })
          )
        )
      )
    }
    return pipe(dropping, core.map(() => Chunk.unsafeFromArray(builder)))
  })
}

/** @internal */
export const either = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Either.Either<E, A>> => {
  const trace = getCallTrace()
  return pipe(
    self,
    foldEffect(
      (e) => core.succeed(Either.left(e)),
      (a) => core.succeed(Either.right(a))
    )
  ).traced(trace)
}

// TODO(Max): after implementing fiber
/** @internal */
export declare const ensuringChild: <R2, X>(
  f: (fiber: Fiber.Fiber<any, Chunk.Chunk<unknown>>) => Effect.Effect<R2, never, X>
) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E, A>

// TODO(Max): after implementing fiber
/** @internal */
export declare const ensuringChildren: <R1, X>(
  children: (fibers: Chunk.Chunk<Fiber.RuntimeFiber<any, any>>) => Effect.Effect<R1, never, X>
) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E, A>

/** @internal */
export const environmentWith = <R, A>(f: (context: Context.Context<R>) => A): Effect.Effect<R, never, A> => {
  const trace = getCallTrace()
  return pipe(core.environment<R>(), core.map(f)).traced(trace)
}

/** @internal */
export const exists = <R, E, A>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, boolean> => {
    return core.suspendSucceed(() => existsLoop(elements[Symbol.iterator](), f)).traced(trace)
  }
}

/** @internal */
const existsLoop = <R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect.Effect<R, E, boolean>
): Effect.Effect<R, E, boolean> => {
  const next = iterator.next()
  if (next.done) {
    return core.succeed(false)
  }
  return pipe(f(next.value), core.flatMap((b) => b ? core.succeed(b) : existsLoop(iterator, f)))
}

/** @internal */
const _existsParFound = Symbol("@effect/io/Effect/existsPar/found")

/** @internal */
export const existsPar = <R, E, A>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, boolean> => {
    return pipe(
      elements,
      core.forEachPar((a) => pipe(f(a), ifEffect(core.fail(_existsParFound), core.unit()))),
      foldEffect(
        (e) => e === _existsParFound ? core.succeed(true) : core.fail(e),
        () => core.succeed(false)
      )
    ).traced(trace)
  }
}

/** @internal */
export const eventually = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A> => {
  const trace = getCallTrace()
  return pipe(self, orElse(() => pipe(core.yieldNow(), core.flatMap(() => eventually(self))))).traced(trace)
}

/** @internal */
export const fiberIdWith = <R, E, A>(
  f: (descriptor: FiberId.Runtime) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<R, E, A>(
    (state) => f(state.id as FiberId.Runtime)
  ).traced(trace)
}

/** @internal */
export const filter = <A, R, E>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<A>> => {
    return core.suspendSucceed(() =>
      pipe(
        Array.from(elements).reduceRight(
          (effect, a) =>
            pipe(
              effect,
              core.zipWith(
                core.suspendSucceed(() => f(a)),
                (list, b) => b ? pipe(list, List.prepend(a)) : list
              )
            ),
          core.sync(() => List.empty<A>()) as Effect.Effect<R, E, List.List<A>>
        ),
        core.map(Chunk.fromIterable)
      )
    ).traced(trace)
  }
}

/** @internal */
export const filterPar = <A, R, E>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<A>> => {
    return pipe(
      elements,
      core.forEachPar((a) => pipe(f(a), core.map((b) => (b ? Option.some(a) : Option.none)))),
      core.map(Chunk.compact)
    ).traced(trace)
  }
}

/** @internal */
export const filterNot = <A, R, E>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<A>> => {
    return pipe(elements, filter((a) => pipe(f(a), core.map((b) => !b)))).traced(trace)
  }
}

/** @internal */
export const filterNotPar = <A, R, E>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<A>> => {
    return pipe(elements, filterPar((a) => pipe(f(a), core.map((b) => !b)))).traced(trace)
  }
}

/** @internal */
export const filterOrDie: {
  <A, B extends A>(
    f: Refinement<A, B>,
    defect: () => unknown
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>
  <A>(
    f: Predicate<A>,
    defect: () => unknown
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
} = <A>(f: Predicate<A>, defect: () => unknown) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(self, filterOrElse(f, () => core.dieSync(defect))).traced(trace)
  }
}

/** @internal */
export const filterOrDieMessage: {
  <A, B extends A>(
    f: Refinement<A, B>,
    message: string
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>
  <A>(
    f: Predicate<A>,
    message: string
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
} = <A>(f: Predicate<A>, message: string) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(self, filterOrElse(f, () => dieMessage(message))).traced(trace)
  }
}

/** @internal */
export const filterOrElse: {
  <A, B extends A, R2, E2, C>(
    f: Refinement<A, B>,
    orElse: () => Effect.Effect<R2, E2, C>
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, B | C>
  <A, R2, E2, B>(
    f: Predicate<A>,
    orElse: () => Effect.Effect<R2, E2, B>
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | B>
} = <A, R2, E2, B>(f: Predicate<A>, orElse: () => Effect.Effect<R2, E2, B>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | B> => {
    return pipe(self, filterOrElseWith(f, orElse)).traced(trace)
  }
}

/** @internal */
export const filterOrElseWith: {
  <A, B extends A, R2, E2, C>(
    f: Refinement<A, B>,
    orElse: (a: A) => Effect.Effect<R2, E2, C>
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, B | C>
  <A, R2, E2, B>(
    f: Predicate<A>,
    orElse: (a: A) => Effect.Effect<R2, E2, B>
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | B>
} = <A, R2, E2, B>(f: Predicate<A>, orElse: (a: A) => Effect.Effect<R2, E2, B>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | B> => {
    return pipe(self, core.flatMap((a) => f(a) ? core.succeed<A | B>(a) : orElse(a))).traced(trace)
  }
}

/** @internal */
export const filterOrFail: {
  <A, B extends A, E2>(
    f: Refinement<A, B>,
    error: () => E2
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E2, B>
  <A, E2>(
    f: Predicate<A>,
    error: () => E2
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E2, A>
} = <A, E2>(f: Predicate<A>, error: () => E2) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E | E2, A> => {
    return pipe(self, filterOrElse(f, () => core.failSync(error))).traced(trace)
  }
}

/** @internal */
export const find = <A, R, E>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Option.Option<A>> => {
    return core.suspendSucceed(() => {
      const array = Array.from(elements)
      const iterator = array[Symbol.iterator]()
      const next = iterator.next()
      if (!next.done) {
        return findLoop(iterator, f, next.value)
      }
      return core.succeed(Option.none)
    }).traced(trace)
  }
}

/** @internal */
export const firstSuccessOf = <R, E, A>(effects: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => {
    const list = List.fromIterable(effects)
    if (List.isNil(list)) {
      return core.dieSync(() => new Cause.IllegalArgumentException(`Received an empty collection of effects`))
    }
    return pipe(
      list.tail,
      List.reduce(list.head, (left, right) => pipe(left, orElse(() => right)))
    )
  }).traced(trace)
}

/** @internal */
const findLoop = <A, R, E>(
  iterator: Iterator<A>,
  f: (a: A) => Effect.Effect<R, E, boolean>,
  value: A
): Effect.Effect<R, E, Option.Option<A>> => {
  return pipe(
    f(value),
    core.flatMap((result) => {
      if (result) {
        return core.succeed(Option.some(value))
      }
      const next = iterator.next()
      if (!next.done) {
        return findLoop(iterator, f, next.value)
      }
      return core.succeed(Option.none)
    })
  )
}

/** @internal */
export const flattenErrorOption = <E1>(fallback: E1) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, Option.Option<E>, A>): Effect.Effect<R, E | E1, A> => {
    return pipe(self, mapError(Option.getOrElse(fallback))).traced(trace)
  }
}

/** @internal */
export const flip = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, A, E> => {
  const trace = getCallTrace()
  return pipe(self, foldEffect(core.succeed, core.fail)).traced(trace)
}

/** @Internal */
export const flipWith = <R, A, E, R2, A2, E2>(f: (effect: Effect.Effect<R, A, E>) => Effect.Effect<R2, A2, E2>) => {
  const trace = getCallTrace()
  return (self: Effect.Effect<R, E, A>): Effect.Effect<R2, E2, A2> => {
    return flip(f(flip(self))).traced(trace)
  }
}

/** @internal */
export function fold<E, A, A2, A3>(onFailure: (error: E) => A2, onSuccess: (value: A) => A3) {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A2 | A3> => {
    return pipe(
      self,
      foldEffect(
        (e) => core.succeed(onFailure(e)),
        (a) => core.succeed(onSuccess(a))
      )
    ).traced(trace)
  }
}

/** @internal */
export const foldEffect = <E, A, R2, E2, A2, R3, E3, A3>(
  onFailure: (e: E) => Effect.Effect<R2, E2, A2>,
  onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2 | R3, E2 | E3, A2 | A3> => {
    return pipe(
      self,
      core.foldCauseEffect(
        (cause) => {
          const either = Cause.failureOrCause(cause)
          switch (either._tag) {
            case "Left": {
              return onFailure(either.left)
            }
            case "Right": {
              return core.failCause(either.right)
            }
          }
        },
        onSuccess
      )
    ).traced(trace)
  }
}

/** @internal */
export const forAll = <R, E, A>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, boolean> => {
    return core.suspendSucceed(() => forAllLoop(elements[Symbol.iterator](), f)).traced(trace)
  }
}

/** @internal */
const forAllLoop = <R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect.Effect<R, E, boolean>
): Effect.Effect<R, E, boolean> => {
  const next = iterator.next()
  return next.done
    ? core.succeed(true)
    : pipe(
      f(next.value),
      core.flatMap((b) => b ? forAllLoop(iterator, f) : core.succeed(b))
    )
}

/** @internal */
export const forEachEffect = <A, R1, E1, B>(f: (a: A) => Effect.Effect<R1, E1, B>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E1, Option.Option<B>> => {
    return pipe(
      self,
      core.foldCauseEffect(
        () => core.succeed(Option.none),
        (a) => pipe(f(a), core.map(Option.some))
      )
    ).traced(trace)
  }
}

/** @internal */
export const forEachOption = <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, B>) => {
  const trace = getCallTrace()
  return (option: Option.Option<A>): Effect.Effect<R, E, Option.Option<B>> => {
    switch (option._tag) {
      case "None": {
        return core.succeed(Option.none).traced(trace)
      }
      case "Some": {
        return pipe(f(option.value), core.map(Option.some)).traced(trace)
      }
    }
  }
}

/** @internal */
export const forEachWithIndex = <A, R, E, B>(f: (a: A, i: number) => Effect.Effect<R, E, B>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return core.suspendSucceed(() => {
      let index = 0
      const acc: Array<B> = []
      return pipe(
        elements,
        core.forEachDiscard((a) =>
          pipe(
            f(a, index),
            core.map((b) => {
              acc.push(b)
              index++
            })
          )
        ),
        core.map(() => Chunk.fromIterable(acc))
      )
    }).traced(trace)
  }
}

/** @internal */
export const forEachParWithIndex = <R, E, A, B>(f: (a: A, i: number) => Effect.Effect<R, E, B>) => {
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return core.suspendSucceed(() =>
      pipe(
        core.sync<Array<B>>(() => []),
        core.flatMap((array) =>
          pipe(
            Array.from(elements).map((a, i) => [a, i] as [A, number]),
            core.forEachParDiscard(
              ([a, i]) =>
                pipe(
                  core.suspendSucceed(() => f(a, i)),
                  core.flatMap((b) =>
                    core.sync(() => {
                      array[i] = b
                    })
                  )
                )
            ),
            core.map(() => Chunk.fromIterable(array))
          )
        )
      )
    )
  }
}

/**
 * Applies the function `f` to each element of the `Collection<A>` and returns
 * the result in a new `Chunk<B>` using the specified execution strategy.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const forEachExec = <R, E, A, B>(
  f: (a: A) => Effect.Effect<R, E, B>,
  strategy: ExecutionStrategy.ExecutionStrategy
) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return core.suspendSucceed(() =>
      pipe(
        strategy,
        ExecutionStrategy.match(
          () => pipe(elements, core.forEach(f)),
          () => pipe(elements, core.forEachPar(f), core.withParallelismUnbounded),
          (parallelism) => pipe(elements, core.forEachPar(f), core.withParallelism(parallelism))
        )
      )
    ).traced(trace)
  }
}

/** @internal */
export const forever = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, never> => {
  const trace = getCallTrace()
  const loop: Effect.Effect<R, E, never> = pipe(self, core.flatMap(() => core.yieldNow()), core.flatMap(() => loop))
  return loop.traced(trace)
}

/** @internal */
export const forkAll = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, never, Fiber.Fiber<E, Chunk.Chunk<A>>> => {
  const trace = getCallTrace()
  return pipe(effects, core.forEach(core.fork), core.map(Fiber.collectAll)).traced(trace)
}

/** @internal */
export const forkAllDiscard = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, never, void> => {
  const trace = getCallTrace()
  return pipe(effects, core.forEachDiscard(core.fork)).traced(trace)
}

/** @internal */
export const forkIn = (scope: Scope.Scope) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> => {
    return core.uninterruptibleMask((restore) =>
      pipe(
        restore(self),
        core.forkDaemon,
        core.tap((fiber) => scope.addFinalizer(() => Fiber.interrupt(fiber)))
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
                fiberIdWith((fiberId) =>
                  Equal.equals(fiberId, fiber.id) ?
                    core.unit() :
                    Fiber.interrupt(fiber)
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
export const forkWithErrorHandler = <E, X>(handler: (e: E) => Effect.Effect<never, never, X>) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> => {
    return pipe(
      self,
      onError((cause) => {
        const either = Cause.failureOrCause(cause)
        switch (either._tag) {
          case "Left": {
            return handler(either.left)
          }
          case "Right": {
            return core.failCause(either.right)
          }
        }
      }),
      core.fork
    ).traced(trace)
  }
}

/** @internal */
export const fromEither = <E, A>(either: Either.Either<E, A>): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  switch (either._tag) {
    case "Left": {
      return core.fail(either.left).traced(trace)
    }
    case "Right": {
      return core.succeed(either.right).traced(trace)
    }
  }
}

/** @internal */
export const fromEitherCause = <E, A>(either: Either.Either<Cause.Cause<E>, A>): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  switch (either._tag) {
    case "Left": {
      return core.failCause(either.left).traced(trace)
    }
    case "Right": {
      return core.succeed(either.right).traced(trace)
    }
  }
}

// TODO(Mike/Max): do.
/** @internal */
export declare const fromFiber: <E, A>(fiber: Fiber.Fiber<E, A>) => Effect.Effect<never, E, A>

// TODO(Mike/Max): do.
/** @internal */
export declare const fromFiberEffect: <R, E, A>(fiber: Effect.Effect<R, E, Fiber.Fiber<E, A>>) => Effect.Effect<R, E, A>

/** @internal */
export const fromOption = <A>(option: Option.Option<A>): Effect.Effect<never, Option.Option<never>, A> => {
  const trace = getCallTrace()
  switch (option._tag) {
    case "None": {
      return core.fail(Option.none).traced(trace)
    }
    case "Some": {
      return core.succeed(option.value).traced(trace)
    }
  }
}

/**
 * Inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 * @internal
 */
export const gen = <
  Eff extends Effect.Effect<any, any, any>,
  AEff
>(
  f: (adapter: <A>(tag: Context.Tag<A>) => Effect.Effect<A, never, A>) => Generator<Eff, AEff, any>
): Effect.Effect<
  [Eff] extends [Effect.Effect<infer R, any, any>] ? R : never,
  [Eff] extends [Effect.Effect<any, infer E, any>] ? E : never,
  AEff
> => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => {
    const iterator = f(core.service)
    const state = iterator.next()
    const run = (
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect.Effect<any, any, AEff> =>
      (state.done ?
        core.succeed(state.value) :
        pipe(
          state.value as unknown as Effect.Effect<any, any, any>,
          core.flatMap((val: any) => run(iterator.next(val)))
        )).traced(trace)
    return run(state)
  }).traced(trace)
}

// TODO(Mike/Max): implement after FiberRefs
// export const getFiberRefs = (): Effect.Effect<never, never, FiberRefs> => {
//   const trace = getCallTrace()
//   return core.withFiberRuntime((state) => core.succeed(state.getFiberRefs)).traced(trace)
// }

/** @internal */
export const getOrFail = <A>(
  option: Option.Option<A>
): Effect.Effect<never, Cause.NoSuchElementException, A> => {
  const trace = getCallTrace()
  return pipe(option, getOrFailWith(() => new Cause.NoSuchElementException())).traced(trace)
}

/** @internal */
export const getOrFailDiscard = <A>(option: Option.Option<A>): Effect.Effect<never, void, A> => {
  const trace = getCallTrace()
  return pipe(option, getOrFailWith(constVoid)).traced(trace)
}

/** @internal */
export const getOrFailWith = <E>(error: () => E) => {
  const trace = getCallTrace()
  return <A>(option: Option.Option<A>): Effect.Effect<never, E, A> => {
    switch (option._tag) {
      case "None": {
        return core.failSync(error).traced(trace)
      }
      case "Some": {
        return core.succeed(option.value).traced(trace)
      }
    }
  }
}

/** @internal */
export const head = <R, E, A>(
  self: Effect.Effect<R, E, Iterable<A>>
): Effect.Effect<R, Option.Option<E>, A> => {
  const trace = getCallTrace()
  return pipe(
    self,
    foldEffect(
      (e) => core.fail(Option.some(e)),
      (as) => {
        const iterator = as[Symbol.iterator]()
        const next = iterator.next()
        if (next.done) {
          return core.fail(Option.none)
        }
        return core.succeed(next.value)
      }
    )
  ).traced(trace)
}

/** @internal */
export const ifEffect = <R1, R2, E1, E2, A, A1>(
  onTrue: Effect.Effect<R1, E1, A>,
  onFalse: Effect.Effect<R2, E2, A1>
) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, boolean>): Effect.Effect<R | R1 | R2, E | E1 | E2, A | A1> => {
    return pipe(
      self,
      core.flatMap((b): Effect.Effect<R1 | R2, E1 | E2, A | A1> => (b ? onTrue : onFalse))
    ).traced(trace)
  }
}

/** @internal */
export const ignore = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, void> => {
  const trace = getCallTrace()
  return pipe(self, fold(constVoid, constVoid)).traced(trace)
}

/** @internal */
const someFatal = Option.some(LogLevel.Fatal)
/** @internal */
const someError = Option.some(LogLevel.Error)
/** @internal */
const someWarning = Option.some(LogLevel.Warning)
/** @internal */
const someTrace = Option.some(LogLevel.Trace)
/** @internal */
const someInfo = Option.some(LogLevel.Info)
/** @internal */
const someDebug = Option.some(LogLevel.Debug)

/** @internal */
export const log = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, Cause.empty, Option.none)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logDebug = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, Cause.empty, someDebug)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export function logDebugCause<E>(cause: Cause.Cause<E>): Effect.Effect<never, never, void> {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log("", cause, someDebug)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logDebugCauseMessage = <E>(
  message: string,
  cause: Cause.Cause<E>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, someDebug)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logError = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, Cause.empty, someError)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logErrorCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log("", cause, someError)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logErrorCauseMessage = <E>(
  message: string,
  cause: Cause.Cause<E>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, someError)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logFatal = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, Cause.empty, someFatal)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logFatalCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log("", cause, someFatal)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export function logFatalCauseMessage<E>(
  message: string,
  cause: Cause.Cause<E>
): Effect.Effect<never, never, void> {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, someFatal)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logInfo = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, Cause.empty, someInfo)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logInfoCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log("", cause, someInfo)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logInfoCauseMessage = <E>(
  message: string,
  cause: Cause.Cause<E>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, someInfo)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logWarning = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, Cause.empty, someWarning)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logWarningCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log("", cause, someWarning)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logWarningCauseMessage = <E>(
  message: string,
  cause: Cause.Cause<E>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, someWarning)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export function logTrace(message: string): Effect.Effect<never, never, void> {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, Cause.empty, someTrace)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logTraceCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log("", cause, someTrace)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logTraceCauseMessage = <E>(
  message: string,
  cause: Cause.Cause<E>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, someTrace)
    return core.unit()
  }).traced(trace)
}

/** @internal */
export const logSpan = (label: string) => {
  const trace = getCallTrace()
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(
      core.getFiberRef(core.currentLogSpan),
      core.flatMap((stack) =>
        pipe(
          Clock.currentTimeMillis(),
          core.flatMap((now) =>
            core.suspendSucceed(() => {
              const logSpan = LogSpan.make(label, now)
              return core.locallyFiberRef(
                pipe(stack, List.prepend(logSpan)) as List.List<LogSpan.LogSpan>
              )(core.currentLogSpan)(effect)
            })
          )
        )
      )
    ).traced(trace)
  }
}

/** @internal */
export const logAnnotate = (key: string, value: string) => {
  const trace = getCallTrace()
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(
      core.getFiberRef(core.currentLogAnnotations),
      core.flatMap((annotations) =>
        core.suspendSucceed(() =>
          pipe(
            effect,
            core.locallyFiberRef(
              (annotations as Map<string, string>).set(key, value) as ReadonlyMap<string, string>
            )(core.currentLogAnnotations)
          )
        )
      )
    ).traced(trace)
  }
}

/** @internal */
export const logAnnotations = (): Effect.Effect<never, never, ReadonlyMap<string, string>> => {
  const trace = getCallTrace()
  return core.getFiberRef(core.currentLogAnnotations).traced(trace)
}

/** @internal */
export const loop = <Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, Chunk.Chunk<A>> => {
  const trace = getCallTrace()
  return pipe(loopInternal(initial, cont, inc, body), core.map(Chunk.fromIterable)).traced(trace)
}

/** @internal */
const loopInternal = <Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, List.List<A>> => {
  return core.suspendSucceed(() => {
    return cont(initial)
      ? pipe(
        body(initial),
        core.flatMap((a) =>
          pipe(
            loopInternal(inc(initial), cont, inc, body),
            core.map(List.prepend(a))
          )
        )
      )
      : core.sync(() => List.empty())
  })
}

/** @internal */
export const loopDiscard = <Z, R, E, X>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect.Effect<R, E, X>
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => {
    return cont(initial)
      ? pipe(body(initial), core.flatMap(() => loopDiscard(inc(initial), cont, inc, body)))
      : core.unit()
  }).traced(trace)
}

/** @internal */
export const mapAccum = <A, B, R, E, Z>(
  elements: Iterable<A>,
  zero: Z,
  f: (z: Z, a: A) => Effect.Effect<R, E, readonly [Z, B]>
): Effect.Effect<R, E, readonly [Z, Chunk.Chunk<B>]> => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => {
    const iterator = elements[Symbol.iterator]()
    const builder: Array<B> = []
    let result: Effect.Effect<R, E, Z> = core.succeed(zero)
    let next: IteratorResult<A, any>
    while (!(next = iterator.next()).done) {
      result = pipe(
        result,
        core.flatMap((state) =>
          pipe(
            f(state, next.value),
            core.map(([z, b]) => {
              builder.push(b)
              return z
            })
          )
        )
      )
    }
    return pipe(result, core.map((z) => [z, Chunk.fromIterable(builder)] as const))
  }).traced(trace)
}

/** @internal */
export const mapBoth = <E, A, E2, A2>(f: (e: E) => E2, g: (a: A) => A2) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E2, A2> => {
    return pipe(
      self,
      foldEffect(
        (e) => core.failSync(() => f(e)),
        (a) => core.sync(() => g(a))
      )
    ).traced(trace)
  }
}

/** @internal */
export const mapError = <E, E2>(f: (e: E) => E2) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E2, A> => {
    return pipe(
      self,
      core.foldCauseEffect(
        (cause) => {
          const either = Cause.failureOrCause(cause)
          switch (either._tag) {
            case "Left": {
              return core.failSync(() => f(either.left))
            }
            case "Right": {
              return core.failCause(either.right)
            }
          }
        },
        core.succeed
      )
    ).traced(trace)
  }
}

/** @internal */
export const mapErrorCause = <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E2, A> => {
    return pipe(
      self,
      core.foldCauseEffect((c) => core.failCauseSync(() => f(c)), core.succeed)
    ).traced(trace)
  }
}

/** @internal */
export const mapTryCatch = <A, B, E1>(f: (a: A) => B, onThrow: (u: unknown) => E1) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E | E1, B> => {
    return pipe(self, core.flatMap((a) => tryCatch(() => f(a), onThrow))).traced(trace)
  }
}

/** @internal */
export const memoize = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<never, never, Effect.Effect<R, E, A>> => {
  const trace = getCallTrace()
  return pipe(
    core.makeDeferred<E, A>(),
    core.flatMap((deferred) =>
      pipe(
        self,
        core.intoDeferred(deferred),
        once,
        core.map(core.zipRight(core.awaitDeferred(deferred)))
      )
    )
  ).traced(trace)
}

/** @internal */
export const memoizeF = <R, E, A, B>(
  f: (a: A) => Effect.Effect<R, E, B>
): Effect.Effect<never, never, (a: A) => Effect.Effect<R, E, B>> => {
  const trace = getCallTrace()
  return pipe(
    Synchronized.make(new Map<A, Deferred.Deferred<E, B>>()),
    core.map((ref) =>
      (a: A) =>
        pipe(
          ref,
          Synchronized.modifyEffect((map) => {
            const result = map.get(a)
            if (result === undefined) {
              return pipe(
                core.makeDeferred<E, B>(),
                core.tap((deferred) => pipe(f(a), core.intoDeferred(deferred), core.fork)),
                core.map((deferred) => [deferred, map.set(a, deferred)] as const)
              )
            }
            return core.succeed([result, map] as const)
          }),
          core.flatMap(core.awaitDeferred)
        )
    )
  ).traced(trace)
}

/** @internal */
export const merge = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, E | A> => {
  const trace = getCallTrace()
  return pipe(self, foldEffect((e) => core.succeed(e), core.succeed)).traced(trace)
}

/** @internal */
export const mergeAll = <Z, A>(zero: Z, f: (z: Z, a: A) => Z) => {
  const trace = getCallTrace()
  return <R, E>(elements: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, Z> => {
    return Array.from(elements).reduce(
      (acc, a) => pipe(acc, core.zipWith(a, f)),
      core.succeed(zero) as Effect.Effect<R, E, Z>
    ).traced(trace)
  }
}

/** @internal */
export const mergeAllPar = <Z, A>(zero: Z, f: (z: Z, a: A) => Z) => {
  const trace = getCallTrace()
  return <R, E>(elements: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, Z> => {
    return pipe(
      Ref.make(zero),
      core.flatMap((acc) =>
        pipe(
          elements,
          core.forEachParDiscard(core.flatMap((a) => pipe(acc, Ref.update((b) => f(b, a))))),
          core.flatMap(() => Ref.get(acc))
        )
      )
    ).traced(trace)
  }
}

/** @internal */
export const negate = <R, E>(self: Effect.Effect<R, E, boolean>): Effect.Effect<R, E, boolean> => {
  const trace = getCallTrace()
  return pipe(self, core.map((b) => !b)).traced(trace)
}

/** @internal */
export const never = (): Effect.Effect<never, never, never> => {
  const trace = getCallTrace()
  return core.asyncInterrupt<never, never, never>(() => {
    const interval = setInterval(() => {
      //
    }, internalClock.MAX_TIMER_MILLIS)
    return Either.left(core.sync(() => clearInterval(interval)))
  }).traced(trace)
}

/** @internal */
export const none = <R, E, A>(
  self: Effect.Effect<R, E, Option.Option<A>>
): Effect.Effect<R, Option.Option<E>, void> => {
  const trace = getCallTrace()
  return pipe(
    self,
    foldEffect(
      (e) => core.fail(Option.some(e)),
      (option) => {
        switch (option._tag) {
          case "None": {
            return core.unit()
          }
          case "Some": {
            return core.fail(Option.none)
          }
        }
      }
    )
  ).traced(trace)
}

/** @internal */
export const noneOrFail = <E>(option: Option.Option<E>): Effect.Effect<never, E, void> => {
  const trace = getCallTrace()
  return flip(getOrFailDiscard(option)).traced(trace)
}

/** @internal */
export const noneOrFailWith = <E, A>(
  option: Option.Option<A>,
  f: (a: A) => E
): Effect.Effect<never, E, void> => {
  const trace = getCallTrace()
  return pipe(flip(getOrFailDiscard(option)), mapError(f)).traced(trace)
}

/** @internal */
export function onDone<E, A, R1, X1, R2, X2>(
  onError: (e: E) => Effect.Effect<R1, never, X1>,
  onSuccess: (a: A) => Effect.Effect<R2, never, X2>
) {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1 | R2, never, void> => {
    return core.uninterruptibleMask((restore) =>
      pipe(
        restore(self),
        foldEffect(
          (e) => restore(onError(e)),
          (a) => restore(onSuccess(a))
        ),
        core.forkDaemon,
        core.asUnit
      )
    ).traced(trace)
  }
}

/** @internal */
export function onDoneCause<E, A, R1, X1, R2, X2>(
  onCause: (cause: Cause.Cause<E>) => Effect.Effect<R1, never, X1>,
  onSuccess: (a: A) => Effect.Effect<R2, never, X2>
) {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1 | R2, never, void> => {
    return core.uninterruptibleMask((restore) =>
      pipe(
        restore(self),
        core.foldCauseEffect(
          (c) => restore(onCause(c)),
          (a) => restore(onSuccess(a))
        ),
        core.forkDaemon,
        core.asUnit
      )
    ).traced(trace)
  }
}

/** @internal */
export const onError = <E, R2, X>(cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, X>) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E, A> => {
    return pipe(
      self,
      core.onExit(
        (exit): Effect.Effect<R2, never, X | void> =>
          Exit.isSuccess(exit) ?
            core.unit() :
            cleanup(exit.cause)
      )
    ).traced(trace)
  }
}

/** @internal */
export const once = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<never, never, Effect.Effect<R, E, void>> => {
  const trace = getCallTrace()
  return pipe(
    Ref.make(true),
    core.map((ref) => pipe(core.whenEffect(pipe(ref, Ref.getAndSet(false)), self), core.asUnit))
  ).traced(trace)
}

/** @internal */
export const option = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Option.Option<A>> => {
  const trace = getCallTrace()
  return pipe(
    self,
    foldEffect(
      () => core.succeed(Option.none),
      (a) => core.succeed(Option.some(a))
    )
  ).traced(trace)
}

/** @internal */
export const orDie = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A> => {
  const trace = getCallTrace()
  return pipe(self, orDieWith(identity)).traced(trace)
}

/** @internal */
export const orDieKeep = <R, E, A>(self: Effect.Effect<R, E, A>) => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.foldCauseEffect(
      (cause) => core.failCause(pipe(cause, Cause.flatMap(Cause.die))),
      core.succeed
    )
  ).traced(trace)
}

/** @internal */
export const orDieWith = <E>(f: (e: E) => unknown) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A> => {
    return pipe(self, foldEffect((e) => core.die(f(e)), core.succeed)).traced(trace)
  }
}

/** @internal */
export const orElse = <R2, E2, A2>(that: () => Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E2, A | A2> => {
    return pipe(self, tryOrElse(that, core.succeed)).traced(trace)
  }
}

/** @internal */
export const orElseEither = <R2, E2, A2>(that: () => Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E2, Either.Either<A, A2>> => {
    return pipe(
      self,
      tryOrElse(
        () => pipe(that(), core.map(Either.right)),
        (a) => core.succeed(Either.left(a))
      )
    ).traced(trace)
  }
}

/** @internal */
export const orElseFail = <E2>(evaluate: () => E2) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E2, A> => {
    return pipe(self, orElse(() => core.failSync(evaluate))).traced(trace)
  }
}

/** @internal */
export const orElseOptional = <R, E, A, R2, E2, A2>(
  that: () => Effect.Effect<R2, Option.Option<E2>, A2>
) => {
  const trace = getCallTrace()
  return (
    self: Effect.Effect<R, Option.Option<E>, A>
  ): Effect.Effect<R | R2, Option.Option<E | E2>, A | A2> => {
    return pipe(
      self,
      catchAll((option) => {
        switch (option._tag) {
          case "None": {
            return that()
          }
          case "Some": {
            return core.fail(Option.some<E | E2>(option.value))
          }
        }
      })
    ).traced(trace)
  }
}

/** @internal */
export const orElseSucceed = <A2>(evaluate: () => A2) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A | A2> => {
    return pipe(self, orElse(() => core.sync(evaluate))).traced(trace)
  }
}

/** @internal */
export const parallelErrors = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Chunk.Chunk<E>, A> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.foldCauseEffect((cause) => {
      const errors = Chunk.fromIterable(Cause.failures(cause))
      return errors.length === 0
        ? core.failCause(cause as Cause.Cause<never>)
        : core.fail(errors)
    }, core.succeed)
  ).traced(trace)
}

/** @internal */
export const parallelFinalizers = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | Scope.Scope, E, A> => {
  const trace = getCallTrace()
  return pipe(
    core.scope(),
    core.flatMap((outerScope) =>
      pipe(
        Scope.make(ExecutionStrategy.parallel),
        core.flatMap((innerScope) =>
          pipe(
            outerScope,
            Scope.addFinalizerExit((exit) => pipe(innerScope, Scope.close(exit))),
            core.zipRight(pipe(innerScope, Scope.extend(self)))
          )
        )
      )
    )
  ).traced(trace)
}

// TODO(Max): after Layer
// /**
//  * Provides a layer to the effect, which translates it to another level.
//  *
//  * @tsplus static effect/core/io/Effect.Aspects provideLayer
//  * @tsplus pipeable effect/core/io/Effect provideLayer
//  * @category environment
//  * @since 1.0.0
//  */
//  export const provideLayer = <R, E, A>(layer: Layer.Layer<R, E, A>) => {
//   const trace = getCallTrace()
//   return <E1, A1>(self: Effect.Effect<A, E1, A1>): Effect.Effect<R, E | E1, A1> => {
//     return core.acquireUseRelease(
//       Scope.make(),
//       (scope) => pipe(
//         layer,
//         Layer.buildWithScope(scope),
//         core.flatMap((r) => pipe(self, core.provideEnvironment(r)))
//       ),
//       (scope, exit) => pipe(scope, Scope.close(exit))
//     ).traced(trace)
//   }
// }

/** @internal */
export const provideService = <T>(tag: Context.Tag<T>, resource: T) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<Exclude<R, T>, E, A> => {
    return pipe(self, provideServiceEffect(tag, core.succeed(resource))).traced(trace)
  }
}

/** @internal */
export const provideServiceEffect = <T, R1, E1>(tag: Context.Tag<T>, effect: Effect.Effect<R1, E1, T>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R1 | Exclude<R, T>, E | E1, A> => {
    return core.environmentWithEffect((env: Context.Context<R1 | Exclude<R, T>>) =>
      pipe(
        effect,
        core.flatMap((service) =>
          pipe(self, core.provideEnvironment(pipe(env, Context.add(tag)(service)) as Context.Context<R | R1>))
        )
      )
    ).traced(trace)
  }
}

// TODO(Max): after Layer
// /** @internal */
//  export const provideSomeLayer = <R1, E1, A1>(layer: Layer.Layer<R1, E1, A1>) => {
//   const trace = getCallTrace()
//   return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R1 | Exclude<R, A1>, E | E1, A> => {
//     // @ts-expect-error
//     return pipe(
//       self,
//       provideLayer(pipe(Layer.environment<Exclude<R, A1>>(), Layer.merge(layer)))
//     ).traced(trace)
//   }
// }

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
                (cause1) => pipe(Fiber.join(right), mapErrorCause((cause2) => Cause.parallel(cause1, cause2))),
                (a) => pipe(right, Fiber.interruptAsWith(state.id), core.as(a))
              )
            ),
          (exit, left) =>
            pipe(
              exit,
              Exit.matchEffect(
                (cause2) => pipe(Fiber.join(left), mapErrorCause((cause1) => Cause.parallel(cause1, cause2))),
                (a) => pipe(left, Fiber.interruptAsWith(state.id), core.as(a))
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
      }, FiberId.combineAll(HashSet.from([leftFiber.id, rightFiber.id])))
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
            Fiber.await(winner),
            core.flatMap((exit) => {
              switch (exit.op) {
                case OpCodes.OP_SUCCESS: {
                  return pipe(Fiber.inheritAll(winner), core.flatMap(() => leftDone(exit, loser)))
                }
                case OpCodes.OP_FAILURE: {
                  return leftDone(exit, loser)
                }
              }
            })
          ),
        (winner, loser) =>
          pipe(
            Fiber.await(winner),
            core.flatMap((exit) => {
              switch (exit.op) {
                case OpCodes.OP_SUCCESS: {
                  return pipe(Fiber.inheritAll(winner), core.flatMap(() => rightDone(exit, loser)))
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
export const sandbox = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, Cause.Cause<E>, A> => {
  const trace = getCallTrace()
  return pipe(self, core.foldCauseEffect(core.fail, core.succeed)).traced(trace)
}

/** @internal */
export const sleep = Clock.sleep

/** @internal */
export const tryCatch = <E, A>(
  attempt: () => A,
  onThrow: (u: unknown) => E
): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  return core.sync(() => {
    try {
      return attempt()
    } catch (error) {
      throw makeEffectError(Cause.fail(onThrow(error)))
    }
  }).traced(trace)
}

/** @internal */
export const tryOrElse = <R2, E2, A2, A, R3, E3, A3>(
  that: () => Effect.Effect<R2, E2, A2>,
  onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2 | R3, E2 | E3, A2 | A3> => {
    return pipe(
      self,
      core.foldCauseEffect(
        (cause) => {
          const option = Cause.keepDefects(cause)
          switch (option._tag) {
            case "None": {
              return that()
            }
            case "Some": {
              return core.failCause(option.value)
            }
          }
        },
        onSuccess
      )
    ).traced(trace)
  }
}

/** @internal */
export const unrefineWith = <E, E1, E2>(
  pf: (u: unknown) => Option.Option<E1>,
  f: (e: E) => E2
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E1 | E2, A> => {
    return pipe(
      self,
      core.catchAllCause(
        (cause): Effect.Effect<R, E1 | E2, A> => {
          const option = pipe(cause, Cause.find((cause) => (Cause.isDieType(cause) ? pf(cause.defect) : Option.none)))
          switch (option._tag) {
            case "None": {
              return core.failCause(pipe(cause, Cause.map(f)))
            }
            case "Some": {
              return core.fail(option.value)
            }
          }
        }
      )
    ).traced(trace)
  }
}

/** @internal */
export const unsome = <R, E, A>(
  self: Effect.Effect<R, Option.Option<E>, A>
): Effect.Effect<R, E, Option.Option<A>> => {
  const trace = getCallTrace()
  return pipe(
    self,
    foldEffect(
      (option) => {
        switch (option._tag) {
          case "None": {
            return core.succeed(Option.none)
          }
          case "Some": {
            return core.fail(option.value)
          }
        }
      },
      (a) => core.succeed(Option.some(a))
    )
  ).traced(trace)
}
