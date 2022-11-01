/**
 * @since 1.0.0
 */
import type { Cause } from "@effect/io/Cause"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import type { Equal } from "@fp-ts/data/Equal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const EffectTypeId: unique symbol = core.EffectTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type EffectTypeId = typeof EffectTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const EffectErrorTypeId: unique symbol = effect.EffectErrorTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type EffectErrorTypeId = typeof EffectErrorTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Effect<R, E, A> extends Effect.Variance<R, E, A>, Equal {
  /** @internal */
  traced(trace: string | undefined): Effect<R, E, A>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface EffectError<E> {
  readonly [EffectErrorTypeId]: EffectErrorTypeId
  readonly _tag: "EffectError"
  readonly cause: Cause<E>
}

/**
 * @since 1.0.0
 */
export declare namespace Effect {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<R, E, A> {
    readonly [EffectTypeId]: {
      readonly _R: (_: never) => R
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Error<E> = EffectError<E>
}

/**
 * Returns `true` if the specified value is an `Effect`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isEffect = core.isEffect

/**
 * Returns `true` if the specified value is an `EffectError`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isEffectError = effect.isEffectError

/**
 * Constructs a new `EffectError`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const makeEffectError = effect.makeEffectError

/**
 * Adds a finalizer to the scope of this effect. The finalizer is guaranteed
 * to be run when the scope is closed and may depend on the `Exit` value that
 * the scope is closed with.
 *
 * @macro traced
 * @since 1.0.0
 * @category finalization
 */
export const addFinalizer = core.addFinalizer

/**
 * Submerges the error case of an `Either` into an `Effect`. The inverse
 * operation of `either`.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const absolve = effect.absolve

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const absorb = effect.absorb

/**
 * Attempts to convert defects into a failure with the specified function,
 * throwing away all information about the cause of the failure.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const absorbWith = effect.absorbWith

/**
 * Constructs a scoped resource from an `acquire` and `release` effect.
 *
 * If `acquire` successfully completes execution then `release` will be added to
 * the finalizers associated with the scope of this effect and is guaranteed to
 * be run when the scope is closed.
 *
 * The `acquire` and `release` effects will be run uninterruptibly.
 *
 * Additionally, the `release` effect may depend on the `Exit` value specified
 * when the scope is closed.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const acquireRelease = core.acquireRelease

/**
 * A variant of `acquireRelease` that allows the `acquire` effect to be
 * interruptible.
 *
 * Since the `acquire` effect could be interrupted after partially acquiring
 * resources, the `release` effect is not allowed to* access the resource
 * produced by `acquire` and must independently determine what finalization,
 * if any, needs to be performed (e.g. by examining in memory state).
 *
 * Additionally, the `release` effect may depend on the `Exit` value specified
 * when the scope is closed.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const acquireReleaseInterruptible = effect.acquireReleaseInterruptible

/**
 * When this effect represents acquisition of a resource (for example, opening
 * a file, launching a thread, etc.), `acquireUseRelease` can be used to
 * ensure the acquisition is not interrupted and the resource is always
 * released.
 *
 * The function does two things:
 *
 *   1. Ensures this effect, which acquires the resource, will not be
 *      interrupted. Of course, acquisition may fail for internal reasons (an
 *      uncaught exception).
 *   2. Ensures the `release` effect will not be interrupted, and will be
 *      executed so long as this effect successfully
 *      acquires the resource.
 *
 * In between acquisition and release of the resource, the `use` effect is
 * executed.
 *
 * If the `release` effect fails, then the entire effect will fail even if the
 * `use` effect succeeds. If this fail-fast behavior is not desired, errors
 * produced by the `release` effect can be caught and ignored.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const acquireUseRelease = core.acquireUseRelease

/**
 * Makes an explicit check to see if the fiber has been interrupted, and if
 * so, performs self-interruption
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const allowInterrupt = effect.allowInterrupt

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const as = core.as

/**
 * Maps the success value of this effect to a `Left` value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asLeft = effect.asLeft

/**
 * Maps the error value of this effect to a `Left` value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asLeftError = effect.asLeftError

/**
 * Maps the success value of this effect to a `Right` value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asRight = effect.asRight

/**
 * Maps the error value of this effect to a `Right` value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asRightError = effect.asRightError

/**
 * Maps the success value of this effect to a `Some` value.
 *
 * @tsplus getter effect/core/io/Effect asSome
 * @category mapping
 * @since 1.0.0
 */
export const asSome = effect.asSome

/**
 * Maps the error value of this effect to a `Some` value.
 *
 * @tsplus getter effect/core/io/Effect asSome
 * @category mapping
 * @since 1.0.0
 */
export const asSomeError = effect.asSomeError

/**
 * Maps the success value of this effect to `void`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asUnit = core.asUnit

/**
 * Imports an asynchronous side-effect into a pure `Effect` value. See
 * `asyncMaybe` for the more expressive variant of this function that can
 * return a value synchronously.
 *
 * The callback function `Effect<R, E, A> => void` must be called at most once.
 *
 * The `FiberId` of the fiber that may complete the async callback may be
 * provided to allow for better diagnostics.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const async = core.async

// TODO(Max): after runtime
// /**
//  * Converts an asynchronous, callback-style API into an `Effect`, which will
//  * be executed asynchronously.
//  *
//  * With this variant, the registration function may return a an `Effect`.
//  *
//  * @macro traced
//  * @since 1.0.0
//  * @category constructors
//  */
// export const asyncEffect = effect.asyncEffect

/**
 * Imports an asynchronous effect into a pure `Effect` value, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function `Effect<R, E, A> => void` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * The `FiberId` of the fiber that may complete the async callback may be
 * provided to allow for better diagnostics.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const asyncOption = effect.asyncOption

/**
 * Imports an asynchronous side-effect into an effect. The side-effect has
 * the option of returning the value synchronously, which is useful in cases
 * where it cannot be determined if the effect is synchronous or asynchronous
 * until the side-effect is actually executed. The effect also has the option
 * of returning a canceler, which will be used by the runtime to cancel the
 * asynchronous effect if the fiber executing the effect is interrupted.
 *
 * If the register function returns a value synchronously, then the callback
 * function `Effect<R, E, A> => void` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * The `FiberId` of the fiber that may complete the async callback may be
 * provided to allow for better diagnostics.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const asyncInterrupt = core.asyncInterrupt

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchAllCause = core.catchAllCause

/**
 * Constructs an effect with information about the current `Fiber`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const descriptor = effect.descriptor

/**
 * Constructs an effect based on information about the current `Fiber`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const descriptorWith = effect.descriptorWith

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const done = core.done

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const die = core.die

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const dieSync = core.dieSync

/**
 * Effectually accesses the environment of the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const environmentWithEffect = core.environmentWithEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const environment = core.environment

/**
 * Returns an effect that, if this effect _starts_ execution, then the
 * specified `finalizer` is guaranteed to be executed, whether this effect
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the effect's result, see `onExit`.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see the `acquireRelease` family of methods.
 *
 * @macro traced
 * @since 1.0.0
 * @category finalization
 */
export const ensuring = effect.ensuring

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const fail = core.fail

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const failSync = core.failSync

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const failCause = core.failCause

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const failCauseSync = core.failCauseSync

/**
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flatMap = core.flatMap

/**
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flatten = core.flatten

/**
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const forEach = core.forEach

/**
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const forEachDiscard = core.forEachDiscard

/**
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const forEachPar = core.forEachPar

/**
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const forEachParDiscard = core.forEachParDiscard

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const foldCause = core.foldCause

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const foldCauseEffect = core.foldCauseEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const foldEffect = effect.foldEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const fromEither = effect.fromEither

/**
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const map = core.map

/**
 * Returns an effect with its error channel mapped using the specified function.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapError = effect.mapError

/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const provideEnvironment = core.provideEnvironment

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const provideSomeEnvironment = core.provideSomeEnvironment

/**
 * Exposes the full `Cause` of failure for the specified effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const sandbox = effect.sandbox

/**
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const scope = core.scope

/**
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const service = core.service

/**
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const serviceWithEffect = core.serviceWithEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeed = core.succeed

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const suspendSucceed = core.suspendSucceed

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const sync = core.sync

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const updateRuntimeFlags = core.updateRuntimeFlags

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptible = core.interruptible

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptibleMask = core.interruptibleMask

/**
 * @macro traced
 * @since 1.0.0
 * @category utilities
 */
export const intoDeferred = core.intoDeferred

/**
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const tap = core.tap

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const uninterruptible = core.uninterruptible

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const uninterruptibleMask = core.uninterruptibleMask

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interrupt = core.interrupt

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptAs = core.interruptAs

/**
 * Ensures that a cleanup functions runs, whether this effect succeeds, fails,
 * or is interrupted.
 *
 * @macro traced
 * @category finalization
 * @since 1.0.0
 */
export const onExit = core.onExit

/**
 * @macro traced
 * @since 1.0.0
 * @category finalization
 */
export const onInterrupt = core.onInterrupt

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const whileLoop = core.whileLoop

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const whenEffect = core.whenEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const withFiberRuntime = core.withFiberRuntime

/**
 * @macro traced
 * @since 1.0.0
 * @category concurrency
 */
export const withParallelism = core.withParallelism

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const withRuntimeFlags = core.withRuntimeFlags

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const yieldNow = core.yieldNow

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const unit = core.unit

/**
 * @since 1.0.0
 * @category tracing
 */
export const traced = core.traced

/**
 * @macro traced
 * @since 1.0.0
 * @category utilities
 */
export const exit = core.exit

/**
 * @macro traced
 * @since 1.0.0
 * @category utilities
 */
export const fiberId = core.fiberId

/**
 * @macro traced
 * @since 1.0.0
 * @category products
 */
export const zip = core.zip

/**
 * @macro traced
 * @since 1.0.0
 * @category products
 */
export const zipLeft = core.zipLeft

/**
 * @macro traced
 * @since 1.0.0
 * @category products
 */
export const zipRight = core.zipRight

/**
 * @macro traced
 * @since 1.0.0
 * @category products
 */
export const zipWith = core.zipWith
