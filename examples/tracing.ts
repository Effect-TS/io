import * as Effect from "@effect/io/Effect"

const message = (n: number) => {
  if (n < 10) {
    throw new Error("well...")
  }
}

const mentioned = (n: number) => {
  if (n < 10) {
    message(n)
  }
}

const program = Effect.gen(function*($) {
  const a = yield* $(Effect.succeed(0))
  const b = yield* $(Effect.succeed(a + 1))
  return yield* $(Effect.sync(() => {
    return mentioned(b)
  }))
})

Effect.unsafeFork(Effect.catchAllCause(program, Effect.logErrorCause))