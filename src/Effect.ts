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
 * resources, the `release` effect is not allowed to access the resource
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
 * @macro traced
 * @category mapping
 * @since 1.0.0
 */
export const asSome = effect.asSome

/**
 * Maps the error value of this effect to a `Some` value.
 *
 * @macro traced
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
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAll = effect.collectAll

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllParDiscard`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllDiscard = effect.collectAllDiscard

/**
 * Evaluate each effect in the structure in parallel, and collect the results.
 * For a sequential version, see `collectAll`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllPar = effect.collectAllPar

/**
 * Evaluate each effect in the structure in parallel, and discard the results.
 * For a sequential version, see `collectAllDiscard`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllParDiscard = effect.collectAllParDiscard

/**
 * Evaluate each effect in the structure with `collectAll`, and collect the
 * results with given partial function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllWith = effect.collectAllWith

/**
 * Evaluate each effect in the structure with `collectAllPar`, and collect
 * the results with given partial function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllWithPar = effect.collectAllWithPar

/**
 * Returns a filtered, mapped subset of the elements of the iterable based on a
 * partial function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllWithEffect = effect.collectAllWithEffect

/**
 * Evaluate and run each effect in the structure and collect the results,
 * discarding results from failed effects.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllSuccesses = effect.collectAllSuccesses

/**
 * Evaluate and run each effect in the structure in parallel and collect the
 * results, discarding results from failed effects.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllSuccessesPar = effect.collectAllSuccessesPar

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
 * Returns a new workflow that will not supervise any fibers forked by this
 * workflow.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const daemonChildren = core.daemonChildren

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
 * Returns an effect whose interruption will be disconnected from the
 * fiber's own interruption, being performed in the background without
 * slowing down the fiber's interruption.
 *
 * This method is useful to create "fast interrupting" effects. For
 * example, if you call this on a bracketed effect, then even if the
 * effect is "stuck" in acquire or release, its interruption will return
 * immediately, while the acquire / release are performed in the
 * background.
 *
 * See timeout and race for other applications.
 *
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const disconnect = effect.disconnect

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
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`, working sequentially.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const exists = effect.exists

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`, working in parallel. Interrupts all effects on any failure or
 * finding an element that satisfies the predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const existsPar = effect.existsPar

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
 * @category constructors
 */
export const fiberIdWith = effect.fiberIdWith

/**
 * Filters the collection using the specified effectful predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filter = effect.filter

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterPar = effect.filterPar

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterNot = effect.filterNot

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterNotPar = effect.filterNotPar

/**
 * Filter the specified effect with the provided function, dying with specified
 * defect if the predicate fails.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrDie = effect.filterOrDie

/**
 * Filter the specified effect with the provided function, dying with specified
 * message if the predicate fails.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrDieMessage = effect.filterOrDieMessage

/**
 * Filters the specified effect with the provided function returning the value
 * of the effect if it is successful, otherwise returns the value of `orElse`.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrElse = effect.filterOrElse

/**
 * Filters the specified effect with the provided function returning the value
 * of the effect if it is successful, otherwise returns the value of `orElse`.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrElseWith = effect.filterOrElseWith

/**
 * Filter the specified effect with the provided function, failing with specified
 * error if the predicate fails.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrFail = effect.filterOrFail

/**
 * Returns the first element that satisfies the effectful predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const find = effect.find

/**
 * Returns an effect that runs this effect and in case of failure, runs each
 * of the specified effects in order until one of them succeeds.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const firstSuccessOf = effect.firstSuccessOf

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
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flattenErrorOption = effect.flattenErrorOption

/**
 * Returns an effect that swaps the error/success cases. This allows you to
 * use all methods on the error channel, possibly before flipping back.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const flip = effect.flip

/**
 * Swaps the error/value parameters, applies the function `f` and flips the
 * parameters back
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const flipWith = effect.flipWith

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const fold = effect.fold

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
 * Determines whether all elements of the `Collection<A>` satisfies the effectual
 * predicate `f`.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const forAll = effect.forAll

/**
 * Returns a new effect that will pass the success value of this effect to the
 * provided callback. If this effect fails, then the failure will be ignored.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const forEachEffect = effect.forEachEffect

/**
 * Applies the function `f` if the argument is non-empty and returns the
 * results in a new `Option<B>`.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const forEachOption = effect.forEachOption

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const forEach = core.forEach

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const forEachDiscard = core.forEachDiscard

/**
 * Same as `forEach`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 *
 * @macro traced
 * @since 1.0.0
 * @category traversing
 */
