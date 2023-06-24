import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("can lift a value to an option", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeedSome(42))
      assert.deepStrictEqual(result, Option.some(42))
    }))
  it.effect("using the none value", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeedNone)
      assert.deepStrictEqual(result, Option.none())
    }))
})
