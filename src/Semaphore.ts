/**
 * @since 1.0.0
 */
import * as circular from "@effect/io/internal/effect/circular"
import * as internal from "@effect/io/internal/semaphore"
import type { Ref } from "@effect/io/internal/stm/ref"

/**
 * @since 1.0.0
 * @category symbols
 */
export const SemaphoreTypeId: unique symbol = circular.SemaphoreTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type SemaphoreTypeId = typeof SemaphoreTypeId

/**
 * A `Semaphore` is a semaphore that can be composed transactionally. Because
 * of the extremely high performance of Effect's implementation of software
 * transactional memory `Semaphore` can support both controlling access to some
 * resource on a standalone basis as well as composing with other STM data
 * structures to solve more advanced concurrency problems.
 *
 * For basic use cases, the most idiomatic way to work with a semaphore is to
 * use the `withPermit` operator, which acquires a permit before executing some
 * effect and release the permit immediately afterward. The permit is guaranteed
 * to be released immediately after the effect completes execution, whether by
 * success, failure, or interruption. Attempting to acquire a permit when a
 * sufficient number of permits are not available will semantically block until
 * permits become available without blocking any underlying operating system
 * threads. If you want to acquire more than one permit at a time you can use
 * `withPermits`, which allows specifying a number of permits to acquire. You
 * You can also use `withPermitScoped` or `withPermitsScoped` to acquire and
 * release permits within the context of a scoped effect for composing with
 * other resources.
 *
 * For more advanced concurrency problems you can use the `acquire` and
 * `release` operators directly, or their variants `acquireN` and `releaseN`,
 * all of which return STM transactions. Thus, they can be composed to form
 * larger STM transactions, for example acquiring permits from two different
 * semaphores transactionally and later releasing them transactionally to safely
 * synchronize on access to two different mutable variables.
 *
 * @since 1.0.0
 * @category models
 */
export interface Semaphore {
  readonly [SemaphoreTypeId]: SemaphoreTypeId
  /** @internal */
  readonly permits: Ref<number>
}

/**
 * Constructs a new `Semaphore` with the specified number of permits.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make

/**
 * Returns the number of permits available to be acquired from the `Semaphore`.
 *
 * @since 1.0.0
 * @category getters
 */
export const available = internal.available

/**
 * Acquires a single permit from the `Semaphore`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const acquire = internal.acquire

/**
 * Acquires the specified number of permits from the `Semaphore`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const acquireN = circular.acquireN

/**
 * Releases a single permit back to the `Semaphore`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const release = internal.release

/**
 * Releases the specified number of permits back to the `Semaphore`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const releaseN = circular.releaseN

/**
 * Executes the specified effect, acquiring a permit immediately before the
 * effect begins execution and releasing it immediately after the effect
 * completes execution, whether by success, failure, or interruption.
 *
 * @since 1.0.0
 * @category permits
 */
export const withPermit = internal.withPermit

/**
 * Executes the specified effect, acquiring the specified number of permits
 * immediately before the effect begins execution and releasing them
 * immediately after the effect completes execution, whether by success,
 * failure, or interruption.
 *
 * @since 1.0.0
 * @category permits
 */
export const withPermits = circular.withPermits

/**
 * Returns a scoped effect that describes acquiring a permit as the `acquire`
 * action and releasing it as the `release` action.
 *
 * @since 1.0.0
 * @category permits
 */
export const withPermitScoped = internal.withPermitScoped

/**
 * Returns a scoped effect that describes acquiring the specified number of
 * permits and releasing them when the scope is closed.
 *
 * @since 1.0.0
 * @category permits
 */
export const withPermitsScoped = circular.withPermitsScoped

/**
 * Unsafely creates a new `Semaphore`.
 *
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeMake = circular.unsafeMakeSemaphore
