import * as Cause from "@effect/io/Cause"
import { runtimeDebug } from "@effect/io/Debug"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRef from "@effect/io/FiberRef"
import * as FiberRefs from "@effect/io/FiberRefs"
import * as core from "@effect/io/internal/core"
import type * as Layer from "@effect/io/Layer"
import type * as Logger from "@effect/io/Logger"
import * as LogLevel from "@effect/io/Logger/Level"
import * as LogSpan from "@effect/io/Logger/Span"
import { constVoid, pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/** @internal */
const LoggerSymbolKey = "@effect/io/Logger"

/** @internal */
export const LoggerTypeId: Logger.LoggerTypeId = Symbol.for(
  LoggerSymbolKey
) as Logger.LoggerTypeId

/** @internal */
const loggerVariance = {
  _Message: (_: unknown) => _,
  _Output: (_: never) => _
}

/** @internal */
export const currentLoggers: FiberRef.FiberRef<
  HashSet.HashSet<Logger.Logger<string, any>>
> = core.unsafeMakeHashSetFiberRef(HashSet.empty())

/** @internal */
export const defaultLogger: Logger.Logger<string, string> = {
  [LoggerTypeId]: loggerVariance,
  log: (fiberId, logLevel, message, cause, _context, spans, annotations) => {
    const now = new Date()
    const nowMillis = now.getTime()

    const outputArray = [
      `timestamp=${now.toISOString()}`,
      `level=${logLevel.label}`,
      `fiber=${FiberId.threadName(fiberId)}`
    ]

    if (message.length > 0) {
      outputArray.push(`message="${message}"`)
    }

    if (cause != null && cause != Cause.empty) {
      outputArray.push(`cause="${pipe(cause, Cause.pretty())}"`)
    }

    let output = outputArray.join(" ")

    if (List.isCons(spans)) {
      output = output + " "

      let first = true
      for (const span of spans) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = output + pipe(span, LogSpan.render(nowMillis))
      }
    }

    if (annotations.size > 0) {
      output = output + " "

      let first = true
      for (const [key, value] of annotations) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = appendQuoted(key, output)
        output = output + "="
        output = appendQuoted(value, output)
      }
    }

    return output
  }
}

/** @internal */
const appendQuoted = (label: string, output: string): string => {
  if (label.indexOf(" ") < 0) {
    return output + label
  } else {
    return output + `"${label}"`
  }
}

/** @internal */
export const consoleLogger = (): Logger.Logger<string, void> => {
  return pipe(
    defaultLogger,
    map((message) => globalThis.console.log(message))
  )
}

/** @internal */
export const console = (
  minLevel: LogLevel.LogLevel = LogLevel.Info
): Layer.Layer<never, never, Logger.Logger<string, void>> => {
  const newMin = runtimeDebug.logLevelOverride ?
    runtimeDebug.logLevelOverride :
    minLevel
  return layer(pipe(consoleLogger(), filterLogLevel(LogLevel.greaterThanEqual(newMin)), map(constVoid)))
}

// TODO(Max): after Layer
/** @internal */
export declare const layer: <B>(logger: Logger.Logger<string, B>) => Layer.Layer<never, never, Logger.Logger<string, B>>

/** @internal */
export function contramap<Message, Message2>(f: (message: Message2) => Message) {
  return <Output>(self: Logger.Logger<Message, Output>): Logger.Logger<Message2, Output> => ({
    [LoggerTypeId]: loggerVariance,
    log: (fiberId, logLevel, message, cause, context, spans, annotations) => {
      return self.log(fiberId, logLevel, f(message), cause, context, spans, annotations)
    }
  })
}

/** @internal */
export const filterLogLevel = (f: (logLevel: LogLevel.LogLevel) => boolean) => {
  return <Message, Output>(self: Logger.Logger<Message, Output>): Logger.Logger<Message, Option.Option<Output>> => ({
    [LoggerTypeId]: loggerVariance,
    log: (fiberId, logLevel, message, cause, context, spans, annotations) => {
      return f(logLevel)
        ? Option.some(
          self.log(
            fiberId,
            logLevel,
            message,
            cause,
            context,
            spans,
            annotations
          )
        )
        : Option.none
    }
  })
}

/** @internal */
export const map = <Output, Output2>(f: (output: Output) => Output2) => {
  return <Message>(self: Logger.Logger<Message, Output>): Logger.Logger<Message, Output2> => ({
    [LoggerTypeId]: loggerVariance,
    log: (fiberId, logLevel, message, cause, context, spans, annotations) => {
      return f(self.log(fiberId, logLevel, message, cause, context, spans, annotations))
    }
  })
}

/** @internal */
export const none = (): Logger.Logger<unknown, void> => ({
  [LoggerTypeId]: loggerVariance,
  log: constVoid
})

/** @internal */
export const simple = <A, B>(log: (a: A) => B): Logger.Logger<A, B> => ({
  [LoggerTypeId]: loggerVariance,
  log: (_fiberId, _logLevel, message, _cause, _context, _spans, _annotations) => {
    return log(message)
  }
})

/** @internal */
export const succeed = <A>(value: A): Logger.Logger<unknown, A> => {
  return simple(() => value)
}

/** @internal */
export const sync = <A>(evaluate: () => A): Logger.Logger<unknown, A> => {
  return simple(evaluate)
}

/** @internal */
export const test = <Message>(input: Message) => {
  return <Output>(self: Logger.Logger<Message, Output>): Output => {
    return self.log(
      FiberId.none,
      LogLevel.Info,
      input,
      Cause.empty,
      FiberRefs.unsafeMake(new Map()),
      List.empty(),
      new Map()
    )
  }
}

/** @internal */
export const zip = <Message2, Output2>(that: Logger.Logger<Message2, Output2>) => {
  return <Message, Output>(
    self: Logger.Logger<Message, Output>
  ): Logger.Logger<Message & Message2, readonly [Output, Output2]> => ({
    [LoggerTypeId]: loggerVariance,
    log: (fiberId, logLevel, message, cause, context, spans, annotations) =>
      [
        self.log(fiberId, logLevel, message, cause, context, spans, annotations),
        that.log(fiberId, logLevel, message, cause, context, spans, annotations)
      ] as const
  })
}

/** @internal */
export const zipLeft = <Message2, Output2>(that: Logger.Logger<Message2, Output2>) => {
  return <Message, Output>(
    self: Logger.Logger<Message, Output>
  ): Logger.Logger<Message & Message2, Output> => {
    return pipe(self, zip(that), map((tuple) => tuple[0]))
  }
}

/** @internal */
export const zipRight = <Message2, Output2>(that: Logger.Logger<Message2, Output2>) => {
  return <Message, Output>(
    self: Logger.Logger<Message, Output>
  ): Logger.Logger<Message & Message2, Output2> => {
    return pipe(self, zip(that), map((tuple) => tuple[1]))
  }
}
