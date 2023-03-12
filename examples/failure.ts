import * as Debug from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"

Debug.runtimeDebug.tracingEnabled = false

Effect.runPromise(Effect.fail(0)).catch((e) => {
  console.log(e)
})
