import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as it from "@effect/io/test/utils/extend"
import { assertType } from "@effect/io/test/utils/types"
import { describe } from "vitest"

const satisfies = <T>(type: T) => type

describe.concurrent("Effect", () => {
  describe("all", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)]))
        assert.deepEqual(res, [0, 1])
        satisfies<true>(assertType<[number, number]>()(res))
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all([]))
        assert.deepEqual(x, [])
        satisfies<true>(assertType<[]>()(x))
      }))
    it.effect("should work with an array argument", () =>
      Effect.gen(function*($) {
        const y = Effect.all([0, 1, 2].map((n) => Effect.succeed(n + 1)))
        const x = yield* $(y)
        assert.deepEqual(x, [1, 2, 3])
        satisfies<true>(assertType<Array<number>>()(x))
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }))
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
        satisfies<true>(
          assertType<{
            readonly a: number
            readonly b: number
          }>()(result)
        )
      }))
    it.effect("should work with one iterable argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all(new Set([Effect.succeed(0), Effect.succeed(1)])))
        assert.deepEqual(result, [0, 1])
        satisfies<true>(assertType<Array<number>>()(result))
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all({}))
        assert.deepEqual(x, {})
        satisfies<true>(assertType<{}>()(x))
      }))
  })
  describe("all/ concurrency", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)], {
          concurrency: "unbounded"
        }))
        assert.deepEqual(res, [0, 1])
        satisfies<true>(assertType<[number, number]>()(res))
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all([], {
          concurrency: "unbounded"
        }))
        assert.deepEqual(x, [])
        satisfies<true>(assertType<[]>()(x))
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }, {
          concurrency: "unbounded"
        }))
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
        satisfies<true>(
          assertType<{
            a: number
            b: number
          }>()(result)
        )
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all({}, { concurrency: "unbounded" }))
        assert.deepEqual(x, {})
        satisfies<true>(assertType<{}>()(x))
      }))
  })
  describe("allValidate", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.allValidate([Effect.succeed(0), Effect.succeed(1)]))
        assert.deepEqual(res, [0, 1])
        satisfies<true>(assertType<[number, number]>()(res))
      }))
    it.effect("failure should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.flip(Effect.allValidate([Effect.fail(0), Effect.succeed(1)])))
        assert.deepEqual(res, [Option.some(0), Option.none()])
        satisfies<true>(assertType<[Option.Option<number>, Option.Option<never>]>()(res))
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.allValidate({ a: Effect.succeed(0), b: Effect.succeed(1) }))
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
        satisfies<true>(
          assertType<{
            readonly a: number
            readonly b: number
          }>()(result)
        )
      }))
    it.effect("failure should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.flip(Effect.allValidate({ a: Effect.fail(0), b: Effect.succeed(1) })))
        const { a, b } = result
        assert.deepEqual(a, Option.some(0))
        assert.deepEqual(b, Option.none())
        satisfies<true>(
          assertType<{
            readonly a: Option.Option<number>
            readonly b: Option.Option<never>
          }>()(result)
        )
      }))
    it.effect("should work with one iterable argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.allValidate(new Set([Effect.succeed(0), Effect.succeed(1)])))
        assert.deepEqual(result, [0, 1])
        satisfies<true>(assertType<Array<number>>()(result))
      }))
  })
})
