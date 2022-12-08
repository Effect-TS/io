/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRef from "@effect/io/FiberRef"
import * as internal from "@effect/io/internal/fiberRefs"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as HashSet from "@fp-ts/data/HashSet"
import type * as Option from "@fp-ts/data/Option"

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
  readonly locals: Map<FiberRef.FiberRef<any>, Chunk.NonEmptyChunk<readonly [FiberId.Runtime, any]>>
}

const delete_: <A>(fiberRef: FiberRef.FiberRef<A>) => (self: FiberRefs) => FiberRefs = internal.delete

export {
  /**
   * Deletes the specified `FiberRef` from the `FibterRefs`.
   *
   * @since 1.0.0
   * @category mutations
   */
  delete_ as delete
}

/**
 * Returns a set of each `FiberRef` in this collection.
 *
 * @since 1.0.0
 * @category getters
 */
export const fiberRefs: (self: FiberRefs) => HashSet.HashSet<FiberRef.FiberRef<any>> = internal.fiberRefs

/**
 * Forks this collection of fiber refs as the specified child fiber id. This
 * will potentially modify the value of the fiber refs, as determined by the
 * individual fiber refs that make up the collection.
 *
 * @since 1.0.0
 * @category mutations
 */
export const forkAs: (childId: FiberId.Runtime) => (self: FiberRefs) => FiberRefs = internal.forkAs

/**
 * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
 * values if it exists or `None` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const get: <A>(fiberRef: FiberRef.FiberRef<A>) => (self: FiberRefs) => Option.Option<A> = internal.get

/**
 * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
 * values if it exists or the `initial` value of the `FiberRef` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const getOrDefault: <A>(fiberRef: FiberRef.FiberRef<A>) => (self: FiberRefs) => A = internal.getOrDefault

/**
 * Joins this collection of fiber refs to the specified collection, as the
 * specified fiber id. This will perform diffing and merging to ensure
 * preservation of maximum information from both child and parent refs.
 *
 * @since 1.0.0
 * @category mutations
 */
export const joinAs: (fiberId: FiberId.Runtime, that: FiberRefs) => (self: FiberRefs) => FiberRefs = internal.joinAs

/**
 * Set each ref to either its value or its default.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const setAll: (self: FiberRefs) => Effect.Effect<never, never, void> = internal.setAll

/**
 * Updates the value of the specified `FiberRef` using the provided `FiberId`
 *
 * @since 1.0.0
 * @category mutations
 */
export const updatedAs: <A>(
  fiberId: FiberId.Runtime,
  fiberRef: FiberRef.FiberRef<A>,
  value: A
) => (self: FiberRefs) => FiberRefs = internal.updatedAs

/**
 * Note: it will not copy the provided Map, make sure to provide a fresh one.
 *
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeMake: (
  fiberRefLocals: Map<FiberRef.FiberRef<any>, Chunk.NonEmptyChunk<readonly [FiberId.Runtime, any]>>
) => FiberRefs = internal.unsafeMake
