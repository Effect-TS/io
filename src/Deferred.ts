/**
 * @since 1.0.0
 */
import type * as FiberId from "@effect/io/Fiber/Id"
import * as core from "@effect/io/internal/core"
import * as internal from "@effect/io/internal/deferred"
import type * as MutableRef from "@fp-ts/data/mutable/MutableRef"

/**
 * @since 1.0.0
 * @category symbols
 */
export const DeferredTypeId: unique symbol = internal.DeferredTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type DeferredTypeId = typeof DeferredTypeId

/**
 * A `Deferred` represents an asynchronous variable that can be set exactly
 * once, with the ability for an arbitrary number of fibers to suspend (by
 * calling `Deferred.await`) and automatically resume when the variable is set.
 *
 * `Deferred` can be used for building primitive actions whose completions
 * require the coordinated action of multiple fibers, and for building
 * higher-level concurrent or asynchronous structures.
 *
 * @since 1.0.0
 * @category models
 */
export interface Deferred<E, A> extends Deferred.Variance<E, A> {
  /** @internal */
  readonly state: MutableRef.MutableRef<internal.State<E, A>>
  /** @internal */
  readonly blockingOn: FiberId.FiberId
}

/**
 * @since 1.0.0
 */
export declare namespace Deferred {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [DeferredTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }
}

/**
 * Creates a new `Deferred`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = core.makeDeferred

/**
 * Creates a new `Deferred` from the specified `FiberId`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const makeAs = core.makeAsDeferred

/**
 * Completes the `Deferred` with the specified value.
 *
 * @since 1.0.0
 * @category mutations
 */
export const succeed = core.succeedDeferred

/**
 * Completes the `Deferred` with the specified value.
 *
 * @since 1.0.0
 * @category mutations
 */
export const sync = core.syncDeferred

/**
 * Fails the `Deferred` with the specified error, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const fail = core.failDeferred

/**
 * Fails the `Deferred` with the specified error, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const failSync = core.failSyncDeferred

/**
 * Fails the `Deferred` with the specified `Cause`, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const failCause = core.failCauseDeferred

/**
 * Fails the `Deferred` with the specified `Cause`, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const failCauseSync = core.failCauseSyncDeferred

/**
 * Kills the `Deferred` with the specified defect, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const die = core.dieDeferred

/**
 * Kills the `Deferred` with the specified defect, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const dieSync = core.dieSyncDeferred

/**
 * Completes the `Deferred` with interruption. This will interrupt all fibers
 * waiting on the value of the `Deferred` with the `FiberId` of the fiber
 * calling this method.
 *
 * @since 1.0.0
 * @category mutations
 */
export const interrupt = core.interruptDeferred

/**
 * Completes the `Deferred` with interruption. This will interrupt all fibers
 * waiting on the value of the `Deferred` with the specified `FiberId`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const interruptAs = core.interruptAsDeferred

/**
 * Exits the `Deferred` with the specified `Exit` value, which will be
 * propagated to all fibers waiting on the value of the `Deferred`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const done = core.doneDeferred

/**
 * Returns `true` if this `Deferred` has already been completed with a value or
 * an error, `false` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isDone = core.isDoneDeferred

/**
 * Returns a `Some<Effect<R, E, A>>` from the `Deferred` if this `Deferred` has
 * already been completed, `None` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const poll = core.pollDeferred

const _await = core.awaitDeferred

export {
  /**
   * Retrieves the value of the `Deferred`, suspending the fiber running the
   * workflow until the result is available.
   *
   * @since 1.0.0
   * @category getters
   */
  _await as await
}

/**
 * Completes the deferred with the result of the specified effect. If the
 * deferred has already been completed, the method will produce false.
 *
 * Note that `Deferred.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 *
 * @since 1.0.0
 * @category mutations
 */
export const complete = core.completeDeferred

/**
 * Completes the deferred with the result of the specified effect. If the
 * deferred has already been completed, the method will produce false.
 *
 * @since 1.0.0
 * @category mutations
 */
export const completeWith = core.completeWithDeferred

/**
 * Unsafely creates a new `Deferred` from the specified `FiberId`.
 *
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeMake = core.unsafeMakeDeferred

/**
 * Unsafely exits the `Deferred` with the specified `Exit` value, which will be
 * propagated to all fibers waiting on the value of the `Deferred`.
 *
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeDone = core.unsafeDoneDeferred
