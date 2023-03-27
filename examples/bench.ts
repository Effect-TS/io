import * as Debug from "@effect/data/Debug"
import * as Effect from "@effect/io/Effect"

Debug.runtimeDebug.tracingEnabled = false

const program = Effect.repeatN(100_000)(Effect.acquireUseRelease(
  Effect.succeed(0),
  (n) => Effect.sync(() => n + 1),
  () => Effect.suspend(() => Effect.getFiberRefs())
))

const main = Effect.flatMap(Effect.timed(program), ([d]) => Effect.log(`Time: ${d.millis}ms`))

Effect.runFork(main)
