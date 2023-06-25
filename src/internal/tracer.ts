/**
 * @since 1.0.0
 */
import * as Context from "@effect/data/Context"
import { globalValue } from "@effect/data/Global"
import * as List from "@effect/data/List"
import * as MutableRef from "@effect/data/MutableRef"
import * as Option from "@effect/data/Option"
import * as Cause from "@effect/io/Cause"
import type * as Exit from "@effect/io/Exit"
import * as Pretty from "@effect/io/internal/cause-pretty"
import * as core from "@effect/io/internal/core"
import * as _fiberId from "@effect/io/internal/fiberId"
import * as fiberRefs from "@effect/io/internal/fiberRefs"
import * as _logger from "@effect/io/internal/logger"
import type * as Tracer from "@effect/io/Tracer"

/** @internal */
export const TracerTypeId: Tracer.TracerTypeId = Symbol.for("@effect/io/Tracer") as Tracer.TracerTypeId

/** @internal */
export const make = (options: Omit<Tracer.Tracer, Tracer.TracerTypeId>): Tracer.Tracer => ({
  [TracerTypeId]: TracerTypeId,
  ...options
})

/** @internal */
export const tracerTag = Context.Tag<Tracer.Tracer>(
  Symbol.for("@effect/io/Tracer")
)

const ids = globalValue("@effect/io/Tracer/SpanId.ids", () => MutableRef.make(0))

/** @internal */
export class NativeSpan implements Tracer.Span {
  readonly _tag = "Span"
  readonly spanId: string
  readonly traceId: string = "native"

  status: Tracer.SpanStatus
  attributes: Map<string, string>
  events: Array<[name: string, attributes: Record<string, string>]> = []

  constructor(
    readonly name: string,
    readonly parent: Option.Option<Tracer.ParentSpan>,
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

  event = (name: string, attributes?: Record<string, string>): void => {
    this.events.push([name, attributes ?? {}])
  }
}

/** @internal */
export const nativeTracer: Tracer.Tracer = make({
  span: (name, parent, startTime) => new NativeSpan(name, parent, startTime)
})

/** @internal */
export const logger = _logger.makeLogger<string, void>((
  fiberId,
  logLevel,
  message,
  cause,
  context,
  _spans,
  annotations
) => {
  const span = Option.flatMap(fiberRefs.get(context, core.currentTracerSpan), List.head)
  if (Option.isNone(span)) {
    return
  }

  const attributes = Object.fromEntries(annotations)
  attributes["effect.fiberId"] = _fiberId.threadName(fiberId)
  attributes["effect.logLevel"] = logLevel.label

  if (cause !== null && cause !== Cause.empty) {
    attributes["effect.cause"] = Pretty.pretty(cause)
  }

  span.value.event(
    message,
    attributes
  )
})
