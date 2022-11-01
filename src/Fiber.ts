/**
 * @since 1.0.0
 */
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberStatus from "@effect/io/Fiber/Status"
import type { TODO } from "@effect/io/internal/todo"
import type * as HashSet from "@fp-ts/data/HashSet"

/**
 * @since 1.0.0
 */
export interface Fiber<E, A> extends TODO<[E, A]> {}

/**
 * @since 1.0.0
 */
export interface RuntimeFiber<E, A> extends TODO<[E, A]> {}

/**
 * @since 1.0.0
 */
export declare namespace Fiber {
  /**
   * A record containing information about a [[Fiber]].
   *
   * @since 1.0.0
   * @category models
   */
  export interface Descriptor {
    /**
     * The fiber's unique identifier.
     */
    readonly id: FiberId.FiberId
    /**
     * The status of the fiber.
     */
    readonly status: FiberStatus.FiberStatus
    /**
     * The set of fibers attempting to interrupt the fiber or its ancestors.
     */
    readonly interruptors: HashSet.HashSet<FiberId.FiberId>
  }
}
