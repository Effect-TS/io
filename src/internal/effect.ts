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
import * as Synchronized from "@effect/io/Ref/Synchronized"
import * as Context from "@fp-ts/data/Context"
import type * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import { identity, pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
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
export const clockWith = <R, E, A>(f: (clock: Clock.Clock) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return pipe(
    DefaultServices.currentServices,
    core.getWithFiberRef((services) => f(pipe(services, Context.get(Clock.Tag))))
  ).traced(trace)
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
