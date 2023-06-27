import * as Effect from "@effect/io/Effect"
import * as Chunk from "@effect/data/Chunk"
import * as it from "@effect/io/test/utils/extend"
import { describe } from "vitest"
import { pipe } from "@effect/data/Function"
import {assertType} from "@effect/io/test/utils/types"

describe.concurrent("Effect", () => {
  describe("all", () => {
    it.effect("should work with multiple arguments", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all(Effect.succeed(0), Effect.succeed(1)))
        const [a, b] = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
        assertType<readonly [number, number]>()(result) satisfies true
      }))
    it.effect("should work with one argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all(Effect.succeed(0)))
        const [a] = result
        assert.deepEqual(a, 0)
        assertType<readonly [number]>()(result) satisfies true
      }))
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)]))
        assert.deepEqual(res, [0, 1])
        assertType<ReadonlyArray<number>>()(res) satisfies true
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all([]))
        assert.deepEqual(x, [])
        assertType<readonly []>()(x) satisfies true
      }))
    it.effect("should work with an array argument", () =>
      Effect.gen(function*($) {
        const y = Effect.all([0, 1, 2].map((n) => Effect.succeed(n + 1)))
        const x = yield* $(y)
        assert.deepEqual(x, [1, 2, 3])
        assertType<ReadonlyArray<number>>()(x) satisfies true
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }))
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
        assertType<{
          readonly a: number
          readonly b: number
        }>()(result) satisfies true
      }))
    it.effect("record should work with pipe", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          { a: Effect.succeed(0), b: Effect.succeed("hello") },
          Effect.all
        )
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, "hello")
        assertType<{
          readonly a: number
          readonly b: string
        }>()(result) satisfies true
      }))
    it.effect("tuple should work with pipe", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          [Effect.succeed(0), Effect.succeed(1)] as const,
          Effect.all
        )
        const [a, b] = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
        assertType<readonly [number, number]>()(result) satisfies true
      }))
    it.effect("array should work with pipe", () =>
      Effect.gen(function*($) {
        const a = yield* $(
          [Effect.succeed(0), Effect.succeed(1)],
          Effect.all
        )
        assert.deepEqual(a, [0, 1])
        assertType<ReadonlyArray<number>>()(a) satisfies true
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all({}))
        assert.deepEqual(x, {})
        assertType<{}>()(x) satisfies true
      }))
    it.effect("should work with chunk", () =>
      Effect.gen(function*($) {
        const x = Chunk.make(Effect.succeed(1), Effect.succeed(2))
        const a = yield* $(x, Effect.all)
        assert.deepEqual(a, [1, 2])
        assertType<ReadonlyArray<number>>()(a) satisfies true
      }))
    it.effect("should work with pipe and generics", () =>
      Effect.gen(function*($) {
        const allGeneric = <R, E, A>(effects: Iterable<Effect.Effect<R, E, A>>) => pipe(
          effects,
          Effect.all
        )
        const chunk = Chunk.make(Effect.succeed(1), Effect.succeed(2))
        const a = yield* $(chunk, allGeneric)
        assert.deepEqual(a, [1, 2])
        assertType<ReadonlyArray<number>>()(a) satisfies true
      }))
    it.effect("with undefined options", () => Effect.gen(function* (_) {
      const x = yield* _(
        Effect.all(Effect.succeed(0), Effect.succeed(1), undefined)
      )
      assert.deepEqual(x, [0, 1])
      assertType<readonly [number, number]>()(x) satisfies true
    }))
    it.effect("tuple should work with pipe and generics", () => Effect.gen(function* (_) {
      const allGeneric = <A, B>(a: A, b: B) => pipe(
        [Effect.succeed(a), Effect.succeed(b)] as const,
        Effect.all
      )
      const x = yield* _(allGeneric(0, "hello"))
      assert.deepEqual(x, [0, "hello"])
      assertType<readonly [number, string]>()(x) satisfies true
    }))
    it.effect("iterable should work with pipe and generics", () => Effect.gen(function* (_) {
      const allGeneric = <A>(a: Iterable<A>) => pipe(
        Array.from(a).map(Effect.succeed),
        Effect.all
      )
      assertType<<A>(a: Iterable<A>) => Effect.Effect<never, never, ReadonlyArray<A>>>()(allGeneric)
      const x = yield* _(allGeneric(Chunk.make(0, "hello")))
      assert.deepEqual(x, [0, "hello"])
      assertType<ReadonlyArray<string | number>>()(x) satisfies true
    }))
    it.effect("struct should work with pipe and generics", () => Effect.gen(function* (_) {
      const allGeneric = <A, B>(a: A, b: B) => pipe(
        { a: Effect.succeed(a), b: Effect.succeed(b) },
        Effect.all
      )
      const x = yield* _(allGeneric(0, "hello"))
      assert.deepEqual(x, { a: 0, b: "hello" })
      assertType<{
        readonly a: number
        readonly b: string
      }>()(x) satisfies true
    }))
  })
  describe("all/ concurrency", () => {
    it.effect("should work with multiple arguments", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all(Effect.succeed(0), Effect.succeed(1), {
          concurrency: "inherit"
        }))
        const [a, b] = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
        assertType<readonly [number, number]>()(result) satisfies true
      }))
    it.effect("should work with one argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all(Effect.succeed(0), {
          concurrency: "inherit"
        }))
        const [a] = result
        assert.deepEqual(a, 0)
        assertType<readonly [number]>()(result) satisfies true
      }))
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)], {
          concurrency: "inherit"
        }))
        assert.deepEqual(res, [0, 1])
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all([], {
          concurrency: "inherit"
        }))
        assert.deepEqual(x, [])
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) },  {
          concurrency: "inherit"
        }))
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
        assertType<{
          readonly a: number
          readonly b: number
        }>()(result) satisfies true
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all({}, { concurrency: "inherit" }))
        assert.deepEqual(x, {})
        assertType<{}>()(x) satisfies true
      }))
  })
  describe("allWith", () => {
    it.effect("record should work with pipe", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          { a: Effect.succeed(0), b: Effect.succeed("hello") },
          Effect.allWith({ concurrency: "inherit" })
        )
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, "hello")
        assertType<{
          readonly a: number
          readonly b: string
        }>()(result) satisfies true
      }))
    it.effect("tuple should work with pipe", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          [Effect.succeed(0), Effect.succeed("hello")] as const,
          Effect.allWith({ concurrency: "inherit" })
        )
        const [a, b] = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, "hello")
        assertType<readonly [number, string]>()(result) satisfies true
      }))
    it.effect("array should work with pipe", () =>
      Effect.gen(function*($) {
        const a = yield* $(
          [Effect.succeed(0), Effect.succeed(1)],
          Effect.allWith({ concurrency: "inherit" })
        )
        assert.deepEqual(a, [0, 1])
        assertType<ReadonlyArray<number>>()(a) satisfies true
      }))
    it.effect("discard", () =>
      Effect.gen(function*($) {
        const a = yield* $(
          [Effect.succeed(0), Effect.succeed(1)],
          Effect.allWith({ concurrency: "inherit", discard: true })
        )
        assert.deepEqual(a, void 0)
        assertType<void>()(a) satisfies true
      }))
    it.effect("tuple should work with pipe and generics", () => Effect.gen(function* (_) {
      const allGeneric = <A, B>(a: A, b: B) => pipe(
        [Effect.succeed(a), Effect.succeed(b)] as const,
        Effect.allWith()
      )
      const x = yield* _(allGeneric(0, "hello"))
      assert.deepEqual(x, [0, "hello"])
      assertType<readonly [number, string]>()(x) satisfies true
    }))
    it.effect("iterable should work with pipe and generics", () => Effect.gen(function* (_) {
      const allGeneric = <A>(a: Iterable<A>) => pipe(
        Array.from(a).map(Effect.succeed),
        Effect.allWith()
      )
      assertType<<A>(a: Iterable<A>) => Effect.Effect<never, never, ReadonlyArray<A>>>()(allGeneric)
      const x = yield* _(allGeneric(Chunk.make(0, "hello")))
      assert.deepEqual(x, [0, "hello"])
      assertType<ReadonlyArray<string | number>>()(x) satisfies true
    }))
    it.effect("struct should work with pipe and generics", () => Effect.gen(function* (_) {
      const allGeneric = <A, B>(a: A, b: B) => pipe(
        { a: Effect.succeed(a), b: Effect.succeed(b) },
        Effect.allWith()
      )
      const x = yield* _(allGeneric(0, "hello"))
      assert.deepEqual(x, { a: 0, b: "hello" })
      assertType<{
        readonly a: number
        readonly b: string
      }>()(x) satisfies true
    }))
  })
})
