/* eslint-disable import/first */
import { runtimeDebug } from "@effect/io/Debug"

runtimeDebug.traceEnabled = true

// Rest
import * as E from "@effect/io/Effect"
import { pipe } from "@fp-ts/data/Function"

console.log(pipe(E.succeed(0), E.flatMap((n) => E.succeed(n + 1))))
