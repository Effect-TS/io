import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import type * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

const program = pipe(
  Effect.environmentWith((_: Context.Context<never>) => _),
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
