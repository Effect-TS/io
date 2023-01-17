import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Ref from "@effect/io/Ref"
import { pipe } from "@fp-ts/data/Function"

export const withLatch = <R, E, A>(
  f: (release: Effect.Effect<never, never, void>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  return pipe(
    Deferred.make<never, void>(),
    Effect.flatMap((latch) =>
      pipe(f(pipe(Deferred.succeed(latch, void 0), Effect.asUnit)), Effect.zipLeft(Deferred.await(latch)))
    )
  )
}

export const withLatchAwait = <R, E, A>(
  f: (release: Effect.Effect<never, never, void>, await: Effect.Effect<never, never, void>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  return Effect.gen(function*($) {
    const ref = yield* $(Ref.make(true))
    const latch = yield* $(Deferred.make<never, void>())
    const result = yield* $(
      f(
        pipe(Deferred.succeed(latch, void 0), Effect.asUnit),
        Effect.uninterruptibleMask((restore) =>
          pipe(Ref.set(ref)(false), Effect.zipRight(restore(Deferred.await(latch))))
        )
      )
    )
    yield* $(pipe(Deferred.await(latch), Effect.whenEffect(Ref.get(ref))))
    return result
  })
}
