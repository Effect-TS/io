/**
 * @since 1.0.0
 */
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRef from "@effect/io/FiberRef"
import * as internal from "@effect/io/internal/fiberRefs"
import type * as List from "@fp-ts/data/List"

/**
 * Note: it will not copy the provided Map, make sure to provide a fresh one.
 *
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeMake = internal.unsafeMake

/**
 * @since 1.0.0
 * @category symbols
 */
export const FiberRefsSym: unique symbol = internal.FiberRefsSym

/**
 * @since 1.0.0
 * @category symbols
 */
export type FiberRefsSym = typeof FiberRefsSym

/**
 * `FiberRefs` is a data type that represents a collection of `FiberRef` values.
 *
 * This allows safely propagating `FiberRef` values across fiber boundaries, for
 * example between an asynchronous producer and consumer.
 *
 * @since 1.0.0
 * @category models
 */
export interface FiberRefs {
  readonly [FiberRefsSym]: FiberRefsSym
  readonly locals: Map<FiberRef.FiberRef<any>, List.Cons<readonly [FiberId.Runtime, any]>>
}

/**
 * Joins this collection of fiber refs to the specified collection, as the
 * specified fiber id. This will perform diffing and merging to ensure
 * preservation of maximum information from both child and parent refs.
 *
 * @category utilities
 * @since 1.0.0
 */
export const joinAs = internal.joinAs

/**
 * Forks this collection of fiber refs as the specified child fiber id. This
 * will potentially modify the value of the fiber refs, as determined by the
 * individual fiber refs that make up the collection.
 *
 * @category utilities
 * @since 1.0.0
 */
export const forkAs = internal.forkAs

/**
 * Returns a set of each `FiberRef` in this collection.
 *
 * @category utilities
 * @since 1.0.0
 */
export const fiberRefs = internal.fiberRefs

/**
 * Set each ref to either its value or its default.
 *
 * @category utilities
 * @since 1.0.0
 */
export const setAll = internal.setAll

const delete_ = internal.delete

export { delete_ as delete }

/**
 * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
 * values if it exists or `None` otherwise.
 *
 * @category utilities
 * @since 1.0.0
 */
export const get = internal.get

/**
 * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
 * values if it exists or the `initial` value of the `FiberRef` otherwise.
 *
 * @category utilities
 * @since 1.0.0
 */
export const getOrDefault = internal.getOrDefault

/**
 * Updates the value of the specified `FiberRef` using the provided `FiberId`
 *
 * @category utilities
 * @since 1.0.0
 */
export const updateAs = internal.updateAs
