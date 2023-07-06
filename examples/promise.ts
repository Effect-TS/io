import * as Effect from "@effect/io/Effect"

const program = Effect.promise(() =>
  new Promise((_, rej) => {
    rej(new Error("ok"))
  })
)

Effect.runFork(Effect.catchAllCause(program, Effect.logCause({ level: "Error" })))
