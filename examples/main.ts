import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import { pipe } from "@fp-ts/data/Function"

Effect.unsafeRunWith(
  pipe(
    Effect.sync(() => "hello"),
    Effect.map((hello) => hello + ", world!"),
    Effect.flatMap((msg) => Effect.log(msg)),
    Effect.provideSomeLayer(Logger.console())
  ),
  (_exit) => {
    console.log("Exit", _exit)
  }
)
