/**
 * @since 1.0.0
 */
import { runtimeDebug } from "@effect/io/Debug"

/** @internal */
const stack: Array<string> = []
/** @internal */
const cleanup = <A>(x: A) => {
  stack.pop()
  return x
}
/** @internal */
const identity = <A>(x: A) => {
  return x
}
/** @internal */
const orUndefined = (trace: string | undefined) => {
  if (trace && runtimeDebug.traceFilter(trace)) {
    return trace
  }
  return undefined
}

/**
 * @since 1.0.0
 */
export const withCallTrace = (trace: string) => {
  if (runtimeDebug.traceEnabled && !runtimeDebug.traceExtractor) {
    stack.push(trace)
    return cleanup
  }
  return identity
}

/**
 * @since 1.0.0
 */
export const getCallTrace = () => {
  if (!runtimeDebug.traceEnabled) {
    return
  }
  if (runtimeDebug.traceExtractor) {
    return orUndefined(runtimeDebug.traceExtractor(4))
  }
  return orUndefined(stack[stack.length - 1])
}
