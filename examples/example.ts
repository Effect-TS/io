import * as Context from "@effect/data/Context"
import { millis } from "@effect/data/Duration"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Logger from "@effect/io/Logger"
import * as LogLevel from "@effect/io/Logger/Level"
import * as Schedule from "@effect/io/Schedule"

const N = Context.Tag<number>()
const L = Layer.effect(
  N,
  Effect.gen(function*($) {
    yield* $(Effect.log("A", { level: "Debug" }))
    yield* $(Effect.forkDaemon(Effect.schedule(Schedule.fixed(millis(10)))(Effect.log("B", { level: "Debug" }))))
    return 0
  })
)

const main = Effect.provideSomeLayer(L)(Effect.flatMap(N, (n) => Effect.log(`n: ${n}`, { level: "Debug" })))

Effect.runSync(
  Logger.withMinimumLogLevel(LogLevel.Debug)(main)
)
