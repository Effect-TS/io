/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/reloadable"
import type * as ScopedRef from "@effect/io/ScopedRef"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ReloadableTypeId: unique symbol = internal.ReloadableTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ReloadableTypeId = typeof ReloadableTypeId

/**
 * A `Reloadable` is an implementation of some service that can be dynamically
 * reloaded, or swapped out for another implementation on-the-fly.
 *
 * @since 1.0.0
 * @category models
 */
export interface Reloadable<A> extends Reloadable.Variance<A> {
  /**
   * @internal
   */
  readonly scopedRef: ScopedRef.ScopedRef<A>
  /**
   * @macro traced
   * @internal
   */
  reload(): Effect.Effect<never, unknown, void>
}

/**
 * @since 1.0.0
 */
export declare namespace Reloadable {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [ReloadableTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}

/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service. The service is automatically reloaded according to the
 * provided schedule.
 *
 * @since 1.0.0
 * @category constructors
 */
export const auto = internal.auto

/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service. The service is automatically reloaded according to a
 * schedule, which is extracted from the input to the layer.
 *
 * @since 1.0.0
 * @category constructors
 */
export const autoFromConfig = internal.autoFromConfig

/**
 * Retrieves the current version of the reloadable service.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const get = internal.get

/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service.
 *
 * @since 1.0.0
 * @category constructors
 */
export const manual = internal.manual

/**
 * Reloads the specified service.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const reload = internal.reload

/**
 * @since 1.0.0
 * @category environment
 */
export const reloadableTag = internal.reloadableTag

/**
 * Forks the reload of the service in the background, ignoring any errors.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const reloadFork = internal.reloadFork
