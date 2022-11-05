/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import type * as FiberStatus from "@effect/io/Fiber/Status"
import type * as FiberRef from "@effect/io/FiberRef"
import type * as FiberRefs from "@effect/io/FiberRefs"
import * as core from "@effect/io/internal/core"
import * as circular from "@effect/io/internal/effect/circular"
import * as internal from "@effect/io/internal/fiber"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as HashSet from "@fp-ts/data/HashSet"
import type * as Option from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 * @category symbols
 */
export const FiberTypeId: unique symbol = internal.FiberTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type FiberTypeId = typeof FiberTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const RuntimeFiberTypeId: unique symbol = internal.RuntimeFiberTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type RuntimeFiberTypeId = typeof RuntimeFiberTypeId

/**
 * A fiber is a lightweight thread of execution that never consumes more than a
 * whole thread (but may consume much less, depending on contention and
 * asynchronicity). Fibers are spawned by forking effects, which run
 * concurrently with the parent effect.
 *
 * Fibers can be joined, yielding their result to other fibers, or interrupted,
 * which terminates the fiber, safely releasing all resources.
 *
 * @since 1.0.0
 * @category models
 */
export interface Fiber<E, A> extends Fiber.Variance<E, A> {
  /**
   * The identity of the fiber.
   */
  id(): FiberId.FiberId

  /**
   * Awaits the fiber, which suspends the awaiting fiber until the result of the
   * fiber has been determined.
   * @macro traced
   */
  await(): Effect.Effect<never, never, Exit.Exit<E, A>>

  /**
   * Retrieves the immediate children of the fiber.
   * @macro traced
   */
  children(): Effect.Effect<never, never, Chunk.Chunk<Fiber.Runtime<any, any>>>

  /**
   * Inherits values from all `FiberRef` instances into current fiber. This
   * will resume immediately.
   * @macro traced
   */
  inheritAll(): Effect.Effect<never, never, void>

  /**
   * Tentatively observes the fiber, but returns immediately if it is not
   * already done.
   * @macro traced
   */
  poll(): Effect.Effect<never, never, Option.Option<Exit.Exit<E, A>>>

  /**
   * In the background, interrupts the fiber as if interrupted from the
   * specified fiber. If the fiber has already exited, the returned effect will
   * resume immediately. Otherwise, the effect will resume when the fiber exits.
   * @macro traced
   */
  interruptWithFork(fiberId: FiberId.FiberId): Effect.Effect<never, never, void>
}

/**
 * A runtime fiber that is executing an effect. Runtime fibers have an
 * identity and a trace.
 *
 * @since 1.0.0
 * @category models
 */
export interface RuntimeFiber<E, A> extends Fiber<E, A>, Fiber.RuntimeVariance<E, A> {
  /**
   * The identity of the fiber.
   */
  id(): FiberId.Runtime

  /**
   * The status of the fiber.
   * @macro traced
   */
  status(): Effect.Effect<never, never, FiberStatus.FiberStatus>

  /**
   * Returns the current `RuntimeFlags` the fiber is running with.
   *
   * @macro traced
   */
  runtimeFlags(): Effect.Effect<never, never, RuntimeFlags.RuntimeFlags>

  /**
   * Adds an observer to the list of observers.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  unsafeAddObserver(observer: (exit: Exit.Exit<E, A>) => void): void

  /**
   * Removes the specified observer from the list of observers that will be
   * notified when the fiber exits.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  unsafeRemoveObserver(observer: (exit: Exit.Exit<E, A>) => void): void

  /**
   * Deletes the specified fiber ref.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  unsafeDeleteFiberRef<X>(fiberRef: FiberRef.FiberRef<X>): void

  /**
   * Retrieves all fiber refs of the fiber.
   *
   * **NOTE**: This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  unsafeGetFiberRefs(): FiberRefs.FiberRefs
}

/**
 * @since 1.0.0
 */
export declare namespace Fiber {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Runtime<E, A> = RuntimeFiber<E, A>

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [FiberTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }

