import * as Config from "@effect/io/Config"
import * as ConfigProvider from "@effect/io/Config/Provider"
import * as Effect from "@effect/io/Effect"
import * as it from "@effect/io/test/utils/extend"

const mockConfigProvider = ConfigProvider.fromMap(
  new Map([
    ["HOST", "localhost"],
    ["PORT", "8080"]
  ])
)

describe("Effect", () => {
  it.effect("setConfigProvider/ value", () =>
    Effect.gen(function*($) {
      const val = yield* $(
        Effect.config(Config.string("HOST")),
        Effect.provideLayer(Effect.setConfigProvider(mockConfigProvider))
      )
      assert.deepStrictEqual(val, "localhost")
    }))

  it.effect("setConfigProvider/ effect", () =>
    Effect.gen(function*($) {
      const val = yield* $(
        Effect.config(Config.string("HOST")),
        Effect.provideLayer(Effect.setConfigProvider(Effect.sync(() => mockConfigProvider)))
      )
      assert.deepStrictEqual(val, "localhost")
    }))
})
