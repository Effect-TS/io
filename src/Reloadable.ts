/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/reloadable"
import type * as Layer from "@effect/io/Layer"
import type * as Schedule from "@effect/io/Schedule"
import type * as ScopedRef from "@effect/io/ScopedRef"
import type * as Context from "@fp-ts/data/Context"

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
export const auto: <Out>(
  tag: Context.Tag<Out>
) => <In, E, R, Out2>(
  layer: Layer.Layer<In, E, Out>,
  policy: Schedule.Schedule<R, In, Out2>
) => Layer.Layer<In | R, E, Reloadable<Out>> = internal.auto

/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service. The service is automatically reloaded according to a
 * schedule, which is extracted from the input to the layer.
 *
 * @since 1.0.0
 * @category constructors
 */
export const autoFromConfig: <Out>(
  tag: Context.Tag<Out>
) => <In, E, R, Out2>(
  layer: Layer.Layer<In, E, Out>,
  scheduleFromConfig: (context: Context.Context<In>) => Schedule.Schedule<R, In, Out2>
) => Layer.Layer<In | R, E, Reloadable<Out>> = internal.autoFromConfig

/**
 * Retrieves the current version of the reloadable service.
 *
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const get: <A>(tag: Context.Tag<A>) => Effect.Effect<Reloadable<A>, never, A> = internal.get

/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service.
 *
 * @since 1.0.0
 * @category constructors
 */
export const manual: <Out>(
  tag: Context.Tag<Out>
) => <In, E>(layer: Layer.Layer<In, E, Out>) => Layer.Layer<In, E, Reloadable<Out>> = internal.manual

/**
 * Reloads the specified service.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const reload: <A>(tag: Context.Tag<A>) => Effect.Effect<Reloadable<A>, unknown, void> = internal.reload

/**
 * @since 1.0.0
 * @category context
 */
export const reloadableTag: <A>(tag: Context.Tag<A>) => Context.Tag<Reloadable<A>> = internal.reloadableTag

/**
 * Forks the reload of the service in the background, ignoring any errors.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const reloadFork: <A>(tag: Context.Tag<A>) => Effect.Effect<Reloadable<A>, unknown, void> = internal.reloadFork
