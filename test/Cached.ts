import * as Cached from "@effect/io/Cached"
import * as Effect from "@effect/io/Effect"
import * as TestClock from "@effect/io/internal_effect_untraced/testing/testClock"
import * as Ref from "@effect/io/Ref"
import * as Schedule from "@effect/io/Schedule"
import * as it from "@effect/io/test/utils/extend"
import * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"
import { assert, describe } from "vitest"

describe.concurrent("Cached", () => {
  it.scoped("manual", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const cached = yield* $(Cached.manual(Ref.get(ref)))
      const resul1 = yield* $(Cached.get(cached))
      const result2 = yield* $(
        pipe(Ref.set(ref, 1), Effect.zipRight(Cached.refresh(cached)), Effect.zipRight(Cached.get(cached)))
      )
      assert.strictEqual(resul1, 0)
      assert.strictEqual(result2, 1)
    }))
  it.scoped("auto", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const cached = yield* $(Cached.auto(Ref.get(ref), Schedule.spaced(Duration.millis(4))))
      const result1 = yield* $(Cached.get(cached))
      const result2 = yield* $(
        pipe(
          Ref.set(ref, 1),
          Effect.zipRight(TestClock.adjust(Duration.millis(5))),
          Effect.zipRight(Cached.get(cached))
        )
      )
      assert.strictEqual(result1, 0)
      assert.strictEqual(result2, 1)
    }))
  it.scopedLive("failed refresh doesn't affect cached value", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make<Either.Either<string, number>>(Either.right(0)))
      const cached = yield* $(Cached.auto(Effect.absolve(Ref.get(ref)), Schedule.spaced(Duration.millis(4))))
      const result1 = yield* $(Cached.get(cached))
      const result2 = yield* $(
        pipe(
          Ref.set(ref, Either.left("Uh oh!")),
          Effect.zipRight(Effect.sleep(Duration.millis(5))),
          Effect.zipRight(Cached.get(cached))
        )
      )
      assert.strictEqual(result1, 0)
      assert.strictEqual(result2, 0)
    }))
})
