/**
 * @since 1.0.0
 */
import type { LogLevel } from "@effect/io/Logger/Level"

/**
 * @since 1.0.0
 * @category models
 */
export interface Debug {
  /**
   * Overrides the default log level filter for loggers such as console.
   */
  logLevelOverride: LogLevel | undefined
  /**
   * When specified it will be used to collect call traces at runtime.
   *
   * NOTE: Collecting traces at runtime is expensive and unreliable due
   * to the stack trace format being non standardized across platforms.
   * This flag is meant to be used only when debugging during development.
   */
  traceExtractor: ((at: number) => string | undefined) | undefined
  /**
   * A function that is used to filter which traces to show and collect.
   */
  traceFilter: (trace: string) => boolean
  /**
   * Enables execution tracing in the fiber runtime.
   */
  traceExecutionEnabled: boolean
  /**
   * Renders the execution trace in the error cause when it is available.
   */
  traceExecutionEnabledInCause: boolean
  /**
   * Renders the stack trace in the error cause when it is available.
   */
  traceStackEnabledInCause: boolean
  /**
   * Renders the span trace in the error cause when it is available.
   */
  traceSpanEnabledInCause: boolean
  /**
   * Sets a limit on how many execution traces should be rendered.
   */
  traceExecutionLimit: number
  /**
   * Sets a limit on how many stack traces should be rendered.
   */
  traceStackLimit: number
  /**
   * Sets a limit on how many span traces should be rendered.
   */
  traceSpanLimit: number
  /**
   * Enables debug logging of execution traces.
   */
  traceExecutionLogEnabled: boolean
  /**
   * Enables tracing.
   */
  traceEnabled: boolean
  /**
   * Listens to execution traces.
   */
  traceExecutionHook: Array<(trace: string) => void>
}

/**
 * @category debug
 * @since 1.0.0
 */
export const runtimeDebug: Debug = {
  logLevelOverride: undefined,
  traceExecutionEnabled: false,
  traceExecutionLogEnabled: false,
  traceExecutionEnabledInCause: false,
  traceSpanEnabledInCause: false,
  traceStackEnabledInCause: false,
  traceExecutionLimit: 5,
  traceStackLimit: 5,
  traceSpanLimit: 5,
  traceExtractor: undefined,
  traceFilter: () => true,
  traceEnabled: false,
  traceExecutionHook: []
}

/**
 * @category debug
 * @since 1.0.0
 */
export const nodeSourceMapExtractor = (at: number) => {
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
