/**
 * @since 1.0.0
 */
import * as Context from "@effect/data/Context"
import * as Debug from "@effect/data/Debug"
import { globalValue } from "@effect/data/Global"
import * as List from "@effect/data/List"
import * as MutableRef from "@effect/data/MutableRef"
import type * as Option from "@effect/data/Option"
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import * as core from "@effect/io/internal_effect_untraced/core"
import type * as Tracer from "@effect/io/Tracer"

/** @internal */
export const TracerTypeId: Tracer.TracerTypeId = Symbol.for("@effect/io/Tracer") as Tracer.TracerTypeId

/**
 * @since 1.0.0
 */
export const make = (options: Omit<Tracer.Tracer, Tracer.TracerTypeId>): Tracer.Tracer => ({
  [TracerTypeId]: TracerTypeId,
  ...options
})

/**
 * @since 1.0.0
 */
export const tracerTag = Context.Tag<Tracer.Tracer>(
  Symbol.for("@effect/io/Tracer")
)

const ids = globalValue("@effect/io/Tracer/SpanId.ids", () => MutableRef.make(0))

class NativeSpan implements Tracer.Span {
  readonly _tag = "Span"
  readonly spanId: string
  readonly traceId: string = "native"

  status: Tracer.SpanStatus
  attributes: Map<string, string>

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
}

/** @internal */
export const nativeTracer: Tracer.Tracer = make({
  span: (name, parent, startTime) => new NativeSpan(name, parent, startTime)
})

/** @internal */
export const currentSpan: () => Effect.Effect<never, never, Option.Option<Tracer.Span>> = Debug.methodWithTrace((
  trace
) => () => core.map(core.fiberRefGet(core.currentTracerSpan), List.head).traced(trace))