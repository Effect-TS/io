/* eslint-disable import/first */
import { runtimeDebug } from "@effect/io/Debug"

runtimeDebug.traceEnabled = true

// Rest
import * as E from "@effect/io/Effect"

console.log(E.yieldNow())
console.log(E.yieldNow())
