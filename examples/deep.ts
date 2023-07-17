import { pipe } from "@effect/data/Function"
import { range } from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import * as Level from "@effect/io/Logger/Level"

const program = pipe(
  range(0, 20),
  Effect.forEach((n) => Effect.delay("1 seconds")(n % 3 === 0 ? Effect.die("boom") : Effect.succeed(n + 1)), {
    concurrency: "unbounded"
  }),
  Effect.flatMap((chunk) => Effect.sync(() => console.log(Array.from(chunk)))),
  Effect.tapErrorCause(Effect.logError),
  Effect.provideLayer(Logger.minimumLogLevel(Level.Debug))
)

Effect.runFork(program)
