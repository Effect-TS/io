import * as Debug from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"

Debug.runtimeDebug.filterStackFrame = (trace) => trace.includes(__dirname)

const program = Effect.gen(function*($) {
  const a = yield* $(Effect.succeed(0))
  const b = yield* $(Effect.succeed(a + 1))
  return yield* $(Effect.fail(new Error(`r: ${b}`)))
})

Effect.unsafeFork(Effect.catchAllCause(program, Effect.logErrorCause))
