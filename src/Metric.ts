/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/metric"
import type * as MetricBoundaries from "@effect/io/Metric/Boundaries"
import type * as MetricKey from "@effect/io/Metric/Key"
import type * as MetricKeyType from "@effect/io/Metric/KeyType"
import type * as MetricLabel from "@effect/io/Metric/Label"
import type * as MetricPair from "@effect/io/Metric/Pair"
import type * as MetricRegistry from "@effect/io/Metric/Registry"
import type * as MetricState from "@effect/io/Metric/State"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Duration from "@fp-ts/data/Duration"
import type * as HashSet from "@fp-ts/data/HashSet"

/**
 * @since 1.0.0
 * @category symbols
 */
export const MetricTypeId: unique symbol = internal.MetricTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type MetricTypeId = typeof MetricTypeId

/**
 * A `Metric<Type, In, Out>` represents a concurrent metric which accepts
 * updates of type `In` and are aggregated to a stateful value of type `Out`.
 *
 * For example, a counter metric would have type `Metric<number, number>`,
 * representing the fact that the metric can be updated with numbers (the amount
 * to increment or decrement the counter by), and the state of the counter is a
 * number.
 *
 * There are five primitive metric types supported by Effect:
 *
 *   - Counters
 *   - Frequencies
 *   - Gauges
 *   - Histograms
 *   - Summaries
 *
 * @since 1.0.0
 * @category models
 */
