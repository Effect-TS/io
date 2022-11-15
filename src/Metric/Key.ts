/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal/metric/key"
import type * as MetricKeyType from "@effect/io/Metric/KeyType"
import type * as MetricLabel from "@effect/io/Metric/Label"
import type * as Equal from "@fp-ts/data/Equal"
import type * as HashSet from "@fp-ts/data/HashSet"

/**
 * @since 1.0.0
 * @category symbols
 */
export const MetricKeyTypeId: unique symbol = internal.MetricKeyTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type MetricKeyTypeId = typeof MetricKeyTypeId

/**
 * A `MetricKey` is a unique key associated with each metric. The key is based
 * on a combination of the metric type, the name and tags associated with the
 * metric, and any other information to describe a metric, such as the
 * boundaries of a histogram. In this way, it is impossible to ever create
 * different metrics with conflicting keys.
 *
 * @since 1.0.0
 * @category models
 */
export interface MetricKey<Type extends MetricKeyType.MetricKeyType<any, any>>
  extends MetricKey.Variance<Type>, Equal.Equal
{
  readonly name: string
  readonly keyType: Type
  readonly tags: HashSet.HashSet<MetricLabel.MetricLabel>
}

/**
 * @since 1.0.0
 */
export declare namespace MetricKey {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Untyped = MetricKey<any>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Counter = MetricKey<MetricKeyType.MetricKeyType.Counter>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Gauge = MetricKey<MetricKeyType.MetricKeyType.Gauge>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Frequency = MetricKey<MetricKeyType.MetricKeyType.Frequency>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Histogram = MetricKey<MetricKeyType.MetricKeyType.Histogram>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Summary = MetricKey<MetricKeyType.MetricKeyType.Summary>

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<Type> {
    readonly [MetricKeyTypeId]: {
      _Type: (_: never) => Type
    }
  }
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMetricKey = internal.isMetricKey

/**
 * Creates a metric key for a counter, with the specified name.
 *
 * @since 1.0.0
 * @category constructors
 */
export const counter = internal.counter

/**
 * Creates a metric key for a categorical frequency table, with the specified
 * name.
 *
 * @since 1.0.0
 * @category constructors
 */
export const frequency = internal.frequency

/**
 * Creates a metric key for a gauge, with the specified name.
 *
 * @since 1.0.0
 * @category constructors
 */
export const gauge = internal.gauge

/**
 * Creates a metric key for a histogram, with the specified name and boundaries.
 *
 * @since 1.0.0
 * @category constructors
 */
export const histogram = internal.histogram

/**
 * Creates a metric key for a summary, with the specified name, maxAge,
 * maxSize, error, and quantiles.
 *
 * @since 1.0.0
 * @category constructors
 */
export const summary = internal.summary

/**
 * Returns a new `MetricKey` with the specified tag appended.
 *
 * @since 1.0.0
 * @category constructors
 */
export const tagged = internal.tagged

/**
 * Returns a new `MetricKey` with the specified tags appended.
 *
 * @since 1.0.0
 * @category constructors
 */
export const taggedWithLabels = internal.taggedWithLabels

/**
 * Returns a new `MetricKey` with the specified tags appended.
 *
 * @since 1.0.0
 * @category constructors
 */
export const taggedWithLabelSet = internal.taggedWithLabelSet
