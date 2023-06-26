import { millis } from "@effect/data/Duration"
import * as Effect from "@effect/io/Effect"

class MyError extends Error {
  readonly _tag = "A"
  constructor(readonly message: string) {
    super(message)
  }

  toString() {
    return `MyError(${this._tag}): ${this.message}`
  }
}

const program = Effect.all(
  Effect.delay(Effect.succeed(0), millis(500)),
  Effect.onInterrupt(Effect.delay(Effect.failSync(() => new MyError("welp")), millis(1000)), () => Effect.die("oki")),
  Effect.delay(Effect.succeed(0), millis(500)),
  Effect.delay(Effect.failSync(() => new MyError("welp")), millis(500)),
  Effect.delay(Effect.succeed(0), millis(500)),
  { concurrency: "inherit", discard: true }
)

Effect.runFork(Effect.catchAllCause(program, Effect.logCause({ level: "Error" })))
