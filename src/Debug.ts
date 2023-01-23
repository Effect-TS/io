/**
 * @since 1.0.0
 */

import * as debug from "@effect/io/internal/debug"

/**
 * @since 1.0.0
 * @category models
 */
export interface Debug {
  /**
   * Overrides the default log level filter for loggers such as console.
   */
  minumumLogLevel: "All" | "Fatal" | "Error" | "Warning" | "Info" | "Debug" | "Trace" | "None"
  /**
   * Sets a limit on how many stack traces should be rendered.
   */
  traceStackLimit: number
  /**
   * Sets a limit on how many execution traces should be rendered.
   */
  traceExecutionLimit: number
  /**
   * Enables tracing of execution and stack.
   */
  tracingEnabled: boolean
  /**
   * Used to extract a source location from an Error when rendering a stack
   */
  parseStack: (error: Error) => ReadonlyArray<Frame | undefined> | undefined
  /**
   * Used to filter a source location when rendering a stack
   */
  filterStackFrame: (frame: Frame | undefined) => boolean
}

/**
 * @since 1.0.0
 * @category models
 */
export interface SourceLocation extends Error {
  depth: number
  parsed?: Frame | undefined

  toFrame(): Frame | undefined
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Frame {
  fileName: string
  line: number
  column: number
}

/**
 * @since 1.0.0
 * @category models
 */
export type Trace = SourceLocation | undefined

/**
 * @since 1.0.0
 * @category models
 */
export type Restore = <F extends (...args: Array<any>) => any>(f: F) => F

/**
 * @since 1.0.0
 * @category debug
 */
export const runtimeDebug: Debug = debug.runtimeDebug

const sourceLocationProto = Object.setPrototypeOf(
  {
    toFrame(this: SourceLocation) {
      if ("parsed" in this) {
        return this.parsed
      }
      const stack = runtimeDebug.parseStack(this)
      this.parsed = stack?.[this.depth - 1]
      return this.parsed
    }
  },
  Error.prototype
)

/**
 * @since 1.0.0
 */
export const sourceLocation = (error: Error): SourceLocation => {
  ;(error as SourceLocation).depth = Error.stackTraceLimit
  Object.setPrototypeOf(error, sourceLocationProto)
  return (error as SourceLocation)
}

/**
 * @since 1.0.0
 */
export const bodyWithTrace = <A>(
  body: (
    trace: Trace,
    restore: Restore
  ) => A
) => {
  if (!runtimeDebug.tracingEnabled) {
    return body(void 0, debug.restoreOff)
  }
  runtimeDebug.tracingEnabled = false
  try {
    const limit = Error.stackTraceLimit
    Error.stackTraceLimit = 3
    const source = sourceLocation(new Error())
    Error.stackTraceLimit = limit
    return body(source as SourceLocation, debug.restoreOn)
  } finally {
    runtimeDebug.tracingEnabled = true
  }
}

/**
 * @since 1.0.0
 */
export const methodWithTrace = <A extends (...args: Array<any>) => any>(
  body: ((trace: Trace, restore: Restore) => A)
): A => {
  // @ts-expect-error
  return (...args) => {
    if (!runtimeDebug.tracingEnabled) {
      return body(void 0, debug.restoreOff)(...args)
    }
    runtimeDebug.tracingEnabled = false
    try {
      const limit = Error.stackTraceLimit
      Error.stackTraceLimit = 2
      const error = sourceLocation(new Error())
      Error.stackTraceLimit = limit
      return body(error, debug.restoreOn)(...args)
    } finally {
      runtimeDebug.tracingEnabled = true
    }
  }
}

/**
 * @since 1.0.0
 */
export const pipeableWithTrace = <A extends (...args: Array<any>) => any>(
  body: ((trace: Trace, restore: Restore) => A)
): A => {
  // @ts-expect-error
  return (...args) => {
    if (!runtimeDebug.tracingEnabled) {
      const a = body(void 0, debug.restoreOff)
      return ((self: any) => untraced(() => a(...args)(self))) as any
    }
    runtimeDebug.tracingEnabled = false
    try {
      const limit = Error.stackTraceLimit
      Error.stackTraceLimit = 2
      const source = sourceLocation(new Error())
      Error.stackTraceLimit = limit
      const f = body(source, debug.restoreOn)
      return ((self: any) => untraced(() => f(...args)(self))) as any
    } finally {
      runtimeDebug.tracingEnabled = true
    }
  }
}

/**
 * @since 1.0.0
 */
export const dualWithTrace = <DF extends (...args: Array<any>) => any, P extends (...args: Array<any>) => any>(
  dfLen: Parameters<DF>["length"],
  body: ((trace: Trace, restore: Restore) => DF)
): DF & P => {
  // @ts-expect-error
  return (...args) => {
    if (!runtimeDebug.tracingEnabled) {
      const f = body(void 0, debug.restoreOff)
      if (args.length === dfLen) {
        return untraced(() => f(...args))
      }
      return ((self: any) => untraced(() => f(self, ...args))) as any
    }
    runtimeDebug.tracingEnabled = false
    try {
      const limit = Error.stackTraceLimit
      Error.stackTraceLimit = 2
      const source = sourceLocation(new Error())
      Error.stackTraceLimit = limit
      const f = body(source, debug.restoreOn)
      if (args.length === dfLen) {
        return untraced(() => f(...args))
      }
      return ((self: any) => untraced(() => f(self, ...args))) as any
    } finally {
      runtimeDebug.tracingEnabled = true
    }
  }
}

/**
 * @since 1.0.0
 */
export const untraced = <A>(
  body: (restore: Restore) => A
) => {
  if (!runtimeDebug.tracingEnabled) {
    return body(debug.restoreOff)
  }
  runtimeDebug.tracingEnabled = false
  try {
    return body(debug.restoreOn)
  } finally {
    runtimeDebug.tracingEnabled = true
  }
}

/**
 * @since 1.0.0
 */
export const traced = <A>(
  body: (restore: Restore) => A
) => {
  if (runtimeDebug.tracingEnabled) {
    return body(debug.restoreOn)
  }
  runtimeDebug.tracingEnabled = true
  try {
    return body(debug.restoreOff)
  } finally {
    runtimeDebug.tracingEnabled = false
  }
}

/**
 * @since 1.0.0
 */
export const getCallTrace = (): undefined => {
  return undefined
}
