/* eslint-disable import/first */
import { runtimeDebug } from "@effect/io/Debug"

runtimeDebug.traceEnabled = true

// Rest
import * as Effect from "@effect/io/Effect"
import { pipe } from "@fp-ts/data/Function"

Effect.unsafeRunWith(
  pipe(Effect.succeed(0), Effect.flatMap((n) => Effect.succeed(n + 1))),
  (exit) => {
    console.log(exit)
  }
)
