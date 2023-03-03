import * as Effect from "@effect/io/Effect"
import * as it from "@effect/io/test/utils/extend"
import { describe } from "vitest"

describe.concurrent("Effect", () => {
  describe("all", () => {
    it.effect("should work with multiple arguments", () =>
      Effect.gen(function*($) {
        const [a, b] = yield* $(Effect.all(Effect.succeed(0), Effect.succeed(1)))
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 1)
      }))
    it.effect("should work with one argument", () =>
      Effect.gen(function*($) {
        const [a] = yield* $(Effect.all(Effect.succeed(0)))
        assert.strictEqual(a, 0)
      }))
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const [a, b] = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)]))
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 1)
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all([]))
        assert.deepEqual(x, [])
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const { a, b } = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }))
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 1)
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all({}))
        assert.deepEqual(x, {})
      }))
  })
  describe("allPar", () => {
    it.effect("should work with multiple arguments", () =>
      Effect.gen(function*($) {
        const [a, b] = yield* $(Effect.allPar(Effect.succeed(0), Effect.succeed(1)))
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 1)
      }))
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const [a, b] = yield* $(Effect.allPar([Effect.succeed(0), Effect.succeed(1)]))
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 1)
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.allPar([]))
        assert.deepEqual(x, [])
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const { a, b } = yield* $(Effect.allPar({ a: Effect.succeed(0), b: Effect.succeed(1) }))
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 1)
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.allPar({}))
        assert.deepEqual(x, {})
      }))
  })
})
