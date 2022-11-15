/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/pollingMetric"
import type * as Metric from "@effect/io/Metric"

/**
 * @since 1.0.0
 * @category symbols
 */
export const PollingMetricTypeId: unique symbol = internal.PollingMetricTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type PollingMetricTypeId = typeof PollingMetricTypeId

/**
 * A `PollingMetric` is a combination of a metric and an effect that polls for
 * updates to the metric.
 *
 * @since 1.0.0
 * @category models
 */
export interface PollingMetric<Type, In, R, E, Out> {
  readonly [PollingMetricTypeId]: PollingMetricTypeId
  /**
   * The metric that this `PollingMetric` polls to update.
   */
  readonly metric: Metric.Metric<Type, In, Out>
  /**
   * An effect that polls a value that may be fed to the metric.
   *
   * @macro traced
   */
  poll(): Effect.Effect<R, E, In>
}

/**
 * Constructs a new polling metric from a metric and poll effect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make

/**
 * Collects all of the polling metrics into a single polling metric, which
 * polls for, updates, and produces the outputs of all individual metrics.
 *
 * @since 1.0.0
 * @category constructors
 */
export const collectAll = internal.collectAll

/**
 * Returns an effect that will launch the polling metric in a background
 * fiber, using the specified schedule.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const launch = internal.launch

/**
 * An effect that polls a value that may be fed to the metric.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const poll = internal.poll

/**
 * An effect that polls for a value and uses the value to update the metric.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const pollAndUpdate = internal.pollAndUpdate

/**
 * Returns a new polling metric whose poll function will be retried with the
 * specified retry policy.
 *
 * @since 1.0.0
 * @category constructors
 */
export const retry = internal.retry

/**
 * Zips this polling metric with the specified polling metric.
 *
 * @since 1.0.0
 * @category mutations
 */
export const zip = internal.zip