  export interface RuntimeVariance<E, A> {
    readonly [RuntimeFiberTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Dump {
    /**
     * The fiber's unique identifier.
     */
    readonly id: FiberId.Runtime
    /**
     * The status of the fiber.
     */
    readonly status: FiberStatus.FiberStatus
  }

  /**
   * A record containing information about a `Fiber`.
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

/**
 * @since 1.0.0
 * @category instances
 */
export const Order = internal.Order

/**
 * Returns `true` if the specified value is a `Fiber`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isFiber = internal.isFiber

/**
 * Returns `true` if the specified `Fiber` is a `RuntimeFiber`, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isRuntimeFiber = internal.isRuntimeFiber

/**
 * The identity of the fiber.
 *
 * @since 1.0.0
 * @category getters
 */
export const id = internal.id

const _await = internal._await
export {
  /**
   * Awaits the fiber, which suspends the awaiting fiber until the result of the
   * fiber has been determined.
   *
   * @macro traced
   * @since 1.0.0
   * @category getters
   */
  _await as await
}

/**
 * Awaits on all fibers to be completed, successfully or not.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const awaitAll = fiberRuntime.awaitAll

/**
 * Retrieves the immediate children of the fiber.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const children = internal.children

/**
 * Collects all fibers into a single fiber producing an in-order list of the
 * results.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAll = fiberRuntime.collectAll

/**
 * A fiber that is done with the specified `Exit` value.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const done = internal.done

/**
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const dump = internal.dump

/**
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const dumpAll = internal.dumpAll

/**
 * A fiber that has already failed with the specified value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fail = internal.fail

/**
 * Creates a `Fiber` that has already failed with the specified cause.
 *
 * @since 1.0.0
 * @category constructors
 */
export const failCause = internal.failCause

/**
 * Lifts an `Effect` into a `Fiber`.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const fromEffect = internal.fromEffect

/**
 * Inherits values from all `FiberRef` instances into current fiber. This
 * will resume immediately.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const inheritAll = internal.inheritAll

/**
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 *
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interrupt = core.interruptFiber

/**
 * Interrupts the fiber as if interrupted from the specified fiber. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 *
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptWith = core.interruptWithFiber

/**
 * Interrupts the fiber as if interrupted from the specified fiber. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 *
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptWithFork = internal.interruptWithFork

/**
 * Interrupts all fibers, awaiting their interruption.
 *
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptAll = internal.interruptAll

/**
 * Interrupts all fibers as by the specified fiber, awaiting their
 * interruption.
 *
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptAllWith = internal.interruptAllWith

/**
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 *
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptFork = fiberRuntime.interruptFork

/**
 * Joins the fiber, which suspends the joining fiber until the result of the
 * fiber has been determined. Attempting to join a fiber that has erred will
 * result in a catchable error. Joining an interrupted fiber will result in an
 * "inner interruption" of this fiber, unlike interruption triggered by
 * another fiber, "inner interruption" can be caught and recovered.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const join = internal.join

/**
 * Joins all fibers, awaiting their _successful_ completion. Attempting to
 * join a fiber that has erred will result in a catchable error, _if_ that
 * error does not result from interruption.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const joinAll = fiberRuntime.joinAll

/**
 * Maps over the value the Fiber computes.
 *
 * @since 1.0.0
 * @category mapping
 */
export const map = internal.map

/**
 * Effectually maps over the value the fiber computes.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapEffect = internal.mapEffect

/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapFiber = internal.mapFiber

/**
 * Folds over the `Fiber` or `RuntimeFiber`.
 *
 * @since 1.0.0
 * @category folding
 */
export const match = internal.match

/**
 * A fiber that never fails or succeeds.
 *
 * @since 1.0.0
 * @category constructors
 */
export const never = internal.never

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the `that` one
 * when `this` one fails. Interrupting the returned fiber will interrupt both
 * fibers, sequentially, from left to right.
 *
 * @since 1.0.0
 * @category alternatives
 */
export const orElse = internal.orElse

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the `that` one
 * when `this` one fails. Interrupting the returned fiber will interrupt both
 * fibers, sequentially, from left to right.
 *
 * @since 1.0.0
 * @category alternatives
 */
export const orElseEither = internal.orElseEither

/**
 * Tentatively observes the fiber, but returns immediately if it is not
 * already done.
 *
 * @since 1.0.0
 * @category getters
 */
export const poll = internal.poll

/**
 * Pretty-prints a `RuntimeFiber`.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const pretty = internal.pretty

/**
 * Returns a chunk containing all root fibers. Due to concurrency, the
 * returned chunk is only weakly consistent.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const roots = internal.roots

/**
 * Converts this fiber into a scoped effect. The fiber is interrupted when the
 * scope is closed.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const scoped = fiberRuntime.scoped

/**
 * Returns the `FiberStatus` of a `RuntimeFiber`.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const status = internal.status

/**
 * Returns a fiber that has already succeeded with the specified value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeed = internal.succeed

/**
 * A fiber that has already succeeded with unit.
 *
 * @since 1.0.0
 * @category constructors
 */
export const unit = internal.unit

/**
 * Zips this fiber and the specified fiber together, producing a tuple of
 * their output.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zip = circular.zipFiber

/**
 * Same as `zip` but discards the output of that `Fiber`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipLeft = circular.zipLeftFiber

/**
 * Same as `zip` but discards the output of this `Fiber`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipRight = circular.zipRightFiber

/**
 * Zips this fiber with the specified fiber, combining their results using the
 * specified combiner function. Both joins and interruptions are performed in
 * sequential order from left to right.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipWith = circular.zipWithFiber
