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
  Effect.delay(Effect.succeed(0), "500 millis"),
  Effect.onInterrupt(Effect.delay(Effect.failSync(() => new MyError("welp")), "1 seconds"), () => Effect.die("oki")),
  Effect.delay(Effect.succeed(0), "500 millis"),
  Effect.delay(Effect.failSync(() => new MyError("welp")), "500 millis"),
  Effect.delay(Effect.succeed(0), "500 millis"),
  { concurrency: "unbounded", discard: true }
)

Effect.runFork(Effect.catchAllCause(program, Effect.logCause({ level: "Error" })))
