import { seconds } from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import { range } from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import * as Level from "@effect/io/Logger/Level"

const program = pipe(
  range(0, 20),
  Effect.forEachPar((n) => Effect.delay(seconds(1))(n % 3 === 0 ? Effect.die("boom") : Effect.succeed(n + 1))),
  Effect.flatMap((chunk) => Effect.sync(() => console.log(Array.from(chunk)))),
  Effect.tapErrorCause(Effect.logErrorCause),
  Effect.provideLayer(Logger.minimumLogLevel(Level.Debug))
)

Effect.runFork(program)
