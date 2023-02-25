import * as Effect from "@effect/io/Effect"
import * as it from "@effect/io/test/utils/extend"
import { describe } from "vitest"

describe.concurrent("Effect", () => {
  describe("sequential", () => {
    it.effect("should work with multiple arguments", () =>
      Effect.gen(function*($) {
        const [a, b] = yield* $(Effect.sequential(Effect.succeed(0), Effect.succeed(1)))
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 1)
      }))
    it.effect("should work with one argument", () =>
      Effect.gen(function*($) {
        const [a] = yield* $(Effect.sequential(Effect.succeed(0)))
        assert.strictEqual(a, 0)
      }))
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const [a, b] = yield* $(Effect.sequential([Effect.succeed(0), Effect.succeed(1)]))
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 1)
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.sequential([]))
        assert.deepEqual(x, [])
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const { a, b } = yield* $(Effect.sequential({ a: Effect.succeed(0), b: Effect.succeed(1) }))
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 1)
      }))
    it.effect("should work with no arguments", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.sequential())
        assert.deepEqual(x, [])
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.sequential({}))
        assert.deepEqual(x, {})
      }))
  })
  describe("parallel", () => {
    it.effect("should work with multiple arguments", () =>
      Effect.gen(function*($) {
        const [a, b] = yield* $(Effect.parallel(Effect.succeed(0), Effect.succeed(1)))
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 1)
      }))
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const [a, b] = yield* $(Effect.parallel([Effect.succeed(0), Effect.succeed(1)]))
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 1)
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.parallel([]))
        assert.deepEqual(x, [])
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const { a, b } = yield* $(Effect.parallel({ a: Effect.succeed(0), b: Effect.succeed(1) }))
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 1)
      }))
    it.effect("should work with no arguments", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.parallel())
        assert.deepEqual(x, [])
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.parallel({}))
        assert.deepEqual(x, {})
      }))
  })
})
