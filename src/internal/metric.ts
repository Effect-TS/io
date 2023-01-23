import * as Debug from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as Cause from "@effect/io/internal/cause"
import * as core from "@effect/io/internal/core"
import * as _effect from "@effect/io/internal/effect"
import * as metricBoundaries from "@effect/io/internal/metric/boundaries"
import * as metricKey from "@effect/io/internal/metric/key"
import * as metricLabel from "@effect/io/internal/metric/label"
import * as metricRegistry from "@effect/io/internal/metric/registry"
import type * as Metric from "@effect/io/Metric"
import type * as MetricBoundaries from "@effect/io/Metric/Boundaries"
import type * as MetricHook from "@effect/io/Metric/Hook"
import type * as MetricKey from "@effect/io/Metric/Key"
import type * as MetricKeyType from "@effect/io/Metric/KeyType"
import type * as MetricLabel from "@effect/io/Metric/Label"
import type * as MetricPair from "@effect/io/Metric/Pair"
import type * as MetricRegistry from "@effect/io/Metric/Registry"
import type * as MetricState from "@effect/io/Metric/State"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Duration from "@fp-ts/data/Duration"
import type { LazyArg } from "@fp-ts/data/Function"
import { constVoid, identity, pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/** @internal */
const MetricSymbolKey = "@effect/io/Metric"

/** @internal */
export const MetricTypeId: Metric.MetricTypeId = Symbol.for(
  MetricSymbolKey
) as Metric.MetricTypeId

/** @internal */
const metricVariance = {
  _Type: (_: any) => _,
  _In: (_: unknown) => _,
  _Out: (_: never) => _
}

/** @internal */
export const globalMetricRegistry: MetricRegistry.MetricRegistry = metricRegistry.make()

/** @internal */
export const make: Metric.MetricApply = function<Type, In, Out>(
  keyType: Type,
  unsafeUpdate: (input: In, extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => void,
  unsafeValue: (extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => Out
): Metric.Metric<Type, In, Out> {
  const metric: Metric.Metric<Type, In, Out> = Object.assign(
    <R, E, A extends In>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
      Debug.bodyWithTrace((trace) =>
        core.tap(
          effect,
          (a) => core.sync(() => unsafeUpdate(a, HashSet.empty()))
        ).traced(trace)
      ),
    {
      [MetricTypeId]: metricVariance,
      keyType,
      unsafeUpdate,
      unsafeValue
    } as const
  )
  return metric
}

/** @internal */
export const contramap = <In, In2>(f: (input: In2) => In) => {
  return <Type, Out>(self: Metric.Metric<Type, In, Out>): Metric.Metric<Type, In2, Out> => {
    return make(
      self.keyType,
      (input, extraTags) => self.unsafeUpdate(f(input), extraTags),
      self.unsafeValue
    )
  }
}

/** @internal */
export const counter = (name: string): Metric.Metric.Counter<number> => {
  return fromMetricKey(metricKey.counter(name))
}

/** @internal */
export const frequency = (name: string): Metric.Metric.Frequency<string> => {
  return fromMetricKey(metricKey.frequency(name))
}

/** @internal */
export const fromConst = <In>(input: LazyArg<In>) => {
  return <Type, Out>(self: Metric.Metric<Type, In, Out>): Metric.Metric<Type, unknown, Out> => {
    return pipe(self, contramap(input))
  }
}

/** @internal */
export const fromMetricKey = <Type extends MetricKeyType.MetricKeyType<any, any>>(
  key: MetricKey.MetricKey<Type>
): Metric.Metric<
  Type,
  MetricKeyType.MetricKeyType.InType<Type>,
  MetricKeyType.MetricKeyType.OutType<Type>
> => {
  const hook = (extraTags: HashSet.HashSet<MetricLabel.MetricLabel>): MetricHook.MetricHook<
    MetricKeyType.MetricKeyType.InType<Type>,
    MetricKeyType.MetricKeyType.OutType<Type>
  > => {
    const fullKey = pipe(key, metricKey.taggedWithLabelSet(extraTags))
    return globalMetricRegistry.get(fullKey)
  }
  return make(
    key.keyType,
    (input, extraTags) => hook(extraTags).update(input),
    (extraTags) => hook(extraTags).get()
  )
}

/** @internal */
export const gauge = (name: string): Metric.Metric.Gauge<number> => {
  return fromMetricKey(metricKey.gauge(name))
}

/** @internal */
export const histogram = (name: string, boundaries: MetricBoundaries.MetricBoundaries) => {
  return fromMetricKey(metricKey.histogram(name, boundaries))
}

/* @internal */
export const increment = Debug.methodWithTrace((trace) =>
  (self: Metric.Metric.Counter<number>): Effect.Effect<never, never, void> => update(self, 1).traced(trace)
)

/* @internal */
export const incrementBy = Debug.dualWithTrace<
  (self: Metric.Metric.Counter<number>, amount: number) => Effect.Effect<never, never, void>,
  (amount: number) => (self: Metric.Metric.Counter<number>) => Effect.Effect<never, never, void>
>(2, (trace) => (self, amount) => update(self, amount).traced(trace))

/** @internal */
export const map = <Out, Out2>(f: (out: Out) => Out2) => {
  return <Type, In>(self: Metric.Metric<Type, In, Out>): Metric.Metric<Type, In, Out2> => {
    return make(
      self.keyType,
      self.unsafeUpdate,
      (extraTags) => f(self.unsafeValue(extraTags))
    )
  }
}

/** @internal */
export const mapType = <Type, Type2>(f: (type: Type) => Type2) => {
  return <In, Out>(self: Metric.Metric<Type, In, Out>): Metric.Metric<Type2, In, Out> => {
    return make(f(self.keyType), self.unsafeUpdate, self.unsafeValue)
  }
}

/* @internal */
export const set = Debug.dualWithTrace<
  <In>(self: Metric.Metric.Gauge<In>, value: In) => Effect.Effect<never, never, void>,
  <In>(value: In) => (self: Metric.Metric.Gauge<In>) => Effect.Effect<never, never, void>
>(2, (trace) => (self, value) => update(self, value).traced(trace))

/** @internal */
export const snapshot = Debug.methodWithTrace((trace) =>
  (): Effect.Effect<never, never, HashSet.HashSet<MetricPair.MetricPair.Untyped>> =>
    core.sync(unsafeSnapshot).traced(trace)
)

/** @internal */
export const succeed = <Out>(out: Out): Metric.Metric<void, unknown, Out> => {
  return make(void 0 as void, constVoid, () => out)
}

/** @internal */
export const sync = <Out>(evaluate: LazyArg<Out>): Metric.Metric<void, unknown, Out> => {
  return make(void 0 as void, constVoid, evaluate)
}

/** @internal */
export const summary = (
  name: string,
  maxAge: Duration.Duration,
  maxSize: number,
  error: number,
  quantiles: Chunk.Chunk<number>
): Metric.Metric.Summary<number> => {
  return withNow(summaryTimestamp(name, maxAge, maxSize, error, quantiles))
}

/** @internal */
export const summaryTimestamp = (
  name: string,
  maxAge: Duration.Duration,
  maxSize: number,
  error: number,
  quantiles: Chunk.Chunk<number>
): Metric.Metric.Summary<readonly [value: number, timestamp: number]> => {
  return fromMetricKey(metricKey.summary(name, maxAge, maxSize, error, quantiles))
}

/** @internal */
export const tagged = <Type, In, Out>(key: string, value: string) => {
  return (self: Metric.Metric<Type, In, Out>): Metric.Metric<Type, In, Out> => {
    return pipe(self, taggedWithLabelSet(HashSet.make(metricLabel.make(key, value))))
  }
}

/** @internal */
export const taggedWith = <In>(f: (input: In) => HashSet.HashSet<MetricLabel.MetricLabel>) => {
  return <Type, Out>(self: Metric.Metric<Type, In, Out>): Metric.Metric<Type, In, void> => {
    return pipe(
      make<Type, In, Out>(
        self.keyType,
        (input, extraTags) => self.unsafeUpdate(input, pipe(f(input), HashSet.union(extraTags))),
        self.unsafeValue
      ),
      map(constVoid)
    )
  }
}

/** @internal */
export const taggedWithLabels = <Type, In, Out>(extraTags: Iterable<MetricLabel.MetricLabel>) => {
  return (self: Metric.Metric<Type, In, Out>): Metric.Metric<Type, In, Out> => {
    return pipe(self, taggedWithLabelSet(HashSet.from(extraTags)))
  }
}

/** @internal */
export const taggedWithLabelSet = (extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => {
  return <Type, In, Out>(self: Metric.Metric<Type, In, Out>): Metric.Metric<Type, In, Out> => {
    return make(
      self.keyType,
      (input, extraTags1) => self.unsafeUpdate(input, pipe(extraTags, HashSet.union(extraTags1))),
      (extraTags1) => self.unsafeValue(pipe(extraTags, HashSet.union(extraTags1)))
    )
  }
}

/** @internal */
export const timer = (name: string): Metric.Metric<
  MetricKeyType.MetricKeyType.Histogram,
  Duration.Duration,
  MetricState.MetricState.Histogram
> => {
  const boundaries = metricBoundaries.exponential(1, 2, 100)
  const base = pipe(histogram(name, boundaries), tagged("time_unit", "milliseconds"))
  return pipe(base, contramap((duration) => duration.millis))
}

/* @internal */
export const trackAll = Debug.dualWithTrace<
  <Type, In, Out>(
    self: Metric.Metric<Type, In, Out>,
    input: In
  ) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <In>(
    input: In
  ) => <Type, Out>(
    self: Metric.Metric<Type, In, Out>
  ) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
>(2, (trace) =>
  (self, input) =>
    (effect) =>
      Debug.untraced(() =>
        core.matchCauseEffect(
          effect,
          (cause) => {
            self.unsafeUpdate(input, HashSet.empty())
            return core.failCause(cause)
          },
          (value) => {
            self.unsafeUpdate(input, HashSet.empty())
            return core.succeed(value)
          }
        ).traced(trace)
      ))

/* @internal */
export const trackDefect = Debug.dualWithTrace<
  <R, E, A, Type, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric.Metric<Type, unknown, Out>
  ) => Effect.Effect<R, E, A>,
  <Type, Out>(
    metric: Metric.Metric<Type, unknown, Out>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
>(2, (trace) => (self, metric) => trackDefectWith(self, metric, identity).traced(trace))

/* @internal */
export const trackDefectWith = Debug.dualWithTrace<
  <R, E, A, Type, In, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric.Metric<Type, In, Out>,
    f: (defect: unknown) => In
  ) => Effect.Effect<R, E, A>,
  <Type, In, Out>(
    metric: Metric.Metric<Type, In, Out>,
    f: (defect: unknown) => In
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
>(3, (trace, restore) =>
  (self, metric, f) =>
    Debug.untraced(() => {
      const updater = (defect: unknown): void => metric.unsafeUpdate(restore(f)(defect), HashSet.empty())
      return _effect.tapDefect(self, (cause) =>
        core.sync(() =>
          pipe(
            Cause.defects(cause),
            Chunk.forEach(updater)
          )
        )).traced(trace)
    }))

/* @internal */
export const trackDuration = Debug.dualWithTrace<
  <R, E, A, Type, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric.Metric<Type, Duration.Duration, Out>
  ) => Effect.Effect<R, E, A>,
  <Type, Out>(
    metric: Metric.Metric<Type, Duration.Duration, Out>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
>(2, (trace) => (self, metric) => trackDurationWith(self, metric, identity).traced(trace))

/* @internal */
export const trackDurationWith = Debug.dualWithTrace<
  <R, E, A, Type, In, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric.Metric<Type, In, Out>,
    f: (duration: Duration.Duration) => In
  ) => Effect.Effect<R, E, A>,
  <Type, In, Out>(
    metric: Metric.Metric<Type, In, Out>,
    f: (duration: Duration.Duration) => In
  ) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
>(3, (trace, restore) =>
  (self, metric, f) =>
    Debug.untraced(() =>
      core.suspendSucceed(() => {
        const startTime = Date.now()
        return core.map(self, (a) => {
          const endTime = Date.now()
          const duration = Duration.millis(endTime - startTime)
          metric.unsafeUpdate(restore(f)(duration), HashSet.empty())
          return a
        })
      }).traced(trace)
    ))

/* @internal */
export const trackError = Debug.dualWithTrace<
  <R, E extends In, A, Type, In, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric.Metric<Type, In, Out>
  ) => Effect.Effect<R, E, A>,
  <Type, In, Out>(
    metric: Metric.Metric<Type, In, Out>
  ) => <R, E extends In, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
>(
  2,
  (trace) =>
    <R, E extends In, A, Type, In, Out>(self: Effect.Effect<R, E, A>, metric: Metric.Metric<Type, In, Out>) =>
      trackErrorWith(self, metric, (a: In) => a).traced(trace)
)

/* @internal */
export const trackErrorWith = Debug.dualWithTrace<
  <R, E extends In2, A, Type, In, Out, In2>(
    self: Effect.Effect<R, E, A>,
    metric: Metric.Metric<Type, In, Out>,
    f: (error: In2) => In
  ) => Effect.Effect<R, E, A>,
  <Type, In, Out, In2>(
    metric: Metric.Metric<Type, In, Out>,
    f: (error: In2) => In
  ) => <R, E extends In2, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
>(
  3,
  (trace, restore) =>
    <R, E extends In2, A, Type, In, Out, In2>(
      self: Effect.Effect<R, E, A>,
      metric: Metric.Metric<Type, In, Out>,
      f: (error: In2) => In
    ) =>
      Debug.untraced(() => {
        const updater = (error: E): Effect.Effect<never, never, void> => update(metric, restore(f)(error))
        return _effect.tapError(self, updater).traced(trace)
      })
)

/* @internal */
export const trackSuccess = Debug.dualWithTrace<
  <R, E, A extends In, Type, In, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric.Metric<Type, In, Out>
  ) => Effect.Effect<R, E, A>,
  <Type, In, Out>(
    metric: Metric.Metric<Type, In, Out>
  ) => <R, E, A extends In>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
>(
  2,
  (trace) =>
    <R, E, A extends In, Type, In, Out>(self: Effect.Effect<R, E, A>, metric: Metric.Metric<Type, In, Out>) =>
      trackSuccessWith(self, metric, (a: In) => a).traced(trace)
)

/* @internal */
export const trackSuccessWith = Debug.dualWithTrace<
  <R, E, A extends In2, Type, In, Out, In2>(
    self: Effect.Effect<R, E, A>,
    metric: Metric.Metric<Type, In, Out>,
    f: (value: In2) => In
  ) => Effect.Effect<R, E, A>,
  <Type, In, Out, In2>(
    metric: Metric.Metric<Type, In, Out>,
    f: (value: In2) => In
  ) => <R, E, A extends In2>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
>(
  3,
  (trace, restore) =>
    <R, E, A extends In2, Type, In, Out, In2>(
      self: Effect.Effect<R, E, A>,
      metric: Metric.Metric<Type, In, Out>,
      f: (value: In2) => In
    ) =>
      Debug.untraced(() => {
        const updater = (value: A): Effect.Effect<never, never, void> => update(metric, restore(f)(value))
        return core.tap(self, updater).traced(trace)
      })
)

/* @internal */
export const update = Debug.dualWithTrace<
  <Type, In, Out>(self: Metric.Metric<Type, In, Out>, input: In) => Effect.Effect<never, never, void>,
  <In>(input: In) => <Type, Out>(self: Metric.Metric<Type, In, Out>) => Effect.Effect<never, never, void>
>(2, (trace) =>
  (self, input) =>
    core.fiberRefGetWith(
      core.currentTags,
      (tags) => core.sync(() => self.unsafeUpdate(input, tags))
    ).traced(trace))

/* @internal */
export const value = Debug.methodWithTrace((trace) =>
  <Type, In, Out>(
    self: Metric.Metric<Type, In, Out>
  ): Effect.Effect<never, never, Out> =>
    core.fiberRefGetWith(
      core.currentTags,
      (tags) => core.sync(() => self.unsafeValue(tags))
    ).traced(trace)
)

/** @internal */
export const withNow = <Type, In, Out>(
  self: Metric.Metric<Type, readonly [In, number], Out>
): Metric.Metric<Type, In, Out> => {
  return pipe(self, contramap((input: In) => [input, Date.now()] as const))
}

/** @internal */
export const zip = <Type2, In2, Out2>(that: Metric.Metric<Type2, In2, Out2>) => {
  return <Type, In, Out>(
    self: Metric.Metric<Type, In, Out>
  ): Metric.Metric<readonly [Type, Type2], readonly [In, In2], readonly [Out, Out2]> => {
    return make(
      [self.keyType, that.keyType] as const,
      (input: readonly [In, In2], extraTags) => {
        const [l, r] = input
        self.unsafeUpdate(l, extraTags)
        that.unsafeUpdate(r, extraTags)
      },
      (extraTags) => [self.unsafeValue(extraTags), that.unsafeValue(extraTags)] as const
    )
  }
}

/** @internal */
export function unsafeSnapshot(): HashSet.HashSet<MetricPair.MetricPair.Untyped> {
  return globalMetricRegistry.snapshot()
}
