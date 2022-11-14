/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import * as internal from "@effect/io/internal/cached"
import type * as Scope from "@effect/io/Scope"
import type * as ScopedRef from "@effect/io/ScopedRef"

/**
 * @since 1.0.0
 * @category symbols
 */
export const CachedTypeId: unique symbol = internal.CachedTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type CachedTypeId = typeof CachedTypeId

/**
 * A `Cached` is a possibly resourceful value that is loaded into memory, and
 * which can be refreshed either manually or automatically.
 *
 * @since 1.0.0
 * @category models
 */
export interface Cached<E, A> extends Cached.Variance<E, A> {
  /** @internal */
  readonly ref: ScopedRef.ScopedRef<Exit.Exit<E, A>>
  /** @internal */
  readonly acquire: Effect.Effect<Scope.Scope, E, A>
}

/**
 * @since 1.0.0
 */
export declare namespace Cached {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [CachedTypeId]: {
      _E: (_: never) => E
      _A: (_: never) => A
    }
  }
}

/**
 * Creates a new `Cached` value that is automatically refreshed according to
 * the specified policy. Note that error retrying is not performed
 * automatically, so if you want to retry on errors, you should first apply
 * retry policies to the acquisition effect before passing it to this
 * constructor.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const auto = internal.auto

/**
 * Retrieves the current value stored in the cache.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const get = internal.get

/**
 * Creates a new `Cached` value that must be manually refreshed by calling
 * the refresh method. Note that error retrying is not performed
 * automatically, so if you want to retry on errors, you should first apply
 * retry policies to the acquisition effect before passing it to this
 * constructor.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const manual = internal.manual

/**
 * Refreshes the cache. This method will not return until either the refresh
 * is successful, or the refresh operation fails.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const refresh = internal.refresh
