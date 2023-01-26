import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"
import * as ROArray from "@fp-ts/data/ReadonlyArray"

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

Effect.unsafeRunPromiseExit(program).then((exit) => {
  if (Exit.isFailure(exit)) {
    console.log(Cause.pretty(exit.cause))
  }
})
