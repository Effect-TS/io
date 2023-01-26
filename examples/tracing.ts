import * as Effect from "@effect/io/Effect"
import { millis } from "@fp-ts/data/Duration"

const program = Effect.tuplePar(
  Effect.delay(Effect.succeed(0), millis(500)),
  Effect.delay(Effect.succeed(0), millis(500)),
  Effect.delay(Effect.failSync(() => new Error("OK")), millis(500)),
  Effect.delay(Effect.succeed(0), millis(500))
)

Effect.unsafeFork(Effect.catchAllCause(program, Effect.logErrorCause))
