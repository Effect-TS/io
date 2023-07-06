import * as Effect from "@effect/io/Effect"
import * as Scheduler from "@effect/io/Scheduler"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("matrix schedules according to priority", () =>
    Effect.gen(function*($) {
      const ps000: Array<number> = []
      const ps100: Array<number> = []
      const ps200: Array<number> = []
      const scheduler = Scheduler.matrix(
        [
          0,
          Scheduler.make((task, priority) => {
            ps000.push(priority)
            setTimeout(task, 0)
          })
        ],
        [
          100,
          Scheduler.make((task, priority) => {
            ps100.push(priority)
            setTimeout(task, 0)
          })
        ],
        [
          200,
          Scheduler.make((task, priority) => {
            ps200.push(priority)
            setTimeout(task, 0)
          })
        ]
      )
      yield* $(
        Effect.fork(Effect.unit()),
        Effect.withScheduler(scheduler)
      )
      assert.deepEqual(ps000, [0])
      yield* $(
        Effect.fork(Effect.unit()),
        Effect.withSchedulingPriority(50),
        Effect.withScheduler(scheduler)
      )
      assert.deepEqual(ps000, [0, 50])
      yield* $(
        Effect.fork(Effect.unit()),
        Effect.withSchedulingPriority(100),
        Effect.withScheduler(scheduler)
      )
      assert.deepEqual(ps100, [100])
      yield* $(
        Effect.fork(Effect.unit()),
        Effect.withSchedulingPriority(150),
        Effect.withScheduler(scheduler)
      )
      assert.deepEqual(ps100, [100, 150])
      yield* $(
        Effect.fork(Effect.unit()),
        Effect.withSchedulingPriority(200),
        Effect.withScheduler(scheduler)
      )
      assert.deepEqual(ps100, [100, 150])
      assert.deepEqual(ps200, [200])
    }))
})
