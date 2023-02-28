import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Random from "@effect/io/Random"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("non-memoized returns new instances on repeated calls", () =>
    it.flakyTest(Effect.gen(function*($) {
      const random = Random.nextInt()
      const [first, second] = yield* $(pipe(random, Effect.zip(random)))
      assert.notStrictEqual(first, second)
    })))
  it.effect("memoized returns the same instance on repeated calls", () =>
    it.flakyTest(Effect.gen(function*($) {
      const memo = Effect.memoize(Random.nextInt())
      const [first, second] = yield* $(pipe(memo, Effect.flatMap((effect) => pipe(effect, Effect.zip(effect)))))
      assert.strictEqual(first, second)
    })))
  it.effect("memoized function returns the same instance on repeated calls", () =>
    it.flakyTest(Effect.gen(function*($) {
      const randomNumber = (n: number) => Random.nextIntBetween(n, n + n)
      const memoized = yield* $(Effect.memoizeFunction(randomNumber))
      const a = yield* $(memoized(10))
      const b = yield* $(memoized(10))
      const c = yield* $(memoized(11))
      const d = yield* $(memoized(11))
      assert.strictEqual(a, b)
      assert.notStrictEqual(b, c)
      assert.strictEqual(c, d)
    })))
  it.effect("once returns an effect that will only be executed once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const effect: Effect.Effect<never, never, void> = yield* $(pipe(Ref.update(ref, (n) => n + 1), Effect.once()))
      yield* $(pipe(effect, Effect.replicate(100), Effect.collectAllPar()))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))
})
