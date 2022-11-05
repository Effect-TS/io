/* eslint-disable import/first */
import { runtimeDebug } from "@effect/io/Debug"

runtimeDebug.traceEnabled = true

// Rest
import * as Effect from "@effect/io/Effect"
import { pipe } from "@fp-ts/data/Function"

Effect.unsafeRunAsync(
  pipe(
    [1, 2, 3, 4, 5],
    Effect.forEach((n) => Effect.succeed(n + 1)),
    Effect.flatMap((chunk) => Effect.sync(() => console.log(Array.from(chunk))))
  )
)
