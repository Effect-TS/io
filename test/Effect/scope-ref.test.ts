import { Tag } from "@effect/data/Context"
import * as List from "@effect/data/List"
import * as Effect from "@effect/io/Effect"
import * as FiberRef from "@effect/io/FiberRef"
import * as Layer from "@effect/io/Layer"
import * as Logger from "@effect/io/Logger"
import * as it from "@effect/io/test/utils/extend"
import { describe } from "bun:test"
import assert from "node:assert"

const ref = FiberRef.unsafeMake(List.empty<string>())
const env = Tag<"context", number>()

const withValue = (value: string) => Effect.locallyWith(ref, List.prepend(value))

const logRef = (msg: string) =>
  Effect.gen(function*($) {
    const stack = yield* $(FiberRef.get(ref))
    const value = yield* $(env)
    yield* $(Effect.log(`${value} | ${msg} | ${List.toReadonlyArray(stack).join(" > ")}`))
  })

describe("Effect", () => {
  it.effect("scoped ref", () =>
    Effect.gen(function*($) {
      const messages: Array<unknown> = []
      const layer = Layer.mergeAll(
        Logger.replace(
          Logger.defaultLogger,
          Logger.make((_) => {
            messages.push(_.message)
          })
        ),
        Layer.succeed(env, 1)
      )

      yield* $(
        Effect.acquireRelease(
          withValue("A")(logRef("acquire")),
          () => withValue("R")(logRef("release"))
        ),
        withValue("INNER"),
        Effect.scoped,
        withValue("OUTER"),
        Effect.provideSomeLayer(layer),
        withValue("EXTERN")
      )

      assert.deepStrictEqual(messages, [
        "1 | acquire | A > INNER > OUTER > EXTERN",
        "1 | release | R > INNER > OUTER > EXTERN"
      ])
    }))
})