export const forEachWithIndex = effect.forEachWithIndex

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const forEachPar = core.forEachPar

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const forEachParDiscard = core.forEachParDiscard

/**
 * Same as `forEachPar`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const forEachParWithIndex = effect.forEachParWithIndex

/**
 * Repeats this effect forever (until the first error).
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const forever = effect.forever

/**
 * Returns an effect that forks this effect into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin executing
 * the effect.
 *
 * You can use the `fork` method whenever you want to execute an effect in a
 * new fiber, concurrently and without "blocking" the fiber executing other
 * effects. Using fibers can be tricky, so instead of using this method
 * directly, consider other higher-level methods, such as `raceWith`,
 * `zipPar`, and so forth.
 *
 * The fiber returned by this method has methods to interrupt the fiber and to
 * wait for it to finish executing the effect. See `Fiber` for more
 * information.
 *
 * Whenever you use this method to launch a new fiber, the new fiber is
 * attached to the parent fiber's scope. This means when the parent fiber
 * terminates, the child fiber will be terminated as well, ensuring that no
 * fibers leak. This behavior is called "auto supervision", and if this
 * behavior is not desired, you may use the `forkDaemon` or `forkIn` methods.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const fork = core.fork

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const forkDaemon = core.forkDaemon

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const forkAll = effect.forkAll

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces unit. This version is faster than `forkAll`
 * in cases where the results of the forked fibers are not needed.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const forkAllDiscard = effect.forkAllDiscard

/**
 * Forks the effect in the specified scope. The fiber will be interrupted
 * when the scope is closed.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const forkIn = effect.forkIn

/**
 * Forks the fiber in a `Scope`, interrupting it when the scope is closed.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const forkScoped = effect.forkScoped

/**
 * Like fork but handles an error with the provided handler.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const forkWithErrorHandler = effect.forkWithErrorHandler

/**
 * Lifts an `Either<E, A>` into an `Effect<never, E, A>`.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const fromEither = effect.fromEither

/**
 * Lifts an `Either<Cause<E>, A>` into an `Effect<never, E, A>`.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const fromEitherCause = effect.fromEitherCause

/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const fromFiber = effect.fromFiber

/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const fromFiberEffect = effect.fromFiberEffect

/**
 * Lifts an `Option` into an `Effect` but preserves the error as an option in
 * the error channel, making it easier to compose in some scenarios.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const fromOption = effect.fromOption

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const gen = effect.gen

// TODO(Mike/Max): implement after FiberRefs
// /**
//  * Returns a collection of all `FiberRef` values for the fiber running this
//  * effect.
//  *
//  * @macro traced
//  * @since 1.0.0
//  * @category fiberRefs
//  */
// export const getFiberRefs = effect.getFiberRefs

