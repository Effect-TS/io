import * as Chunk from "@effect/data/Chunk"
import * as Either from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as it from "@effect/io/test/utils/extend"
import { describe } from "vitest"

describe.concurrent("Effect", () => {
  describe("all", () => {
    it.effect("should work with multiple arguments", () =>
      Effect.gen(function*($) {
        const [a, b] = yield* $(Effect.all(Effect.succeed(0), Effect.succeed(1)))
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
      }))
    it.effect("should work with one argument", () =>
      Effect.gen(function*($) {
        const [a] = yield* $(Effect.all(Effect.succeed(0)))
        assert.deepEqual(a, 0)
      }))
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)]))
        assert.deepEqual(res, [0, 1])
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all([]))
        assert.deepEqual(x, [])
      }))
    it.effect("should work with an iterable argument", () =>
      Effect.gen(function*($) {
        const y = Effect.all(Chunk.make(Effect.succeed(0), Effect.succeed("ok"), Effect.fail(1)))
        const x = yield* $(Effect.either(y))
        assert.deepEqual(x, Either.left(1))
      }))
    it.effect("should work with an array argument", () =>
      Effect.gen(function*($) {
        const y = Effect.all([0, 1, 2].map((n) => Effect.succeed(n + 1)))
        const x = yield* $(y)
        assert.deepEqual(x, [1, 2, 3])
      }))
    it.effect("should work with an array argument piped", () =>
      Effect.gen(function*($) {
        const y = pipe([0, 1, 2].map((n) => Effect.succeed(n + 1)), Effect.all)
        const x = yield* $(y)
        assert.deepEqual(x, [1, 2, 3])
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const { a, b } = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }))
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
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
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
      }))
    it.effect("should work with one argument", () =>
      Effect.gen(function*($) {
        const [a] = yield* $(Effect.all(Effect.succeed(0)))
        assert.deepEqual(a, 0)
      }))
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.allPar([Effect.succeed(0), Effect.succeed(1)]))
        assert.deepEqual(res, [0, 1])
      }))
    it.effect("should work with an array argument piped", () =>
      Effect.gen(function*($) {
        const y = pipe([0, 1, 2].map((n) => Effect.succeed(n + 1)), Effect.allPar)
        const x = yield* $(y)
        assert.deepEqual(x, [1, 2, 3])
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.allPar([]))
        assert.deepEqual(x, [])
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const { a, b } = yield* $(Effect.allPar({ a: Effect.succeed(0), b: Effect.succeed(1) }))
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.allPar({}))
        assert.deepEqual(x, {})
      }))
  })
})
