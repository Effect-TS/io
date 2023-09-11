import * as Context from "@effect/data/Context"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as FiberRef from "@effect/io/FiberRef"
import * as Layer from "@effect/io/Layer"
import * as RuntimeFlags from "@effect/io/RuntimeFlags"
import * as Scope from "@effect/io/Scope"
import * as it from "@effect/io/test/utils/extend"
import { describe } from "bun:test"
import assert from "node:assert"

interface A {
  readonly value: number
}
const A = Context.Tag<A>()
const LiveA = Layer.succeed(A, { value: 1 })
const ref = FiberRef.unsafeMake(0)
const LiveEnv = Layer.mergeAll(
  LiveA,
  RuntimeFlags.enableOpSupervision,
  Layer.scopedDiscard(Effect.locallyScoped(ref, 2))
)

describe("Effect", () => {
  it.it("provideSomeRuntime", async () => {
    const { runtime, scope } = await Effect.runPromise(
      Effect.flatMap(Scope.make(), (scope) =>
        Effect.map(
          Scope.extend(Layer.toRuntime(LiveEnv), scope),
          (runtime) => ({ runtime, scope })
        ))
    )

    const all = await Effect.runPromise(Effect.all(
      [
        Effect.provideSomeRuntime(
          Effect.gen(function*($) {
            const a = yield* $(FiberRef.get(ref))
            const b = yield* $(A)
            const c = RuntimeFlags.isEnabled(yield* $(Effect.getRuntimeFlags), RuntimeFlags.OpSupervision)
            return { a, b, c }
          }),
          runtime
        ),
        Effect.gen(function*($) {
          const a = yield* $(FiberRef.get(ref))
          const c = RuntimeFlags.isEnabled(yield* $(Effect.getRuntimeFlags), RuntimeFlags.OpSupervision)
          return { a, c }
        })
      ]
    ))

    await Effect.runPromise(Scope.close(scope, Exit.unit))

    assert.deepStrictEqual(all[0].a, 2)
    assert.deepStrictEqual(all[0].b, { value: 1 })
    assert.deepStrictEqual(all[0].c, true)
    assert.deepStrictEqual(all[1].a, 0)
    assert.deepStrictEqual(all[1].c, false)
  })
})
