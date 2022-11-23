import * as Effect from "@effect/io/Effect"
import * as it from "@effect/io/test/utils/extend"
import * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("returns first success", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.fail("fail"),
        Effect.raceAll([Effect.succeed(24)])
      )
      assert.strictEqual(result, 24)
    }))

  it.live("returns last failure", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.sleep(Duration.millis(100)),
        Effect.zipRight(Effect.fail(24)),
        Effect.raceAll([Effect.fail(25)]),
        Effect.flip
      )
      assert.strictEqual(result, 24)
    }))

  it.live("returns success when it happens after failure", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.fail(42),
        Effect.raceAll([
          pipe(
            Effect.succeed(24),
            Effect.zipLeft(Effect.sleep(Duration.millis(100)))
          )
        ])
      )
      assert.strictEqual(result, 24)
    }))
})
