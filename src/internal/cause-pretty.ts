import type * as Cause from "@effect/io/Cause"
import * as Debug from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as FiberId from "@effect/io/Fiber/Id"
import * as internal from "@effect/io/internal/cause"
import { StackAnnotation } from "@effect/io/internal/cause"
import * as core from "@effect/io/internal/core"
import * as OpCodes from "@effect/io/internal/opCodes/cause"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"

// -----------------------------------------------------------------------------
// Pretty Printing
// -----------------------------------------------------------------------------

/** @internal */
type Segment = SequentialSegment | ParallelSegment | FailureSegment

/** @internal */
type Step = ParallelSegment | FailureSegment

/** @internal */
interface FailureSegment {
  readonly _tag: "FailureSegment"
  readonly lines: ReadonlyArray<string>
}

/** @internal */
interface ParallelSegment {
  readonly _tag: "ParallelSegment"
  readonly all: ReadonlyArray<SequentialSegment>
}

/** @internal */
interface SequentialSegment {
  readonly _tag: "SequentialSegment"
  readonly all: ReadonlyArray<Step>
}

/** @internal */
const FailureSegment = (lines: ReadonlyArray<string>): FailureSegment => {
  return {
    _tag: "FailureSegment",
    lines
  }
}

/** @internal */
const SequentialSegment = (all: ReadonlyArray<Step>): SequentialSegment => {
  return {
    _tag: "SequentialSegment",
    all
  }
}

/** @internal */
const ParallelSegment = (all: ReadonlyArray<SequentialSegment>): ParallelSegment => {
  return {
    _tag: "ParallelSegment",
    all
  }
}

/** @internal */
const box = {
  horizontal: {
    light: "─",
    heavy: "═"
  },
  vertical: {
    heavy: "║"
  },
  branch: {
    right: {
      heavy: "╠"
    },
    down: {
      light: "╥",
      heavy: "╦"
    }
  },
  terminal: {
    down: {
      heavy: "╗"
    }
  },
  arrow: {
    down: "▼"
  }
}

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
): SequentialSegment => {
  return SequentialSegment([
    FailureSegment([
      ...error,
      ...renderStack(stack)
    ])
  ])
}

/** @internal */
const renderDie = (
  error: ReadonlyArray<string>,
  stack: Option.Option<StackAnnotation>
): SequentialSegment => {
  return SequentialSegment([
    FailureSegment([
      ...error,
      ...renderStack(stack)
    ])
  ])
}

/** @internal */
const renderInterrupt = (
  fiberId: FiberId.FiberId,
  stack: Option.Option<StackAnnotation>
): SequentialSegment => {
  const ids = Array.from(FiberId.ids(fiberId)).map((id) => `#${id}`).join(", ")
  return SequentialSegment([
    FailureSegment([
      `An interrupt was produced by ${ids}.`,
      ...renderStack(stack)
    ])
  ])
}

/** @internal */
const renderError = (error: Error): ReadonlyArray<string> => {
  if (error.stack) {
    const stack = Debug.runtimeDebug.parseStack(error)
    if (stack) {
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
      if (traces.length > 0) {
        return [
          `${error.name}: ${error.message}`,
          ...traces
        ]
      }
    }
  }
  return lines(String(error))
}

/** @internal */
const prefixBlock = (
  values: ReadonlyArray<string>,
  prefix1: string,
  prefix2: string
): ReadonlyArray<string> => {
  if (ReadonlyArray.isNonEmpty(values)) {
    const head = values[0]
    const tail = values.slice(1)
    const init = `${prefix1}${head}`
    const rest = tail.map((value) => `${prefix2}${value}`)
    return [init, ...rest]
  }
  return []
}

/** @internal */
const format = (segment: Segment): ReadonlyArray<string> => {
  switch (segment._tag) {
    case "FailureSegment": {
      return prefixBlock(segment.lines, box.horizontal.light, " ")
    }
    case "ParallelSegment": {
      const verticalSeparator = `  ${box.vertical.heavy}`
      const fiberBus = segment.all.flatMap((_, i) => {
        return i === segment.all.length - 1 ?
          [box.horizontal.heavy, box.horizontal.heavy, box.terminal.down.heavy] :
          [box.horizontal.heavy, box.horizontal.heavy, box.branch.down.heavy]
      }).join("")
      const segments = segment.all.reduceRight(
        (acc, curr) => [
          ...prefixBlock(acc, verticalSeparator, verticalSeparator),
          ...prefixBlock(format(curr), "  ", "  ")
        ],
        [] as ReadonlyArray<string>
      )
      return [fiberBus, ...segments]
    }
    case "SequentialSegment": {
      return segment.all.flatMap((step) => [
        box.vertical.heavy,
        ...prefixBlock(format(step), box.branch.right.heavy, box.vertical.heavy),
        box.arrow.down
      ])
    }
  }
}

