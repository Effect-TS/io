/**
 * @since 1.0.0
 */
import * as Context from "@effect/data/Context"
import { globalValue } from "@effect/data/Global"
import * as MutableRef from "@effect/data/MutableRef"
import * as Option from "@effect/data/Option"
import * as Clock from "@effect/io/Clock"
import { dualWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"

/**
 * @since 1.0.0
 */
export const TracerTypeId = Symbol.for("@effect/io/Tracer")

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
 */
export const make = (options: Omit<Tracer, TracerTypeId>): Tracer => ({
  [TracerTypeId]: TracerTypeId,
  ...options
})

/**
 * @since 1.0.0
 */
export const Tracer = Context.Tag<Tracer>()

/**
 * @since 1.0.0
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
 */
export interface ExternalSpan {
  readonly _tag: "ExternalSpan"
  readonly name: string
  readonly spanId: string
  readonly traceId: string
}

/**
 * @since 1.0.0
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
}

const ids = globalValue("@effect/io/Tracer/SpanId.ids", () => MutableRef.make(0))

class NativeSpan implements Span {
  readonly _tag = "Span"
  readonly spanId: string
  readonly traceId: string = "native"

  status: SpanStatus
  attributes: Map<string, string>

  constructor(
    readonly name: string,
    readonly parent: Option.Option<ParentSpan>,
    readonly startTime: number
  ) {
    this.status = {
      _tag: "Started",
      startTime
    }
    this.attributes = new Map()
    this.spanId = `span${MutableRef.incrementAndGet(ids)}`
  }

  end = (endTime: number, exit: Exit.Exit<unknown, unknown>): void => {
    this.status = {
      _tag: "Ended",
      endTime,
      exit,
      startTime: this.status.startTime
    }
  }

  attribute = (key: string, value: string): void => {
    this.attributes.set(key, value)
  }
}

const nativeTracer: Tracer = make({
  span: (name, parent, startTime) => new NativeSpan(name, parent, startTime)
})

/**
 * @since 1.0.0
 */
export const Span = Context.Tag<Span>()

/**
 * @since 1.0.0
 */
export const withSpan: {
  (name: string, options?: {
    attributes?: Record<string, string>
    parent?: ParentSpan
    root?: boolean
  }): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Span>, E, A>
  <R, E, A>(self: Effect.Effect<R, E, A>, name: string, options?: {
    attributes?: Record<string, string>
    parent?: ParentSpan
    root?: boolean
  }): Effect.Effect<Exclude<R, Span>, E, A>
} = dualWithTrace<
  (name: string, options?: {
    attributes?: Record<string, string>
    parent?: ParentSpan
    root?: boolean
  }) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Span>, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, name: string, options?: {
    attributes?: Record<string, string>
    parent?: ParentSpan
    root?: boolean
  }) => Effect.Effect<Exclude<R, Span>, E, A>
>((args) => typeof args[0] !== "string", () =>
  (self, name, options) =>
    Effect.acquireUseRelease(
      Effect.flatMap(Clock.currentTimeMillis(), (startTime) =>
        Effect.contextWith((context: Context.Context<never>): Span => {
          const tracer: Tracer = Option.getOrElse(
            Context.getOption(context, Tracer),
            () => nativeTracer
          )

          const parent = Option.orElse(
            Option.fromNullable(options?.parent),
            () => options?.root === true ? Option.none() : Context.getOption(context, Span)
          )

          const span = tracer.span(name, parent, startTime)

          Object.entries(options?.attributes ?? {}).forEach(([k, v]) => {
            span.attribute(k, v)
          })

          return span
        })),
      (span) =>
        Effect.provideService(Span, span)(self),
      (span, exit) =>
        Effect.flatMap(
          Clock.currentTimeMillis(),
          (endTime) => Effect.sync(() => span.end(endTime, exit))
        )
    ))
