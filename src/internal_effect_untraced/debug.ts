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

const processEnv = typeof process !== "undefined" ? process.env : undefined

/** @internal */
export const runtimeDebug: Debug = {
  minumumLogLevel: processEnv && processEnv["EFFECT_LOG_LEVEL"] && levels.includes(processEnv["EFFECT_LOG_LEVEL"]) ?
    processEnv["EFFECT_LOG_LEVEL"] as Debug["minumumLogLevel"] :
    "Info",
  traceStackLimit: processEnv && processEnv["EFFECT_TRACING_STACK_LIMIT"] ?
    Number.parseInt(processEnv["EFFECT_TRACING_STACK_LIMIT"]) :
    5,
  tracingEnabled: processEnv && processEnv["EFFECT_TRACING_ENABLED"] &&
      processEnv["EFFECT_TRACING_ENABLED"] === "false" ?
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
          const name = blocks.length === 2 && !blocks[0].includes("<anonymous>") ? blocks[0] : undefined
          const file = blocks.length === 2 ? blocks[1] : blocks[0]
          const matchFrame = file?.match(/\(?(.*):(\d+):(\d+)/)
          if (matchFrame) {
            frames.push({
              name,
              fileName: matchFrame[1],
              line: Number.parseInt(matchFrame[2]),
              column: Number.parseInt(matchFrame[3])
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
