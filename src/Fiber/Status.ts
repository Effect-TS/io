/**
 * @since 1.0.0
 */
import type { FiberId } from "@effect/io/Fiber/Id"
import type { RuntimeFlags } from "@effect/io/Fiber/Runtime/Flags"
import * as internal from "@effect/io/internal/fiberStatus"
import type { Equal } from "@fp-ts/data/Equal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const FiberStatusTypeId: unique symbol = internal.FiberStatusTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type FiberStatusTypeId = typeof FiberStatusTypeId

/**
 * @since 1.0.0
 * @category models
 */
export type FiberStatus = Done | Running | Suspended

/**
 * @since 1.0.0
 * @category models
 */
export interface Done extends Equal {
  readonly _tag: "Done"
  readonly [FiberStatusTypeId]: FiberStatusTypeId
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Running extends Equal {
  readonly _tag: "Running"
  readonly [FiberStatusTypeId]: FiberStatusTypeId
  readonly runtimeFlags: RuntimeFlags
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Suspended extends Equal {
  readonly _tag: "Suspended"
  readonly [FiberStatusTypeId]: FiberStatusTypeId
  readonly runtimeFlags: RuntimeFlags
  readonly blockingOn: FiberId
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const done = internal.done

/**
 * @since 1.0.0
 * @category constructors
 */
export const running = internal.running

/**
 * @since 1.0.0
 * @category constructors
 */
export const suspended = internal.suspended

/**
 * Returns `true` if the specified value is a `FiberStatus`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isFiberStatus = internal.isFiberStatus
