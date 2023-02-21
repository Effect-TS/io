import type * as Context from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"

const program = pipe(
  Effect.contextWith((_: Context.Context<never>) => _),
  Effect.forever,
  Effect.fork,
  Effect.flatMap((f) => Fiber.await(f))
)

Effect.runPromise(program).then(() => {
  console.log("done")
})
