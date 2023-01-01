import * as Effect from "@effect/io/Effect"
import * as FiberRef from "@effect/io/FiberRef"
import * as FiberRefs from "@effect/io/FiberRefs"
import * as Logger from "@effect/io/Logger"
import * as LogLevel from "@effect/io/Logger/Level"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

const minimumLogLevel = FiberRef.unsafeMake(LogLevel.Info)

const withLogLevelFilter = (level: LogLevel.LogLevel) => FiberRef.locally(level)(minimumLogLevel)

const filterMinimumLogLevel = <I, O>(logger: Logger.Logger<I, O>) =>
  Logger.make<I, Option.Option<O>>(
    (fiberId, logLevel, message, cause, context, spans, annotations, runtime) => {
      if (LogLevel.greaterThanEqual(FiberRefs.getOrDefault(minimumLogLevel)(context))(logLevel)) {
        return Option.some(logger.log(fiberId, logLevel, message, cause, context, spans, annotations, runtime))
      }
      return Option.none
    }
  )

const program1 = withLogLevelFilter(LogLevel.Debug)(
  Effect.gen(function*($) {
    yield* $(Effect.logDebug("debug0"))
    yield* $(Effect.logDebug("debug1"))
    yield* $(Effect.logDebug("debug2"))
  })
)

const program2 = withLogLevelFilter(LogLevel.Info)(
  Effect.gen(function*($) {
    yield* $(Effect.logDebug("debug0"))
    yield* $(Effect.logDebug("debug1"))
    yield* $(Effect.logDebug("debug2"))
  })
)

const main = pipe(
  Effect.tuple(program1, program2),
  Effect.provideSomeLayer(
    Logger.replace(
      Logger.defaultLogger,
      filterMinimumLogLevel(Logger.consoleLogger())
    )
  )
)

Effect.unsafeFork(main)