/**
 * Lifts an `Option` into an `Effect`, if the option is not defined it fails
 * with `NoSuchElementException`.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const getOrFail = effect.getOrFail

/**
 * Lifts an `Option` into a `IO`, if the option is not defined it fails with
 * `void`.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const getOrFailDiscard = effect.getOrFailDiscard

/**
 * Lifts an `Maybe` into an `Effect`. If the option is not defined, fail with
 * the specified `e` value.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const getOrFailWith = effect.getOrFailWith

/**
 * Returns a successful effect with the head of the collection if the collection
 * is non-empty, or fails with the error `None` if the collection is empty.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const head = effect.head

/**
 * Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const ifEffect = effect.ifEffect

/**
 * Returns a new effect that ignores the success or failure of this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const ignore = effect.ignore

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
 * Logs the specified message at the current log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const log = effect.log

/**
 * Logs the specified message at the debug log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logDebug = effect.logDebug

/**
 * Logs the specified cause at the debug log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logDebugCause = effect.logDebugCause

/**
 * Logs the specified message and cause at the debug log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logDebugCauseMessage = effect.logDebugCauseMessage

/**
 * Logs the specified message at the error log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logError = effect.logError

/**
 * Logs the specified cause at the error log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logErrorCause = effect.logErrorCause

/**
 * Logs the specified message and cause at the error log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logErrorCauseMessage = effect.logErrorCauseMessage

/**
 * Logs the specified message at the fatal log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logFatal = effect.logFatal

/**
 * Logs the specified cause at the fatal log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logFatalCause = effect.logFatalCause

/**
 * Logs the specified message and cause at the fatal log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logFatalCauseMessage = effect.logFatalCauseMessage

/**
 * Logs the specified message at the informational log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logInfo = effect.logInfo

/**
 * Logs the specified cause at the informational log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logInfoCause = effect.logInfoCause

/**
 * Logs the specified message and cause at the informational log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logInfoCauseMessage = effect.logInfoCauseMessage

/**
 * Logs the specified message at the warning log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logWarning = effect.logWarning

/**
 * Logs the specified cause at the warning log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logWarningCause = effect.logWarningCause

/**
 * Logs the specified message and cause at the warning log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logWarningCauseMessage = effect.logWarningCauseMessage

/**
 * Logs the specified message at the trace log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logTrace = effect.logTrace

/**
 * Logs the specified cause at the trace log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logTraceCause = effect.logTraceCause

/**
 * Logs the specified message and cause at the trace log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logTraceCauseMessage = effect.logTraceCauseMessage

/**
 * Adjusts the label for the current logging span.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logSpan = effect.logSpan

/**
 * Annotates each log in this effect with the specified log annotation.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logAnnotate = effect.logAnnotate

/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logAnnotations = effect.logAnnotations

/**
 * Loops with the specified effectual function, collecting the results into a
 * list. The moral equivalent of:
 *
 * @example
 * let s  = initial
 * let as = [] as readonly A[]
 *
 * while (cont(s)) {
 *   as = [body(s), ...as]
 *   s  = inc(s)
 * }
 *
 * A.reverse(as)
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const loop = effect.loop

/**
 * Loops with the specified effectual function purely for its effects. The
 * moral equivalent of:
 *
 * @example
 * var s = initial
 *
 * while (cont(s)) {
 *   body(s)
 *   s = inc(s)
 * }
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const loopDiscard = effect.loopDiscard

/**
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const map = core.map

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapAccum = effect.mapAccum

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapBoth = effect.mapBoth

/**
 * Returns an effect with its error channel mapped using the specified function.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapError = effect.mapError

/**
 * Returns an effect with its full cause of failure mapped using the specified
 * function. This can be used to transform errors while preserving the
 * original structure of `Cause`.
 *
 * See `absorb`, `sandbox`, `catchAllCause` for other functions for dealing
 * with defects.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapErrorCause = effect.mapErrorCause

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapTryCatch = effect.mapTryCatch

/**
 * Returns an effect that, if evaluated, will return the lazily computed
 * result of this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const memoize = effect.memoize

/**
 * Returns a memoized version of the specified effectual function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const memoizeF = effect.memoizeF

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const merge = effect.merge

/**
 * Merges an `Iterable<Effect<R, E, A>>` to a single effect, working
 * sequentially.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const mergeAll = effect.mergeAll

/**
 * Merges an `Iterable<Effect<R, E, A>>` to a single effect, working in
 * parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const mergeAllPar = effect.mergeAllPar

/**
 * Returns a new effect where boolean value of this effect is negated.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const negate = effect.negate

/**
 * Returns a effect that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const never = effect.never

/**
 * Requires the option produced by this value to be `None`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const none = effect.none

/**
 * Lifts an `Option` into a `Effect`. If the option is empty it succeeds with
 * `void`. If the option is defined it fails with the content.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const noneOrFail = effect.noneOrFail

/**
 * Lifts an `Option` into a `Effect`. If the option is empty it succeeds with
 * `undefined`. If the option is defined it fails with an error computed by
 * the specified function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const noneOrFailWith = effect.noneOrFailWith

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const onDone = effect.onDone

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const onDoneCause = effect.onDoneCause

/**
 * Runs the specified effect if this effect fails, providing the error to the
 * effect if it exists. The provided effect will not be interrupted.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const onError = effect.onError

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
 * Returns an effect that will be executed at most once, even if it is
 * evaluated multiple times.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const once = effect.once

/**
 * Executes this effect, skipping the error but returning optionally the
 * success.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const option = effect.option

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orDie = effect.orDie

/**
 * Converts all failures to unchecked exceptions.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orDieKeep = effect.orDieKeep

/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orDieWith = effect.orDieWith

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
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orElseEither = effect.orElseEither

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orElseOptional = effect.orElseOptional

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orElseSucceed = effect.orElseSucceed

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * fails with the specified error.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orElseFail = effect.orElseFail

/**
 * Exposes all parallel errors in a single call.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const parallelErrors = effect.parallelErrors

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const parallelFinalizers = effect.parallelFinalizers

/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const provideEnvironment = core.provideEnvironment

// TODO(Max): after Layer
// /**
//  * Provides a layer to the effect, which translates it to another level.
//  *
//  * @macro traced
//  * @since 1.0.0
//  * @category environment
//  */
// export const provideLayer = effect.provideLayer

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const provideService = effect.provideService

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const provideServiceEffect = effect.provideServiceEffect

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const provideSomeEnvironment = core.provideSomeEnvironment

