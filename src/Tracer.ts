/**
 * @since 1.0.0
 */
import type { Effect } from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as Option from "@fp-ts/data/Option"

/**
 * @category symbols
 * @since 1.0.0
 */
export const TracerTypeId: unique symbol = Symbol.for("@effect/io/Tracer")

/**
 * @category symbols
 * @since 1.0.0
 */
export type TracerTypeId = typeof TracerTypeId

/**
 * The Tracer service is used to provide tracing facilities to Effect.
 *
 * This service is meant to be implemented by exporters such as opentelemetry.
 *
 * @category models
 * @since 1.0.0
 */
export interface Tracer {
  readonly _id: TracerTypeId
  readonly withSpan: (spanName: string, trace?: string) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: (
  withSpan: (spanName: string, trace?: string) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
) => Tracer = (
  withSpan
) => ({ _id: TracerTypeId, withSpan })

/**
 * @category fiberRefs
 * @since 1.0.0
 */
export const currentTracer = core.fiberRefUnsafeMake<Option.Option<Tracer>>(Option.none)
