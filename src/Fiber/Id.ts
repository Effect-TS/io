/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal/fiberId"
import type { Equal } from "@fp-ts/data/Equal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const FiberIdTypeId: unique symbol = internal.FiberIdTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type FiberIdTypeId = typeof FiberIdTypeId

/**
 * @since 1.0.0
 * @category models
 */
export type FiberId = None | Runtime | Composite

/**
 * @since 1.0.0
 * @category models
 */
export interface None extends Equal {
  readonly [FiberIdTypeId]: FiberIdTypeId
  readonly _tag: "None"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Runtime extends Equal {
  readonly [FiberIdTypeId]: FiberIdTypeId
  readonly _tag: "Runtime"
  readonly id: number
  readonly startTimeMillis: number
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Composite extends Equal {
  readonly [FiberIdTypeId]: FiberIdTypeId
  readonly _tag: "Composite"
  readonly left: FiberId
  readonly right: FiberId
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const none = internal.none

/**
 * @since 1.0.0
 * @category constructors
 */
export const runtime = internal.runtime

/**
 * @since 1.0.0
 * @category constructors
 */
export const composite = internal.composite

/**
 * Determines if the `FiberId` is a `None`.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isNone = internal.isNone

/**
 * Returns `true` if the specified unknown value is a `FiberId`, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isFiberId = internal.isFiberId

/**
 * Combine two `FiberId`s.
 *
 * @since 1.0.0
 * @category constructors
 */
export const combine = internal.combine

/**
 * Combines a set of `FiberId`s into a single `FiberId`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const combineAll = internal.combineAll

/**
 * Returns this `FiberId` if it is not `None`, otherwise returns that `FiberId`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const getOrElse = internal.getOrElse

/**
 * Get the set of identifiers for this `FiberId`.
 *
 * @since 1.0.0
 * @category destructors
 */
export const ids = internal.ids

/**
 * Creates a new `FiberId`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make

/**
 * Unsafely creates a new `FiberId`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMake = internal.unsafeMake

/**
 * Creates a string representing the name of the current thread of execution
 * represented by the specified `FiberId`.
 *
 * @since 1.0.0
 * @category destructors
 */
export const threadName = internal.threadName

/**
 * Convert a `FiberId` into an `Option<FiberId>`.
 *
 * @since 1.0.0
 * @category destructors
 */
export const toOption = internal.toOption

/**
 * Convert a `FiberId` into a `HashSet<FiberId>`.
 *
 * @since 1.0.0
 * @category destructors
 */
export const toSet = internal.toSet
