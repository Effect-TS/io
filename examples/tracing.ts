import * as Effect from "@effect/io/Effect"

const program = Effect.gen(function*($) {
  const a = yield* $(Effect.succeed(0))
  const b = yield* $(Effect.succeed(a + 1))
  return yield* $(Effect.fail(`r: ${b}`))
})

Effect.unsafeFork(Effect.catchAllCause(program, Effect.logErrorCause))
