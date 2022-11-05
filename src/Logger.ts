/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRefs from "@effect/io/FiberRefs"
import * as circular from "@effect/io/internal/layer/circular"
import * as internal from "@effect/io/internal/logger"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as LogSpan from "@effect/io/Logger/Span"
import type * as List from "@fp-ts/data/List"

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
export const consoleLogger = internal.consoleLogger

/**
 * @since 1.0.0
 * @category constructors
 */
export const defaultLogger = internal.defaultLogger

/**
 * @since 1.0.0
 * @category environment
 */
export const console = circular.consoleLoggerLayer

/**
 * @since 1.0.0
 * @category mapping
 */
export const contramap = internal.contramap

/**
 * Returns a version of this logger that only logs messages when the log level
 * satisfies the specified predicate.
 *
 * @since 1.0.0
 * @category filtering
 */
export const filterLogLevel = internal.filterLogLevel

/**
 * @since 1.0.0
 * @category environment
 */
export const layer = circular.loggerLayer

/**
 * @since 1.0.0
 * @category mapping
 */
export const map = internal.map

/**
 * A logger that does nothing in response to logging events.
 *
 * @since 1.0.0
 * @category constructors
 */
export const none = internal.none

/**
 * @since 1.0.0
 * @category constructors
 */
export const simple = internal.simple

/**
 * @since 1.0.0
 * @category constructors
 */
export const succeed = internal.succeed

/**
 * @since 1.0.0
 * @category constructors
 */
export const sync = internal.sync

/**
 * @since 1.0.0
 * @category constructors
 */
export const test = internal.test

/**
 * Combines this logger with the specified logger to produce a new logger that
 * logs to both this logger and that logger.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zip = internal.zip

/**
 * @since 1.0.0
 * @category zipping
 */
export const zipLeft = internal.zipLeft

/**
 * @since 1.0.0
 * @category zipping
 */
export const zipRight = internal.zipRight
