/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberStatus from "@effect/io/Fiber/Status"
import type { TODO } from "@effect/io/internal/todo"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as HashSet from "@fp-ts/data/HashSet"

/**
 * @since 1.0.0
 */
export interface Fiber<E, A> extends TODO<[E, A]> {
  readonly id: FiberId.FiberId
}

/**
 * @since 1.0.0
 */
export interface RuntimeFiber<E, A> extends Fiber<E, A> {}

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

// TODO(Max/Mike): do.
/**
 * @since 1.0.0
 */
export declare const collectAll: <E, A>(fibers: Iterable<Fiber<E, A>>) => Fiber<E, Chunk.Chunk<A>>

export declare const interrupt: <E, A>(self: Fiber<E, A>) => Effect.Effect<never, never, Exit.Exit<E, A>>
