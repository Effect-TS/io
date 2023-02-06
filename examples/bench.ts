import * as Duration from "@effect/data/Duration"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import { pipe } from "@fp-ts/core/Function"
import * as ROArray from "@fp-ts/core/ReadonlyArray"

const program = pipe(
  ROArray.range(1, 4),
  Effect.forEach((n) =>
    pipe(
      Effect.sync(() => console.log(n)),
      Effect.blocking,
      Effect.delay(Duration.millis(200))
    )
  )
)

Effect.runPromiseExit(program).then((exit) => {
  if (Exit.isFailure(exit)) {
    console.log(Cause.pretty(exit.cause))
  }
})
