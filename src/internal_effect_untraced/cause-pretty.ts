import * as Chunk from "@effect/data/Chunk"
import type * as Cause from "@effect/io/Cause"
import * as Debug from "@effect/io/Debug"
import * as internal from "@effect/io/internal_effect_untraced/cause"
import { StackAnnotation } from "@effect/io/internal_effect_untraced/cause"
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
  constructor(public seq: number, public message: string, public stack: string) {}
}

class RenderErrorTmp {
  constructor(readonly message: string, readonly stack: Option.Option<Cause.StackAnnotation>) {}
}

/** @internal */
export const pretty = <E>(cause: Cause.Cause<E>): string => {
  if (internal.isInterruptedOnly(cause)) {
    return "All fibers interrupted without errors."
  }
  const errors = internal.reduceWithContext(cause, void 0, {
    emptyCase: (): ReadonlyArray<RenderErrorTmp> => [],
    dieCase: (_, defect) => [{ message: defaultErrorToLines(defect), stack: Option.none() }],
    failCase: (_, defect) => [{ message: defaultErrorToLines(defect), stack: Option.none() }],
    interruptCase: () => [],
    parallelCase: (_, l, r) => [...l, ...r],
    sequentialCase: (_, l, r) => [...l, ...r],
    annotatedCase: (_, v, parent) =>
      internal.isStackAnnotation(parent) ?
        v.map((r) => ({
          message: r.message,
          stack: pipe(
            Option.map(r.stack, (annotation) =>
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
            Option.orElse(() => Option.some(parent))
          )
        })) :
        v
  }).flatMap((r) => renderFail(r.message, r.stack))

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
