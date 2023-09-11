import * as Either from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as it from "@effect/io/test/utils/extend"
import { describe, expect } from "bun:test"
import assert from "node:assert"

const sum = (n: number): number => {
  if (n < 0) {
    return 0
  }
  return n + sum(n - 1)
}

describe("Effect", () => {
  it.effect("sync - effect", () =>
    Effect.gen(function*($) {
      const sumEffect = (n: number): Effect.Effect<never, unknown, number> => {
        if (n < 0) {
          return Effect.sync(() => 0)
        }
        return pipe(Effect.sync(() => n), Effect.flatMap((b) => pipe(sumEffect(n - 1), Effect.map((a) => a + b))))
      }
      const result = yield* $(sumEffect(1000))
      assert.strictEqual(result, sum(1000))
    }))
  it.it("sync - must be lazy", async () => {
    let program
    try {
      program = Effect.sync(() => {
        throw new Error("shouldn't happen!")
      })
      program = Effect.succeed(true)
    } catch {
      program = Effect.succeed(false)
    }
    const result = await Effect.runPromise(program)
    expect(result).toBeTrue()
  })
  it.it("suspend - must be lazy", async () => {
    let program
    try {
      program = Effect.suspend(() => {
        throw new Error("shouldn't happen!")
      })
      program = Effect.succeed(true)
    } catch {
      program = Effect.succeed(false)
    }
    const result = await Effect.runPromise(program)
    expect(result).toBeTrue()
  })
  it.effect("suspend - must catch throwable", () =>
    Effect.gen(function*($) {
      const error = new Error("woops")
      const result = yield* $(
        Effect.suspend<never, never, never>(() => {
          throw error
        }),
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.die(error))
    }))
  it.effect("suspendSucceed - must be evaluatable", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.suspend(() => Effect.succeed(42)))
      assert.strictEqual(result, 42)
    }))
  it.effect("suspendSucceed - must not catch throwable", () =>
    Effect.gen(function*($) {
      const error = new Error("woops")
      const result = yield* $(
        Effect.suspend<never, never, never>(() => {
          throw error
        }),
        Effect.sandbox,
        Effect.either
      )
      assert.deepStrictEqual(result, Either.left(Cause.die(error)))
    }))
})
