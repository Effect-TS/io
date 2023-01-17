import * as Effect from "@effect/io/Effect"
import * as Queue from "@effect/io/Queue"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import { constFalse, constTrue, pipe } from "@fp-ts/data/Function"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("retryUntil - retries until condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(pipe(
        Ref.updateAndGet(input)((n) => n - 1),
        Effect.zipLeft(Ref.update(output)((n) => n + 1)),
        Effect.flipWith(Effect.retryUntil((n) => n === 0))
      ))
      const result = yield* $(Ref.get(output))
      assert.strictEqual(result, 10)
    }))
  it.effect("retryUntil - runs at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(pipe(Ref.update(ref)((n) => n + 1), Effect.flipWith(Effect.retryUntil(constTrue))))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))
  it.effect("retryUntilEquals - retries until error equals predicate", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const queue = yield* $(Queue.unbounded<number>())
      yield* $(pipe(queue, Queue.offerAll([1, 2, 3, 4, 5, 6])))
      yield* $(pipe(
        Queue.take(queue),
        Effect.zipLeft(Ref.update(ref)((n) => n + 1)),
        Effect.flipWith(Effect.retryUntilEquals(5))
      ))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 5)
    }))
  it.effect("retryUntilEffect - retries until condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(pipe(
        Ref.updateAndGet(input)((n) => n - 1),
        Effect.zipLeft(Ref.update(output)((n) => n + 1)),
        Effect.flipWith(Effect.retryUntilEffect((n) => Effect.succeed(n === 0)))
      ))
      const result = yield* $(Ref.get(output))
      assert.strictEqual(result, 10)
    }))
  it.effect("retryUntilEffect - runs at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(pipe(
        Ref.update(ref)((n) => n + 1),
        Effect.flipWith(Effect.retryUntilEffect(() => Effect.succeed(true)))
      ))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))
  it.effect("retryWhile - retries while condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(pipe(
        Ref.updateAndGet(input)((n) => n - 1),
        Effect.zipLeft(Ref.update(output)((n) => n + 1)),
        Effect.flipWith(Effect.retryWhile((n) => n >= 0))
      ))
      const result = yield* $(Ref.get(output))
      assert.strictEqual(result, 11)
    }))
  it.effect("retryWhile - runs at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(pipe(Ref.update(ref)((n) => n + 1), Effect.flipWith(Effect.retryWhile(constFalse))))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))
  it.effect("retryWhileEquals - retries while error equals predicate", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const queue = yield* $(Queue.unbounded<number>())
      yield* $(pipe(queue, Queue.offerAll([0, 0, 0, 0, 1, 2])))
      yield* $(pipe(
        Queue.take(queue),
        Effect.zipLeft(Ref.update(ref)((n) => n + 1)),
        Effect.flipWith(Effect.retryWhileEquals(0))
      ))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 5)
    }))
  it.effect("retryWhileEffect - retries while condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(pipe(
        Ref.updateAndGet(input)((n) => n - 1),
        Effect.zipLeft(Ref.update(output)((n) => n + 1)),
        Effect.flipWith(Effect.retryWhileEffect((n) => Effect.succeed(n >= 0)))
      ))
      const result = yield* $(Ref.get(output))
      assert.strictEqual(result, 11)
    }))
  it.effect("retryWhileEffect - runs at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(pipe(
        Ref.update(ref)((n) => n + 1),
        Effect.flipWith(Effect.retryWhileEffect(() => Effect.succeed(false)))
      ))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))
})
