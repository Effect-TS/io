import * as Clock from "@effect/io/Clock"
import * as Effect from "@effect/io/Effect"
import * as TestClock from "@effect/io/internal/testing/testClock"
import * as Ref from "@effect/io/Ref"
import * as Schedule from "@effect/io/Schedule"
import * as it from "@effect/io/test/utils/extend"
import * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("schedule - runs effect for each recurrence of the schedule", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<ReadonlyArray<Duration.Duration>>([])
      const effect = pipe(
        Clock.currentTimeMillis(),
        Effect.flatMap((duration) => pipe(ref, Ref.update((array) => [...array, Duration.millis(duration)])))
      )
      const schedule = pipe(
        Schedule.spaced(Duration.seconds(1)),
        Schedule.intersect(Schedule.recurs(5))
      )
      yield* pipe(effect, Effect.schedule(schedule), Effect.fork)
      yield* TestClock.adjust(Duration.seconds(5))
      const value = yield* Ref.get(ref)
      const expected = [1, 2, 3, 4, 5].map(Duration.seconds)
      assert.deepStrictEqual(value, expected)
    }))
})
