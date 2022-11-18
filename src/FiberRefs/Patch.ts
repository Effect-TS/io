/**
 * @since 1.0.0
 */
import type * as FiberRef from "@effect/io/FiberRef"
import * as internal from "@effect/io/internal/fiberRefs/patch"

/**
 * A `FiberRefsPatch` captures the changes in `FiberRef` values made by a single
 * fiber as a value. This allows fibers to apply the changes made by a workflow
 * without inheriting all the `FiberRef` values of the fiber that executed the
 * workflow.
 *
 * @since 1.0.0
 * @category models
 */
export type FiberRefsPatch = Empty | Add | Remove | Update | AndThen

/**
 * @since 1.0.0
 * @category models
 */
export interface Empty {
  readonly op: internal.OP_EMPTY
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Add {
  readonly op: internal.OP_ADD
  readonly fiberRef: FiberRef.FiberRef<unknown>
  readonly value: unknown
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Remove {
  readonly op: internal.OP_REMOVE
  readonly fiberRef: FiberRef.FiberRef<unknown>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Update {
  readonly op: internal.OP_UPDATE
  readonly fiberRef: FiberRef.FiberRef<unknown>
  readonly patch: unknown
}

/**
 * @since 1.0.0
 * @category models
 */
export interface AndThen {
  readonly op: internal.OP_AND_THEN
  readonly first: FiberRefsPatch
  readonly second: FiberRefsPatch
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty = internal.empty

/**
 * Constructs a patch that describes the changes between the specified
 * collections of `FiberRef`
 *
 * @since 1.0.0
 * @category constructors
 */
export const diff = internal.diff

/**
 * Combines this patch and the specified patch to create a new patch that
 * describes applying the changes from this patch and the specified patch
 * sequentially.
 *
 * @since 1.0.0
 * @category constructors
 */
export const combine = internal.combine

/**
 * Applies the changes described by this patch to the specified collection
 * of `FiberRef` values.
 *
 * @since 1.0.0
 * @category destructors
 */
export const patch = internal.patch
