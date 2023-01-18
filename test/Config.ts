import * as Cause from "@effect/io/Cause"
import * as Config from "@effect/io/Config"
import * as ConfigError from "@effect/io/Config/Error"
import * as ConfigProvider from "@effect/io/Config/Provider"
import * as ConfigSecret from "@effect/io/Config/Secret"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as it from "@effect/io/test/utils/extend"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import { assert, describe } from "vitest"

describe.concurrent("Config", () => {
  describe.concurrent("withDefault", () => {
    it.effect("recovers from missing data error", () =>
      Effect.gen(function*($) {
        const config = pipe(
          Config.integer("key"),
          Config.withDefault(0)
        )
        const configProvider = ConfigProvider.fromMap(new Map())
        const result = yield* $(configProvider.load(config))
        assert.strictEqual(result, 0)
      }))

    it.effect("does not recover from other errors", () =>
      Effect.gen(function*($) {
        const config = pipe(
          Config.integer("key"),
          Config.withDefault(0)
        )
        const configProvider = ConfigProvider.fromMap(new Map([["key", "value"]]))
        const result = yield* $(pipe(
          Effect.exit(configProvider.load(config)),
          Effect.map(Exit.unannotate)
        ))
        assert.isTrue(
          Exit.isFailure(result) &&
            Cause.isFailType(result.cause) &&
            ConfigError.isInvalidData(result.cause.error)
        )
      }))

    it.effect("does not recover from missing data and other error", () =>
      Effect.gen(function*($) {
        const config = pipe(
          Config.integer("key1"),
          Config.zip(Config.integer("key2")),
          Config.withDefault<readonly [number, number]>([0, 0])
        )
        const configProvider = ConfigProvider.fromMap(new Map([["key2", "value"]]))
        const result = yield* $(pipe(
          Effect.exit(configProvider.load(config)),
          Effect.map(Exit.unannotate)
        ))
        assert.isTrue(
          Exit.isFailure(result) &&
            Cause.isFailType(result.cause) &&
            ConfigError.isAnd(result.cause.error) &&
            ConfigError.isMissingData(result.cause.error.left) &&
            ConfigError.isInvalidData(result.cause.error.right)
        )
      }))

    it.effect("recovers from missing data or other error", () =>
      Effect.gen(function*($) {
        const config = pipe(
          Config.integer("key1"),
          Config.orElse(() => Config.integer("key2")),
          Config.withDefault(0)
        )
        const configProvider = ConfigProvider.fromMap(new Map([["key2", "value"]]))
        const result = yield* $(configProvider.load(config))
        assert.strictEqual(result, 0)
      }))
  })

  describe.concurrent("optional", () => {
    it.effect("recovers from missing data error", () =>
      Effect.gen(function*($) {
        const config = Config.optional(Config.integer("key"))
        const configProvider = ConfigProvider.fromMap(new Map())
        const result = yield* $(configProvider.load(config))
        assert.deepStrictEqual(result, Option.none)
      }))

    it.effect("does not recover from other errors", () =>
      Effect.gen(function*($) {
        const config = Config.optional(Config.integer("key"))
        const configProvider = ConfigProvider.fromMap(new Map([["key", "value"]]))
        const result = yield* $(pipe(
          Effect.exit(configProvider.load(config)),
          Effect.map(Exit.unannotate)
        ))
        assert.isTrue(
          Exit.isFailure(result) &&
            Cause.isFailType(result.cause) &&
            ConfigError.isInvalidData(result.cause.error)
        )
      }))

    it.effect("does not recover from missing data and other error", () =>
      Effect.gen(function*($) {
        const config = pipe(
          Config.integer("key1"),
          Config.zip(Config.integer("key2")),
          Config.optional
        )
        const configProvider = ConfigProvider.fromMap(new Map([["key2", "value"]]))
        const result = yield* $(pipe(
          Effect.exit(configProvider.load(config)),
          Effect.map(Exit.unannotate)
        ))
        assert.isTrue(
          Exit.isFailure(result) &&
            Cause.isFailType(result.cause) &&
            ConfigError.isAnd(result.cause.error) &&
            ConfigError.isMissingData(result.cause.error.left) &&
            ConfigError.isInvalidData(result.cause.error.right)
        )
      }))

    it.effect("recovers from missing data or other error", () =>
      Effect.gen(function*($) {
        const config = pipe(
          Config.integer("key1"),
          Config.orElse(() => Config.integer("key2")),
          Config.optional
        )
        const configProvider = ConfigProvider.fromMap(new Map([["key2", "value"]]))
        const result = yield* $(configProvider.load(config))
        assert.deepStrictEqual(result, Option.none)
      }))
  })

  describe.concurrent("Secret", () => {
    it.it("chunk constructor", () => {
      const secret = ConfigSecret.fromChunk(Chunk.fromIterable("secret".split("")))
      assert.isTrue(Equal.equals(secret, ConfigSecret.fromString("secret")))
    })

    it.it("value", () => {
      const secret = ConfigSecret.fromChunk(Chunk.fromIterable("secret".split("")))
      const value = ConfigSecret.value(secret)
      assert.strictEqual(value, "secret")
    })

    it.it("toString", () => {
      const secret = ConfigSecret.fromString("secret")
      assert.strictEqual(`${secret}`, "ConfigSecret(<redacted>)")
    })

    it.it("wipe", () => {
      const secret = ConfigSecret.fromString("secret")
      ConfigSecret.unsafeWipe(secret)
      assert.isTrue(
        Equal.equals(
          ConfigSecret.value(secret),
          Array.from({ length: "secret".length }, () => String.fromCharCode(0)).join("")
        )
      )
    })
  })
})
