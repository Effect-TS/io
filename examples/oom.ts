import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import { pipe } from "@fp-ts/core/Function"
import type * as Context from "@fp-ts/data/Context"

const program = pipe(
  Effect.contextWith((_: Context.Context<never>) => _),
  Effect.forever,
  Effect.fork,
  Effect.flatMap((f) => Fiber.await(f))
)

pipe(
  program,
  Effect.unsafeRunPromise
).then(() => {
  console.log("done")
})