// TODO(Max): after Layer
// /**
//  * Splits the environment into two parts, providing one part using the
//  * specified layer and leaving the remainder `R0`.
//  *
//  * @macro traced
//  * @since 1.0.0
//  * @category environment
//  */
// export const provideSomeLayer = effect.provideSomeLayer

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * Note that both effects are disconnected before being raced. This means that
 * interruption of the loser will always be performed in the background. If this
 * behavior is not desired, you can use `Effect.raceWith`, which will not
 * disconnect or interrupt losers.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const race = effect.race

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const raceAwait = effect.raceAwait

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const raceEither = effect.raceEither

/**
 * Forks this effect and the specified effect into their own fibers, and races
 * them, calling one of two specified callbacks depending on which fiber wins
 * the race. This method does not interrupt, join, or otherwise do anything
 * with the fibers. It can be considered a low-level building block for
 * higher-level operators like `race`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const raceFibersWith = effect.raceFibersWith

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to complete, whether by success or failure. If
 * neither effect completes, then the composed effect will not complete.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated. If early return is
 * desired, then instead of performing `l raceFirst r`, perform
 * `l.disconnect raceFirst r.disconnect`, which disconnects left and right
 * interrupt signal, allowing a fast return, with interruption performed
 * in the background.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const raceFirst = effect.raceFirst

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const raceWith = effect.raceWith

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
 * Accesses the current scope and uses it to perform the specified effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category scoping
 */
export const scopeWith = core.scopeWith

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
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const tryCatch = effect.tryCatch

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
 * Runs the specified effect with an unbounded maximum number of fibers for
 * parallel operations.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const withParallelismUnbounded = core.withParallelismUnbounded

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
