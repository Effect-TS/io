/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRefs from "@effect/io/FiberRefs"
import * as circular from "@effect/io/internal/layer/circular"
import * as internal from "@effect/io/internal/logger"
import type * as Layer from "@effect/io/Layer"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as LogSpan from "@effect/io/Logger/Span"
import type * as List from "@fp-ts/data/List"
import type * as Option from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 * @category symbols
 */
export const LoggerTypeId: unique symbol = internal.LoggerTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type LoggerTypeId = typeof LoggerTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Logger<Message, Output> extends Logger.Variance<Message, Output> {
  readonly log: (
    fiberId: FiberId.FiberId,
    logLevel: LogLevel.LogLevel,
    message: Message,
    cause: Cause.Cause<unknown>,
    context: FiberRefs.FiberRefs,
    spans: List.List<LogSpan.LogSpan>,
    annotations: ReadonlyMap<string, string>
  ) => Output
}

/**
 * @since 1.0.0
 */
export declare namespace Logger {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<Message, Output> {
    readonly [LoggerTypeId]: {
      readonly _Message: (_: Message) => void
      readonly _Output: (_: never) => Output
    }
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const consoleLogger: () => Logger<string, void> = internal.consoleLogger

/**
 * @since 1.0.0
 * @category constructors
 */
export const defaultLogger: Logger<string, string> = internal.defaultLogger

/**
 * @since 1.0.0
 * @category environment
 */
export const console: (minLevel?: LogLevel.LogLevel) => Layer.Layer<never, never, never> = circular.consoleLoggerLayer

/**
 * @since 1.0.0
 * @category mapping
 */
export const contramap: <Message, Message2>(
  f: (message: Message2) => Message
) => <Output>(self: Logger<Message, Output>) => Logger<Message2, Output> = internal.contramap

/**
 * Returns a version of this logger that only logs messages when the log level
 * satisfies the specified predicate.
 *
 * @since 1.0.0
 * @category filtering
 */
export const filterLogLevel: (
  f: (logLevel: LogLevel.LogLevel) => boolean
) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message, Option.Option<Output>> =
  internal.filterLogLevel

/**
 * @since 1.0.0
 * @category environment
 */
export const layer: <B>(logger: Logger<string, B>) => Layer.Layer<never, never, never> = circular.loggerLayer

/**
 * @since 1.0.0
 * @category mapping
 */
export const map: <Output, Output2>(
  f: (output: Output) => Output2
) => <Message>(self: Logger<Message, Output>) => Logger<Message, Output2> = internal.map

/**
 * A logger that does nothing in response to logging events.
 *
 * @since 1.0.0
 * @category constructors
 */
export const none: () => Logger<unknown, void> = internal.none

/**
 * @since 1.0.0
 * @category constructors
 */
export const simple: <A, B>(log: (a: A) => B) => Logger<A, B> = internal.simple

/**
 * @since 1.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Logger<unknown, A> = internal.succeed

/**
 * @since 1.0.0
 * @category constructors
 */
export const sync: <A>(evaluate: () => A) => Logger<unknown, A> = internal.sync

/**
 * @since 1.0.0
 * @category constructors
 */
export const test: <Message>(input: Message) => <Output>(self: Logger<Message, Output>) => Output = internal.test

/**
 * Combines this logger with the specified logger to produce a new logger that
 * logs to both this logger and that logger.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zip: <Message2, Output2>(
  that: Logger<Message2, Output2>
) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message2, readonly [Output, Output2]> =
  internal.zip

/**
 * @since 1.0.0
 * @category zipping
 */
export const zipLeft: <Message2, Output2>(
  that: Logger<Message2, Output2>
) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message2, Output> = internal.zipLeft

/**
 * @since 1.0.0
 * @category zipping
 */
export const zipRight: <Message2, Output2>(
  that: Logger<Message2, Output2>
) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message2, Output2> = internal.zipRight
