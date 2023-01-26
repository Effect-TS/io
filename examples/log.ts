import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import * as LogLevel from "@effect/io/Logger/Level"
import { pipe } from "@fp-ts/core/Function"

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
  Effect.tuple(program1, program2),
  Effect.provideSomeLayer(Logger.minimumLogLevel(LogLevel.Info))
)

Effect.unsafeFork(main)
