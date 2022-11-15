/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/metric"
import type * as MetricKeyType from "@effect/io/Metric/KeyType"
import type * as MetricLabel from "@effect/io/Metric/Label"
import type * as MetricState from "@effect/io/Metric/State"
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
export const globalMetricRegistry = internal.globalMetricRegistry

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make

/**
 * Returns a new metric that is powered by this one, but which accepts updates
 * of the specified new type, which must be transformable to the input type of
 * this metric.
 *
 * @since 1.0.0
 * @category mapping
 */
export const contramap = internal.contramap

/**
 * A counter, which can be incremented by numbers.
 *
 * @since 1.0.0
 * @category constructors
 */
export const counter = internal.counter

/**
 * A string histogram metric, which keeps track of the counts of different
 * strings.
 *
 * @since 1.0.0
 * @category constructors
 */
export const frequency = internal.frequency

/**
 * Returns a new metric that is powered by this one, but which accepts updates
 * of any type, and translates them to updates with the specified constant
 * update value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromConst = internal.fromConst

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromMetricKey = internal.fromMetricKey

/**
 * A gauge, which can be set to a value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const gauge = internal.gauge

/**
 * A numeric histogram metric, which keeps track of the count of numbers that
 * fall in bins with the specified boundaries.
 *
 * @since 1.0.0
 * @category constructors
 */
export const histogram = internal.histogram

/**
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const increment = internal.increment

/**
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const incrementBy = internal.incrementBy

/**
 * Returns a new metric that is powered by this one, but which outputs a new
 * state type, determined by transforming the state type of this metric by the
 * specified function.
 *
 * @since 1.0.0
 * @category mapping
 */
export const map = internal.map

/**
 * @since 1.0.0
 * @category mapping
 */
export const mapType = internal.mapType

/**
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const set = internal.set

/**
 * Creates a metric that ignores input and produces constant output.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeed = internal.succeed

/**
 * Creates a metric that ignores input and produces constant output.
 *
 * @since 1.0.0
 * @category constructors
 */
export const sync = internal.sync

/**
 * @since 1.0.0
 * @category constructors
 */
export const summary = internal.summary

/**
 * @since 1.0.0
 * @category constructors
 */
export const summaryTimestamp = internal.summaryTimestamp

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @since 1.0.0
 * @category mutations
 */
export const tagged = internal.tagged

/**
 * Returns a new metric, which is identical in every way to this one, except
 * dynamic tags are added based on the update values. Note that the metric
 * returned by this method does not return any useful information, due to the
 * dynamic nature of the added tags.
 *
 * @since 1.0.0
 * @category mutations
 */
export const taggedWith = internal.taggedWith

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @since 1.0.0
 * @category mutations
 */
export const taggedWithLabels = internal.taggedWithLabels

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @since 1.0.0
 * @category mutations
 */
export const taggedWithLabelSet = internal.taggedWithLabelSet

/**
 * Creates a timer metric, based on a histogram, which keeps track of
 * durations in milliseconds. The unit of time will automatically be added to
 * the metric as a tag (i.e. `"time_unit: milliseconds"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const timer = internal.timer

/**
 * Returns an aspect that will update this metric with the specified constant
 * value every time the aspect is applied to an effect, regardless of whether
 * that effect fails or succeeds.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackAll = internal.trackAll

/**
 * Returns an aspect that will update this metric with the defects of the
 * effects that it is applied to.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackDefect = internal.trackDefect

/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the defect throwables of the effects that the
 * aspect is applied to.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackDefectWith = internal.trackDefectWith

/**
 * Returns an aspect that will update this metric with the duration that the
 * effect takes to execute. To call this method, the input type of the metric
 * must be `Duration`.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackDuration = internal.trackDuration

/**
 * Returns an aspect that will update this metric with the duration that the
 * effect takes to execute. To call this method, you must supply a function
 * that can convert the `Duration` to the input type of this metric.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackDurationWith = internal.trackDurationWith

/**
 * Returns an aspect that will update this metric with the failure value of
 * the effects that it is applied to.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackError = internal.trackError

/**
 * Returns an aspect that will update this metric with the success value of
 * the effects that it is applied to.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackSuccess = internal.trackSuccess

/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the success value of the effects that the aspect is
 * applied to.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackSuccessWith = internal.trackSuccessWith

/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the error value of the effects that the aspect is
 * applied to.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const trackErrorWith = internal.trackErrorWith

/**
 * Updates the metric with the specified update message. For example, if the
 * metric were a counter, the update would increment the method by the
 * provided amount.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const update = internal.update

/**
 * Retrieves a snapshot of the value of the metric at this moment in time.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const value = internal.value

/**
 * @since 1.0.0
 * @category mutations
 */
export const withNow = internal.withNow

/**
 * @since 1.0.0
 * @category zipping
 */
export const zip = internal.zip

/**
 * Unsafely captures a snapshot of all metrics recorded by the application.
 *
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeSnapshot = internal.unsafeSnapshot
