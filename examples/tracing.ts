import * as Debug from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import { pipe } from "@fp-ts/data/Function"
import parser from "error-stack-parser"

Debug.runtimeDebug.parseStack = (error, depth) => {
  const frames = parser.parse(error)
  const frame = frames[depth - 1]!

  if (frame) {
    return `${frame.getFileName()}:${frame.getLineNumber()}:${frame.getColumnNumber()}`
  }
}

const program = pipe(
  Effect.flatMap(Effect.succeed(0), (n) => Effect.succeed(n + 1)),
  Effect.flatMap((r) => Effect.fail(`r: ${r}`))
)

Effect.unsafeFork(Effect.catchAllCause(program, Effect.logErrorCause))
