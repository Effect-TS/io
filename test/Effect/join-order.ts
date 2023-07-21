import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as FiberRef from "@effect/io/FiberRef"
import * as TestClock from "@effect/io/internal/testing/testClock"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("zip/all joins fibers in the correct order", () =>
    Effect.gen(function*($) {
      const ref = yield* $(FiberRef.make(5))
      const fiber = yield* $(Effect.fork(Effect.zip(
        FiberRef.set(ref, 10).pipe(Effect.delay("2 seconds")),
        FiberRef.set(ref, 15),
        { concurrent: true }
      )))
      yield* $(TestClock.adjust("3 seconds"))
      yield* $(Fiber.join(fiber))
      assert.strictEqual(yield* $(FiberRef.get(ref)), 10)
    }).pipe(Effect.scoped))
})
