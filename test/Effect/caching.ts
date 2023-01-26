import * as Effect from "@effect/io/Effect"
import * as TestClock from "@effect/io/internal_effect_untraced/testing/testClock"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("cached - returns new instances after duration", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const cache = yield* $(pipe(
        Ref.updateAndGet(ref, (n) => n + 1),
        Effect.cached(Duration.minutes(60))
      ))
      const a = yield* $(cache)
      yield* $(TestClock.adjust(Duration.minutes(59)))
      const b = yield* $(cache)
      yield* $(TestClock.adjust(Duration.minutes(1)))
      const c = yield* $(cache)
      yield* $(TestClock.adjust(Duration.minutes(59)))
      const d = yield* $(cache)
      assert.strictEqual(a, b)
      assert.notStrictEqual(b, c)
      assert.strictEqual(c, d)
    }))
  it.effect("cached - correctly handles an infinite duration time to live", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const cached = yield* $(pipe(
        Ref.modify(ref, (curr) => [curr, curr + 1]),
        Effect.cached(Duration.infinity)
      ))
      const a = yield* $(cached)
      const b = yield* $(cached)
      const c = yield* $(cached)
      assert.strictEqual(a, 0)
      assert.strictEqual(b, 0)
      assert.strictEqual(c, 0)
    }))
  it.effect("cachedInvalidate - returns new instances after duration", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const [cached, invalidate] = yield* $(
        pipe(
          Ref.updateAndGet(ref, (n) => n + 1),
          Effect.cachedInvalidate(Duration.minutes(60))
        )
      )
      const a = yield* $(cached)
      yield* $(TestClock.adjust(Duration.minutes(59)))
      const b = yield* $(cached)
      yield* $(invalidate)
      const c = yield* $(cached)
      yield* $(TestClock.adjust(Duration.minutes(1)))
      const d = yield* $(cached)
      yield* $(TestClock.adjust(Duration.minutes(59)))
      const e = yield* $(cached)
      assert.strictEqual(a, b)
      assert.notStrictEqual(b, c)
      assert.strictEqual(c, d)
      assert.notStrictEqual(d, e)
    }))
})
