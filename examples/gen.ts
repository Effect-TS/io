import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import { pipe } from "@fp-ts/data/Function"

const program = pipe(
  Effect.gen(function*() {
    yield* Effect.log("hello")
    yield* Effect.log("world")
  }),
  Effect.provideSomeLayer(Logger.console())
)

Effect.unsafeRunWith(program, (exit) => {
  console.log(exit)
})
