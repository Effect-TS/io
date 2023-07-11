import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import * as LogLevel from "@effect/io/Logger/Level"

const program1 = Logger.withMinimumLogLevel(LogLevel.Debug)(
  Effect.gen(function*($) {
    yield* $(Effect.log("debug0", { level: "Debug" }))
    yield* $(Effect.log("debug1", { level: "Debug" }))
    yield* $(Effect.log("debug2", { level: "Debug" }))
  })
)

const program2 = Logger.withMinimumLogLevel(LogLevel.Info)(
  Effect.gen(function*($) {
    yield* $(Effect.log("debug0", { level: "Debug" }))
    yield* $(Effect.log("debug1", { level: "Debug" }))
    yield* $(Effect.log("debug2", { level: "Debug" }))
  })
)

const main = pipe(
  Effect.all([program1, program2], { discard: true }),
  Effect.provideSomeLayer(Logger.minimumLogLevel(LogLevel.Info))
)

Effect.runFork(main)
