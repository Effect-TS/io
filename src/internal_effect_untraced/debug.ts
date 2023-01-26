import type { Debug, Frame, Restore } from "../Debug"

/** @internal */
const levels = ["All", "Fatal", "Error", "Warning", "Info", "Debug", "Trace", "None"]

/** @internal */
export const restoreOn: Restore = (body): any =>
  function() {
    if (runtimeDebug.tracingEnabled) {
      // @ts-expect-error
      return body.apply(this, arguments)
    }
    runtimeDebug.tracingEnabled = true
    try {
      // @ts-expect-error
      return body.apply(this, arguments)
    } finally {
      runtimeDebug.tracingEnabled = false
    }
  }

/** @internal */
export const restoreOff: Restore = (body): any =>
  function() {
    if (!runtimeDebug.tracingEnabled) {
      // @ts-expect-error
      return body.apply(this, arguments)
    }
    runtimeDebug.tracingEnabled = false
    try {
      // @ts-expect-error
      return body.apply(this, arguments)
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
        if (lines[i].includes("at")) {
          const blocks = lines[i].split(" ").filter((i) => i.length > 0 && i !== "at")
          const name = blocks.length === 2 ? blocks[0] : undefined
          const file = blocks.length === 2 ? blocks[1] : blocks[0]
          const matchFrame = file?.match(/(file:\/\/)?\/(.*):(\d+):(\d+)/)
          if (matchFrame) {
            frames.push({
              name,
              fileName: `/${matchFrame[2]}`,
              line: Number.parseInt(matchFrame[3]),
              column: Number.parseInt(matchFrame[4])
            })
          } else {
            frames.push(undefined)
          }
        } else {
          frames.push(undefined)
        }
      }
      return frames
    }
    return []
  },
  filterStackFrame: (_) => _ != null && !_.fileName.match(/\/internal_effect_untraced/)
}
