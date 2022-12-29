/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as Clock from "@effect/io/Clock"
import type { Config } from "@effect/io/Config"
import type { ConfigError } from "@effect/io/Config/Error"
import type { ConfigProvider } from "@effect/io/Config/Provider"
import type * as Deferred from "@effect/io/Deferred"
import type * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import type * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import type * as RuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"
import type * as FiberRefs from "@effect/io/FiberRefs"
import type * as FiberRefsPatch from "@effect/io/FiberRefs/Patch"
import * as core from "@effect/io/internal/core"
import * as defaultServices from "@effect/io/internal/defaultServices"
import * as effect from "@effect/io/internal/effect"
import * as circular from "@effect/io/internal/effect/circular"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as layer from "@effect/io/internal/layer"
import * as _runtime from "@effect/io/internal/runtime"
import * as _schedule from "@effect/io/internal/schedule"
import type { EnforceNonEmptyRecord, MergeRecord, NonEmptyArrayEffect, TupleEffect } from "@effect/io/internal/types"
import type * as Layer from "@effect/io/Layer"
import type * as Metric from "@effect/io/Metric"
import type * as Random from "@effect/io/Random"
import type * as Runtime from "@effect/io/Runtime"
import type * as Schedule from "@effect/io/Schedule"
import type * as Scope from "@effect/io/Scope"
import type * as Supervisor from "@effect/io/Supervisor"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Context from "@fp-ts/data/Context"
import type * as Duration from "@fp-ts/data/Duration"
import type * as Either from "@fp-ts/data/Either"
import type * as Equal from "@fp-ts/data/Equal"
import type * as HashSet from "@fp-ts/data/HashSet"
import type * as Option from "@fp-ts/data/Option"
import type { Predicate, Refinement } from "@fp-ts/data/Predicate"

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
 * The `Effect` interface defines a value that lazily describes a workflow or job.
 * The workflow requires some context `R`, and may fail with an error of type `E`,
 * or succeed with a value of type `A`.
 *
 * `Effect` values model resourceful interaction with the outside world, including
 * synchronous, asynchronous, concurrent, and parallel interaction. They use a
 * fiber-based concurrency model, with built-in support for scheduling, fine-grained
 * interruption, structured concurrency, and high scalability.
 *
 * To run an `Effect` value, you need a `Runtime`, which is a type that is capable
 * of executing `Effect` values.
 *
 * @since 1.0.0
 * @category models
 */
export interface Effect<R, E, A> extends Effect.Variance<R, E, A>, Equal.Equal {
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
  /**
   * @since 1.0.0
   * @category type-level
   */
  export type Context<T extends Effect<any, any, any>> = [T] extends [Effect<infer _R, infer _E, infer _A>] ? _R : never
  /**
   * @since 1.0.0
   * @category type-level
   */
  export type Error<T extends Effect<any, any, any>> = [T] extends [Effect<infer _R, infer _E, infer _A>] ? _E : never
  /**
   * @since 1.0.0
   * @category type-level
   */
  export type Success<T extends Effect<any, any, any>> = [T] extends [Effect<infer _R, infer _E, infer _A>] ? _A : never
}

/**
 * This function returns `true` if the specified value is an `Effect` value,
 * `false` otherwise.
 *
 * This function can be useful for checking the type of a value before
 * attempting to operate on it as an `Effect` value. For example, you could
 * use `isEffect` to check the type of a value before using it as an
 * argument to a function that expects an `Effect` value.
 *
 * @param u - The value to check for being an `Effect` value.
 *
 * @returns `true` if the specified value is an `Effect` value, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isEffect: (u: unknown) => u is Effect<unknown, unknown, unknown> = core.isEffect

/**
 * This function adds a finalizer to the scope of the calling `Effect` value.
 * The finalizer is guaranteed to be run when the scope is closed, and it may
 * depend on the `Exit` value that the scope is closed with.
 *
 * @param finalizer - The finalizer to add to the scope of the calling
 * `Effect` value. This function must take an `Exit` value as its parameter,
 * and return a new `Effect` value.
 *
 * @returns A new `Effect` value that represents the addition of the finalizer
 * to the scope of the calling `Effect` value.
 *
 * @macro traced
 * @since 1.0.0
 * @category finalization
 */
export const addFinalizer: <R, X>(
  finalizer: (exit: Exit.Exit<unknown, unknown>) => Effect<R, never, X>
) => Effect<R | Scope.Scope, never, void> = fiberRuntime.addFinalizer

/**
 * This function submerges the error case of an `Either` value into an
 * `Effect` value. It is the inverse operation of `either`.
 *
 * If the `Either` value is a `Right` value, then the `Effect` value will
 * succeed with the value contained in the `Right`. If the `Either` value
 * is a `Left` value, then the `Effect` value will fail with the error
 * contained in the `Left`.
 *
 * @param self - The `Effect` value that contains an `Either` value as its
 * result.
 *
 * @returns A new `Effect` value that has the same context as the original
 * `Effect` value, but has the error case of the `Either` value submerged
 * into it.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const absolve: <R, E, A>(self: Effect<R, E, Either.Either<E, A>>) => Effect<R, E, A> = effect.absolve

/**
 * This function transforms an `Effect` value that may fail with a defect
 * into a new `Effect` value that may fail with an unknown error.
 *
 * The resulting `Effect` value will have the same context and success
 * type as the original `Effect` value, but it will have a more general
 * error type that allows it to fail with any type of error.
 *
 * @param self - The `Effect` value to transform.
 *
 * @returns A new `Effect` value that has the same context and success
 * type as the original `Effect` value, but a more general error type that
 * allows it to fail with any type of error.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const absorb: <R, E, A>(self: Effect<R, E, A>) => Effect<R, unknown, A> = effect.absorb

/**
 * This function takes a mapping function `f` and returns a new function
 * that transforms an `Effect` value that may fail with a defect into a new
 * `Effect` value that may fail with an unknown error.
 *
 * If the original `Effect` value fails with a known error, then the
 * mapping function `f` will be applied to the error to convert it to an
 * unknown structure.
 *
 * The resulting `Effect` value will have the same context and success
 * type as the original `Effect` value, but it will have a more general
 * error type that allows it to fail with any type of error.
 *
 * @param f - The mapping function to apply to known errors. This function
 * must take an error of type `E` and return an unknown structure.
 *
 * @returns A new function that transforms an `Effect` value that may fail
 * with a defect into a new `Effect` value that may fail with an unknown
 * error.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const absorbWith: <E>(f: (e: E) => unknown) => <R, A>(self: Effect<R, E, A>) => Effect<R, unknown, A> =
  effect.absorbWith

/**
 * This function constructs a scoped resource from an `acquire` and `release`
 * `Effect` value.
 *
 * If the `acquire` `Effect` value successfully completes execution, then the
 * `release` `Effect` value will be added to the finalizers associated with the
 * scope of this `Effect` value, and it is guaranteed to be run when the scope
 * is closed.
 *
 * The `acquire` and `release` `Effect` values will be run uninterruptibly.
 * Additionally, the `release` `Effect` value may depend on the `Exit` value
 * specified when the scope is closed.
 *
 * @param acquire - The `Effect` value that acquires the resource.
 * @param release - The `Effect` value that releases the resource.
 *
 * @returns A new `Effect` value that represents the scoped resource.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const acquireRelease: <R, E, A, R2, X>(
  acquire: Effect<R, E, A>,
  release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect<R2, never, X>
) => Effect<Scope.Scope | R | R2, E, A> = fiberRuntime.acquireRelease

/**
 * This function is a variant of `acquireRelease` that allows the `acquire`
 * `Effect` value to be interruptible.
 *
 * Since the `acquire` `Effect` value could be interrupted after partially
 * acquiring resources, the `release` `Effect` value is not allowed to access
 * the resource produced by `acquire` and must independently determine what
 * finalization, if any, needs to be performed (e.g. by examining in memory
 * state).
 *
 * Additionally, the `release` `Effect` value may depend on the `Exit` value
 * specified when the scope is closed.
 *
 * @param acquire - The interruptible `Effect` value that acquires the
 * resource.
 * @param release - The `Effect` value that releases the resource. This function
 * must take an `Exit` value as its parameter, and return a new `Effect` value.
 *
 * @returns A new `Effect` value that represents the interruptible scoped
 * resource.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const acquireReleaseInterruptible: <R, E, A, R2, X>(
  acquire: Effect<R, E, A>,
  release: (exit: Exit.Exit<unknown, unknown>) => Effect<R2, never, X>
) => Effect<Scope.Scope | R | R2, E, A> = circular.acquireReleaseInterruptible

/**
 * This function is used to ensure that an `Effect` value that represents the
 * acquisition of a resource (for example, opening a file, launching a thread,
 * etc.) will not be interrupted, and that the resource will always be released
 * when the `Effect` value completes execution.
 *
 * `acquireUseRelease` does the following:
 *
 *   1. Ensures that the `Effect` value that acquires the resource will not be
 *      interrupted. Note that acquisition may still fail due to internal
 *      reasons (such as an uncaught exception).
 *   2. Ensures that the `release` `Effect` value will not be interrupted,
 *      and will be executed as long as the acquisition `Effect` value
 *      successfully acquires the resource.
 *
 * During the time period between the acquisition and release of the resource,
 * the `use` `Effect` value will be executed.
 *
 * If the `release` `Effect` value fails, then the entire `Effect` value will
 * fail, even if the `use` `Effect` value succeeds. If this fail-fast behavior
 * is not desired, errors produced by the `release` `Effect` value can be caught
 * and ignored.
 *
 * @param acquire - The `Effect` value that acquires the resource.
 * @param use - The `Effect` value that is executed between the acquisition
 * and release of the resource.
 * @param release - The `Effect` value that releases the resource.
 *
 * @returns A new `Effect` value that represents the acquisition, use, and
 * release of the resource.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const acquireUseRelease: <R, E, A, R2, E2, A2, R3, X>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R2, E2, A2>,
  release: (a: A, exit: Exit.Exit<E2, A2>) => Effect<R3, never, X>
) => Effect<R | R2 | R3, E | E2, A2> = core.acquireUseRelease

/**
 * This function checks if any fibers are attempting to interrupt the current
 * fiber, and if so, performs self-interruption.
 *
 * Note that this allows for interruption to occur in uninterruptible regions.
 *
 * @returns A new `Effect` value that represents the check for interruption
 * and the potential self-interruption of the current fiber.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const allowInterrupt: () => Effect<never, never, void> = effect.allowInterrupt

/**
 * This function maps the success value of an `Effect` value to a specified
 * constant value.
 *
 * @param value - The constant value that the success value of the `Effect`
 * value will be mapped to.
 * @param self - The `Effect` value whose success value will be mapped to the
 * specified constant value.
 *
 * @returns A new `Effect` value that represents the mapping of the success
 * value of the original `Effect` value to the specified constant value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const as: <B>(value: B) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, B> = core.as

/**
 * This function maps the success value of an `Effect` value to a `Left` value
 * in an `Either` value.
 *
 * @param self - The `Effect` value whose success value will be mapped to a
 * `Left` value in an `Either` value.
 *
 * @returns A new `Effect` value that represents the mapping of the success
 * value of the original `Effect` value to a `Left` value in an `Either`
 * value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asLeft: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Either.Either<A, never>> = effect.asLeft

/**
 * This function maps the error value of an `Effect` value to a `Left` value
 * in an `Either` value.
 *
 * @param self - The `Effect` value whose error value will be mapped to a
 * `Left` value in an `Either` value.
 *
 * @returns A new `Effect` value that represents the mapping of the error
 * value of the original `Effect` value to a `Left` value in an `Either`
 * value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asLeftError: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Either.Either<E, never>, A> = effect.asLeftError

/**
 * This function maps the success value of an `Effect` value to a `Right` value
 * in an `Either` value.
 *
 * @param self - The `Effect` value whose success value will be mapped to a
 * `Right` value in an `Either` value.
 *
 * @returns A new `Effect` value that represents the mapping of the success
 * value of the original `Effect` value to a `Right` value in an `Either`
 * value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asRight: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Either.Either<never, A>> = effect.asRight

/**
 * This function maps the error value of an `Effect` value to a `Right` value
 * in an `Either` value.
 *
 * @param self - The `Effect` value whose error value will be mapped to a
 * `Right` value in an `Either` value.
 *
 * @returns A new `Effect` value that represents the mapping of the error
 * value of the original `Effect` value to a `Right` value in an `Either`
 * value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asRightError: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Either.Either<never, E>, A> =
  effect.asRightError

/**
 * This function maps the success value of an `Effect` value to a `Some` value
 * in an `Option` value. If the original `Effect` value fails, the returned
 * `Effect` value will also fail.
 *
 * @param self - The `Effect` value whose success value will be mapped to a
 * `Some` value in an `Option` value.
 *
 * @returns A new `Effect` value that represents the mapping of the success
 * value of the original `Effect` value to a `Some` value in an `Option`
 * value. The returned `Effect` value may fail if the original `Effect` value
 * fails.
 *
 * @macro traced
 * @category mapping
 * @since 1.0.0
 */
