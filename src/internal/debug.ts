import type { Debug, Frame, Restore } from "../Debug"

/** @internal */
const levels = ["All", "Fatal", "Error", "Warning", "Info", "Debug", "Trace", "None"]

/** @internal */
export const restoreOn: Restore = (f): any =>
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

/** @internal */
export const restoreOff: Restore = (f): any =>
  (...args: Array<any>) => {
    if (!runtimeDebug.tracingEnabled) {
      return f(...args)
    }
    runtimeDebug.tracingEnabled = false
    try {
      return f(...args)
    } finally {
      runtimeDebug.tracingEnabled = true
    }
  }

/** @internal */
export const runtimeDebug: Debug = {
  minumumLogLevel:
    process && process.env && process.env["EFFECT_LOG_LEVEL"] && levels.includes(process.env["EFFECT_LOG_LEVEL"]) ?
      process.env["EFFECT_LOG_LEVEL"] as Debug["minumumLogLevel"] :
      "Info",
  traceExecutionLimit: process && process.env && process.env["EFFECT_TRACING_EXECUTION_LIMIT"] ?
    Number.parseInt(process.env["EFFECT_TRACING_EXECUTION_LIMIT"]) :
    1,
  traceStackLimit: process && process.env && process.env["EFFECT_TRACING_STACK_LIMIT"] ?
    Number.parseInt(process.env["EFFECT_TRACING_STACK_LIMIT"]) :
    5,
  tracingEnabled: process && process.env && process.env["EFFECT_TRACING_ENABLED"] &&
      process.env["EFFECT_TRACING_ENABLED"] === "false" ?
    false :
    true,
  parseStack: (error) => {
    const stack = error.stack
    if (stack) {
      const lines = stack.split("\n")
      let starts = 0
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.startsWith("Error")) {
          starts = i
        }
      }
      const frames: Array<Frame | undefined> = []
      for (let i = starts + 1; i < lines.length; i++) {
        const matchFrame = lines[i]?.match(/(file:\/\/)?\/(.*):(\d+):(\d+)/)
        if (matchFrame) {
          frames.push({
            fileName: `/${matchFrame[2]}`,
            line: Number.parseInt(matchFrame[3]),
            column: Number.parseInt(matchFrame[4])
          })
        } else {
          frames.push(undefined)
        }
      }
      return frames
    }
  },
  filterStackFrame: (_) => _ != null && !_.fileName.match(/\/src\/internal/)
}
