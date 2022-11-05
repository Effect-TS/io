import * as Effect from "@effect/io/Effect"
import { pipe } from "@fp-ts/data/Function"

Effect.unsafeRunWith(
  pipe(
    Effect.sync(() => "hello"),
    Effect.map((hello) => hello + ", world!")
    // Effect.flatMap((hello) => Effect.sync(() => ))
  ),
  (_exit) => {
    console.log("Exit", _exit)
  }
)
