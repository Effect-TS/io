import * as Effect from "@effect/io/Effect"
import * as it from "@effect/io/test/utils/extend"
import * as Either from "@fp-ts/data/Either"
import * as Option from "@fp-ts/data/Option"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("can lift a value to an option", () =>
    Effect.gen(function*() {
      const result = yield* Effect.succeedSome(42)
      assert.deepStrictEqual(result, Option.some(42))
    }))

  it.effect("using the none value", () =>
    Effect.gen(function*() {
      const result = yield* Effect.succeedNone()
      assert.deepStrictEqual(result, Option.none)
    }))

  it.effect("can lift a value into right", () =>
    Effect.gen(function*() {
      const result = yield* Effect.succeedRight(42)
      assert.deepStrictEqual(result, Either.right(42))
    }))

  it.effect("can lift a value into left", () =>
    Effect.gen(function*() {
      const result = yield* Effect.succeedLeft(42)
      assert.deepStrictEqual(result, Either.left(42))
    }))
})
