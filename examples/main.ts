import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"

pipe(
  Effect.sync(() => "hello"),
  Effect.map((hello) => hello + ", world!"),
  Effect.flatMap(Effect.log()),
  Effect.tapErrorCause(Effect.logErrorCause()),
  Effect.runFork
)
