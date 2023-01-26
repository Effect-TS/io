import * as Effect from "@effect/io/Effect"
import { pipe } from "@fp-ts/core/Function"

pipe(
  Effect.sync(() => "hello"),
  Effect.map((hello) => hello + ", world!"),
  Effect.flatMap(Effect.log),
  Effect.tapErrorCause(Effect.logErrorCause),
  Effect.runFork
)
