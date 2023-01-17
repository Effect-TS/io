/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import type * as FiberId from "@effect/io/Fiber/Id"
import * as core from "@effect/io/internal/core"
import * as internal from "@effect/io/internal/deferred"
import type { LazyArg } from "@fp-ts/data/Function"
import type * as MutableRef from "@fp-ts/data/MutableRef"
import type * as Option from "@fp-ts/data/Option"

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
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const make: <E, A>() => Effect.Effect<never, never, Deferred<E, A>> = core.deferredMake

/**
 * Creates a new `Deferred` from the specified `FiberId`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const makeAs: <E, A>(fiberId: FiberId.FiberId) => Effect.Effect<never, never, Deferred<E, A>> =
  core.deferredMakeAs

/**
 * Completes the `Deferred` with the specified value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const succeed: <E, A>(self: Deferred<E, A>, value: A) => Effect.Effect<never, never, boolean> =
  core.deferredSucceed

/**
 * Completes the `Deferred` with the specified value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const sync: <E, A>(self: Deferred<E, A>, evaluate: LazyArg<A>) => Effect.Effect<never, never, boolean> =
  core.deferredSync

/**
 * Fails the `Deferred` with the specified error, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const fail: <E, A>(self: Deferred<E, A>, error: E) => Effect.Effect<never, never, boolean> = core.deferredFail

/**
 * Fails the `Deferred` with the specified error, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const failSync: <E, A>(self: Deferred<E, A>, evaluate: LazyArg<E>) => Effect.Effect<never, never, boolean> =
  core.deferredFailSync

/**
 * Fails the `Deferred` with the specified `Cause`, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const failCause: <E, A>(self: Deferred<E, A>, cause: Cause.Cause<E>) => Effect.Effect<never, never, boolean> =
  core.deferredFailCause

/**
 * Fails the `Deferred` with the specified `Cause`, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const failCauseSync: <E, A>(
  self: Deferred<E, A>,
  evaluate: LazyArg<Cause.Cause<E>>
) => Effect.Effect<never, never, boolean> = core.deferredFailCauseSync

/**
 * Kills the `Deferred` with the specified defect, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const die: <E, A>(self: Deferred<E, A>, defect: unknown) => Effect.Effect<never, never, boolean> =
  core.deferredDie

/**
 * Kills the `Deferred` with the specified defect, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const dieSync: <E, A>(self: Deferred<E, A>, evaluate: LazyArg<unknown>) => Effect.Effect<never, never, boolean> =
  core.deferredDieSync

/**
 * Completes the `Deferred` with interruption. This will interrupt all fibers
 * waiting on the value of the `Deferred` with the `FiberId` of the fiber
 * calling this method.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const interrupt: <E, A>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean> = core.deferredInterrupt

/**
 * Completes the `Deferred` with interruption. This will interrupt all fibers
 * waiting on the value of the `Deferred` with the specified `FiberId`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const interruptWith: <E, A>(
  self: Deferred<E, A>,
  fiberId: FiberId.FiberId
) => Effect.Effect<never, never, boolean> = core.deferredInterruptWith

/**
 * Exits the `Deferred` with the specified `Exit` value, which will be
 * propagated to all fibers waiting on the value of the `Deferred`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const done: <E, A>(self: Deferred<E, A>, exit: Exit.Exit<E, A>) => Effect.Effect<never, never, boolean> =
  core.deferredDone

/**
 * Returns `true` if this `Deferred` has already been completed with a value or
 * an error, `false` otherwise.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const isDone: <E, A>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean> = core.deferredIsDone

/**
 * Returns a `Some<Effect<R, E, A>>` from the `Deferred` if this `Deferred` has
 * already been completed, `None` otherwise.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const poll: <E, A>(
  self: Deferred<E, A>
) => Effect.Effect<never, never, Option.Option<Effect.Effect<never, E, A>>> = core.deferredPoll

const _await: <E, A>(self: Deferred<E, A>) => Effect.Effect<never, E, A> = core.deferredAwait

export {
  /**
   * Retrieves the value of the `Deferred`, suspending the fiber running the
   * workflow until the result is available.
   *
   * @macro traced
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
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const complete: <E, A>(
  self: Deferred<E, A>,
  effect: Effect.Effect<never, E, A>
) => Effect.Effect<never, never, boolean> = core.deferredComplete

/**
 * Completes the deferred with the result of the specified effect. If the
 * deferred has already been completed, the method will produce false.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const completeWith: <E, A>(
  self: Deferred<E, A>,
  effect: Effect.Effect<never, E, A>
) => Effect.Effect<never, never, boolean> = core.deferredCompleteWith

/**
 * Unsafely creates a new `Deferred` from the specified `FiberId`.
 *
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeMake: <E, A>(fiberId: FiberId.FiberId) => Deferred<E, A> = core.deferredUnsafeMake

/**
 * Unsafely exits the `Deferred` with the specified `Exit` value, which will be
 * propagated to all fibers waiting on the value of the `Deferred`.
 *
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeDone: <E, A>(self: Deferred<E, A>, effect: Effect.Effect<never, E, A>) => void =
  core.deferredUnsafeDone
