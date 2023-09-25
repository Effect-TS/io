import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import * as LogLevel from "@effect/io/LogLevel"

const program1 = Logger.withMinimumLogLevel(LogLevel.Debug)(
  Effect.gen(function*($) {
    yield* $(Effect.logDebug("debug0"))
    yield* $(Effect.logDebug("debug1"))
    yield* $(Effect.logDebug("debug2"))
  })
)

const program2 = Logger.withMinimumLogLevel(LogLevel.Info)(
  Effect.gen(function*($) {
    yield* $(Effect.logDebug("debug0"))
    yield* $(Effect.logDebug("debug1"))
    yield* $(Effect.logDebug("debug2"))
  })
)

const main = pipe(
  Effect.all([program1, program2], { discard: true }),
  Effect.provide(Logger.minimumLogLevel(LogLevel.Info))
)

Effect.runFork(main)
