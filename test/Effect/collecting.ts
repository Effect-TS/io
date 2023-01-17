import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("collectAllPar - returns result in the same order", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.collectAllPar([1, 2, 3].map(Effect.succeed)))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("collectAllPar - is referentially transparent", () =>
    Effect.gen(function*($) {
      const counter = yield* $(Ref.make(0))
      const op = Ref.getAndUpdate(counter)((n) => n + 1)
      const ops3 = Effect.collectAllPar([op, op, op])
      const result = yield* $(pipe(ops3, Effect.zipPar(ops3)))
      assert.notDeepEqual(Array.from(result[0]), Array.from(result[1]))
    }))
  it.effect("collectAllPar - returns results in the same order in parallel", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(Effect.collectAllPar([1, 2, 3].map(Effect.succeed)), Effect.withParallelism(2)))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("collectAllParDiscard - preserves failures", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Effect.collectAllParDiscard(Array.from({ length: 10 }, () => Effect.fail(Cause.RuntimeException()))),
        Effect.withParallelism(5),
        Effect.flip
      ))
      assert.deepStrictEqual(result, Cause.RuntimeException())
    }))
  it.effect("collectFirst - collects the first value for which the effectual function returns Some", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Array.from({ length: 10 }, (_, i) => i),
        Effect.collectFirst((n) =>
          n > 5 ?
            Effect.succeed(Option.some(n)) :
            Effect.succeed(Option.none)
        )
      ))
      assert.deepStrictEqual(result, Option.some(6))
    }))
})
