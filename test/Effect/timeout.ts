import * as Duration from "@effect/data/Duration"
import { constFalse, pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as TestClock from "@effect/io/internal/testing/testClock"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.live("timeout a long computation", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          Effect.sleep(Duration.seconds(5)),
          Effect.zipRight(Effect.succeed(true)),
          Effect.timeoutFail({
            onTimeout: constFalse,
            duration: Duration.millis(10)
          }),
          Effect.exit
        )
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(false))
    }))
  it.live("timeout a long computation with a cause", () =>
    Effect.gen(function*($) {
      const cause = Cause.die(new Error("boom"))
      const result = yield* $(
        pipe(
          Effect.sleep(Duration.seconds(5)),
          Effect.zipRight(Effect.succeed(true)),
          Effect.timeoutFailCause({
            onTimeout: () => cause,
            duration: Duration.millis(10)
          }),
          Effect.sandbox,
          Effect.flip
        )
      )
      assert.deepStrictEqual(Cause.unannotate(result), cause)
    }))
  it.live("timeout repetition of uninterruptible effect", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(Effect.unit, Effect.uninterruptible, Effect.forever, Effect.timeout(Duration.millis(10)))
      )
      assert.deepStrictEqual(result, Option.none())
    }))
  it.effect("timeout in uninterruptible region", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.unit, Effect.timeout(Duration.seconds(20)), Effect.uninterruptible)
      assert.deepStrictEqual(result, Option.some(void 0))
    }))
  it.effect("timeout - disconnect - returns `Some` with the produced value if the effect completes before the timeout elapses", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.unit, Effect.disconnect, Effect.timeout(Duration.millis(100)))
      assert.deepStrictEqual(result, Option.some(void 0))
    }))
  it.effect("timeout - disconnect - returns `None` otherwise", () =>
    Effect.gen(function*($) {
      const fiber = yield* $(
        pipe(
          Effect.never,
          Effect.uninterruptible,
          Effect.disconnect,
          Effect.timeout(Duration.millis(100)),
          Effect.fork
        )
      )
      yield* $(TestClock.adjust(Duration.millis(100)))
      const result = yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(result, Option.none())
    }))
  it.effect("timeout should wait for interrupt even when uninterruptible", () =>
    Effect.gen(function*($) {
      const messages: Array<string> = []
      const log = (s: string) =>
        Effect.sync(() => {
          messages.push(s)
        })
      const program = log("start doing something.").pipe(
        Effect.flatMap(() => Effect.sleep("2 seconds")),
        Effect.flatMap(() => log("my job is finished!")),
        Effect.as("result")
      )
      const resultFiber = yield* $(
        program,
        Effect.timeout("1 seconds"),
        Effect.tap(() => log("done")),
        Effect.uninterruptible,
        Effect.fork
      )
      yield* $(TestClock.adjust(Duration.seconds(3)))
      const result = yield* $(Fiber.join(resultFiber))
      assert.deepStrictEqual(result, Option.none())
      assert.deepStrictEqual(messages, ["start doing something.", "my job is finished!", "done"])
    }))
})
