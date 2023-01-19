import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import type * as Fiber from "@effect/io/Fiber"
import * as core from "@effect/io/internal/core"
import * as circular from "@effect/io/internal/effect/circular"
import * as metric from "@effect/io/internal/metric"
import * as schedule from "@effect/io/internal/schedule"
import type * as Metric from "@effect/io/Metric"
import type * as PollingMetric from "@effect/io/Metric/Polling"
import type * as Schedule from "@effect/io/Schedule"
import type * as Scope from "@effect/io/Scope"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
const PollingMetricSymbolKey = "@effect/io/Metric/Polling"

/** @internal */
export const PollingMetricTypeId: PollingMetric.PollingMetricTypeId = Symbol.for(
  PollingMetricSymbolKey
) as PollingMetric.PollingMetricTypeId

/** @internal */
export const make = <Type, In, Out, R, E>(
  metric: Metric.Metric<Type, In, Out>,
  poll: Effect.Effect<R, E, In>
): PollingMetric.PollingMetric<Type, In, R, E, Out> => {
  return {
    [PollingMetricTypeId]: PollingMetricTypeId,
    metric,
    poll: () => {
      const trace = getCallTrace()
      return poll.traced(trace)
    }
  }
}

/** @internal */
export const collectAll = <R, E, Out>(
  iterable: Iterable<PollingMetric.PollingMetric<any, any, R, E, Out>>
): PollingMetric.PollingMetric<Chunk.Chunk<any>, Chunk.Chunk<any>, R, E, Chunk.Chunk<Out>> => {
  const metrics = Array.from(iterable)
  return {
    [PollingMetricTypeId]: PollingMetricTypeId,
    metric: metric.make(
      Chunk.of<any>(void 0) as Chunk.Chunk<any>,
      (inputs: Chunk.Chunk<any>, extraTags) => {
        for (let i = 0; i < inputs.length; i++) {
          const pollingMetric = metrics[i]!
          const input = pipe(inputs, Chunk.unsafeGet(i))
          pollingMetric.metric.unsafeUpdate(input, extraTags)
        }
      },
      (extraTags) => Chunk.unsafeFromArray(metrics.map((pollingMetric) => pollingMetric.metric.unsafeValue(extraTags)))
    ),
    poll: () => {
      const trace = getCallTrace()
      return pipe(metrics, core.forEach((metric) => metric.poll())).traced(trace)
    }
  }
}

/** @internal */
export const launch = <R2, A2>(schedule: Schedule.Schedule<R2, unknown, A2>) => {
  return <Type, In, R, E, Out>(
    self: PollingMetric.PollingMetric<Type, In, R, E, Out>
  ): Effect.Effect<R | R2 | Scope.Scope, never, Fiber.Fiber<E, A2>> => {
    return pipe(
      pollAndUpdate(self),
      core.zipRight(metric.value(self.metric)),
      circular.scheduleForked(schedule)
    )
  }
}

/** @internal */
export const poll = <Type, In, R, E, Out>(
  self: PollingMetric.PollingMetric<Type, In, R, E, Out>
): Effect.Effect<R, E, In> => {
  const trace = getCallTrace()
  return self.poll().traced(trace)
}

/** @internal */
export const pollAndUpdate = <Type, In, R, E, Out>(
  self: PollingMetric.PollingMetric<Type, In, R, E, Out>
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  return pipe(
    self.poll(),
    core.flatMap((value) => pipe(self.metric, metric.update(value)))
  ).traced(trace)
}

/** @internal */
export const retry = <R2, E, _>(policy: Schedule.Schedule<R2, E, _>) => {
  return <Type, In, R, Out>(
    self: PollingMetric.PollingMetric<Type, In, R, E, Out>
  ): PollingMetric.PollingMetric<Type, In, R | R2, E, Out> => ({
    [PollingMetricTypeId]: PollingMetricTypeId,
    metric: self.metric,
    poll: () => {
      const trace = getCallTrace()
      return pipe(self.poll(), schedule.retry_Effect(policy)).traced(trace)
    }
  })
}

/** @internal */
export const zip = <Type2, In2, R2, E2, Out2>(
  that: PollingMetric.PollingMetric<Type2, In2, R2, E2, Out2>
) => {
  return <Type, In, R, E, Out>(
    self: PollingMetric.PollingMetric<Type, In, R, E, Out>
  ): PollingMetric.PollingMetric<
    readonly [Type, Type2],
    readonly [In, In2],
    R | R2,
    E | E2,
    readonly [Out, Out2]
  > => ({
    [PollingMetricTypeId]: PollingMetricTypeId,
    metric: pipe(self.metric, metric.zip(that.metric)),
    poll: () => {
      const trace = getCallTrace()
      return pipe(self.poll(), core.zip(that.poll())).traced(trace)
    }
  })
}
