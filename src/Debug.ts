/**
 * @since 1.0.0
 */
import { identity } from "@fp-ts/data/Function"

/**
 * @since 1.0.0
 * @category models
 */
export interface Debug {
  /**
   * Overrides the default log level filter for loggers such as console.
   */
  defaultLogLevel: "All" | "Fatal" | "Error" | "Warning" | "Info" | "Debug" | "Trace" | "None"
  /**
   * When specified it will be used to collect call traces at runtime.
   *
   * NOTE: Collecting traces at runtime is expensive and unreliable due
   * to the stack trace format being non standardized across platforms.
   * This flag is meant to be used only when debugging during development.
   */
  getCallTrace: ((at: number) => string | undefined) | undefined
  /**
   * A function that is used to filter which traces to show and collect.
   */
  traceFilter: (trace: string) => boolean
  /**
   * Sets a limit on how many stack traces should be rendered.
   */
  traceStackLimit: number
  /**
   * Sets a limit on how many execution traces should be rendered.
   */
  traceExecutionLimit: number
  /**
   * Enables debug logging of execution traces.
   */
  traceExecutionLogEnabled: boolean
}

/**
 * @category debug
 * @since 1.0.0
 */
export const runtimeDebug: Debug = {
  defaultLogLevel: "Info",
  traceExecutionLimit: 5,
  traceStackLimit: 5,
  getCallTrace: undefined,
  traceFilter: () => true,
  traceExecutionLogEnabled: false
}

/**
 * @category debug
 * @since 1.0.0
 */
export const getCallTraceFromNewError = (at: number): string | undefined => {
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = at
  const stack = new Error().stack
  Error.stackTraceLimit = limit
  if (stack) {
    const lines = stack.split("\n")
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.startsWith("Error")) {
        const m = lines[i + at]?.match(/(file:\/\/)?\/(.*):(\d+):(\d+)/)
        if (m) {
          return `/${m[2]}:${m[3]}:${m[4]}`
        }
      }
    }
  }
}

/** @internal */
const stack: Array<string> = []
/** @internal */
const cleanup = <A>(x: A) => {
  stack.pop()
  return x
}

/** @internal */
const orUndefined = (trace: string | undefined): string | undefined => {
  if (trace && runtimeDebug.traceFilter(trace)) {
    return trace
  }
  return void 0
}

/**
 * @since 1.0.0
 */
export const isTraceEnabled: () => boolean = () =>
  (runtimeDebug.traceStackLimit > 0) || (runtimeDebug.traceExecutionLimit > 0)

/**
 * @since 1.0.0
 */
export const withCallTrace = (trace: string): <A>(value: A) => A => {
  if (!runtimeDebug.getCallTrace) {
    stack.push(trace)
    return cleanup
  }
  return identity
}

/**
 * @since 1.0.0
 */
export const getCallTrace = (): string | undefined => {
  if (runtimeDebug.getCallTrace) {
    return orUndefined(runtimeDebug.getCallTrace(4))
  }
  return orUndefined(stack[stack.length - 1])
}
