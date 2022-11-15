import * as Clock from "@effect/io/Clock"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as Metric from "@effect/io/Metric"
import * as PollingMetric from "@effect/io/PollingMetric"
import * as Schedule from "@effect/io/Schedule"
import * as it from "@effect/io/test/utils/extend"
import * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"
import { assert, describe } from "vitest"

const makePollingGauge = (name: string, increment: number) => {
  const gauge = Metric.gauge(name)
  const metric = PollingMetric.make(
    gauge,
    pipe(Metric.value(gauge), Effect.map((gauge) => gauge.value + increment))
  )
  return [gauge, metric] as const
}

describe.concurrent("PollingMetric", () => {
  it.effect("launch should be interruptible", () =>
    Effect.gen(function*() {
      const name = yield* pipe(
        Clock.currentTimeMillis(),
        Effect.map((now) => `gauge-${now}`)
      )
      const [gauge, metric] = makePollingGauge(name, 1)
      const schedule = pipe(
        Schedule.forever(),
        Schedule.delayed((_) => Duration.millis(250))
      )
      const fiber = yield* pipe(
        metric,
        PollingMetric.launch(schedule),
        Effect.scoped
      )
      yield* Fiber.interrupt(fiber)
      const result = yield* Metric.value(gauge)
      assert.strictEqual(result.value, 0)
    }))

  // TODO: never terminates
  // it.effect("launch should update the interanl metric using the provided Schedule", () =>
  //   Effect.gen(function*() {
  //     const name = yield* pipe(
  //       Clock.currentTimeMillis(),
  //       Effect.map((now) => `gauge-${now}`)
  //     )
  //     const [gauge, metric] = makePollingGauge(name, 1)
  //     const fiber = yield* pipe(
  //       metric,
  //       PollingMetric.launch(Schedule.once()),
  //       Effect.scoped
  //     )
  //     yield* Fiber.join(fiber)
  //     const result = yield* Metric.value(gauge)
  //     assert.strictEqual(result.value, 1)
  //   }))

  // TODO: never terminates
  // it.effect("collectAll should generate a metric that polls all the provided metrics", () =>
  //   Effect.gen(function*() {
  //     const gaugeIncrement1 = 1
  //     const gaugeIncrement2 = 2
  //     const pollingCount = 2
  //     const name1 = yield* pipe(
  //       Clock.currentTimeMillis(),
  //       Effect.map((now) => `gauge1-${now}`)
  //     )
  //     const name2 = yield* pipe(
  //       Clock.currentTimeMillis(),
  //       Effect.map((now) => `gauge2-${now}`)
  //     )
  //     const [gauge1, metric1] = makePollingGauge(name1, gaugeIncrement1)
  //     const [gauge2, metric2] = makePollingGauge(name2, gaugeIncrement2)
  //     const metric = PollingMetric.collectAll([metric1, metric2])
  //     const fiber = yield* pipe(
  //       metric,
  //       PollingMetric.launch(Schedule.recurs(pollingCount)),
  //       Effect.scoped
  //     )
  //     yield* Fiber.join(fiber)
  //     const result1 = yield* Metric.value(gauge1)
  //     const result2 = yield* Metric.value(gauge2)
  //     assert.strictEqual(result1.value, gaugeIncrement1 * pollingCount)
  //     assert.strictEqual(result2.value, gaugeIncrement2 * pollingCount)
  //   }))
})
