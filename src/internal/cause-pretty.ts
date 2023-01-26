import type * as Cause from "@effect/io/Cause"
import * as Debug from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/cause"
import { StackAnnotation } from "@effect/io/internal/cause"
import * as core from "@effect/io/internal/core"
import * as OpCodes from "@effect/io/internal/opCodes/cause"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

// -----------------------------------------------------------------------------
// Pretty Printing
// -----------------------------------------------------------------------------

/** @internal */
const lines = (s: string) => {
  return s.split("\n").map((s) => s.replace("\r", "")) as ReadonlyArray<string>
}

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
    return u
  }
  return JSON.stringify(u, null, 2)
}

const renderTraces = (chunk: Chunk.Chunk<Debug.Trace>): ReadonlyArray<string> => {
  const ret: Array<string> = []
  for (const s of chunk) {
    const r = s?.toFrame()
    if (r) {
      if (Debug.runtimeDebug.filterStackFrame(r)) {
        ret.push(renderFrame(r))
      } else {
        return ret
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
  if (span.value.execution) {
    return renderTraces(Chunk.prepend(span.value.execution)(span.value.stack))
  }
  if (span.value.stack.length > 0) {
    return renderTraces(span.value.stack)
  }
  return []
}

/** @internal */
const renderFail = (
  error: ReadonlyArray<string>,
  stack: Option.Option<StackAnnotation>
): ReadonlyArray<string> => {
  return [
    ...error,
    ...renderStack(stack)
  ]
}

/** @internal */
const renderDie = (
  error: ReadonlyArray<string>,
  stack: Option.Option<StackAnnotation>
): ReadonlyArray<string> => {
  return [
    ...error,
    ...renderStack(stack)
  ]
}

/** @internal */
const renderError = (error: Error): ReadonlyArray<string> => {
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
      `${error.name}: ${error.message}`,
      ...traces
    ]
  }
  return lines(String(error))
}

/** @internal */
const defaultErrorToLines = (error: unknown) => {
  return error instanceof Error ? renderError(error) : lines(renderToString(error))
}

const render = <E>(
  cause: Cause.Cause<E>,
  stack: Option.Option<StackAnnotation>
): Effect.Effect<never, never, ReadonlyArray<string>> => {
  switch (cause._tag) {
    case OpCodes.OP_ANNOTATED: {
      const annotation = cause.annotation
      if (internal.isStackAnnotation(annotation)) {
        return core.suspendSucceed(() =>
          render(
            cause.cause,
            pipe(
              stack,
              Option.map((parent) =>
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
                  annotation.execution ?? parent.execution
                )
              ),
              Option.orElse(Option.some(annotation))
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
      return core.succeed(renderDie(defaultErrorToLines(cause.defect), stack))
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
    return core.succeed("All fibers have interrupted without errors.")
  }
  return core.map(render(cause, Option.none), (errors) => errors.join("\r\n"))
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
