/* eslint-disable import/first */
import { runtimeDebug } from "@effect/io/Debug"

runtimeDebug.traceEnabled = true

// Rest
import * as E from "@effect/io/Effect"
import * as F from "@fp-ts/data/Function"

console.log(F.pipe(E.succeed(0), E.flatMap((n) => E.succeed(n + 1))))
