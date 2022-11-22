/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal/schedule/intervals"
import type * as Interval from "@effect/io/Schedule/Interval"
import type * as List from "@fp-ts/data/List"

/**
 * @since 1.0.0
 * @category symbols
 */
export const IntervalsTypeId: unique symbol = internal.IntervalsTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type IntervalsTypeId = typeof IntervalsTypeId

/**
 * An `Intervals` represents a list of several `Interval`s.
 *
 * @since 1.0.0
 * @category models
 */
export interface Intervals {
  readonly [IntervalsTypeId]: IntervalsTypeId
  readonly intervals: List.List<Interval.Interval>
}

/**
 * Creates a new `Intervals` from a `List` of `Interval`s.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: (intervals: List.List<Interval.Interval>) => Intervals = internal.make

/**
 * Constructs an empty list of `Interval`s.
 *
 * @since 1.0.0
 * @category constructors
 */
export const empty: Intervals = internal.empty

/**
 * Constructs `Intervals` from the specified `Iterable<Interval>`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromIterable: (intervals: Iterable<Interval.Interval>) => Intervals = internal.fromIterable

/**
 * Computes the union of this `Intervals` and  that `Intervals`
 *
 * @since 1.0.0
 * @category mutations
 */
export const union: (that: Intervals) => (self: Intervals) => Intervals = internal.union

/**
 * Produces the intersection of this `Intervals` and that `Intervals`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const intersect: (that: Intervals) => (self: Intervals) => Intervals = internal.intersect

/**
 * The start of the earliest interval in the specified `Intervals`.
 *
 * @since 1.0.0
 * @category getters
 */
export const start: (self: Intervals) => number = internal.start

/**
 * The end of the latest interval in the specified `Intervals`.
 *
 * @since 1.0.0
 * @category getters
 */
export const end: (self: Intervals) => number = internal.end

/**
 * Returns `true` if the start of this `Intervals` is before the start of that
 * `Intervals`, `false` otherwise.
 *
 * @since 1.0.0
 * @category ordering
 */
export const lessThan: (that: Intervals) => (self: Intervals) => boolean = internal.lessThan

/**
 * Returns `true` if this `Intervals` is non-empty, `false` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isNonEmpty: (self: Intervals) => boolean = internal.isNonEmpty

/**
 * Returns the maximum of the two `Intervals` (i.e. which has the latest start).
 *
 * @since 1.0.0
 * @category ordering
 */
export const max: (that: Intervals) => (self: Intervals) => Intervals = internal.max
