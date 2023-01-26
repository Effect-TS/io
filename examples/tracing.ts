import * as Effect from "@effect/io/Effect"
import { millis } from "@fp-ts/data/Duration"

class MyError {
  readonly _tag = "A"
  readonly message = "Ok!"
}

const program = Effect.tuplePar(
  Effect.delay(Effect.succeed(0), millis(500)),
  Effect.delay(Effect.succeed(0), millis(500)),
  Effect.delay(Effect.failSync(() => new MyError()), millis(500)),
  Effect.delay(Effect.succeed(0), millis(500))
)

Effect.unsafeFork(Effect.catchAllCause(program, Effect.logErrorCause))
