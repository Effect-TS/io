import * as Cause from "@effect/io/Cause"
import * as Clock from "@effect/io/Clock"
import { getCallTrace } from "@effect/io/Debug"
import * as DefaultServices from "@effect/io/DefaultServices"
import type * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import type * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import { RuntimeException } from "@effect/io/internal/cause"
import * as core from "@effect/io/internal/core"
import type { MergeRecord } from "@effect/io/internal/types"
import * as Synchronized from "@effect/io/Ref/Synchronized"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import type * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import { identity, pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

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
export const clockWith = <R, E, A>(f: (clock: Clock.Clock) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return pipe(
    DefaultServices.currentServices,
    core.getWithFiberRef((services) => f(pipe(services, Context.get(Clock.Tag))))
  ).traced(trace)
}

/** @internal */
export const collect = <A, R, E, B>(f: (a: A) => Effect.Effect<R, Option.Option<E>, B>) => {
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    const trace = getCallTrace()
    return pipe(elements, core.forEach((a) => unsome(f(a))), core.map(Chunk.compact)).traced(trace)
  }
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
export const collectPar = <A, R, E, B>(f: (a: A) => Effect.Effect<R, Option.Option<E>, B>) => {
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return pipe(elements, core.forEachPar((a) => unsome(f(a))), core.map(Chunk.compact))
  }
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
export const eventually = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A> => {
  const trace = getCallTrace()
  return pipe(self, orElse(() => pipe(core.yieldNow(), core.flatMap(() => eventually(self))))).traced(trace)
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
export const orElse = <R2, E2, A2>(that: () => Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E2, A | A2> => {
    return pipe(self, tryOrElse(that, core.succeed)).traced(trace)
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
export const sleep = (duration: Duration.Duration): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return clockWith((clock) => clock.sleep(duration)).traced(trace)
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
