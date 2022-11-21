import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import { pipe } from "@fp-ts/data/Function"

const program = pipe(
  [1, 2, 3, 4, 5],
  Effect.forEach((n) => Effect.succeed(n + 1)),
  Effect.tap(() => Effect.die("error")),
  Effect.flatMap((chunk) => Effect.sync(() => console.log(Array.from(chunk))))
)

Effect.unsafeRunAsyncWith(
  program,
  (exit) => {
    if (Exit.isFailure(exit)) console.error(Cause.pretty()(exit.cause))
  }
)
