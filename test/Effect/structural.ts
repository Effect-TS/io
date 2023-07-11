import * as Chunk from "@effect/data/Chunk"
import { pipe } from "@effect/data/Function"
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
    it.effect("record should work with pipe", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          { a: Effect.succeed(0), b: Effect.succeed("hello") },
          Effect.all()
        )
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, "hello")
        satisfies<true>(
          assertType<{
            readonly a: number
            readonly b: string
          }>()(result)
        )
      }))
    it.effect("tuple should work with pipe", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          [Effect.succeed(0), Effect.succeed(1)] as const,
          Effect.all()
        )
        const [a, b] = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
        satisfies<true>(assertType<[number, number]>()(result))
      }))
    it.effect("array should work with pipe", () =>
      Effect.gen(function*($) {
        const a = yield* $(
          [Effect.succeed(0), Effect.succeed(1)],
          Effect.all()
        )
        assert.deepEqual(a, [0, 1])
        satisfies<true>(assertType<Array<number>>()(a))
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all({}))
        assert.deepEqual(x, {})
        satisfies<true>(assertType<{}>()(x))
      }))
    it.effect("should work with chunk", () =>
      Effect.gen(function*($) {
        const x = Chunk.make(Effect.succeed(1), Effect.succeed(2))
        const a = yield* $(x, Effect.all())
        assert.deepEqual(a, [1, 2])
        satisfies<true>(assertType<Array<number>>()(a))
      }))
    it.effect("should work with pipe and generics", () =>
      Effect.gen(function*($) {
        const allGeneric = <R, E, A>(effects: Iterable<Effect.Effect<R, E, A>>) =>
          pipe(
            effects,
            Effect.all()
          )
        const chunk = Chunk.make(Effect.succeed(1), Effect.succeed(2))
        const a = yield* $(chunk, allGeneric)
        assert.deepEqual(a, [1, 2])
        satisfies<true>(assertType<Array<number>>()(a))
      }))
    it.effect("tuple should work with pipe and generics", () =>
      Effect.gen(function*(_) {
        const allGeneric = <A, B>(a: A, b: B) =>
          pipe(
            [Effect.succeed(a), Effect.succeed(b)] as const,
            Effect.all()
          )
        const x = yield* _(allGeneric(0, "hello"))
        assert.deepEqual(x, [0, "hello"])
        satisfies<true>(assertType<[number, string]>()(x))
      }))
    it.effect("iterable should work with pipe and generics", () =>
      Effect.gen(function*(_) {
        const allGeneric = <A>(a: Iterable<A>) =>
          pipe(
            Array.from(a).map(Effect.succeed),
            Effect.all()
          )
        type F = <A>(a: Iterable<A>) => Effect.Effect<never, never, Array<A>>
        satisfies<true>(assertType<F>()(allGeneric))
        const x = yield* _(allGeneric(Chunk.make(0, "hello")))
        assert.deepEqual(x, [0, "hello"])
        satisfies<true>(assertType<Array<string | number>>()(x))
      }))
    it.effect("struct should work with pipe and generics", () =>
      Effect.gen(function*(_) {
        const allGeneric = <A, B>(a: A, b: B) =>
          pipe(
            { a: Effect.succeed(a), b: Effect.succeed(b) },
            Effect.all()
          )
        const x = yield* _(allGeneric(0, "hello"))
        assert.deepEqual(x, { a: 0, b: "hello" })
        satisfies<true>(
          assertType<{
            readonly a: number
            readonly b: string
          }>()(x)
        )
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
    it.effect("record should work with pipe", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          { a: Effect.succeed(0), b: Effect.succeed("hello") },
          Effect.all({ concurrency: "unbounded" })
        )
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, "hello")
        satisfies<true>(
          assertType<{
            a: number
            b: string
          }>()(result)
        )
      }))
    it.effect("tuple should work with pipe", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          [Effect.succeed(0), Effect.succeed("hello")] as const,
          Effect.all({ concurrency: "unbounded" })
        )
        const [a, b] = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, "hello")
        satisfies<true>(assertType<[number, string]>()(result))
      }))
    it.effect("array should work with pipe", () =>
      Effect.gen(function*($) {
        const a = yield* $(
          [Effect.succeed(0), Effect.succeed(1)],
          Effect.all({ concurrency: "unbounded" })
        )
        assert.deepEqual(a, [0, 1])
        satisfies<true>(assertType<Array<number>>()(a))
      }))
    it.effect("discard", () =>
      Effect.gen(function*($) {
        const a = yield* $(
          [Effect.succeed(0), Effect.succeed(1)],
          Effect.all({ concurrency: "unbounded", discard: true })
        )
        assert.deepEqual(a, void 0)
        satisfies<true>(assertType<void>()(a))
      }))
    it.effect("tuple should work with pipe and generics", () =>
      Effect.gen(function*(_) {
        const allGeneric = <A, B>(a: A, b: B) =>
          pipe(
            [Effect.succeed(a), Effect.succeed(b)] as const,
            Effect.all()
          )
        const x = yield* _(allGeneric(0, "hello"))
        assert.deepEqual(x, [0, "hello"])
        satisfies<true>(assertType<[number, string]>()(x))
      }))
    it.effect("iterable should work with pipe and generics", () =>
      Effect.gen(function*(_) {
        const allGeneric = <A>(a: Iterable<A>) =>
          pipe(
            Array.from(a).map(Effect.succeed),
            Effect.all()
          )
        type F = <A>(a: Iterable<A>) => Effect.Effect<never, never, Array<A>>
        satisfies<true>(assertType<F>()(allGeneric))
        const x = yield* _(allGeneric(Chunk.make(0, "hello")))
        assert.deepEqual(x, [0, "hello"])
        satisfies<true>(assertType<Array<string | number>>()(x))
      }))
    it.effect("struct should work with pipe and generics", () =>
      Effect.gen(function*(_) {
        const allGeneric = <A, B>(a: A, b: B) =>
          pipe(
            { a: Effect.succeed(a), b: Effect.succeed(b) },
            Effect.all()
          )
        const x = yield* _(allGeneric(0, "hello"))
        assert.deepEqual(x, { a: 0, b: "hello" })
        satisfies<true>(
          assertType<{
            readonly a: number
            readonly b: string
          }>()(x)
        )
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
    it.effect("record should work with pipe", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          { a: Effect.succeed(0), b: Effect.succeed("hello") },
          Effect.allValidate()
        )
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, "hello")
        satisfies<true>(
          assertType<{
            readonly a: number
            readonly b: string
          }>()(result)
        )
      }))
    it.effect("record should work with pipe", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          { a: Effect.succeed(0), b: Effect.succeed("hello") },
          Effect.allValidate({ concurrency: "unbounded" })
        )
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, "hello")
        satisfies<true>(
          assertType<{
            readonly a: number
            readonly b: string
          }>()(result)
        )
      }))
    it.effect("failure/ record should work with pipe", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          { a: Effect.fail(0), b: Effect.fail("hello") },
          Effect.allValidate({ concurrency: "unbounded" }),
          Effect.flip
        )
        const { a, b } = result
        assert.deepEqual(a, Option.some(0))
        assert.deepEqual(b, Option.some("hello"))
        satisfies<true>(
          assertType<{
            readonly a: Option.Option<number>
            readonly b: Option.Option<string>
          }>()(result)
        )
      }))
    it.effect("tuple should work with pipe", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          [Effect.succeed(0), Effect.succeed("hello")] as const,
          Effect.allValidate({ concurrency: "unbounded" })
        )
        const [a, b] = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, "hello")
        satisfies<true>(assertType<[number, string]>()(result))
      }))
    it.effect("array should work with pipe", () =>
      Effect.gen(function*($) {
        const a = yield* $(
          [Effect.succeed(0), Effect.succeed(1)],
          Effect.allValidate({ concurrency: "unbounded" })
        )
        assert.deepEqual(a, [0, 1])
        satisfies<true>(assertType<Array<number>>()(a))
      }))
    it.effect("discard", () =>
      Effect.gen(function*($) {
        const a = yield* $(
          [Effect.succeed(0), Effect.succeed(1)],
          Effect.allValidate({ concurrency: "unbounded", discard: true })
        )
        assert.deepEqual(a, void 0)
        satisfies<true>(assertType<void>()(a))
      }))
    it.effect("tuple should work with pipe and generics", () =>
      Effect.gen(function*(_) {
        const allGeneric = <A, B>(a: A, b: B) =>
          pipe(
            [Effect.succeed(a), Effect.succeed(b)] as const,
            Effect.allValidate()
          )
        const x = yield* _(allGeneric(0, "hello"))
        assert.deepEqual(x, [0, "hello"])
        satisfies<true>(assertType<[number, string]>()(x))
      }))
    it.effect("iterable should work with pipe and generics", () =>
      Effect.gen(function*(_) {
        const allGeneric = <A>(a: Iterable<A>) =>
          pipe(
            Array.from(a).map(Effect.succeed),
            Effect.allValidate()
          )
        type F = <A>(a: Iterable<A>) => Effect.Effect<never, Array<Option.Option<never>>, Array<A>>
        satisfies<true>(assertType<F>()(allGeneric))
        const x = yield* _(allGeneric(Chunk.make(0, "hello")))
        assert.deepEqual(x, [0, "hello"])
        satisfies<true>(assertType<Array<string | number>>()(x))
      }))
    it.effect("struct should work with pipe and generics", () =>
      Effect.gen(function*(_) {
        const allGeneric = <A, B>(a: A, b: B) =>
          pipe(
            { a: Effect.succeed(a), b: Effect.succeed(b) },
            Effect.allValidate()
          )
        const x = yield* _(allGeneric(0, "hello"))
        assert.deepEqual(x, { a: 0, b: "hello" })
        satisfies<true>(
          assertType<{
            readonly a: number
            readonly b: string
          }>()(x)
        )
      }))
  })
})
