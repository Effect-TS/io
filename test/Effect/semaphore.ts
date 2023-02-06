import * as D from "@effect/data/Duration"
import * as Effect from "@effect/io/Effect"
import * as TestClock from "@effect/io/internal_effect_untraced/testing/testClock"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("semaphore works", () =>
    Effect.gen(function*($) {
      const sem = yield* $(Effect.makeSemaphore(4))
      const messages: Array<string> = []
      yield* $(
        Effect.fork(Effect.collectAllPar(
          [0, 1, 2, 3].map((n) =>
            sem.withPermits(2)(Effect.delay(D.seconds(2))(Effect.sync(() => messages.push(`process: ${n}`))))
          )
        ))
      )
      yield* $(TestClock.adjust(D.seconds(3)))
      assert.equal(messages.length, 2)
      yield* $(TestClock.adjust(D.seconds(3)))
      assert.equal(messages.length, 4)
      yield* $(
        Effect.fork(Effect.collectAllPar(
          [0, 1, 2, 3].map((n) =>
            sem.withPermits(2)(Effect.delay(D.seconds(2))(Effect.sync(() => messages.push(`process: ${n}`))))
          )
        ))
      )
      yield* $(TestClock.adjust(D.seconds(3)))
      assert.equal(messages.length, 6)
      yield* $(TestClock.adjust(D.seconds(3)))
      assert.equal(messages.length, 8)
    }))
})
