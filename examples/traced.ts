import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import * as Level from "@effect/io/Logger/Level"
import { pipe } from "@fp-ts/data/Function"

const program = pipe(
  [1, 2, 3, 4, 5],
  Effect.forEachPar((n) => n % 3 === 0 ? Effect.die("boom") : Effect.succeed(n + 1)),
  Effect.flatMap((chunk) => Effect.sync(() => console.log(Array.from(chunk)))),
  Effect.tapErrorCause(Effect.logErrorCause),
  Effect.provideLayer(Logger.minimumLogLevel(Level.Debug))
)

Effect.unsafeFork(program)
