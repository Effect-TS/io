/**
 * @since 1.0.0
 */
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as circular from "@effect/io/internal/effect/index"
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
 * @category models
 */
export interface Effect<R, E, A> extends Effect.Variance<R, E, A>, Equal {
  /** @internal */
  traced(trace: string | undefined): Effect<R, E, A>
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
}

/**
 * Returns `true` if the specified value is an `Effect`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isEffect = core.isEffect

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
export const acquireReleaseInterruptible = circular.acquireReleaseInterruptible

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
 * Makes an explicit check to see if any fibers are attempting to interrupt the
 * current fiber, and if so, performs self-interruption.
 *
 * Note that this allows for interruption to occur in uninterruptible regions.
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
 * Imports a synchronous side-effect into a pure `Effect` value, translating any
 * thrown exceptions into typed failed effects creating with `Effect.fail`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const attempt = effect.attempt

/**
 * Returns a new effect that will not succeed with its value before first
 * waiting for the end of all child fibers forked by the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const awaitAllChildren = effect.awaitAllChildren

/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const cached = effect.cached

/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration. In
 * addition, returns an effect that can be used to invalidate the current
 * cached value before the `timeToLive` duration expires.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const cachedInvalidate = effect.cachedInvalidate

const _catch = effect._catch
export {
  /**
   * Recovers from specified error.
   *
   * @macro traced
   * @since 1.0.0
   * @category error handling
   */
  _catch as catch
}

/**
 * Recovers from all recoverable errors.
 *
 * **Note**: that `Effect.catchAll` will not recover from unrecoverable defects. To
 * recover from both recoverable and unrecoverable errors use
 * `Effect.catchAllCause`.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchAll = effect.catchAll

/**
 * Recovers from both recoverable and unrecoverable errors.
 *
 * See `absorb`, `sandbox`, `mapErrorCause` for other functions that can
 * recover from defects.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchAllCause = core.catchAllCause

/**
 * Recovers from all defects with provided function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchAllDefect = effect.catchAllDefect

/**
 * Recovers from some or all of the error cases.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchSome = effect.catchSome

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchSomeCause = effect.catchSomeCause

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchSomeDefect = effect.catchSomeDefect

/**
 * Recovers from specified tagged error.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchTag = effect.catchTag

/**
 * Returns an effect that succeeds with the cause of failure of this effect,
 * or `Cause.empty` if the effect did succeed.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const cause = effect.cause

/**
 * Retreives the `Clock` service from the environment.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const clock = effect.clock

/**
 * Retreives the `Clock` service from the environment and provides it to the
 * specified effectful function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const clockWith = effect.clockWith

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collect = effect.collect

/**
 * Collects the first element of the `Collection<A?` for which the effectual
 * function `f` returns `Some`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectFirst = effect.collectFirst

/**
 * Evaluate each effect in the structure in parallel, collecting the successful
 * values and discarding the empty cases.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectPar = effect.collectPar

/**
 * Transforms all elements of the chunk for as long as the specified partial
 * function is defined.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectWhile = effect.collectWhile

/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise
 *
 * For effectful conditionals, see `ifEffect`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const cond = effect.cond

/**
 * Fail with the specifed `error` if the supplied partial function does not
 * match, otherwise continue with the returned value.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const continueOrFail = effect.continueOrFail

/**
 * Fail with the specifed `error` if the supplied partial function does not
 * match, otherwise continue with the returned value.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const continueOrFailEffect = effect.continueOrFailEffect

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
export const die = core.die

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const dieMessage = effect.dieMessage

/**
 * Returns an effect that dies with a `RuntimeException` having the specified
 * text message. This method can be used for terminating a fiber because a
 * defect has been detected in the code.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const dieSync = core.dieSync

/**
 * Binds an effectful value in a `do` scope
 *
 * @macro traced
 * @since 1.0.0
 * @category do notation
 */
export const bind = effect.bind

/**
 * Like bind for values
 *
 * @macro traced
 * @since 1.0.0
 * @category do notation
 */
export const bindValue = effect.bindValue

/**
 * @macro traced
 * @since 1.0.0
 * @category do notation
 */
export const Do = effect.Do

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const done = core.done

/**
 * Returns an effect whose failure and success have been lifted into an
 * `Either`. The resulting effect cannot fail, because the failure case has
 * been exposed as part of the `Either` success case.
 *
 * This method is useful for recovering from effects that may fail.
 *
 * The error parameter of the returned `Effect` is `never`, since it is
 * guaranteed the effect does not model failure.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const either = effect.either

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
export const ensuring = circular.ensuring

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not this
 * effect succeeds.
 *
 * @macro traced
 * @since 1.0.0
 * @category finalization
 */
export const ensuringChild = effect.ensuringChild

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @macro traced
 * @since 1.0.0
 * @category finalization
 */
export const ensuringChildren = effect.ensuringChildren

/**
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const environment = core.environment

/**
 * Accesses the environment of the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const environmentWith = effect.environmentWith

/**
 * Effectually accesses the environment of the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const environmentWithEffect = core.environmentWithEffect

/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const eventually = effect.eventually

/**
 * @macro traced
 * @since 1.0.0
 * @category utilities
 */
export const exit = core.exit

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
 * @category utilities
 */
export const fiberId = core.fiberId

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
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orElse = effect.orElse

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
 * Returns an effect that suspends for the specified duration. This method is
 * asynchronous, and does not actually block the fiber executing the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const sleep = effect.sleep

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
 * @category sequencing
 */
export const tap = core.tap

/**
 * @since 1.0.0
 * @category tracing
 */
export const traced = core.traced

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain
 * defects, executes `success` in case of successes
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const tryOrElse = effect.tryOrElse

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
 * @category constructors
 */
export const unit = core.unit

/**
 * Takes some fiber failures and converts them into errors, using the specified
 * function to convert the `E` into an `E1 | E2`.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const unrefineWith = effect.unrefineWith

/**
 * Converts an option on errors into an option on values.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const unsome = effect.unsome

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const updateRuntimeFlags = core.updateRuntimeFlags

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