export interface Metric<Type, In, Out> extends Metric.Variance<Type, In, Out> {
  /**
   * The type of the underlying primitive metric. For example, this could be
   * `MetricKeyType.Counter` or `MetricKeyType.Gauge`.
   */
  readonly keyType: Type
  readonly unsafeUpdate: (input: In, extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => void
  readonly unsafeValue: (extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => Out
  /**
   * @macro traced
   */
  <R, E, A extends In>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MetricApply {
  <Type, In, Out>(
    keyType: Type,
    unsafeUpdate: (input: In, extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => void,
    unsafeValue: (extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => Out
  ): Metric<Type, In, Out>
}

/**
 * @since 1.0.0
 */
export declare namespace Metric {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Counter<In> = Metric<MetricKeyType.MetricKeyType.Counter, In, MetricState.MetricState.Counter>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Gauge<In> = Metric<MetricKeyType.MetricKeyType.Gauge, In, MetricState.MetricState.Gauge>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Frequency<In> = Metric<MetricKeyType.MetricKeyType.Frequency, In, MetricState.MetricState.Frequency>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Histogram<In> = Metric<MetricKeyType.MetricKeyType.Histogram, In, MetricState.MetricState.Histogram>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Summary<In> = Metric<MetricKeyType.MetricKeyType.Summary, In, MetricState.MetricState.Summary>

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<Type, In, Out> {
    readonly [MetricTypeId]: {
      readonly _Type: (_: Type) => Type
      readonly _In: (_: In) => void
      readonly _Out: (_: never) => Out
    }
  }
}

/**
 * @since 1.0.0
 * @category globals
 */
export const globalMetricRegistry: MetricRegistry.MetricRegistry = internal.globalMetricRegistry

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: MetricApply = internal.make

/**
 * Returns a new metric that is powered by this one, but which accepts updates
 * of the specified new type, which must be transformable to the input type of
 * this metric.
 *
 * @since 1.0.0
 * @category mapping
 */
export const contramap: <In, In2>(
  f: (input: In2) => In
) => <Type, Out>(self: Metric<Type, In, Out>) => Metric<Type, In2, Out> = internal.contramap

/**
 * A counter, which can be incremented by numbers.
 *
 * @since 1.0.0
 * @category constructors
 */
export const counter: (name: string) => Metric.Counter<number> = internal.counter

/**
 * A string histogram metric, which keeps track of the counts of different
 * strings.
 *
 * @since 1.0.0
 * @category constructors
 */
export const frequency: (name: string) => Metric.Frequency<string> = internal.frequency

/**
 * Returns a new metric that is powered by this one, but which accepts updates
 * of any type, and translates them to updates with the specified constant
 * update value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromConst: <In>(
  input: () => In
) => <Type, Out>(self: Metric<Type, In, Out>) => Metric<Type, unknown, Out> = internal.fromConst

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromMetricKey: <Type extends MetricKeyType.MetricKeyType<any, any>>(
  key: MetricKey.MetricKey<Type>
) => Metric<Type, MetricKeyType.MetricKeyType.InType<Type>, MetricKeyType.MetricKeyType.OutType<Type>> =
  internal.fromMetricKey

/**
 * A gauge, which can be set to a value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const gauge: (name: string) => Metric.Gauge<number> = internal.gauge

/**
 * A numeric histogram metric, which keeps track of the count of numbers that
 * fall in bins with the specified boundaries.
 *
 * @since 1.0.0
 * @category constructors
 */
export const histogram: (
  name: string,
  boundaries: MetricBoundaries.MetricBoundaries
) => Metric<MetricKeyType.MetricKeyType.Histogram, number, MetricState.MetricState.Histogram> = internal.histogram

/**
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const increment: (self: Metric.Counter<number>) => Effect.Effect<never, never, void> = internal.increment

/**
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const incrementBy: (amount: number) => (self: Metric.Counter<number>) => Effect.Effect<never, never, void> =
  internal.incrementBy

/**
 * Returns a new metric that is powered by this one, but which outputs a new
 * state type, determined by transforming the state type of this metric by the
 * specified function.
 *
 * @since 1.0.0
 * @category mapping
 */
export const map: <Out, Out2>(
  f: (out: Out) => Out2
) => <Type, In>(self: Metric<Type, In, Out>) => Metric<Type, In, Out2> = internal.map

/**
 * @since 1.0.0
 * @category mapping
 */
export const mapType: <Type, Type2>(
  f: (type: Type) => Type2
) => <In, Out>(self: Metric<Type, In, Out>) => Metric<Type2, In, Out> = internal.mapType

/**
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const set: <In>(value: In) => (self: Metric.Gauge<In>) => Effect.Effect<never, never, void> = internal.set

/**
 * Creates a metric that ignores input and produces constant output.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeed: <Out>(out: Out) => Metric<void, unknown, Out> = internal.succeed

/**
 * Creates a metric that ignores input and produces constant output.
 *
 * @since 1.0.0
 * @category constructors
 */
export const sync: <Out>(evaluate: () => Out) => Metric<void, unknown, Out> = internal.sync

/**
 * @since 1.0.0
 * @category constructors
 */
export const summary: (
  name: string,
  maxAge: Duration.Duration,
  maxSize: number,
  error: number,
  quantiles: Chunk.Chunk<number>
) => Metric.Summary<number> = internal.summary

/**
 * @since 1.0.0
 * @category constructors
 */
export const summaryTimestamp: (
  name: string,
  maxAge: Duration.Duration,
  maxSize: number,
  error: number,
  quantiles: Chunk.Chunk<number>
) => Metric.Summary<readonly [value: number, timestamp: number]> = internal.summaryTimestamp

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @since 1.0.0
 * @category mutations
 */
export const tagged: <Type, In, Out>(
  key: string,
  value: string
) => (self: Metric<Type, In, Out>) => Metric<Type, In, Out> = internal.tagged

/**
 * Returns a new metric, which is identical in every way to this one, except
 * dynamic tags are added based on the update values. Note that the metric
 * returned by this method does not return any useful information, due to the
 * dynamic nature of the added tags.
 *
 * @since 1.0.0
 * @category mutations
 */
export const taggedWith: <In>(
  f: (input: In) => HashSet.HashSet<MetricLabel.MetricLabel>
) => <Type, Out>(self: Metric<Type, In, Out>) => Metric<Type, In, void> = internal.taggedWith

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @since 1.0.0
 * @category mutations
 */
export const taggedWithLabels: <Type, In, Out>(
  extraTags: Iterable<MetricLabel.MetricLabel>
) => (self: Metric<Type, In, Out>) => Metric<Type, In, Out> = internal.taggedWithLabels

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @since 1.0.0
 * @category mutations
 */
export const taggedWithLabelSet: (
  extraTags: HashSet.HashSet<MetricLabel.MetricLabel>
) => <Type, In, Out>(self: Metric<Type, In, Out>) => Metric<Type, In, Out> = internal.taggedWithLabelSet

/**
 * Creates a timer metric, based on a histogram, which keeps track of
 * durations in milliseconds. The unit of time will automatically be added to
 * the metric as a tag (i.e. `"time_unit: milliseconds"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const timer: (
  name: string
) => Metric<MetricKeyType.MetricKeyType.Histogram, Duration.Duration, MetricState.MetricState.Histogram> =
  internal.timer

/**
 * Returns an aspect that will update this metric with the specified constant
 * value every time the aspect is applied to an effect, regardless of whether
 * that effect fails or succeeds.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackAll: <In>(
  input: In
) => <Type, Out>(self: Metric<Type, In, Out>) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  internal.trackAll

/**
 * Returns an aspect that will update this metric with the defects of the
 * effects that it is applied to.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackDefect: <Type, Out>(
  self: Metric<Type, unknown, Out>
) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> = internal.trackDefect

/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the defect throwables of the effects that the
 * aspect is applied to.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackDefectWith: <In>(
  f: (defect: unknown) => In
) => <Type, Out>(self: Metric<Type, In, Out>) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  internal.trackDefectWith

/**
 * Returns an aspect that will update this metric with the duration that the
 * effect takes to execute. To call this method, the input type of the metric
 * must be `Duration`.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackDuration: <Type, Out>(
  self: Metric<Type, Duration.Duration, Out>
) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> = internal.trackDuration

/**
 * Returns an aspect that will update this metric with the duration that the
 * effect takes to execute. To call this method, you must supply a function
 * that can convert the `Duration` to the input type of this metric.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackDurationWith: <In>(
  f: (duration: Duration.Duration) => In
) => <Type, Out>(self: Metric<Type, In, Out>) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  internal.trackDurationWith

/**
 * Returns an aspect that will update this metric with the failure value of
 * the effects that it is applied to.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackError: <Type, In, Out>(
  self: Metric<Type, In, Out>
) => <R, E extends In, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> = internal.trackError

/**
 * Returns an aspect that will update this metric with the success value of
 * the effects that it is applied to.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackSuccess: <Type, In, Out>(
  self: Metric<Type, In, Out>
) => <R, E, A extends In>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> = internal.trackSuccess

/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the success value of the effects that the aspect is
 * applied to.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackSuccessWith: <In, In2>(
  f: (value: In2) => In
) => <Type, Out>(
  self: Metric<Type, In, Out>
) => <R, E, A extends In2>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> = internal.trackSuccessWith

/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the error value of the effects that the aspect is
 * applied to.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackErrorWith: <In, In2>(
  f: (error: In2) => In
) => <Type, Out>(
  self: Metric<Type, In, Out>
) => <R, E extends In2, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> = internal.trackErrorWith

/**
 * Updates the metric with the specified update message. For example, if the
 * metric were a counter, the update would increment the method by the
 * provided amount.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const update: <In>(input: In) => <Type, Out>(self: Metric<Type, In, Out>) => Effect.Effect<never, never, void> =
  internal.update

/**
 * Retrieves a snapshot of the value of the metric at this moment in time.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const value: <Type, In, Out>(self: Metric<Type, In, Out>) => Effect.Effect<never, never, Out> = internal.value

/**
 * @since 1.0.0
 * @category mutations
 */
export const withNow: <Type, In, Out>(self: Metric<Type, readonly [In, number], Out>) => Metric<Type, In, Out> =
  internal.withNow

/**
 * @since 1.0.0
 * @category zipping
 */
export const zip: <Type2, In2, Out2>(
  that: Metric<Type2, In2, Out2>
) => <Type, In, Out>(
  self: Metric<Type, In, Out>
) => Metric<readonly [Type, Type2], readonly [In, In2], readonly [Out, Out2]> = internal.zip

/**
 * Unsafely captures a snapshot of all metrics recorded by the application.
 *
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeSnapshot: () => HashSet.HashSet<MetricPair.MetricPair.Untyped> = internal.unsafeSnapshot
