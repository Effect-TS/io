import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("collectAllPar - returns result in the same order", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.allPar([1, 2, 3].map(Effect.succeed)))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("collectAllPar - is referentially transparent", () =>
    Effect.gen(function*($) {
      const counter = yield* $(Ref.make(0))
      const op = Ref.getAndUpdate(counter, (n) => n + 1)
      const ops3 = Effect.allPar([op, op, op])
      const result = yield* $(ops3, Effect.zipPar(ops3))
      assert.notDeepEqual(Array.from(result[0]), Array.from(result[1]))
    }))
  it.effect("collectAllPar - returns results in the same order in parallel", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.allPar([1, 2, 3].map(Effect.succeed)), Effect.withParallelism(2))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("collectAllParDiscard - preserves failures", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.allIterable(Array.from({ length: 10 }, () => Effect.fail(Cause.RuntimeException())), {
          concurrency: 5,
          discard: true
        }),
        Effect.flip
      )
      assert.deepStrictEqual(result, Cause.RuntimeException())
    }))
})
