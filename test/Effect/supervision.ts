import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as Layer from "@effect/io/Layer"
import * as Supervisor from "@effect/io/Supervisor"
import * as it from "@effect/io/test/utils/extend"

class CustomSupervisor extends Supervisor.AbstractSupervisor<number> {
  count = 0
  constructor() {
    super()
  }
  value(): Effect.Effect<never, never, number> {
    return Effect.sync(() => this.count)
  }
  onResume<E, A>(_fiber: Fiber.RuntimeFiber<E, A>): void {
    this.count++
  }
}

const supervisor = new CustomSupervisor()

const initial = Layer.flatMap(
  Supervisor.addSupervisor(supervisor),
  (env) =>
    Layer.map(
      Layer.effectDiscard(Effect.yieldNow()),
      () => env
    )
)

describe.concurrent("Effect", () => {
  it.effect("supervises onResume", () =>
    Effect.provideSomeLayer(initial)(
      Effect.gen(function*($) {
        const result0 = yield* $(Effect.sync(() => supervisor.count))
        const fiber = yield* $(Effect.sync(() => supervisor.count), Effect.fork)
        const result1 = yield* $(Fiber.join(fiber))
        assert.strictEqual(result0 > 0, true)
        assert.strictEqual(result1, result0 + 1)
      })
    ))
})
