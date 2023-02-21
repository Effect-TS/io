import { constFalse, constTrue, pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Queue from "@effect/io/Queue"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("succeeds eventually", () =>
    Effect.gen(function*($) {
      const effect = (ref: Ref.Ref<number>) => {
        return pipe(
          Ref.get(ref),
          Effect.flatMap((n) =>
            n < 10 ?
              pipe(Ref.update(ref, (n) => n + 1), Effect.zipRight(Effect.fail("Ouch"))) :
              Effect.succeed(n)
          )
        )
      }
      const ref = yield* $(Ref.make(0))
      const result = yield* $(Effect.eventually(effect(ref)))
      assert.strictEqual(result, 10)
    }))
  it.effect("repeatUntil - repeats until condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(pipe(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.zipLeft(Ref.update(output, (n) => n + 1)),
        Effect.repeatUntil((n) => n === 0)
      ))
      const result = yield* $(Ref.get(output))
      assert.strictEqual(result, 10)
    }))
  it.effect("repeatUntil - always evaluates effect at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(pipe(Ref.update(ref, (n) => n + 1), Effect.repeatUntil(constTrue)))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))
  it.effect("repeatUntilEquals - repeats until result is equal to predicate", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const queue = yield* $(Queue.unbounded<number>())
      yield* $(Queue.offerAll(queue, [1, 2, 3, 4, 5, 6]))
      yield* $(pipe(
        Queue.take(queue),
        Effect.zipLeft(Ref.update(ref, (n) => n + 1)),
        Effect.repeatUntilEquals(5)
      ))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 5)
    }))
  it.effect("repeatUntilEffect - repeats until the effectful condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(pipe(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.zipLeft(Ref.update(output, (n) => n + 1)),
        Effect.repeatUntilEffect((n) => Effect.succeed(n === 0))
      ))
      const result = yield* $(Ref.get(output))
      assert.strictEqual(result, 10)
    }))
  it.effect("repeatUntilEffect - always evaluates the effect at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(pipe(Ref.update(ref, (n) => n + 1), Effect.repeatUntilEffect(() => Effect.succeed(true))))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))
  it.effect("repeatWhile - repeats while the condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(pipe(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.zipLeft(Ref.update(output, (n) => n + 1)),
        Effect.repeatWhile((n) => n >= 0)
      ))
      const result = yield* $(Ref.get(output))
      assert.strictEqual(result, 11)
    }))
  it.effect("repeatWhile - always evaluates the effect at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(pipe(Ref.update(ref, (n) => n + 1), Effect.repeatWhile(constFalse)))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))
  it.effect("repeatWhileEquals - repeats while the result equals the predicate", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const queue = yield* $(Queue.unbounded<number>())
      yield* $(Queue.offerAll(queue, [0, 0, 0, 0, 1, 2]))
      yield* $(
        pipe(Queue.take(queue), Effect.zipLeft(Ref.update(ref, (n) => n + 1)), Effect.repeatWhileEquals(0))
      )
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 5)
    }))
  it.effect("repeatWhileEffect - repeats while condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(pipe(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.zipLeft(Ref.update(output, (n) => n + 1)),
        Effect.repeatWhileEffect((v) => Effect.succeed(v >= 0))
      ))
      const result = yield* $(Ref.get(output))
      assert.strictEqual(result, 11)
    }))
  it.effect("repeatWhileEffect - always evaluates effect at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(pipe(Ref.update(ref, (n) => n + 1), Effect.repeatWhileEffect(() => Effect.succeed(false))))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))
})