export const asSome: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Option.Option<A>> = effect.asSome

/**
 * This function maps the error value of an `Effect` value to a `Some` value
 * in an `Option` value. If the original `Effect` value succeeds, the returned
 * `Effect` value will also succeed.
 *
 * @param self - The `Effect` value whose error value will be mapped to a
 * `Some` value in an `Option` value.
 *
 * @returns A new `Effect` value that represents the mapping of the error
 * value of the original `Effect` value to a `Some` value in an `Option`
 * value. The returned `Effect` value may succeed if the original `Effect`
 * value succeeds.
 *
 * @macro traced
 * @category mapping
 * @since 1.0.0
 */
export const asSomeError: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Option.Option<E>, A> = effect.asSomeError

/**
 * This function maps the success value of an `Effect` value to `void`. If the
 * original `Effect` value succeeds, the returned `Effect` value will also
 * succeed. If the original `Effect` value fails, the returned `Effect` value
 * will fail with the same error.
 *
 * @param self - The `Effect` value whose success value will be mapped to `void`.
 *
 * @returns A new `Effect` value that represents the mapping of the success
 * value of the original `Effect` value to `void`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asUnit: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, void> = core.asUnit

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
export const async: <R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void) => void,
  blockingOn?: FiberId.FiberId
) => Effect<R, E, A> = core.async

/**
 * Converts an asynchronous, callback-style API into an `Effect`, which will
 * be executed asynchronously.
 *
 * With this variant, the registration function may return a an `Effect`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const asyncEffect: <R, E, A, R2, E2, X>(
  register: (callback: (_: Effect<R, E, A>) => void) => Effect<R2, E2, X>
) => Effect<R | R2, E | E2, A> = _runtime.asyncEffect

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
export const asyncOption: <R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void) => Option.Option<Effect<R, E, A>>,
  blockingOn?: FiberId.FiberId
) => Effect<R, E, A> = effect.asyncOption

/**
 * Imports an asynchronous side-effect into an effect. It has the option of
 * returning the value synchronously, which is useful in cases where it cannot
 * be determined if the effect is synchronous or asynchronous until the register
 * is actually executed. It also has the option of returning a canceler,
 * which will be used by the runtime to cancel the asynchronous effect if the fiber
 * executing the effect is interrupted.
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
export const asyncInterruptEither: <R, E, A>(
  register: (callback: (effect: Effect<R, E, A>) => void) => Either.Either<Effect<R, never, void>, Effect<R, E, A>>,
  blockingOn?: FiberId.FiberId
) => Effect<R, E, A> = core.asyncInterruptEither

/**
 * Imports an asynchronous side-effect into an effect allowing control of interruption.
 *
 * The `FiberId` of the fiber that may complete the async callback may be
 * provided to allow for better diagnostics.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const asyncInterrupt: <R, E, A>(
  register: (callback: (effect: Effect<R, E, A>) => void) => Effect<R, never, void>,
  blockingOn?: FiberId.FiberId
) => Effect<R, E, A> = core.asyncInterrupt

/**
 * Imports a synchronous side-effect into a pure `Effect` value, translating any
 * thrown exceptions into typed failed effects creating with `Effect.fail`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const attempt: <A>(evaluate: () => A) => Effect<never, unknown, A> = effect.attempt

/**
 * Returns a new effect that will not succeed with its value before first
 * waiting for the end of all child fibers forked by the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const awaitAllChildren: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = circular.awaitAllChildren

/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const cached: (
  timeToLive: Duration.Duration
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Effect<never, E, A>> = circular.cached

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
export const cachedInvalidate: (
  timeToLive: Duration.Duration
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, readonly [Effect<never, E, A>, Effect<never, never, void>]> =
  circular.cachedInvalidate

const _catch: <N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => Effect<R1, E1, A1>
) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | Exclude<E, { [n in N]: K }>, A1 | A> = effect._catch

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
export const catchAll: <E, R2, E2, A2>(
  f: (e: E) => Effect<R2, E2, A2>
) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, A2 | A> = core.catchAll

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
export const catchAllCause: <E, R2, E2, A2>(
  f: (cause: Cause.Cause<E>) => Effect<R2, E2, A2>
) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, A2 | A> = core.catchAllCause

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
export const catchAllDefect: <R2, E2, A2>(
  f: (defect: unknown) => Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A> = effect.catchAllDefect

/**
 * Recovers from some or all of the error cases.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchSome: <E, R2, E2, A2>(
  pf: (e: E) => Option.Option<Effect<R2, E2, A2>>
) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A2 | A> = core.catchSome

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchSomeCause: <E, R2, E2, A2>(
  f: (cause: Cause.Cause<E>) => Option.Option<Effect<R2, E2, A2>>
) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A2 | A> = effect.catchSomeCause

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
export const catchSomeDefect: <R2, E2, A2>(
  pf: (_: unknown) => Option.Option<Effect<R2, E2, A2>>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A> = effect.catchSomeDefect

/**
 * Recovers from specified tagged error.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchTag: <K extends E["_tag"] & string, E extends { _tag: string }, R1, E1, A1>(
  k: K,
  f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>
) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A> = effect.catchTag

/**
 * Returns an effect that succeeds with the cause of failure of this effect,
 * or `Cause.empty` if the effect did succeed.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const cause: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Cause.Cause<E>> = effect.cause

/**
 * Checks the interrupt status, and produces the effect returned by the
 * specified callback.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const checkInterruptible: <R, E, A>(f: (isInterruptible: boolean) => Effect<R, E, A>) => Effect<R, E, A> =
  core.checkInterruptible

/**
 * Retreives the `Clock` service from the environment.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const clock: () => Effect<never, never, Clock.Clock> = effect.clock

/**
 * Retreives the `Clock` service from the environment and provides it to the
 * specified effectful function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const clockWith: <R, E, A>(f: (clock: Clock.Clock) => Effect<R, E, A>) => Effect<R, E, A> = effect.clockWith

/**
 * Uses the default config provider to load the specified config, or fail with
 * an error of type Config.Error.
 *
 * @macro traced
 * @since 1.0.0
 * @category config
 */
export const config: <A>(config: Config<A>) => Effect<never, ConfigError, A> = defaultServices.config

/**
 * Retrieves the default config provider, and passes it to the specified
 * function, which may return an effect that uses the provider to perform some
 * work or compute some value.
 *
 * @macro traced
 * @since 1.0.0
 * @category config
 */
export const configProviderWith: <R, E, A>(f: (configProvider: ConfigProvider) => Effect<R, E, A>) => Effect<R, E, A> =
  defaultServices.configProviderWith

/**
 * Executes the specified workflow with the specified configuration provider.
 *
 * @macro traced
 * @since 1.0.0
 * @category config
 */
export const withConfigProvider: (value: ConfigProvider) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> =
  defaultServices.withConfigProvider

/**
 * Sets the configuration provider to the specified value and restores it to its original value
 * when the scope is closed.
 *
 * @macro traced
 * @since 1.0.0
 * @category config
 */
