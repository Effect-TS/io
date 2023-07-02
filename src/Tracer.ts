/**
 * @since 1.0.0
 */
import type * as Context from "@effect/data/Context"
import type * as Option from "@effect/data/Option"
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import * as defaultServices from "@effect/io/internal_effect_untraced/defaultServices"
import * as internal from "@effect/io/internal_effect_untraced/tracer"
import type * as Logger from "@effect/io/Logger"

/**
 * @since 1.0.0
 */
export const TracerTypeId: unique symbol = internal.TracerTypeId

/**
 * @since 1.0.0
 */
export type TracerTypeId = typeof TracerTypeId

/**
 * @since 1.0.0
 */
export interface Tracer {
  readonly [TracerTypeId]: TracerTypeId
  readonly span: (
    name: string,
    parent: Option.Option<ParentSpan>,
    context: Context.Context<never>,
    startTime: bigint
  ) => Span
}

/**
 * @since 1.0.0
 * @category models
 */
export type SpanStatus = {
  _tag: "Started"
  startTime: bigint
} | {
  _tag: "Ended"
  startTime: bigint
  endTime: bigint
  exit: Exit.Exit<unknown, unknown>
}

/**
 * @since 1.0.0
 * @category models
 */
export type ParentSpan = Span | ExternalSpan

/**
 * @since 1.0.0
 * @category models
 */
export interface ExternalSpan {
  readonly _tag: "ExternalSpan"
  readonly name: string
  readonly spanId: string
  readonly traceId: string
  readonly context: Context.Context<never>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Span {
  readonly _tag: "Span"
  readonly name: string
  readonly spanId: string
  readonly traceId: string
  readonly parent: Option.Option<ParentSpan>
  readonly context: Context.Context<never>
  readonly status: SpanStatus
  readonly attributes: ReadonlyMap<string, AttributeValue>
  readonly end: (endTime: bigint, exit: Exit.Exit<unknown, unknown>) => void
  readonly attribute: (key: string, value: AttributeValue) => void
  readonly event: (name: string, attributes?: Record<string, AttributeValue>) => void
}
/**
 * @since 1.0.0
 * @category models
 */
export type AttributeValue = string | boolean | number

/**
 * @since 1.0.0
 * @category tags
 */
export const Tracer: Context.Tag<Tracer, Tracer> = internal.tracerTag

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (options: Omit<Tracer, typeof TracerTypeId>) => Tracer = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const tracerWith: <R, E, A>(f: (tracer: Tracer) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  defaultServices.tracerWith

/**
 * A Logger which adds log entries as events to the current span.
 *
 * @since 1.0.0
 * @category loggers
 */
export const logger: Logger.Logger<string, void> = internal.logger
