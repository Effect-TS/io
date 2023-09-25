import * as Context from "@effect/data/Context"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Logger from "@effect/io/Logger"
import * as LogLevel from "@effect/io/LogLevel"
import * as Schedule from "@effect/io/Schedule"

const N = Context.Tag<number>()
const L = Layer.effect(
  N,
  Effect.gen(function*($) {
    yield* $(Effect.logDebug("A"))
    yield* $(Effect.forkDaemon(Effect.schedule(Schedule.fixed("10 millis"))(Effect.logDebug("B"))))
    return 0
  })
)

const main = Effect.provide(L)(Effect.flatMap(N, (n) => Effect.logDebug(`n: ${n}`)))

Effect.runSync(
  Logger.withMinimumLogLevel(LogLevel.Debug)(main)
)