/** @internal */
const linearSegments = <E>(
  cause: Cause.Cause<E>,
  renderer: Cause.CauseRenderer<E>,
  stack: Option.Option<StackAnnotation>
): Effect.Effect<never, never, ReadonlyArray<Step>> => {
  switch (cause._tag) {
    case OpCodes.OP_SEQUENTIAL: {
      return pipe(
        linearSegments(cause.left, renderer, stack),
        core.zipWith(
          linearSegments(cause.right, renderer, stack),
          (left, right) => [...left, ...right]
        )
      )
    }
    default: {
      return pipe(
        causeToSequential(cause, renderer, stack),
        core.map((sequential) => sequential.all)
      )
    }
  }
}

/** @internal */
const parallelSegments = <E>(
  cause: Cause.Cause<E>,
  renderer: Cause.CauseRenderer<E>,
  stack: Option.Option<StackAnnotation>
): Effect.Effect<never, never, ReadonlyArray<SequentialSegment>> => {
  switch (cause._tag) {
    case OpCodes.OP_PARALLEL: {
      return pipe(
        parallelSegments(cause.left, renderer, stack),
        core.zipWith(
          parallelSegments(cause.right, renderer, stack),
          (left, right) => [...left, ...right]
        )
      )
    }
    default: {
      return pipe(
        causeToSequential(cause, renderer, stack),
        core.map((sequential) => [sequential])
      )
    }
  }
}

/** @internal */
const causeToSequential = <E>(
  cause: Cause.Cause<E>,
  renderer: Cause.CauseRenderer<E>,
  stack: Option.Option<StackAnnotation>
): Effect.Effect<never, never, SequentialSegment> => {
  switch (cause._tag) {
    case OpCodes.OP_EMPTY: {
      return core.succeed(SequentialSegment([]))
    }
    case OpCodes.OP_FAIL: {
      return core.succeed(
        renderFail(
          renderer.renderError(cause.error),
          stack
        )
      )
    }
    case OpCodes.OP_DIE: {
      return core.succeed(
        renderDie(renderer.renderUnknown(cause.defect), stack)
      )
    }
    case OpCodes.OP_INTERRUPT: {
      return core.succeed(
        renderInterrupt(cause.fiberId, stack)
      )
    }
    case OpCodes.OP_SEQUENTIAL: {
      return pipe(
        linearSegments(cause, renderer, stack),
        core.map((segments) => SequentialSegment(segments))
      )
    }
    case OpCodes.OP_PARALLEL: {
      return pipe(
        parallelSegments(cause, renderer, stack),
        core.map((segments) => SequentialSegment([ParallelSegment(segments)]))
      )
    }
    case OpCodes.OP_ANNOTATED: {
      const annotation = cause.annotation
      if (internal.isStackAnnotation(annotation)) {
        return core.suspendSucceed(() =>
          causeToSequential(
            cause.cause,
            renderer,
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
      return core.suspendSucceed(() => causeToSequential(cause.cause, renderer, stack))
    }
  }
}

/** @internal */
const defaultErrorToLines = (error: unknown) => {
  return error instanceof Error ? renderError(error) : lines(renderToString(error))
}

/** @internal */
export const defaultRenderer: Cause.CauseRenderer = {
  lineWidth: 80,
  ribbonFraction: 1,
  renderError: defaultErrorToLines,
  renderUnknown: defaultErrorToLines
}

/** @internal */
const prettyDocuments = <E>(
  cause: Cause.Cause<E>,
  renderer: Cause.CauseRenderer<E>
): Effect.Effect<never, never, ReadonlyArray<string>> => {
  return pipe(
    causeToSequential(
      cause,
      renderer,
      Option.none
    ),
    core.map((sequential) => {
      if (
        sequential.all.length === 1 &&
        sequential.all[0] &&
        sequential.all[0]._tag === "FailureSegment"
      ) {
        return sequential.all[0].lines
      }
      const documents = format(sequential)
      return documents.length > 0 ? [box.branch.down.light, ...documents] : documents
    })
  )
}

/** @internal */
export const prettySafe = <E>(
  cause: Cause.Cause<E>,
  renderer: Cause.CauseRenderer<E>
): Effect.Effect<never, never, string> => {
  return pipe(
    cause,
    internal.reduceWithContext(undefined, UnEmptyCauseReducer<E>()),
    (self) => prettyDocuments(self, renderer),
    core.map((docs) => `\r\n${docs.join("\r\n")}\r\n`)
  )
}

/** @internal */
const UnEmptyCauseReducer = <E>(): Cause.CauseReducer<unknown, E, Cause.Cause<E>> => ({
  emptyCase: () => internal.empty,
  failCase: (_, error) => internal.fail(error),
  dieCase: (_, defect) => internal.die(defect),
  interruptCase: (_, fiberId) => internal.interrupt(fiberId),
  annotatedCase: (_, cause, annotation) => internal.isEmptyType(cause) ? cause : internal.annotated(cause, annotation),
  sequentialCase: (_, left, right) =>
    internal.isEmptyType(left) ? right : internal.isEmptyType(right) ? left : internal.sequential(left, right),
  parallelCase: (_, left, right) =>
    internal.isEmptyType(left) ? right : internal.isEmptyType(right) ? left : internal.parallel(left, right)
})

function renderFrame(r: Debug.Frame | undefined): string {
  return r ? `    at ${r.fileName}:${r.line}:${r.column}` : `    at <unknown>`
}