export const withConfigProviderScoped: (value: ConfigProvider) => Effect<Scope.Scope, never, void> =
  fiberRuntime.withConfigProviderScoped

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collect: <A, R, E, B>(
  f: (a: A) => Effect<R, Option.Option<E>, B>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<B>> = fiberRuntime.collect

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAll: <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, E, Chunk.Chunk<A>> =
  effect.collectAll

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllParDiscard`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllDiscard: <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, E, void> =
  effect.collectAllDiscard

/**
 * Evaluate each effect in the structure in parallel, and collect the results.
 * For a sequential version, see `collectAll`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllPar: <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, E, Chunk.Chunk<A>> =
  fiberRuntime.collectAllPar

/**
 * Evaluate each effect in the structure in parallel, and discard the results.
 * For a sequential version, see `collectAllDiscard`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllParDiscard: <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, E, void> =
  fiberRuntime.collectAllParDiscard

/**
 * Evaluate each effect in the structure with `collectAll`, and collect the
 * results with given partial function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllWith: <A, B>(
  pf: (a: A) => Option.Option<B>
) => <R, E>(elements: Iterable<Effect<R, E, A>>) => Effect<R, E, Chunk.Chunk<B>> = effect.collectAllWith

/**
 * Evaluate each effect in the structure with `collectAllPar`, and collect
 * the results with given partial function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllWithPar: <A, B>(
  pf: (a: A) => Option.Option<B>
) => <R, E>(elements: Iterable<Effect<R, E, A>>) => Effect<R, E, Chunk.Chunk<B>> = fiberRuntime.collectAllWithPar

/**
 * Returns a filtered, mapped subset of the elements of the iterable based on a
 * partial function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllWithEffect: <A, R, E, B>(
  f: (a: A) => Option.Option<Effect<R, E, B>>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<B>> = effect.collectAllWithEffect

/**
 * Evaluate and run each effect in the structure and collect the results,
 * discarding results from failed effects.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllSuccesses: <R, E, A>(as: Iterable<Effect<R, E, A>>) => Effect<R, never, Chunk.Chunk<A>> =
  effect.collectAllSuccesses

/**
 * Evaluate and run each effect in the structure in parallel and collect the
 * results, discarding results from failed effects.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectAllSuccessesPar: <R, E, A>(
  elements: Iterable<Effect<R, E, A>>
) => Effect<R, never, Chunk.Chunk<A>> = fiberRuntime.collectAllSuccessesPar

/**
 * Collects the first element of the `Collection<A?` for which the effectual
 * function `f` returns `Some`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectFirst: <R, E, A, B>(
  f: (a: A) => Effect<R, E, Option.Option<B>>
) => (elements: Iterable<A>) => Effect<R, E, Option.Option<B>> = effect.collectFirst

/**
 * Evaluate each effect in the structure in parallel, collecting the successful
 * values and discarding the empty cases.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectPar: <A, R, E, B>(
  f: (a: A) => Effect<R, Option.Option<E>, B>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<B>> = fiberRuntime.collectPar

/**
 * Transforms all elements of the chunk for as long as the specified partial
 * function is defined.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const collectWhile: <A, R, E, B>(
  f: (a: A) => Option.Option<Effect<R, E, B>>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<B>> = effect.collectWhile

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
export const cond: <E, A>(predicate: () => boolean, result: () => A, error: () => E) => Effect<never, E, A> =
  effect.cond

/**
 * Fail with the specifed `error` if the supplied partial function does not
 * match, otherwise continue with the returned value.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const continueOrFail: <E1, A, A2>(
  error: E1,
  pf: (a: A) => Option.Option<A2>
) => <R, E>(self: Effect<R, E, A>) => Effect<R, E1 | E, A2> = effect.continueOrFail

/**
 * Fail with the specifed `error` if the supplied partial function does not
 * match, otherwise continue with the returned value.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const continueOrFailEffect: <E1, A, R2, E2, A2>(
  error: E1,
  pf: (a: A) => Option.Option<Effect<R2, E2, A2>>
) => <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E1 | E2 | E, A2> = effect.continueOrFailEffect

/**
 * Returns a new workflow that will not supervise any fibers forked by this
 * workflow.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const daemonChildren: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = fiberRuntime.daemonChildren

/**
 * Returns an effect that is delayed from this effect by the specified
 * `Duration`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const delay: (duration: Duration.Duration) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = effect.delay

/**
 * Constructs an effect with information about the current `Fiber`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const descriptor: () => Effect<never, never, Fiber.Fiber.Descriptor> = effect.descriptor

/**
 * Constructs an effect based on information about the current `Fiber`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const descriptorWith: <R, E, A>(f: (descriptor: Fiber.Fiber.Descriptor) => Effect<R, E, A>) => Effect<R, E, A> =
  effect.descriptorWith

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Effect<never, never, never> = core.die

/**
 * Returns an effect that dies with a `RuntimeException` having the specified
 * text message. This method can be used for terminating a fiber because a
 * defect has been detected in the code.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const dieMessage: (message: string) => Effect<never, never, never> = effect.dieMessage

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const dieSync: (evaluate: () => unknown) => Effect<never, never, never> = core.dieSync

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
export const disconnect: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = circular.disconnect

/**
 * Returns a new workflow that executes this one and captures the changes in
 * `FiberRef` values.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const diffFiberRefs: <R, E, A>(
  self: Effect<R, E, A>
) => Effect<R, E, readonly [FiberRefsPatch.FiberRefsPatch, A]> = effect.diffFiberRefs

/**
 * Binds an effectful value in a `do` scope
 *
 * @macro traced
 * @since 1.0.0
 * @category do notation
 */
export const bind: <N extends string, K, R2, E2, A>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect<R2, E2, A>
) => <R, E>(self: Effect<R, E, K>) => Effect<R2 | R, E2 | E, MergeRecord<K, { [k in N]: A }>> = effect.bind

/**
 * Like bind for values
 *
 * @macro traced
 * @since 1.0.0
 * @category do notation
 */
export const bindValue: <N extends string, K, A>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
) => <R, E>(self: Effect<R, E, K>) => Effect<R, E, MergeRecord<K, { [k in N]: A }>> = effect.bindValue

/**
 * @macro traced
 * @since 1.0.0
 * @category do notation
 */
export const Do: () => Effect<never, never, {}> = effect.Do

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const done: <E, A>(exit: Exit.Exit<E, A>) => Effect<never, E, A> = core.done

/**
 * Drops all elements until the effectful predicate returns true.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const dropUntil: <A, R, E>(
  predicate: (a: A) => Effect<R, E, boolean>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<A>> = effect.dropUntil

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const dropWhile: <R, E, A>(
  f: (a: A) => Effect<R, E, boolean>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<A>> = effect.dropWhile

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
export const either: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Either.Either<E, A>> = core.either

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
export const ensuring: <R1, X>(
  finalizer: Effect<R1, never, X>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A> = circular.ensuring

/**
 * Acts on the children of this fiber (collected into a single fiber),
 * guaranteeing the specified callback will be invoked, whether or not this
 * effect succeeds.
 *
 * @macro traced
 * @since 1.0.0
 * @category finalization
 */
export const ensuringChild: <R2, X>(
  f: (fiber: Fiber.Fiber<any, Chunk.Chunk<unknown>>) => Effect<R2, never, X>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, A> = circular.ensuringChild

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @macro traced
 * @since 1.0.0
 * @category finalization
 */
export const ensuringChildren: <R1, X>(
  children: (fibers: Chunk.Chunk<Fiber.RuntimeFiber<any, any>>) => Effect<R1, never, X>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A> = circular.ensuringChildren

/**
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const environment: <R>() => Effect<R, never, Context.Context<R>> = core.environment

/**
 * Accesses the environment of the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const environmentWith: <R, A>(f: (context: Context.Context<R>) => A) => Effect<R, never, A> =
  effect.environmentWith

/**
 * Effectually accesses the environment of the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const environmentWithEffect: <R, R0, E, A>(
  f: (context: Context.Context<R0>) => Effect<R, E, A>
) => Effect<R | R0, E, A> = core.environmentWithEffect

/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const eventually: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, A> = effect.eventually

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`, working sequentially.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const exists: <R, E, A>(f: (a: A) => Effect<R, E, boolean>) => (elements: Iterable<A>) => Effect<R, E, boolean> =
  effect.exists

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`, working in parallel. Interrupts all effects on any failure or
 * finding an element that satisfies the predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const existsPar: <R, E, A>(
  f: (a: A) => Effect<R, E, boolean>
) => (elements: Iterable<A>) => Effect<R, E, boolean> = fiberRuntime.existsPar

/**
 * @macro traced
 * @since 1.0.0
 * @category utilities
 */
export const exit: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Exit.Exit<E, A>> = core.exit

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Effect<never, E, never> = core.fail

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const failSync: <E>(evaluate: () => E) => Effect<never, E, never> = core.failSync

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Effect<never, E, never> = core.failCause

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const failCauseSync: <E>(evaluate: () => Cause.Cause<E>) => Effect<never, E, never> = core.failCauseSync

/**
 * @macro traced
 * @since 1.0.0
 * @category utilities
 */
export const fiberId: () => Effect<never, never, FiberId.FiberId> = core.fiberId

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const fiberIdWith: <R, E, A>(f: (descriptor: FiberId.Runtime) => Effect<R, E, A>) => Effect<R, E, A> =
  core.fiberIdWith

/**
 * Filters the collection using the specified effectful predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filter: <A, R, E>(
  f: (a: A) => Effect<R, E, boolean>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<A>> = effect.filter

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterPar: <A, R, E>(
  f: (a: A) => Effect<R, E, boolean>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<A>> = fiberRuntime.filterPar

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterNot: <A, R, E>(
  f: (a: A) => Effect<R, E, boolean>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<A>> = effect.filterNot

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterNotPar: <A, R, E>(
  f: (a: A) => Effect<R, E, boolean>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<A>> = fiberRuntime.filterNotPar

/**
 * Filter the specified effect with the provided function, dying with specified
 * defect if the predicate fails.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrDie: {
  <A, B extends A>(f: Refinement<A, B>, defect: () => unknown): <R, E>(self: Effect<R, E, A>) => Effect<R, E, B>
  <A>(f: Predicate<A>, defect: () => unknown): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
} = effect.filterOrDie

/**
 * Filter the specified effect with the provided function, dying with specified
 * message if the predicate fails.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrDieMessage: {
  <A, B extends A>(f: Refinement<A, B>, message: string): <R, E>(self: Effect<R, E, A>) => Effect<R, E, B>
  <A>(f: Predicate<A>, message: string): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
} = effect.filterOrDieMessage

/**
 * Filters the specified effect with the provided function returning the value
 * of the effect if it is successful, otherwise returns the value of `orElse`.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrElse: {
  <A, B extends A, R2, E2, C>(
    f: Refinement<A, B>,
    orElse: () => Effect<R2, E2, C>
  ): <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, B | C>
  <A, R2, E2, B>(
    f: Predicate<A>,
    orElse: () => Effect<R2, E2, B>
  ): <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A | B>
} = effect.filterOrElse

/**
 * Filters the specified effect with the provided function returning the value
 * of the effect if it is successful, otherwise returns the value of `orElse`.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrElseWith: {
  <A, B extends A, R2, E2, C>(
    f: Refinement<A, B>,
    orElse: (a: A) => Effect<R2, E2, C>
  ): <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, B | C>
  <A, R2, E2, B>(
    f: Predicate<A>,
    orElse: (a: A) => Effect<R2, E2, B>
  ): <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A | B>
} = effect.filterOrElseWith

/**
 * Filter the specified effect with the provided function, failing with specified
 * error if the predicate fails.
 *
 * @macro traced
 * @since 1.0.0
 * @category filtering
 */
export const filterOrFail: {
  <A, B extends A, E2>(f: Refinement<A, B>, error: () => E2): <R, E>(self: Effect<R, E, A>) => Effect<R, E2 | E, B>
  <A, E2>(f: Predicate<A>, error: () => E2): <R, E>(self: Effect<R, E, A>) => Effect<R, E2 | E, A>
} = effect.filterOrFail

/**
 * Returns the first element that satisfies the effectful predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const find: <A, R, E>(
  f: (a: A) => Effect<R, E, boolean>
) => (elements: Iterable<A>) => Effect<R, E, Option.Option<A>> = effect.find

/**
 * This function takes an iterable of `Effect` values and returns a new
 * `Effect` value that represents the first `Effect` value in the iterable
 * that succeeds. If all of the `Effect` values in the iterable fail, then
 * the resulting `Effect` value will fail as well.
 *
 * This function is sequential, meaning that the `Effect` values in the
 * iterable will be executed in sequence, and the first one that succeeds
 * will determine the outcome of the resulting `Effect` value.
 *
 * @param effects - The iterable of `Effect` values to evaluate.
 *
 * @returns A new `Effect` value that represents the first successful
 * `Effect` value in the iterable, or a failed `Effect` value if all of the
 * `Effect` values in the iterable fail.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const firstSuccessOf: <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, E, A> = effect.firstSuccessOf

/**
 * This function is a pipeable operator that maps over an `Effect` value,
 * flattening the result of the mapping function into a new `Effect` value.
 *
 * @param f - The mapping function to apply to the `Effect` value.
 * This function must return another `Effect` value.
 *
 * @returns A new `Effect` value that is the result of flattening the
 * mapped `Effect` value.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flatMap: <A, R1, E1, B>(
  f: (a: A) => Effect<R1, E1, B>
) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, B> = core.flatMap

/**
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flatten: <R, E, R1, E1, A>(self: Effect<R, E, Effect<R1, E1, A>>) => Effect<R | R1, E | E1, A> =
  core.flatten

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flattenErrorOption: <E1>(
  fallback: E1
) => <R, E, A>(self: Effect<R, Option.Option<E>, A>) => Effect<R, E1 | E, A> = effect.flattenErrorOption

/**
 * Returns an effect that swaps the error/success cases. This allows you to
 * use all methods on the error channel, possibly before flipping back.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const flip: <R, E, A>(self: Effect<R, E, A>) => Effect<R, A, E> = core.flip

/**
 * Swaps the error/value parameters, applies the function `f` and flips the
 * parameters back
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const flipWith: <R, A, E, R2, A2, E2>(
  f: (effect: Effect<R, A, E>) => Effect<R2, A2, E2>
) => (self: Effect<R, E, A>) => Effect<R2, E2, A2> = effect.flipWith

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const fold: <E, A, A2, A3>(
  onFailure: (error: E) => A2,
  onSuccess: (value: A) => A3
) => <R>(self: Effect<R, E, A>) => Effect<R, never, A2 | A3> = effect.fold

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const foldCause: <E, A2, A, A3>(
  onFailure: (cause: Cause.Cause<E>) => A2,
  onSuccess: (a: A) => A3
) => <R>(self: Effect<R, E, A>) => Effect<R, never, A2 | A3> = core.foldCause

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const foldCauseEffect: <E, A, R2, E2, A2, R3, E3, A3>(
  onFailure: (cause: Cause.Cause<E>) => Effect<R2, E2, A2>,
  onSuccess: (a: A) => Effect<R3, E3, A3>
) => <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2 | E3, A2 | A3> = core.foldCauseEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const foldEffect: <E, A, R2, E2, A2, R3, E3, A3>(
  onFailure: (e: E) => Effect<R2, E2, A2>,
  onSuccess: (a: A) => Effect<R3, E3, A3>
) => <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2 | E3, A2 | A3> = core.foldEffect

/**
 * Determines whether all elements of the `Collection<A>` satisfies the effectual
 * predicate `f`.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const forAll: <R, E, A>(f: (a: A) => Effect<R, E, boolean>) => (elements: Iterable<A>) => Effect<R, E, boolean> =
  effect.forAll

/**
 * Returns a new effect that will pass the success value of this effect to the
 * provided callback. If this effect fails, then the failure will be ignored.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const forEachEffect: <A, R1, E1, B>(
  f: (a: A) => Effect<R1, E1, B>
) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1, Option.Option<B>> = effect.forEachEffect

/**
 * Applies the function `f` if the argument is non-empty and returns the
 * results in a new `Option<B>`.
 *
 * @macro traced
 * @since 1.0.0
 * @category elements
 */
export const forEachOption: <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
) => (option: Option.Option<A>) => Effect<R, E, Option.Option<B>> = effect.forEachOption

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const forEach: <A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
) => (self: Iterable<A>) => Effect<R, E, Chunk.Chunk<B>> = core.forEach

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const forEachDiscard: <A, R, E, B>(f: (a: A) => Effect<R, E, B>) => (self: Iterable<A>) => Effect<R, E, void> =
  core.forEachDiscard

/**
 * Applies the function `f` to each element of the `Collection<A>` and returns
 * the result in a new `Chunk<B>` using the specified execution strategy.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const forEachExec: <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>,
  strategy: ExecutionStrategy.ExecutionStrategy
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<B>> = fiberRuntime.forEachExec

/**
 * Same as `forEach`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 *
 * @macro traced
 * @since 1.0.0
 * @category traversing
 */
export const forEachWithIndex: <A, R, E, B>(
  f: (a: A, i: number) => Effect<R, E, B>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<B>> = effect.forEachWithIndex

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const forEachPar: <A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
) => (self: Iterable<A>) => Effect<R, E, Chunk.Chunk<B>> = fiberRuntime.forEachPar

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const forEachParDiscard: <A, R, E, _>(
  f: (a: A) => Effect<R, E, _>
) => (self: Iterable<A>) => Effect<R, E, void> = fiberRuntime.forEachParDiscard

/**
 * Same as `forEachPar`, except that the function `f` is supplied
 * a second argument that corresponds to the index (starting from 0)
 * of the current element being iterated over.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const forEachParWithIndex: <R, E, A, B>(
  f: (a: A, i: number) => Effect<R, E, B>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<B>> = fiberRuntime.forEachParWithIndex

/**
 * Repeats this effect forever (until the first error).
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const forever: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, never> = effect.forever

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
export const fork: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Fiber.RuntimeFiber<E, A>> = fiberRuntime.fork

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const forkDaemon: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Fiber.RuntimeFiber<E, A>> =
  fiberRuntime.forkDaemon

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const forkAll: <R, E, A>(
  effects: Iterable<Effect<R, E, A>>
) => Effect<R, never, Fiber.Fiber<E, Chunk.Chunk<A>>> = circular.forkAll

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces unit. This version is faster than `forkAll`
 * in cases where the results of the forked fibers are not needed.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const forkAllDiscard: <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, never, void> =
  fiberRuntime.forkAllDiscard

/**
 * Forks the effect in the specified scope. The fiber will be interrupted
 * when the scope is closed.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const forkIn: (
  scope: Scope.Scope
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Fiber.RuntimeFiber<E, A>> = circular.forkIn

/**
 * Forks the fiber in a `Scope`, interrupting it when the scope is closed.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const forkScoped: <R, E, A>(self: Effect<R, E, A>) => Effect<Scope.Scope | R, never, Fiber.RuntimeFiber<E, A>> =
  circular.forkScoped

/**
 * Like fork but handles an error with the provided handler.
 *
 * @macro traced
 * @since 1.0.0
 * @category supervision
 */
export const forkWithErrorHandler: <E, X>(
  handler: (e: E) => Effect<never, never, X>
) => <R, A>(self: Effect<R, E, A>) => Effect<R, never, Fiber.RuntimeFiber<E, A>> = fiberRuntime.forkWithErrorHandler

/**
 * Lifts an `Either<E, A>` into an `Effect<never, E, A>`.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const fromEither: <E, A>(either: Either.Either<E, A>) => Effect<never, E, A> = core.fromEither

/**
 * Lifts an `Either<Cause<E>, A>` into an `Effect<never, E, A>`.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const fromEitherCause: <E, A>(either: Either.Either<Cause.Cause<E>, A>) => Effect<never, E, A> =
  effect.fromEitherCause

/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const fromFiber: <E, A>(fiber: Fiber.Fiber<E, A>) => Effect<never, E, A> = circular.fromFiber

/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const fromFiberEffect: <R, E, A>(fiber: Effect<R, E, Fiber.Fiber<E, A>>) => Effect<R, E, A> =
  circular.fromFiberEffect

/**
 * Lifts an `Option` into an `Effect` but preserves the error as an option in
 * the error channel, making it easier to compose in some scenarios.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const fromOption: <A>(option: Option.Option<A>) => Effect<never, Option.Option<never>, A> = core.fromOption

/**
 * @category models
 * @since 1.0.0
 */
export interface EffectGen<R, E, A> {
  readonly _R: () => R
  readonly _E: () => E
  readonly _A: () => A
  readonly value: Effect<R, E, A>

  [Symbol.iterator](): Generator<EffectGen<R, E, A>, A>
}

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const gen: <Eff extends EffectGen<any, any, any>, AEff>(
  f: (resume: <R, E, A>(self: Effect<R, E, A>) => EffectGen<R, E, A>) => Generator<Eff, AEff, any>
) => Effect<
  [Eff] extends [never] ? never : [Eff] extends [EffectGen<infer R, any, any>] ? R : never,
  [Eff] extends [never] ? never : [Eff] extends [EffectGen<any, infer E, any>] ? E : never,
  AEff
> = effect.gen

/**
 * Returns a collection of all `FiberRef` values for the fiber running this
 * effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const getFiberRefs: () => Effect<never, never, FiberRefs.FiberRefs> = effect.getFiberRefs

/**
 * Lifts an `Option` into an `Effect`, if the option is not defined it fails
 * with `NoSuchElementException`.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const getOrFail: <A>(option: Option.Option<A>) => Effect<never, Cause.NoSuchElementException, A> =
  effect.getOrFail

/**
 * Lifts an `Option` into a `IO`, if the option is not defined it fails with
 * `void`.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const getOrFailDiscard: <A>(option: Option.Option<A>) => Effect<never, void, A> = effect.getOrFailDiscard

/**
 * Lifts an `Maybe` into an `Effect`. If the option is not defined, fail with
 * the specified `e` value.
 *
 * @macro traced
 * @since 1.0.0
 * @category conversions
 */
export const getOrFailWith: <E>(error: () => E) => <A>(option: Option.Option<A>) => Effect<never, E, A> =
  effect.getOrFailWith

/**
 * Returns a successful effect with the head of the collection if the collection
 * is non-empty, or fails with the error `None` if the collection is empty.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const head: <R, E, A>(self: Effect<R, E, Iterable<A>>) => Effect<R, Option.Option<E>, A> = effect.head

/**
 * Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const ifEffect: <R1, R2, E1, E2, A, A1>(
  onTrue: Effect<R1, E1, A>,
  onFalse: Effect<R2, E2, A1>
) => <R, E>(self: Effect<R, E, boolean>) => Effect<R1 | R2 | R, E1 | E2 | E, A | A1> = core.ifEffect

/**
 * Returns a new effect that ignores the success or failure of this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const ignore: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, void> = effect.ignore

/**
 * Returns a new effect that ignores the success or failure of this effect,
 * but which also logs failures at the Debug level, just in case the failure
 * turns out to be important.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const ignoreLogged: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, void> = effect.ignoreLogged

/**
 * Inherits values from all `FiberRef` instances into current fiber.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const inheritFiberRefs: (childFiberRefs: FiberRefs.FiberRefs) => Effect<never, never, void> =
  effect.inheritFiberRefs

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interrupt: () => Effect<never, never, never> = core.interrupt

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptWith: (fiberId: FiberId.FiberId) => Effect<never, never, never> = core.interruptWith

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptible: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = core.interruptible

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptibleMask: <R, E, A>(
  f: (restore: <RX, EX, AX>(effect: Effect<RX, EX, AX>) => Effect<RX, EX, AX>) => Effect<R, E, A>
) => Effect<R, E, A> = core.interruptibleMask

/**
 * @macro traced
 * @since 1.0.0
 * @category utilities
 */
export const intoDeferred: <E, A>(
  deferred: Deferred.Deferred<E, A>
) => <R>(self: Effect<R, E, A>) => Effect<R, never, boolean> = core.intoDeferred

/**
 * Returns `true` if this effect is a failure, `false` otherwise.
 *
 * @macro traced
 * @since 1.0.0
 * @category getter
 */
export const isFailure: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, boolean> = effect.isFailure

/**
 * Returns `true` if this effect is a success, `false` otherwise.
 *
 * @macro traced
 * @since 1.0.0
 * @category getter
 */
export const isSuccess: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, boolean> = effect.isSuccess

/**
 * Iterates with the specified effectual function. The moral equivalent of:
 *
 * ```ts
 * let s = initial
 *
 * while (cont(s)) {
 *   s = body(s)
 * }
 *
 * return s
 * ```
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const iterate: <Z>(
  initial: Z,
  cont: (z: Z) => boolean
) => <R, E>(body: (z: Z) => Effect<R, E, Z>) => Effect<R, E, Z> = effect.iterate

/**
 * "Zooms in" on the value in the `Left` side of an `Either`, moving the
 * possibility that the value is a `Right` to the error channel.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const left: <R, E, A, B>(self: Effect<R, E, Either.Either<A, B>>) => Effect<R, Either.Either<E, B>, A> =
  effect.left

/**
 * Performs the specified operation while "zoomed in" on the `Left` case of an
 * `Either`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const leftWith: <R, E, B, A, R1, E1, B1, A1>(
  f: (effect: Effect<R, Either.Either<E, B>, A>) => Effect<R1, Either.Either<E1, B1>, A1>
) => (self: Effect<R, E, Either.Either<A, B>>) => Effect<R | R1, E | E1, Either.Either<A1, B1>> = effect.leftWith

/**
 * Logs the specified message at the current log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const log: (message: string) => Effect<never, never, void> = effect.log

/**
 * Logs the specified message at the debug log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logDebug: (message: string) => Effect<never, never, void> = effect.logDebug

/**
 * Logs the specified cause at the debug log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logDebugCause: <E>(cause: Cause.Cause<E>) => Effect<never, never, void> = effect.logDebugCause

/**
 * Logs the specified message and cause at the debug log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logDebugCauseMessage: <E>(message: string, cause: Cause.Cause<E>) => Effect<never, never, void> =
  effect.logDebugCauseMessage

/**
 * Logs the specified message at the error log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logError: (message: string) => Effect<never, never, void> = effect.logError

/**
 * Logs the specified cause at the error log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logErrorCause: <E>(cause: Cause.Cause<E>) => Effect<never, never, void> = effect.logErrorCause

/**
 * Logs the specified message and cause at the error log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logErrorCauseMessage: <E>(message: string, cause: Cause.Cause<E>) => Effect<never, never, void> =
  effect.logErrorCauseMessage

/**
 * Logs the specified message at the fatal log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logFatal: (message: string) => Effect<never, never, void> = effect.logFatal

/**
 * Logs the specified cause at the fatal log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logFatalCause: <E>(cause: Cause.Cause<E>) => Effect<never, never, void> = effect.logFatalCause

/**
 * Logs the specified message and cause at the fatal log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logFatalCauseMessage: <E>(message: string, cause: Cause.Cause<E>) => Effect<never, never, void> =
  effect.logFatalCauseMessage

/**
 * Logs the specified message at the informational log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logInfo: (message: string) => Effect<never, never, void> = effect.logInfo

/**
 * Logs the specified cause at the informational log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logInfoCause: <E>(cause: Cause.Cause<E>) => Effect<never, never, void> = effect.logInfoCause

/**
 * Logs the specified message and cause at the informational log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logInfoCauseMessage: <E>(message: string, cause: Cause.Cause<E>) => Effect<never, never, void> =
  effect.logInfoCauseMessage

/**
 * Logs the specified message at the warning log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logWarning: (message: string) => Effect<never, never, void> = effect.logWarning

/**
 * Logs the specified cause at the warning log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logWarningCause: <E>(cause: Cause.Cause<E>) => Effect<never, never, void> = effect.logWarningCause

/**
 * Logs the specified message and cause at the warning log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logWarningCauseMessage: <E>(message: string, cause: Cause.Cause<E>) => Effect<never, never, void> =
  effect.logWarningCauseMessage

/**
 * Logs the specified message at the trace log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logTrace: (message: string) => Effect<never, never, void> = effect.logTrace

/**
 * Logs the specified cause at the trace log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logTraceCause: <E>(cause: Cause.Cause<E>) => Effect<never, never, void> = effect.logTraceCause

/**
 * Logs the specified message and cause at the trace log level.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logTraceCauseMessage: <E>(message: string, cause: Cause.Cause<E>) => Effect<never, never, void> =
  effect.logTraceCauseMessage

/**
 * Adjusts the label for the current logging span.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logSpan: (label: string) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> = effect.logSpan

/**
 * Annotates each log in this effect with the specified log annotation.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logAnnotate: (key: string, value: string) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> =
  effect.logAnnotate

/**
 * Retrieves the log annotations associated with the current scope.
 *
 * @macro traced
 * @since 1.0.0
 * @category logging
 */
export const logAnnotations: () => Effect<never, never, ReadonlyMap<string, string>> = effect.logAnnotations

/**
 * Loops with the specified effectual function, collecting the results into a
 * list. The moral equivalent of:
 *
 * ```ts
 * let s  = initial
 * let as = [] as readonly A[]
 *
 * while (cont(s)) {
 *   as = [body(s), ...as]
 *   s  = inc(s)
 * }
 *
 * A.reverse(as)
 * ```
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const loop: <Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect<R, E, A>
) => Effect<R, E, Chunk.Chunk<A>> = effect.loop

/**
 * Loops with the specified effectual function purely for its effects. The
 * moral equivalent of:
 *
 * ```ts
 * let s = initial
 *
 * while (cont(s)) {
 *   body(s)
 *   s = inc(s)
 * }
 * ```
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const loopDiscard: <Z, R, E, X>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect<R, E, X>
) => Effect<R, E, void> = effect.loopDiscard

/**
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const map: <A, B>(f: (a: A) => B) => <R, E>(self: Effect<R, E, A>) => Effect<R, E, B> = core.map

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapAccum: <A, B, R, E, Z>(
  elements: Iterable<A>,
  zero: Z,
  f: (z: Z, a: A) => Effect<R, E, readonly [Z, B]>
) => Effect<R, E, readonly [Z, Chunk.Chunk<B>]> = effect.mapAccum

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapBoth: <E, A, E2, A2>(
  f: (e: E) => E2,
  g: (a: A) => A2
) => <R>(self: Effect<R, E, A>) => Effect<R, E2, A2> = effect.mapBoth

/**
 * Returns an effect with its error channel mapped using the specified function.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapError: <E, E2>(f: (e: E) => E2) => <R, A>(self: Effect<R, E, A>) => Effect<R, E2, A> = core.mapError

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
export const mapErrorCause: <E, E2>(
  f: (cause: Cause.Cause<E>) => Cause.Cause<E2>
) => <R, A>(self: Effect<R, E, A>) => Effect<R, E2, A> = effect.mapErrorCause

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const mapTryCatch: <A, B, E1>(
  f: (a: A) => B,
  onThrow: (u: unknown) => E1
) => <R, E>(self: Effect<R, E, A>) => Effect<R, E1 | E, B> = effect.mapTryCatch

/**
 * Returns an effect that, if evaluated, will return the lazily computed
 * result of this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const memoize: <R, E, A>(self: Effect<R, E, A>) => Effect<never, never, Effect<R, E, A>> = effect.memoize

/**
 * Returns a memoized version of the specified effectual function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const memoizeFunction: <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
) => Effect<never, never, (a: A) => Effect<R, E, B>> = circular.memoizeFunction

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const merge: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, E | A> = effect.merge

/**
 * Merges an `Iterable<Effect<R, E, A>>` to a single effect, working
 * sequentially.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const mergeAll: <Z, A>(
  zero: Z,
  f: (z: Z, a: A) => Z
) => <R, E>(elements: Iterable<Effect<R, E, A>>) => Effect<R, E, Z> = effect.mergeAll

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
export const mergeAllPar: <Z, A>(
  zero: Z,
  f: (z: Z, a: A) => Z
) => <R, E>(elements: Iterable<Effect<R, E, A>>) => Effect<R, E, Z> = fiberRuntime.mergeAllPar

/**
 * Returns a new effect where boolean value of this effect is negated.
 *
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const negate: <R, E>(self: Effect<R, E, boolean>) => Effect<R, E, boolean> = effect.negate

/**
 * Returns a effect that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const never: () => Effect<never, never, never> = core.never

/**
 * Requires the option produced by this value to be `None`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const none: <R, E, A>(self: Effect<R, E, Option.Option<A>>) => Effect<R, Option.Option<E>, void> = effect.none

/**
 * Lifts an `Option` into a `Effect`. If the option is empty it succeeds with
 * `void`. If the option is defined it fails with the content.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const noneOrFail: <E>(option: Option.Option<E>) => Effect<never, E, void> = effect.noneOrFail

/**
 * Lifts an `Option` into a `Effect`. If the option is empty it succeeds with
 * `undefined`. If the option is defined it fails with an error computed by
 * the specified function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const noneOrFailWith: <E, A>(option: Option.Option<A>, f: (a: A) => E) => Effect<never, E, void> =
  effect.noneOrFailWith

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const onDone: <E, A, R1, X1, R2, X2>(
  onError: (e: E) => Effect<R1, never, X1>,
  onSuccess: (a: A) => Effect<R2, never, X2>
) => <R>(self: Effect<R, E, A>) => Effect<R1 | R2 | R, never, void> = fiberRuntime.onDone

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const onDoneCause: <E, A, R1, X1, R2, X2>(
  onCause: (cause: Cause.Cause<E>) => Effect<R1, never, X1>,
  onSuccess: (a: A) => Effect<R2, never, X2>
) => <R>(self: Effect<R, E, A>) => Effect<R1 | R2 | R, never, void> = fiberRuntime.onDoneCause

/**
 * Runs the specified effect if this effect fails, providing the error to the
 * effect if it exists. The provided effect will not be interrupted.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const onError: <E, R2, X>(
  cleanup: (cause: Cause.Cause<E>) => Effect<R2, never, X>
) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, A> = core.onError

/**
 * Ensures that a cleanup functions runs, whether this effect succeeds, fails,
 * or is interrupted.
 *
 * @macro traced
 * @category finalization
 * @since 1.0.0
 */
export const onExit: <E, A, R2, X>(
  cleanup: (exit: Exit.Exit<E, A>) => Effect<R2, never, X>
) => <R>(self: Effect<R, E, A>) => Effect<R2 | R, E, A> = core.onExit

/**
 * @macro traced
 * @since 1.0.0
 * @category finalization
 */
export const onInterrupt: <R2, X>(
  cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect<R2, never, X>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, A> = core.onInterrupt

/**
 * Returns an effect that will be executed at most once, even if it is
 * evaluated multiple times.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const once: <R, E, A>(self: Effect<R, E, A>) => Effect<never, never, Effect<R, E, void>> = effect.once

/**
 * Executes this effect, skipping the error but returning optionally the
 * success.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const option: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Option.Option<A>> = effect.option

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orDie: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, A> = core.orDie

/**
 * Converts all failures to unchecked exceptions.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orDieKeep: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, A> = effect.orDieKeep

/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orDieWith: <E>(f: (e: E) => unknown) => <R, A>(self: Effect<R, E, A>) => Effect<R, never, A> =
  core.orDieWith

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orElse: <R2, E2, A2>(
  that: () => Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, A2 | A> = core.orElse

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orElseEither: <R2, E2, A2>(
  that: () => Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, Either.Either<A, A2>> = effect.orElseEither

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orElseOptional: <R, E, A, R2, E2, A2>(
  that: () => Effect<R2, Option.Option<E2>, A2>
) => (self: Effect<R, Option.Option<E>, A>) => Effect<R | R2, Option.Option<E | E2>, A | A2> = effect.orElseOptional

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orElseSucceed: <A2>(evaluate: () => A2) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A2 | A> =
  effect.orElseSucceed

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * fails with the specified error.
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const orElseFail: <E2>(evaluate: () => E2) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E2, A> =
  effect.orElseFail

/**
 * Exposes all parallel errors in a single call.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const parallelErrors: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Chunk.Chunk<E>, A> = effect.parallelErrors

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const parallelFinalizers: <R, E, A>(self: Effect<R, E, A>) => Effect<Scope.Scope | R, E, A> =
  fiberRuntime.parallelFinalizers

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a tupled fashion.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const partition: <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
) => (elements: Iterable<A>) => Effect<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]> = effect.partition

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in parallel and returns the result as a
 * tuple.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const partitionPar: <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
) => (elements: Iterable<A>) => Effect<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]> = fiberRuntime.partitionPar

/**
 * Applies the specified changes to the `FiberRef` values for the fiber
 * running this workflow.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const patchFiberRefs: (patch: FiberRefsPatch.FiberRefsPatch) => Effect<never, never, void> =
  effect.patchFiberRefs

/**
 * Like `tryPromise` but produces a defect in case of errors.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const promise: <A>(evaluate: () => Promise<A>) => Effect<never, never, A> = effect.promise

/**
 * Like `promise` but allows for interruption via AbortSignal
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const promiseInterrupt: <A>(evaluate: (signal: AbortSignal) => Promise<A>) => Effect<never, never, A> =
  effect.promiseInterrupt

/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const provideEnvironment: <R>(
  environment: Context.Context<R>
) => <E, A>(self: Effect<R, E, A>) => Effect<never, E, A> = core.provideEnvironment

/**
 * Provides a layer to the effect, which translates it to another level.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const provideLayer: <R, E, A>(
  layer: Layer.Layer<R, E, A>
) => <E1, A1>(self: Effect<A, E1, A1>) => Effect<R, E | E1, A1> = layer.provideLayer

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @since 1.0.0
 * @category environment
 */
export const provideService: <T>(
  tag: Context.Tag<T>
) => {
  /**
   * @macro traced
   */
  (resource: T): <R, E, A>(self: Effect<R, E, A>) => Effect<Exclude<R, T>, E, A>
} = effect.provideService

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @since 1.0.0
 * @category environment
 */
export const provideServiceEffect: <T>(
  tag: Context.Tag<T>
) => {
  /**
   * @macro traced
   */
  <R1, E1>(effect: Effect<R1, E1, T>): <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | Exclude<R, T>, E1 | E, A>
} = effect.provideServiceEffect

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const provideSomeEnvironment: <R0, R>(
  f: (context: Context.Context<R0>) => Context.Context<R>
) => <E, A>(self: Effect<R, E, A>) => Effect<R0, E, A> = core.provideSomeEnvironment

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const provideSomeLayer: <R2, E2, A2>(
  layer: Layer.Layer<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | Exclude<R, A2>, E2 | E, A> = layer.provideSomeLayer

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
export const race: <R2, E2, A2>(
  that: Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A> = circular.race

/**
 * Returns an effect that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value. Losers of
 * the race will be interrupted immediately
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const raceAll: <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, E, A> = fiberRuntime.raceAll

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
export const raceAwait: <R2, E2, A2>(
  that: Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A> = circular.raceAwait

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
export const raceEither: <R2, E2, A2>(
  that: Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, Either.Either<A, A2>> = circular.raceEither

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
export const raceFibersWith: <E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  that: Effect<R1, E1, A1>,
  selfWins: (winner: Fiber.RuntimeFiber<E, A>, loser: Fiber.RuntimeFiber<E1, A1>) => Effect<R2, E2, A2>,
  thatWins: (winner: Fiber.RuntimeFiber<E1, A1>, loser: Fiber.RuntimeFiber<E, A>) => Effect<R3, E3, A3>
) => <R>(self: Effect<R, E, A>) => Effect<R1 | R2 | R3 | R, E2 | E3, A2 | A3> = circular.raceFibersWith

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
export const raceFirst: <R2, E2, A2>(
  that: Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A> = circular.raceFirst

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const raceWith: <E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  that: Effect<R1, E1, A1>,
  leftDone: (exit: Exit.Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect<R2, E2, A2>,
  rightDone: (exit: Exit.Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect<R3, E3, A3>
) => <R>(self: Effect<R, E, A>) => Effect<R1 | R2 | R3 | R, E2 | E3, A2 | A3> = circular.raceWith

/**
 * Retreives the `Random` service from the environment.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const random: () => Effect<never, never, Random.Random> = effect.random

/**
 * Retreives the `Random` service from the environment and uses it to run the
 * specified workflow.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const randomWith: <R, E, A>(f: (random: Random.Random) => Effect<R, E, A>) => Effect<R, E, A> = effect.randomWith

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially
 * from left to right.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const reduce: <Z, A, R, E>(
  zero: Z,
  f: (z: Z, a: A) => Effect<R, E, Z>
) => (elements: Iterable<A>) => Effect<R, E, Z> = effect.reduce

/**
 * Reduces an `Iterable<Effect<R, E, A>>` to a single effect, working
 * sequentially.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const reduceAll: <R, E, A>(
  zero: Effect<R, E, A>,
  f: (acc: A, a: A) => A
) => (elements: Iterable<Effect<R, E, A>>) => Effect<R, E, A> = effect.reduceAll

/**
 * Reduces an `Iterable<Effect<R, E, A>>` to a single effect, working in
 * parallel.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const reduceAllPar: <R, E, A>(
  zero: Effect<R, E, A>,
  f: (acc: A, a: A) => A
) => (elements: Iterable<Effect<R, E, A>>) => Effect<R, E, A> = fiberRuntime.reduceAllPar

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const reduceRight: <A, Z, R, E>(
  zero: Z,
  f: (a: A, z: Z) => Effect<R, E, Z>
) => (elements: Iterable<A>) => Effect<R, E, Z> = effect.reduceRight

/**
 * Folds over the elements in this chunk from the left, stopping the fold early
 * when the predicate is not satisfied.
 *
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const reduceWhile: <A, R, E, Z>(
  zero: Z,
  p: Predicate<Z>,
  f: (s: Z, a: A) => Effect<R, E, Z>
) => (elements: Iterable<A>) => Effect<R, E, Z> = effect.reduceWhile

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const refineOrDie: <E, E1>(
  pf: (e: E) => Option.Option<E1>
) => <R, A>(self: Effect<R, E, A>) => Effect<R, E1, A> = effect.refineOrDie

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a defect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const refineOrDieWith: <E, E1>(
  pf: (e: E) => Option.Option<E1>,
  f: (e: E) => unknown
) => <R, A>(self: Effect<R, E, A>) => Effect<R, E1, A> = effect.refineOrDieWith

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const reject: <A, E1>(pf: (a: A) => Option.Option<E1>) => <R, E>(self: Effect<R, E, A>) => Effect<R, E1 | E, A> =
  effect.reject

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const rejectEffect: <A, R1, E1>(
  pf: (a: A) => Option.Option<Effect<R1, E1, E1>>
) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, A> = effect.rejectEffect

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an effect
 * that executes `io`, and then if that succeeds, executes `io` an additional
 * time.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const repeat: <R1, A, B>(
  schedule: Schedule.Schedule<R1, A, B>
) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E, B> = _schedule.repeat_Effect

/**
 * Returns a new effect that repeats this effect the specified number of times
 * or until the first failure. Repeats are in addition to the first execution,
 * so that `io.repeatN(1)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const repeatN: (n: number) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = effect.repeatN

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `pipe(effect, Effect.repeat(Schedule.once()))` yields an effect that executes
 * `effect`, and then if that succeeds, executes `effect` an additional time.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const repeatOrElse: <R2, A, B, E, R3, E2>(
  schedule: Schedule.Schedule<R2, A, B>,
  orElse: (error: E, option: Option.Option<B>) => Effect<R3, E2, B>
) => <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2, B> = _schedule.repeatOrElse_Effect

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `pipe(effect, Effect.repeat(Schedule.once()))` yields an effect that executes
 * `effect`, and then if that succeeds, executes `effect` an additional time.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const repeatOrElseEither: <R2, A, B, E, R3, E2, C>(
  schedule: Schedule.Schedule<R2, A, B>,
  orElse: (error: E, option: Option.Option<B>) => Effect<R3, E2, C>
) => <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2, Either.Either<C, B>> = _schedule.repeatOrElseEither_Effect

/**
 * Repeats this effect until its value satisfies the specified predicate or
 * until the first failure.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const repeatUntil: <A>(f: Predicate<A>) => <R, E>(self: Effect<R, E, A>) => Effect<R, E, A> =
  _schedule.repeatUntil_Effect

/**
 * Repeats this effect until its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const repeatUntilEffect: <A, R2>(
  f: (a: A) => Effect<R2, never, boolean>
) => <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E, A> = _schedule.repeatUntilEffect_Effect

/**
 * Repeats this effect until its value is equal to the specified value or
 * until the first failure.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const repeatUntilEquals: <A>(value: A) => <R, E>(self: Effect<R, E, A>) => Effect<R, E, A> =
  _schedule.repeatUntilEquals_Effect

/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const repeatWhile: <A>(f: Predicate<A>) => <R, E>(self: Effect<R, E, A>) => Effect<R, E, A> =
  _schedule.repeatWhile_Effect

/**
 * Repeats this effect while its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const repeatWhileEffect: <R1, A>(
  f: (a: A) => Effect<R1, never, boolean>
) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E, A> = _schedule.repeatWhileEffect_Effect

/**
 * Repeats this effect for as long as its value is equal to the specified
 * value or until the first failure.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const repeatWhileEquals: <A>(value: A) => <R, E>(self: Effect<R, E, A>) => Effect<R, E, A> =
  _schedule.repeatWhileEquals_Effect

/**
 * Retries with the specified retry policy. Retries are done following the
 * failure of the original `io` (up to a fixed maximum with `once` or `recurs`
 * for example), so that that `io.retry(Schedule.once)` means "execute `io`
 * and in case of failure, try again once".
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retry: <R1, E, B>(
  policy: Schedule.Schedule<R1, E, B>
) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A> = _schedule.retry_Effect

/**
 * Retries this effect the specified number of times.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retryN: (n: number) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = _schedule.retryN_Effect

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retryOrElse: <R1, E extends E3, A1, R2, E2, A2, E3>(
  policy: Schedule.Schedule<R1, E3, A1>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>
) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R2 | R, E | E2, A2 | A> = _schedule.retryOrElse_Effect

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retryOrElseEither: <R1, E extends E3, A1, R2, E2, A2, E3>(
  policy: Schedule.Schedule<R1, E3, A1>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>
) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R2 | R, E | E2, Either.Either<A2, A>> =
  _schedule.retryOrElseEither_Effect

/**
 * Retries this effect until its error satisfies the specified predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retryUntil: <E>(f: Predicate<E>) => <R, A>(self: Effect<R, E, A>) => Effect<R, E, A> =
  _schedule.retryUntil_Effect

/**
 * Retries this effect until its error satisfies the specified effectful
 * predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retryUntilEffect: <R1, E>(
  f: (e: E) => Effect<R1, never, boolean>
) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A> = _schedule.retryUntilEffect_Effect

/**
 * Retries this effect until its error is equal to the specified error.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retryUntilEquals: <E>(e: E) => <R, A>(self: Effect<R, E, A>) => Effect<R, E, A> =
  _schedule.retryUntilEquals_Effect

/**
 * Retries this effect while its error satisfies the specified predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retryWhile: <E>(f: Predicate<E>) => <R, A>(self: Effect<R, E, A>) => Effect<R, E, A> =
  _schedule.retryWhile_Effect

/**
 * Retries this effect while its error satisfies the specified effectful
 * predicate.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retryWhileEffect: <R1, E>(
  f: (e: E) => Effect<R1, never, boolean>
) => <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A> = _schedule.retryWhileEffect_Effect

/**
 * Retries this effect for as long as its error is equal to the specified
 * error.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const retryWhileEquals: <E>(e: E) => <R, A>(self: Effect<R, E, A>) => Effect<R, E, A> =
  _schedule.retryWhileEquals_Effect

/**
 * Replicates the given effect `n` times.
 *
 * @since 1.0.0
 * @category mutations
 */
export const replicate: (n: number) => <R, E, A>(self: Effect<R, E, A>) => Chunk.Chunk<Effect<R, E, A>> =
  effect.replicate

/**
 * Performs this effect the specified number of times and collects the
 * results.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const replicateEffect: (n: number) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Chunk.Chunk<A>> =
  effect.replicateEffect

/**
 * Performs this effect the specified number of times, discarding the
 * results.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const replicateEffectDiscard: (n: number) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, void> =
  effect.replicateEffectDiscard

/**
 * Unearth the unchecked failure of the effect (opposite of `orDie`).
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const resurrect: <R, E, A>(self: Effect<R, E, A>) => Effect<R, unknown, A> = effect.resurrect

/**
 * "Zooms in" on the value in the `Right` side of an `Either`, moving the
 * possibility that the value is a `Left` to the error channel.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const right: <R, E, A, B>(self: Effect<R, E, Either.Either<A, B>>) => Effect<R, Either.Either<A, E>, B> =
  effect.right

/**
 * Performs the specified operation while "zoomed in" on the `Right` case of an
 * `Either`.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const rightWith: <R, E, A, A1, B, B1, R1, E1>(
  f: (effect: Effect<R, Either.Either<A, E>, B>) => Effect<R1, Either.Either<A1, E1>, B1>
) => (self: Effect<R, E, Either.Either<A, B>>) => Effect<R | R1, E | E1, Either.Either<A1, B1>> = effect.rightWith

/**
 * Returns an effect that accesses the runtime, which can be used to
 * (unsafely) execute tasks. This is useful for integration with legacy code
 * that must call back into Effect code.
 *
 * @since 1.0.0
 * @category constructors
 */
export const runtime: <R>() => Effect<R, never, Runtime.Runtime<R>> = _runtime.runtime

/**
 * Retrieves an effect that succeeds with the current runtime flags, which
 * govern behavior and features of the runtime system.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const runtimeFlags: () => Effect<never, never, RuntimeFlags.RuntimeFlags> = core.runtimeFlags

/**
 * Exposes the full `Cause` of failure for the specified effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const sandbox: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Cause.Cause<E>, A> = effect.sandbox

/**
 * Runs this effect according to the specified schedule.
 *
 * See `scheduleFrom` for a variant that allows the schedule's decision to
 * depend on the result of this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const schedule: <R2, Out>(
  schedule: Schedule.Schedule<R2, any, Out>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, Out> = _schedule.schedule_Effect

/**
 * Runs this effect according to the specified schedule in a new fiber
 * attached to the current scope.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const scheduleForked: <R2, Out>(
  schedule: Schedule.Schedule<R2, unknown, Out>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<Scope.Scope | R2 | R, never, Fiber.RuntimeFiber<E, Out>> =
  circular.scheduleForked

/**
 * Runs this effect according to the specified schedule starting from the
 * specified input value.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const scheduleFrom: <R2, In, Out>(
  initial: In,
  schedule: Schedule.Schedule<R2, In, Out>
) => <R, E>(self: Effect<R, E, In>) => Effect<R2 | R, E, Out> = _schedule.scheduleFrom_Effect

/**
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const scope: () => Effect<Scope.Scope, never, Scope.Scope> = fiberRuntime.scope

/**
 * Accesses the current scope and uses it to perform the specified effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category scoping
 */
export const scopeWith: <R, E, A>(f: (scope: Scope.Scope) => Effect<R, E, A>) => Effect<R | Scope.Scope, E, A> =
  fiberRuntime.scopeWith

/**
 * Scopes all resources uses in this workflow to the lifetime of the workflow,
 * ensuring that their finalizers are run as soon as this workflow completes
 * execution, whether by success, failure, or interruption.
 *
 * @since 1.0.0
 * @category environment
 */
export const scoped: <R, E, A>(effect: Effect<R, E, A>) => Effect<Exclude<R, Scope.Scope>, E, A> =
  fiberRuntime.scopedEffect

/**
 * Returns a new scoped workflow that runs finalizers added to the scope of
 * this workflow sequentially in the reverse of the order in which they were
 * added. Note that finalizers are run sequentially by default so this only
 * has meaning if used within a scope where finalizers are being run in
 * parallel.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const sequentialFinalizers: <R, E, A>(self: Effect<R, E, A>) => Effect<R | Scope.Scope, E, A> =
  fiberRuntime.sequentialFinalizers

/**
 * Extracts the specified service from the environment of the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const service: <T>(tag: Context.Tag<T>) => Effect<T, never, T> = core.service

/**
 * Accesses the specified service in the environment of the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const serviceWith: <T>(tag: Context.Tag<T>) => <A>(f: (a: T) => A) => Effect<T, never, A> = core.serviceWith

/**
 * Effectfully accesses the specified service in the environment of the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const serviceWithEffect: <T>(
  tag: Context.Tag<T>
) => <R, E, A>(f: (a: T) => Effect<R, E, A>) => Effect<T | R, E, A> = core.serviceWithEffect

/**
 * Sets the `FiberRef` values for the fiber running this effect to the values
 * in the specified collection of `FiberRef` values.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const setFiberRefs: (fiberRefs: FiberRefs.FiberRefs) => Effect<never, never, void> = effect.setFiberRefs

/**
 * Returns an effect that suspends for the specified duration. This method is
 * asynchronous, and does not actually block the fiber executing the effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const sleep: (duration: Duration.Duration) => Effect<never, never, void> = effect.sleep

/**
 * Converts an option on values into an option on errors.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const some: <R, E, A>(self: Effect<R, E, Option.Option<A>>) => Effect<R, Option.Option<E>, A> = fiberRuntime.some

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const someOrElse: <B>(
  orElse: () => B
) => <R, E, A>(self: Effect<R, E, Option.Option<A>>) => Effect<R, E, B | A> = effect.someOrElse

/**
 * Extracts the optional value, or executes the given 'orElse' effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const someOrElseEffect: <R2, E2, A2>(
  orElse: () => Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, Option.Option<A>>) => Effect<R2 | R, E2 | E, A2 | A> = effect.someOrElseEffect

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const someOrFail: <E2>(
  orFail: () => E2
) => <R, E, A>(self: Effect<R, E, Option.Option<A>>) => Effect<R, E2 | E, A> = effect.someOrFail

/**
 * Extracts the optional value, or fails with a `NoSuchElementException`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const someOrFailException: <R, E, A>(
  self: Effect<R, E, Option.Option<A>>
) => Effect<R, Cause.NoSuchElementException | E, A> = effect.someOrFailException

/**
 * Perfoms the specified operation while "zoomed in" on the `Some` case of an
 * `Option`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const someWith: <R, E, A, R1, E1, A1>(
  f: (effect: Effect<R, Option.Option<E>, A>) => Effect<R1, Option.Option<E1>, A1>
) => (self: Effect<R, E, Option.Option<A>>) => Effect<R | R1, E | E1, Option.Option<A1>> = fiberRuntime.someWith

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const struct: <NER extends Record<string, Effect<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> | Record<string, Effect<any, any, any>>
) => Effect<
  [NER[keyof NER]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [NER[keyof NER]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  {
    [K in keyof NER]: [NER[K]] extends [{ [EffectTypeId]: { _A: (_: never) => infer A } }] ? A : never
  }
> = effect.struct

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const structPar: <NER extends Record<string, Effect<any, any, any>>>(
  r: Record<string, Effect<any, any, any>> | EnforceNonEmptyRecord<NER>
) => Effect<
  [NER[keyof NER]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [NER[keyof NER]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  { [K in keyof NER]: [NER[K]] extends [{ [EffectTypeId]: { _A: (_: never) => infer A } }] ? A : never }
> = fiberRuntime.structPar

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Effect<never, never, A> = core.succeed

/**
 * Returns an effect which succeeds with the value wrapped in a `Left`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeedLeft: <A>(value: A) => Effect<never, never, Either.Either<A, never>> = effect.succeedLeft

/**
 * Returns an effect which succeeds with `None`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeedNone: () => Effect<never, never, Option.Option<never>> = effect.succeedNone

/**
 * Returns an effect which succeeds with the value wrapped in a `Right`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeedRight: <A>(value: A) => Effect<never, never, Either.Either<never, A>> = effect.succeedRight

/**
 * Returns an effect which succeeds with the value wrapped in a `Some`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeedSome: <A>(value: A) => Effect<never, never, Option.Option<A>> = effect.succeedSome

/**
 * Summarizes a effect by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const summarized: <R2, E2, B, C>(
  summary: Effect<R2, E2, B>,
  f: (start: B, end: B) => C
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, readonly [C, A]> = effect.summarized

/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const supervised: <X>(
  supervisor: Supervisor.Supervisor<X>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = circular.supervised

/**
 * Returns a lazily constructed effect, whose construction may itself require
 * effects. When no environment is required (i.e., when `R == unknown`) it is
 * conceptually equivalent to `flatten(succeed(io))`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const suspend: <R, E, A>(evaluate: () => Effect<R, E, A>) => Effect<R, unknown, A> = effect.suspend

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const suspendSucceed: <R, E, A>(effect: () => Effect<R, E, A>) => Effect<R, E, A> = core.suspendSucceed

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const sync: <A>(evaluate: () => A) => Effect<never, never, A> = core.sync

/**
 * Takes all elements so long as the effectual predicate returns true.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const takeWhile: <R, E, A>(
  f: (a: A) => Effect<R, E, boolean>
) => (elements: Iterable<A>) => Effect<R, E, Chunk.Chunk<A>> = effect.takeWhile

/**
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const tap: <A, R2, E2, X>(
  f: (a: A) => Effect<R2, E2, X>
) => <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A> = core.tap

/**
 * Returns an effect that effectfully "peeks" at the failure or success of
 * this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const tapBoth: <E, A, R2, E2, X, R3, E3, X1>(
  f: (e: E) => Effect<R2, E2, X>,
  g: (a: A) => Effect<R3, E3, X1>
) => <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E | E2 | E3, A> = effect.tapBoth

/**
 * Returns an effect that effectually "peeks" at the defect of this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const tapDefect: <R2, E2, X>(
  f: (cause: Cause.Cause<never>) => Effect<R2, E2, X>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A> = effect.tapDefect

/**
 * Returns an effect that effectfully "peeks" at the result of this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const tapEither: <E, A, R2, E2, X>(
  f: (either: Either.Either<E, A>) => Effect<R2, E2, X>
) => <R>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A> = effect.tapEither

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const tapError: <E, R2, E2, X>(
  f: (e: E) => Effect<R2, E2, X>
) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A> = effect.tapError

/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const tapErrorCause: <E, R2, E2, X>(
  f: (cause: Cause.Cause<E>) => Effect<R2, E2, X>
) => <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E | E2, A> = effect.tapErrorCause

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 * If the partial function isn't defined at the input, the result is
 * equivalent to the original effect.
 *
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const tapSome: <A, R1, E1, X>(
  pf: (a: A) => Option.Option<Effect<R1, E1, X>>
) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, A> = effect.tapSome

/**
 * Returns a new effect that executes this one and times the execution.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const timed: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, readonly [Duration.Duration, A]> = effect.timed

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const timedWith: <R1, E1>(
  milliseconds: Effect<R1, E1, number>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, readonly [Duration.Duration, A]> = effect.timedWith

/**
 * Returns an effect that will timeout this effect, returning `None` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Some` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then instead
 * of using `effect.timeout(d)`, use `effect.disconnect.timeout(d)`, which
 * first disconnects the effect's interruption signal before performing the
 * timeout, resulting in earliest possible return, before an underlying effect
 * has been successfully interrupted.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const timeout: (
  duration: Duration.Duration
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Option.Option<A>> = circular.timeout

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified error.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const timeoutFail: <E1>(
  evaluate: () => E1,
  duration: Duration.Duration
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E1 | E, A> = circular.timeoutFail

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified failure.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const timeoutFailCause: <E1>(
  evaluate: () => Cause.Cause<E1>,
  duration: Duration.Duration
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E1 | E, A> = circular.timeoutFailCause

/**
 * Returns an effect that will timeout this effect, returning either the
 * default value if the timeout elapses before the effect has produced a
 * value or returning the result of applying the function `f` to the
 * success value of the effect.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const timeoutTo: <A, B, B1>(
  def: B1,
  f: (a: A) => B,
  duration: Duration.Duration
) => <R, E>(self: Effect<R, E, A>) => Effect<R, E, B | B1> = circular.timeoutTo

/**
 * Constructs a layer from this effect.
 *
 * @since 1.0.0
 * @category conversions
 */
export const toLayer: <A>(tag: Context.Tag<A>) => <R, E>(self: Effect<R, E, A>) => Layer.Layer<R, E, A> = layer.toLayer

/**
 * @since 1.0.0
 * @category tracing
 */
export const traced: (trace: string | undefined) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = core.traced

/**
 * Transplants specified effects so that when those effects fork other
 * effects, the forked effects will be governed by the scope of the fiber that
 * executes this effect.
 *
 * This can be used to "graft" deep grandchildren onto a higher-level scope,
 * effectively extending their lifespans into the parent scope.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const transplant: <R, E, A>(
  f: (grafter: <R2, E2, A2>(effect: Effect<R2, E2, A2>) => Effect<R2, E2, A2>) => Effect<R, E, A>
) => Effect<R, E, A> = core.transplant

/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const tryCatch: <E, A>(attempt: () => A, onThrow: (u: unknown) => E) => Effect<never, E, A> = effect.tryCatch

/**
 * Create an `Effect` that when executed will construct `promise` and wait for
 * its result, errors will be handled using `onReject`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const tryCatchPromise: <E, A>(
  evaluate: () => Promise<A>,
  onReject: (reason: unknown) => E
) => Effect<never, E, A> = effect.tryCatchPromise

/**
 * Like `tryCatchPromise` but allows for interruption via AbortSignal
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const tryCatchPromiseInterrupt: <E, A>(
  evaluate: (signal: AbortSignal) => Promise<A>,
  onReject: (reason: unknown) => E
) => Effect<never, E, A> = effect.tryCatchPromiseInterrupt

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain
 * defects, executes `success` in case of successes
 *
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const tryOrElse: <R2, E2, A2, A, R3, E3, A3>(
  that: () => Effect<R2, E2, A2>,
  onSuccess: (a: A) => Effect<R3, E3, A3>
) => <R, E>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2 | E3, A2 | A3> = core.tryOrElse

/**
 * Create an `Effect` that when executed will construct `promise` and wait for
 * its result, errors will produce failure as `unknown`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const tryPromise: <A>(evaluate: () => Promise<A>) => Effect<never, unknown, A> = effect.tryPromise

/**
 * Like `tryPromise` but allows for interruption via AbortSignal
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const tryPromiseInterrupt: <A>(evaluate: (signal: AbortSignal) => Promise<A>) => Effect<never, unknown, A> =
  effect.tryPromiseInterrupt

/**
 * Like `forEach` + `identity` with a tuple type.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const tuple: <T extends NonEmptyArrayEffect>(
  ...t: T
) => Effect<
  [T[number]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [T[number]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  TupleEffect<T>
> = effect.tuple

/**
 * Like tuple but parallel, same as `forEachPar` + `identity` with a tuple type.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const tuplePar: <T extends NonEmptyArrayEffect>(...t: T) => Effect<
  [T[number]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [T[number]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  TupleEffect<T>
> = fiberRuntime.tuplePar

/**
 * When this effect succeeds with a cause, then this method returns a new
 * effect that either fails with the cause that this effect succeeded with, or
 * succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const uncause: <R, E>(self: Effect<R, never, Cause.Cause<E>>) => Effect<R, E, void> = effect.uncause

/**
 * Constructs a `Chunk` by repeatedly applying the effectual function `f` as
 * long as it returns `Some`.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const unfold: <A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, Option.Option<readonly [A, S]>>
) => Effect<R, E, Chunk.Chunk<A>> = effect.unfold

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const uninterruptible: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = core.uninterruptible

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const uninterruptibleMask: <R, E, A>(
  f: (restore: <RX, EX, AX>(effect: Effect<RX, EX, AX>) => Effect<RX, EX, AX>) => Effect<R, E, A>
) => Effect<R, E, A> = core.uninterruptibleMask

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const unit: () => Effect<never, never, void> = core.unit

/**
 * Converts a `Effect<R, Either<E, B>, A>` into a `Effect<R, E, Either<A, B>>`.
 * The inverse of `left`.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const unleft: <R, E, B, A>(self: Effect<R, Either.Either<E, B>, A>) => Effect<R, E, Either.Either<A, B>> =
  effect.unleft

/**
 * The moral equivalent of `if (!p) exp`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const unless: (predicate: () => boolean) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Option.Option<A>> =
  effect.unless

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const unlessEffect: <R2, E2>(
  predicate: Effect<R2, E2, boolean>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, Option.Option<A>> = effect.unlessEffect

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const unrefine: <E1>(
  pf: (u: unknown) => Option.Option<E1>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E1 | E, A> = effect.unrefine

/**
 * Takes some fiber failures and converts them into errors, using the specified
 * function to convert the `E` into an `E1 | E2`.
 *
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const unrefineWith: <E, E1, E2>(
  pf: (u: unknown) => Option.Option<E1>,
  f: (e: E) => E2
) => <R, A>(self: Effect<R, E, A>) => Effect<R, E1 | E2, A> = effect.unrefineWith

/**
 * Converts a `Effect<R, Either<B, E>, A>` into a `Effect<R, E, Either<B, A>>`.
 * The inverse of `right`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const unright: <R, B, E, A>(self: Effect<R, Either.Either<B, E>, A>) => Effect<R, E, Either.Either<B, A>> =
  effect.unright

/**
 * @since 1.0.0
 * @category execution
 */
export const unsafeRunAsync: <E, A>(effect: Effect<never, E, A>) => void = _runtime.unsafeRunAsync

/**
 * @since 1.0.0
 * @category execution
 */
export const unsafeFork: <E, A>(effect: Effect<never, E, A>) => Fiber.RuntimeFiber<E, A> = _runtime.unsafeFork

/**
 * @since 1.0.0
 * @category execution
 */
export const unsafeRunAsyncWith: <E, A>(effect: Effect<never, E, A>, k: (exit: Exit.Exit<E, A>) => void) => void =
  _runtime.unsafeRunAsyncWith

/**
 * Runs an `Effect` workflow, returning a `Promise` which resolves with the
 * result of the workflow or rejects with an error.
 *
 * @since 1.0.0
 * @category execution
 */
export const unsafeRunPromise: <E, A>(effect: Effect<never, E, A>) => Promise<A> = _runtime.unsafeRunPromise

/**
 * Runs an `Effect` workflow, returning a `Promise` which resolves with the
 * `Exit` value of the workflow.
 *
 * @since 1.0.0
 * @category execution
 */
export const unsafeRunPromiseExit: <E, A>(effect: Effect<never, E, A>) => Promise<Exit.Exit<E, A>> =
  _runtime.unsafeRunPromiseExit

/**
 * @since 1.0.0
 * @category execution
 */
export const unsafeRunSync: <E, A>(effect: Effect<never, E, A>) => A = _runtime.unsafeRunSync

/**
 * @since 1.0.0
 * @category execution
 */
export const unsafeRunSyncExit: <E, A>(effect: Effect<never, E, A>) => Exit.Exit<E, A> = _runtime.unsafeRunSyncExit

/**
 * @since 1.0.0
 * @category execution
 */
export const unsafeRunWith: <E, A>(
  effect: Effect<never, E, A>,
  k: (exit: Exit.Exit<E, A>) => void
) => (fiberId: FiberId.FiberId) => (_: (exit: Exit.Exit<E, A>) => void) => void = _runtime.unsafeRunWith

/**
 * The inverse operation `sandbox(effect)`
 *
 * Terminates with exceptions on the `Left` side of the `Either` error, if it
 * exists. Otherwise extracts the contained `Effect< R, E, A>`
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const unsandbox: <R, E, A>(self: Effect<R, Cause.Cause<E>, A>) => Effect<R, E, A> = effect.unsandbox

/**
 * Scopes all resources acquired by `resource` to the lifetime of `use`
 * without effecting the scope of any resources acquired by `use`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const using: <A, R2, E2, A2>(
  use: (a: A) => Effect<R2, E2, A2>
) => <R, E>(self: Effect<Scope.Scope | R, E, A>) => Effect<R2 | R, E2 | E, A2> = fiberRuntime.using

/**
 * Converts an option on errors into an option on values.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const unsome: <R, E, A>(self: Effect<R, Option.Option<E>, A>) => Effect<R, E, Option.Option<A>> =
  fiberRuntime.unsome

/**
 * Updates the `FiberRef` values for the fiber running this effect using the
 * specified function.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const updateFiberRefs: (
  f: (fiberId: FiberId.Runtime, fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs
) => Effect<never, never, void> = effect.updateFiberRefs

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const updateRuntimeFlags: (patch: RuntimeFlagsPatch.RuntimeFlagsPatch) => Effect<never, never, void> =
  core.updateRuntimeFlags

/**
 * Updates the service with the required service entry.
 *
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const updateService: <T>(
  tag: Context.Tag<T>
) => <T1 extends T>(f: (_: T) => T1) => <R, E, A>(self: Effect<R, E, A>) => Effect<T | R, E, A> = effect.updateService

/**
 * Sequentially zips the this result with the specified result. Combines both
 * `Cause`s when both effects fail.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const validate: <R1, E1, B>(
  that: Effect<R1, E1, B>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, readonly [A, B]> = effect.validate

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel. Combines both Cause<E1>` when both effects fail.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const validatePar: <R1, E1, B>(
  that: Effect<R1, E1, B>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, readonly [A, B]> = circular.validatePar

/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost. To retain all information please use `partition`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const validateAll: <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
) => (elements: Iterable<A>) => Effect<R, Chunk.Chunk<E>, Chunk.Chunk<B>> = effect.validateAll

/**
 * Feeds elements of type `A` to `f `and accumulates, in parallel, all errors
 * in error channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost. To retain all information please use [[partitionPar]].
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const validateAllPar: <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
) => (elements: Iterable<A>) => Effect<R, Chunk.Chunk<E>, Chunk.Chunk<B>> = fiberRuntime.validateAllPar

/**
 * Feeds elements of type `A` to `f` and accumulates all errors, discarding
 * the successes.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const validateAllDiscard: <R, E, A, X>(
  f: (a: A) => Effect<R, E, X>
) => (elements: Iterable<A>) => Effect<R, Chunk.Chunk<E>, void> = effect.validateAllDiscard

/**
 * Feeds elements of type `A` to `f` in parallel and accumulates all errors,
 * discarding the successes.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const validateAllParDiscard: <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
) => (elements: Iterable<A>) => Effect<R, Chunk.Chunk<E>, void> = fiberRuntime.validateAllParDiscard

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const validateFirst: <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
) => (elements: Iterable<A>) => Effect<R, Chunk.Chunk<E>, B> = effect.validateFirst

/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const validateFirstPar: <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>
) => (elements: Iterable<A>) => Effect<R, Chunk.Chunk<E>, B> = fiberRuntime.validateFirstPar

/**
 * Sequentially zips this effect with the specified effect using the specified
 * combiner function. Combines the causes in case both effect fail.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const validateWith: <A, R1, E1, B, C>(
  that: Effect<R1, E1, B>,
  f: (a: A, b: B) => C
) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, C> = effect.validateWith

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel, combining their results with the specified `f` function. If
 * both sides fail, then the cause will be combined.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const validateWithPar: <A, R1, E1, B, C>(
  that: Effect<R1, E1, B>,
  f: (a: A, b: B) => C
) => <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, C> = circular.validateWithPar

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const whileLoop: <R, E, A>(
  check: () => boolean,
  body: () => Effect<R, E, A>,
  process: (a: A) => void
) => Effect<R, E, void> = core.whileLoop

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const when: (predicate: () => boolean) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Option.Option<A>> =
  effect.when

/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const whenCase: <R, E, A, B>(
  evaluate: () => A,
  pf: (a: A) => Option.Option<Effect<R, E, B>>
) => Effect<R, E, Option.Option<B>> = effect.whenCase

/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const whenCaseEffect: <A, R2, E2, A2>(
  pf: (a: A) => Option.Option<Effect<R2, E2, A2>>
) => <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, Option.Option<A2>> = effect.whenCaseEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const whenEffect: <R, E>(
  predicate: Effect<R, E, boolean>
) => <R2, E2, A>(effect: Effect<R2, E2, A>) => Effect<R | R2, E | E2, Option.Option<A>> = core.whenEffect

/**
 * Executes the specified workflow with the specified implementation of the
 * clock service.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const withClock: <A extends Clock.Clock>(value: A) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> =
  defaultServices.withClock

/**
 * Sets the implementation of the clock service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const withClockScoped: <A extends Clock.Clock>(value: A) => Effect<Scope.Scope, never, void> =
  fiberRuntime.withClockScoped

/**
 * Returns a new scoped workflow that returns the result of this workflow as
 * well as a finalizer that can be run to close the scope of this workflow.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const withEarlyRelease: <R, E, A>(
  self: Effect<R, E, A>
) => Effect<Scope.Scope | R, E, readonly [Effect<never, never, void>, A]> = fiberRuntime.withEarlyRelease

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const withMetric: <Type, In, Out>(
  metric: Metric.Metric<Type, In, Out>
) => <R, E, A extends In>(self: Effect<R, E, A>) => Effect<R, E, A> = effect.withMetric

/**
 * @macro traced
 * @since 1.0.0
 * @category concurrency
 */
export const withParallelism: (parallelism: number) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> =
  core.withParallelism

/**
 * Runs the specified effect with an unbounded maximum number of fibers for
 * parallel operations.
 *
 * @macro traced
 * @since 1.0.0
 * @category aspects
 */
export const withParallelismUnbounded: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> =
  core.withParallelismUnbounded

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const withRuntimeFlags: (
  update: RuntimeFlagsPatch.RuntimeFlagsPatch
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = core.withRuntimeFlags

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const withRuntimeFlagsScoped: (update: RuntimeFlagsPatch.RuntimeFlagsPatch) => Effect<Scope.Scope, never, void> =
  fiberRuntime.withRuntimeFlagsScoped

/**
 * Annotates the wrapped effect with a span using the current Tracer.
 *
 * @macro traced
 * @since 1.0.0
 * @category tracing
 */
export const withSpan: (name: string) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = effect.withSpan

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const yieldNow: (priority?: "background" | "normal" | undefined) => Effect<never, never, void> = core.yieldNow

/**
 * @macro traced
 * @since 1.0.0
 * @category products
 */
export const zip: <R2, E2, A2>(
  that: Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, readonly [A, A2]> = core.zip

/**
 * @macro traced
 * @since 1.0.0
 * @category products
 */
export const zipLeft: <R2, E2, A2>(
  that: Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A> = core.zipLeft

/**
 * @macro traced
 * @since 1.0.0
 * @category products
 */
export const zipRight: <R2, E2, A2>(
  that: Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2> = core.zipRight

/**
 * @macro traced
 * @since 1.0.0
 * @category products
 */
export const zipWith: <R2, E2, A2, A, B>(
  that: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B
) => <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, B> = core.zipWith

/**
 * Zips this effect and that effect in parallel.
 *
 * @macro traced
 * @since 1.0.0
 * @category zipping
 */
export const zipPar: <R2, E2, A2>(
  that: Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, readonly [A, A2]> = circular.zipPar

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel, returning result of that effect. If either side fails,
 * then the other side will be interrupted.
 *
 * @macro traced
 * @since 1.0.0
 * @category zipping
 */
export const zipParLeft: <R2, E2, A2>(
  that: Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A> = circular.zipParLeft

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel, returning result of the provided effect. If either side fails,
 * then the other side will be interrupted.
 *
 * @macro traced
 * @since 1.0.0
 * @category zipping
 */
export const zipParRight: <R2, E2, A2>(
  that: Effect<R2, E2, A2>
) => <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2> = circular.zipParRight

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @macro traced
 * @since 1.0.0
 * @category zipping
 */
export const zipWithPar: <R2, E2, A2, A, B>(
  that: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B
) => <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, B> = circular.zipWithPar

/**
 * Schedules a potentially blocking effect to occur with background priority.
 *
 * Note: this is equivalent to pipe(yieldNow("background"), zipRight(self))
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const blocking: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A> = effect.blocking
