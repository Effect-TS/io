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
   * Used to extract a source location from an Error with a stack
   */
  parseStack: (error: Error, depth: number) => string | undefined
}

const levels = ["All", "Fatal", "Error", "Warning", "Info", "Debug", "Trace", "None"]

/**
 * @category debug
 * @since 1.0.0
 */
export const runtimeDebug: Debug = {
  minumumLogLevel:
    process && process.env && process.env["EFFECT_LOG_LEVEL"] && levels.includes(process.env["EFFECT_LOG_LEVEL"]) ?
      process.env["EFFECT_LOG_LEVEL"] as Debug["minumumLogLevel"] :
      "Info",
  traceExecutionLimit: process && process.env && process.env["EFFECT_TRACING_EXECUTION_LIMIT"] ?
    Number.parseInt(process.env["EFFECT_TRACING_EXECUTION_LIMIT"]) :
    5,
  traceStackLimit: process && process.env && process.env["EFFECT_TRACING_STACK_LIMIT"] ?
    Number.parseInt(process.env["EFFECT_TRACING_STACK_LIMIT"]) :
    5,
  tracingEnabled: process && process.env && process.env["EFFECT_TRACING_ENABLED"] &&
      process.env["EFFECT_TRACING_ENABLED"] === "false" ?
    false :
    true,
  parseStack: (error, depth) => {
    const stack = error.stack
    if (stack) {
      const lines = stack.split("\n")
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.startsWith("Error")) {
          const m = lines[i + depth]?.match(/(file:\/\/)?\/(.*):(\d+):(\d+)/)
          if (m) {
            return `/${m[2]}:${m[3]}:${m[4]}`
          }
        }
      }
    }
  }
}

const restore: <F extends (...args: Array<any>) => any>(f: F) => F = (f): any =>
  (...args: Array<any>) => {
    if (runtimeDebug.tracingEnabled) {
      return f(...args)
    }
    runtimeDebug.tracingEnabled = true
    try {
      return f(...args)
    } finally {
      runtimeDebug.tracingEnabled = false
    }
  }

const sourceLocationProto = Object.setPrototypeOf(
  {
    toString(this: SourceLocation) {
      if ("parsed" in this) {
        return this.parsed
      }
      this.parsed = runtimeDebug.parseStack(this, this.depth)
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
    restore: <F extends (...args: Array<any>) => any>(f: F) => F
  ) => A
) => {
  if (!runtimeDebug.tracingEnabled) {
    return body(void 0, identity)
  }
  runtimeDebug.tracingEnabled = false
  try {
    const limit = Error.stackTraceLimit
    Error.stackTraceLimit = 3
    const source = sourceLocation(new Error())
    Error.stackTraceLimit = limit
    return body(source as SourceLocation, restore)
  } finally {
    runtimeDebug.tracingEnabled = true
  }
}

/**
 * @since 1.0.0
 */
export const methodWithTrace = <A extends (...args: Array<any>) => any>(
  body: ((
    trace: Trace,
    restore: <F extends (...args: Array<any>) => any>(f: F) => F
  ) => A)
): A => {
  // @ts-expect-error
  return (...args) => {
    if (!runtimeDebug.tracingEnabled) {
      return body(void 0, identity)(...args)
    }
    runtimeDebug.tracingEnabled = false
    try {
      const limit = Error.stackTraceLimit
      Error.stackTraceLimit = 2
      const error = sourceLocation(new Error())
      Error.stackTraceLimit = limit
      return body(error, restore)(...args)
    } finally {
      runtimeDebug.tracingEnabled = true
    }
  }
}

/**
 * @since 1.0.0
 */
export const pipeableWithTrace = <A extends (...args: Array<any>) => any>(
  body: ((
    trace: Trace,
    restore: <F extends (...args: Array<any>) => any>(f: F) => F
  ) => A)
): A => {
  // @ts-expect-error
  return (...args) => {
    if (!runtimeDebug.tracingEnabled) {
      const a = body(void 0, identity)
      return ((self: any) => untraced(() => a(...args)(self))) as any
    }
    runtimeDebug.tracingEnabled = false
    try {
      const limit = Error.stackTraceLimit
      Error.stackTraceLimit = 2
      const source = sourceLocation(new Error())
      Error.stackTraceLimit = limit
      const f = body(source, restore)
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
  body: ((
    trace: Trace,
    restore: <F extends (...args: Array<any>) => any>(f: F) => F
  ) => DF)
): DF & P => {
  // @ts-expect-error
  return (...args) => {
    if (!runtimeDebug.tracingEnabled) {
      const f = body(void 0, identity)
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
      const f = body(source, restore)
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
  body: (restore: <F extends (...args: Array<any>) => any>(f: F) => F) => A
) => {
  if (!runtimeDebug.tracingEnabled) {
    return body(identity)
  }
  runtimeDebug.tracingEnabled = false
  try {
    return body((f): any =>
      (...args: Array<any>) => {
        if (runtimeDebug.tracingEnabled) {
          return f(...args)
        }
        runtimeDebug.tracingEnabled = true
        try {
          return f(...args)
        } finally {
          runtimeDebug.tracingEnabled = false
        }
      }
    )
  } finally {
    runtimeDebug.tracingEnabled = true
  }
}

/**
 * @since 1.0.0
 */
export const getCallTrace = (): undefined => {
  return undefined
}

/**
 * @since 1.0.0
 * @category models
 */
export interface SourceLocation extends Error {
  depth: number
  parsed?: string | undefined

  toString(): string | undefined
}

/**
 * @since 1.0.0
 * @category models
 */
export type Trace = SourceLocation | undefined
