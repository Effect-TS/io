import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
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
  onRun<E, A, X>(execution: () => X, _fiber: Fiber.RuntimeFiber<E, A>): X {
    try {
      this.count++
      return execution()
    } finally {
      this.count--
    }
  }
}

const supervisor = new CustomSupervisor()

describe.concurrent("Effect", () => {
  it.effect("supervises onRun", () =>
    Effect.provideSomeLayer(Supervisor.addSupervisor(supervisor))(
      Effect.gen(function*($) {
        const result0 = yield* $(Effect.sync(() => supervisor.count))
        const fiber = yield* $(Effect.sync(() => supervisor.count), Effect.fork)
        const result1 = yield* $(Fiber.join(fiber))
        assert.strictEqual(result0 > 0, true)
        assert.strictEqual(result1 > 0, true)
      })
    ))
})
