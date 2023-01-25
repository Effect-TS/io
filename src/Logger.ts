/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type { Effect } from "@effect/io/Effect"
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRefs from "@effect/io/FiberRefs"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as circular from "@effect/io/internal/layer/circular"
import * as internal from "@effect/io/internal/logger"
import * as internalCircular from "@effect/io/internal/logger-circular"
import type * as Layer from "@effect/io/Layer"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as LogSpan from "@effect/io/Logger/Span"
import type { Runtime } from "@effect/io/Runtime"
import type * as Chunk from "@fp-ts/data/Chunk"
import type { LazyArg } from "@fp-ts/data/Function"
import type * as HashMap from "@fp-ts/data/HashMap"
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
    spans: Chunk.Chunk<LogSpan.LogSpan>,
    annotations: HashMap.HashMap<string, string>,
    runtime: Runtime<never>
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
 * @category context
 */
export const add: <B>(logger: Logger<string, B>) => Layer.Layer<never, never, never> = circular.addLogger

/**
 * @since 1.0.0
 * @category context
 */
export const replace: <A, B>(logger: Logger<string, A>, that: Logger<string, B>) => Layer.Layer<never, never, never> =
  circular.replaceLogger

/**
 * @since 1.0.0
 * @category mapping
 */
export const contramap: <Message, Message2>(
  f: (message: Message2) => Message
) => <Output>(self: Logger<Message, Output>) => Logger<Message2, Output> = internal.contramap

/**
 * @since 1.0.0
 * @category context
 */
export const remove: <A>(logger: Logger<string, A>) => Layer.Layer<never, never, never> = circular.removeLogger

/**
 * @since 1.0.0
 * @category constructors
 */
export const defaultLogger: Logger<string, void> = fiberRuntime.defaultLogger

/**
 * @since 1.0.0
 * @category constructors
 */
export const logFmt: Layer.Layer<never, never, never> = replace(fiberRuntime.defaultLogger, fiberRuntime.logFmtLogger)

/**
 * @since 1.0.0
 * @category context
 */
export const minimumLogLevel: (level: LogLevel.LogLevel) => Layer.Layer<never, never, never> = circular.minimumLogLevel

/**
 * @since 1.0.0
 * @category context
 */
export const withMinimumLogLevel: {
  <R, E, A>(self: Effect<R, E, A>, level: LogLevel.LogLevel): Effect<R, E, A>
  (level: LogLevel.LogLevel): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
} = circular.withMinimumLogLevel

/**
 * @since 1.0.0
 * @category constructors
 */
export const stringLogger: Logger<string, string> = internal.stringLogger

/**
 * @since 1.0.0
 * @category constructors
 */
export const logfmtLogger: Logger<string, string> = internal.logfmtLogger

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
 * @category constructors
 * @since 1.0.0
 */
export const make: <Message, Output>(
  log: (
    fiberId: FiberId.FiberId,
    logLevel: LogLevel.LogLevel,
    message: Message,
    cause: Cause.Cause<unknown>,
    context: FiberRefs.FiberRefs,
    spans: Chunk.Chunk<LogSpan.LogSpan>,
    annotations: HashMap.HashMap<string, string>,
    runtime: Runtime<never>
  ) => Output
) => Logger<Message, Output> = internal.makeLogger

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
export const none: (_: void) => Logger<unknown, void> = internal.none

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
export const sync: <A>(evaluate: LazyArg<A>) => Logger<unknown, A> = internal.sync

/**
 * @since 1.0.0
 * @category constructors
 */
export const test: <Message>(input: Message) => <Output>(self: Logger<Message, Output>) => Output =
  internalCircular.test

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
