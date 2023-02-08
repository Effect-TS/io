import * as Chunk from "@effect/data/Chunk"
import type * as Cause from "@effect/io/Cause"
import * as Debug from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal_effect_untraced/cause"
import { StackAnnotation } from "@effect/io/internal_effect_untraced/cause"
import * as core from "@effect/io/internal_effect_untraced/core"
import * as OpCodes from "@effect/io/internal_effect_untraced/opCodes/cause"
import { pipe } from "@fp-ts/core/Function"
import * as Option from "@fp-ts/core/Option"

// -----------------------------------------------------------------------------
// Pretty Printing
// -----------------------------------------------------------------------------

/** @internal */
const renderToString = (u: unknown): string => {
  if (
    typeof u === "object" &&
    u != null &&
    "toString" in u &&
    typeof u["toString"] === "function" &&
    u["toString"] !== Object.prototype.toString
  ) {
    return u["toString"]()
  }
  if (typeof u === "string") {
    return `Error: ${u}`
  }
  if (typeof u === "object" && u !== null) {
    if ("message" in u && typeof u["message"] === "string") {
      const raw = JSON.parse(JSON.stringify(u))
      const keys = new Set(Object.keys(raw))
      keys.delete("name")
      keys.delete("message")
      keys.delete("_tag")
      if (keys.size === 0) {
        return `${"name" in u && typeof u.name === "string" ? u.name : "Error"}${
          "_tag" in u && typeof u["_tag"] === "string" ? `(${u._tag})` : ``
        }: ${u.message}`
      }
    }
  }
  return `Error: ${JSON.stringify(u)}`
}

const renderTraces = (chunk: Chunk.Chunk<Debug.Trace>): ReadonlyArray<string> => {
  const ret: Array<string> = []
  for (const s of chunk) {
    const r = s?.toFrame()
    if (r) {
      if (Debug.runtimeDebug.filterStackFrame(r)) {
        ret.push(renderFrame(r))
      }
    }
  }
  return ret
}

/** @internal */
const renderStack = (span: Option.Option<StackAnnotation>): ReadonlyArray<string> => {
  if (Option.isNone(span)) {
    return []
  }
  if (span.value.stack.length > 0) {
    return renderTraces(span.value.stack)
  }
  return []
}

/** @internal */
const renderFail = (
  error: string,
  stack: Option.Option<StackAnnotation>
): ReadonlyArray<RenderError> => {
  return [new RenderError(stack._tag === "Some" ? stack.value.seq : 0, error, renderStack(stack).join("\r\n"))]
}

/** @internal */
const renderError = (error: Error): string => {
  if (error.stack) {
    const stack = Debug.runtimeDebug.parseStack(error)
    const traces: Array<string> = []
    for (const frame of stack) {
      if (frame) {
        if (Debug.runtimeDebug.filterStackFrame(frame)) {
          traces.push(renderFrame(frame))
        } else {
          break
        }
      }
    }
    return [
      renderToString(error),
      ...traces
    ].join("\r\n")
  }
  return String(error)
}

/** @internal */
const defaultErrorToLines = (error: unknown) => {
  if (error instanceof Error) {
    return renderError(error)
  }
  return renderToString(error)
}

class RenderError {
  constructor(readonly seq: number, readonly message: string, readonly stack: string) {}
}

const render = <E>(
  cause: Cause.Cause<E>,
  stack: Option.Option<StackAnnotation>
): Effect.Effect<never, never, ReadonlyArray<RenderError>> => {
  switch (cause._tag) {
    case OpCodes.OP_ANNOTATED: {
      const annotation = cause.annotation
      if (internal.isStackAnnotation(annotation)) {
        return core.suspendSucceed(() =>
          render(
            cause.cause,
            pipe(
              Option.map(stack, (parent) =>
                new StackAnnotation(
                  annotation.stack.length < Debug.runtimeDebug.traceStackLimit && parent.stack.length > 0 &&
                    ((annotation.stack.length > 0 &&
                      Chunk.unsafeLast(parent.stack) !== Chunk.unsafeLast(annotation.stack)) ||
                      annotation.stack.length === 0) ?
                    pipe(
                      annotation.stack,
                      Chunk.concat(parent.stack),
                      Chunk.dedupeAdjacent,
                      Chunk.take(Debug.runtimeDebug.traceStackLimit)
                    ) :
                    annotation.stack,
                  annotation.seq
                )),
              Option.orElse(() => Option.some(annotation))
            )
          )
        )
      }
      return core.suspendSucceed(() => render(cause.cause, stack))
    }
    case OpCodes.OP_EMPTY: {
      return core.succeed([])
    }
    case OpCodes.OP_FAIL: {
      return core.succeed(renderFail(defaultErrorToLines(cause.error), stack))
    }
    case OpCodes.OP_DIE: {
      return core.succeed(renderFail(defaultErrorToLines(cause.defect), stack))
    }
    case OpCodes.OP_INTERRUPT: {
      return core.succeed([])
    }
    case OpCodes.OP_SEQUENTIAL: {
      return core.zipWith(
        core.suspendSucceed(() => render(cause.left, stack)),
        core.suspendSucceed(() => render(cause.right, stack)),
        (left, right) => [...left, ...right]
      )
    }
    case OpCodes.OP_PARALLEL: {
      return core.zipWith(
        core.suspendSucceed(() => render(cause.left, stack)),
        core.suspendSucceed(() => render(cause.right, stack)),
        (left, right) => [...left, ...right]
      )
    }
    default: {
      return core.succeed([])
    }
  }
}

/** @internal */
export const prettySafe = <E>(cause: Cause.Cause<E>): Effect.Effect<never, never, string> => {
  if (internal.isInterruptedOnly(cause)) {
    return core.succeed("All fibers interrupted without errors.")
  }
  return core.map(render(cause, Option.none()), (errors) => {
    const final = Array.from(errors).sort((a, b) => a.seq === b.seq ? 0 : a.seq > b.seq ? 1 : -1).map((e) => {
      let message = e.message
      if (e.stack && e.stack.length > 0) {
        message += `\r\n${e.stack}`
      }
      return message
    }).join("\r\n\r\n")
    if (!final.includes("\r\n")) {
      return final
    }
    return `\r\n${final}\r\n`
  })
}

function renderFrame(r: Debug.Frame | undefined): string {
  if (r) {
    if (r.name) {
      return `    at ${r.name} (${r.fileName}:${r.line}:${r.column})`
    }
    return `    at ${r.fileName}:${r.line}:${r.column}`
  }
  return `    at <unknown>`
}
