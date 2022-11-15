/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal/metric/boundaries"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Equal from "@fp-ts/data/Equal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const MetricBoundariesTypeId: unique symbol = internal.MetricBoundariesTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type MetricBoundariesTypeId = typeof MetricBoundariesTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface MetricBoundaries extends Equal.Equal {
  readonly [MetricBoundariesTypeId]: MetricBoundariesTypeId
  readonly values: Chunk.Chunk<number>
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMetricBoundaries = internal.isMetricBoundaries

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromChunk = internal.fromChunk

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with linear increasing values.
 *
 * @since 1.0.0
 * @category constructors
 */
export const linear = internal.linear

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with exponentially increasing values.
 *
 * @since 1.0.0
 * @category constructors
 */
export const exponential = internal.exponential
