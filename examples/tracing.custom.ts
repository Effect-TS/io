import * as Debug from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import parser from "error-stack-parser"

Debug.runtimeDebug.parseStack = (error, depth) => {
  const frames = parser.parse(error)
  const frame = frames[depth - 1]!

  if (frame) {
    return `${frame.getFileName()}:${frame.getLineNumber()}:${frame.getColumnNumber()}`
  }
}

const program = Effect.gen(function*($) {
  const a = yield* $(Effect.succeed(0))
  const b = yield* $(Effect.succeed(a + 1))
  return yield* $(Effect.fail(`r: ${b}`))
})

Effect.unsafeFork(Effect.catchAllCause(program, Effect.logErrorCause))
