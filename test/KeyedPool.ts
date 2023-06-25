import * as Chunk from "@effect/data/Chunk"
import * as Duration from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as TestClock from "@effect/io/internal/testing/testClock"
import * as KeyedPool from "@effect/io/KeyedPool"
import * as Random from "@effect/io/Random"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import { describe, expect } from "vitest"

describe("KeyedPool", () => {
  it.scoped("acquire release many successfully while other key is blocked", () =>
    Effect.gen(function*($) {
      const N = 10
      const pool = yield* $(KeyedPool.makeSized((key: string) => Effect.succeed(key), 4))
      yield* $(
        KeyedPool.get(pool, "key1"),
        Effect.repeatN(3),
        Effect.asUnit
      )
      const fiber = yield* $(Effect.fork(
        Effect.forEachParDiscard(Chunk.range(1, N), () =>
          Effect.scoped(
            Effect.zipRight(
              KeyedPool.get(pool, "key2"),
              Effect.sleep(Duration.millis(10))
            )
          ))
      ))
      yield* $(TestClock.adjust(Duration.millis(10 * N)))
      const result = yield* $(Fiber.join(fiber))
      expect(result).toBeUndefined()
    }))

  it.scoped("acquire release many with invalidates", () =>
    Effect.gen(function*($) {
      const N = 10
      const counter = yield* $(Ref.make(0))
      const pool = yield* $(KeyedPool.makeSized(
        (key) => Ref.modify(counter, (n) => [`${key}-${n}`, n + 1] as const),
        4
      ))
      const fiber = yield* $(Effect.fork(
        Effect.forEachParDiscard(Chunk.range(1, N), () =>
          Effect.scoped(pipe(
            KeyedPool.get(pool, "key1"),
            Effect.flatMap((value) =>
              Effect.zipRight(
                Effect.whenEffect(
                  KeyedPool.invalidate(pool, value),
                  Random.nextBoolean
                ),
                Effect.flatMap(
                  Random.nextIntBetween(0, 15),
                  (n) => Effect.sleep(Duration.millis(n))
                )
              )
            )
          )))
      ))
      yield* $(TestClock.adjust(Duration.millis(15 * N)))
      const result = yield* $(Fiber.join(fiber))
      expect(result).toBeUndefined()
    }))
})
