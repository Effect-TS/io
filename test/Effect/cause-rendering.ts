import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("Cause should include span data", () =>
    Effect.gen(function*($) {
      const cause = yield* $(Effect.flip(Effect.sandbox(
        Effect.withSpan("spanB")(
          Effect.withSpan("spanA")(
            Effect.fail(new Error("ok"))
          )
        )
      )))
      const rendered = Cause.pretty(cause)
      assert.include(rendered, "spanA")
      assert.include(rendered, "spanB")
    }))
  it.effect("catchTag should not invalidate traces", () =>
    Effect.gen(function*($) {
      class E1 {
        readonly _tag = "E1"
      }
      class E2 {
        readonly _tag = "E2"
      }
      const effect = Effect.withSpan("spanB")(
        Effect.withSpan("spanA")(
          Effect.if(Effect.sync(() => Math.random() > 1), {
            onTrue: Effect.fail(new E2()),
            onFalse: Effect.fail(new E1())
          })
        )
      ).pipe(Effect.catchTag("E2", (e) => Effect.die(e)))
      const cause = yield* $(Effect.flip(Effect.sandbox(effect)))
      const rendered = Cause.pretty(cause)
      assert.include(rendered, "spanA")
      assert.include(rendered, "spanB")
    }))
  it.effect("catchTags should not invalidate traces", () =>
    Effect.gen(function*($) {
      class E1 {
        readonly _tag = "E1"
      }
      class E2 {
        readonly _tag = "E2"
      }
      const effect = Effect.withSpan("spanB")(
        Effect.withSpan("spanA")(
          Effect.if(Effect.sync(() => Math.random() > 1), {
            onTrue: Effect.fail(new E2()),
            onFalse: Effect.fail(new E1())
          })
        )
      ).pipe(Effect.catchTags({ E2: (e) => Effect.die(e) }))
      const cause = yield* $(Effect.flip(Effect.sandbox(effect)))
      const rendered = Cause.pretty(cause)
      assert.include(rendered, "spanA")
      assert.include(rendered, "spanB")
    }))
})
