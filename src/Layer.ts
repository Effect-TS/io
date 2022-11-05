/**
 * A `Layer<RIn, E, ROut>` describes how to build one or more services in your
 * application. Services can be injected into effects via
 * `Effect.provideService`. Effects can require services via `Effect.service`.
 *
 * Layer can be thought of as recipes for producing bundles of services, given
 * their dependencies (other services).
 *
 * Construction of services can be effectful and utilize resources that must be
 * acquired and safely released when the services are done being utilized.
 *
 * By default layers are shared, meaning that if the same layer is used twice
 * the layer will only be allocated a single time.
 *
 * Because of their excellent composition properties, layers are the idiomatic
 * way in Effect-TS to create services that depend on other services.
 *
 * @since 1.0.0
 */

import * as internal from "@effect/io/internal/layer"

/**
 * @since 1.0.0
 * @category symbols
 */
export const LayerTypeId: unique symbol = internal.LayerTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type LayerTypeId = typeof LayerTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Layer<RIn, E, ROut> extends Layer.Variance<RIn, E, ROut> {}

/**
 * @since 1.0.0
 */
export declare namespace Layer {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<RIn, E, ROut> {
    readonly [LayerTypeId]: {
      readonly _RIn: (_: never) => RIn
      readonly _E: (_: never) => E
      readonly _ROut: (_: ROut) => void
    }
  }
}

/**
 * Constructs a layer from the specified effect, which must return one or more
 * services.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromEffectEnvironment = internal.fromEffectEnvironment
