import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as FiberId from "@effect/io/Fiber/Id"
import * as it from "@effect/io/test/utils/extend"
import { pipe } from "@fp-ts/data/Function"
import { assert, describe } from "vitest"

const ExampleError = new Error("Oh noes!")

describe.concurrent("Effect", () => {
  it.effect("done lifts exit into an effect", () =>
    Effect.gen(function*() {
      const fiberId = FiberId.make(0, 123)
      const error = ExampleError
      const completed = yield* Effect.done(Exit.succeed(1))
      const interrupted = yield* pipe(Effect.done(Exit.interrupt(fiberId)), Effect.exit)
      const terminated = yield* pipe(Effect.done(Exit.die(error)), Effect.exit)
      const failed = yield* pipe(Effect.done(Exit.fail(error)), Effect.exit)
      assert.strictEqual(completed, 1)
      assert.deepStrictEqual(Exit.unannotate(interrupted), Exit.interrupt(fiberId))
      assert.deepStrictEqual(Exit.unannotate(terminated), Exit.die(error))
      assert.deepStrictEqual(Exit.unannotate(failed), Exit.fail(error))
    }))
})
