/**
 * @since 1.0.0
 */
import * as Context from "@effect/data/Context"
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
  readonly span: (name: string, parent: Option.Option<ParentSpan>, startTime: number) => Span
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: Omit<Tracer, TracerTypeId>): Tracer => ({
  [TracerTypeId]: TracerTypeId,
  ...options
})

/**
 * @since 1.0.0
 * @category tags
 */
export const Tracer = Context.Tag<Tracer>(
  Symbol.for("@effect/io/Tracer")
)

/**
 * @since 1.0.0
 * @category models
 */
export type SpanStatus = {
  _tag: "Started"
  startTime: number
} | {
  _tag: "Ended"
  startTime: number
  endTime: number
  exit: Exit.Exit<unknown, unknown>
}

/**
 * @since 1.0.0
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
  readonly status: SpanStatus
  readonly attributes: ReadonlyMap<string, string>
  readonly end: (endTime: number, exit: Exit.Exit<unknown, unknown>) => void
  readonly attribute: (key: string, value: string) => void
  readonly event: (name: string, attributes?: Record<string, string>) => void
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const tracerWith: <R, E, A>(f: (tracer: Tracer) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  defaultServices.tracerWith

/**
 * @since 1.0.0
 * @category loggers
 */
export const logger: Logger.Logger<string, void> = internal.logger
