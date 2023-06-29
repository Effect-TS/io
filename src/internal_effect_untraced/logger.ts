import * as Debug from "@effect/data/Debug"
import type { LazyArg } from "@effect/data/Function"
import { constVoid, dual } from "@effect/data/Function"
import type * as HashMap from "@effect/data/HashMap"
import type * as List from "@effect/data/List"
import * as Option from "@effect/data/Option"
import type * as CauseExt from "@effect/io/Cause"
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRefs from "@effect/io/FiberRefs"
import type * as Logger from "@effect/io/Logger"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as LogSpan from "@effect/io/Logger/Span"

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
export const makeLogger = <Message, Output>(
  log: (
    fiberId: FiberId.FiberId,
    logLevel: LogLevel.LogLevel,
    message: Message,
    cause: CauseExt.Cause<unknown>,
    context: FiberRefs.FiberRefs,
    spans: List.List<LogSpan.LogSpan>,
    annotations: HashMap.HashMap<string, string>
  ) => Output
): Logger.Logger<Message, Output> => ({
  [LoggerTypeId]: loggerVariance,
  log
})

/** @internal */
export const contramap = Debug.untracedDual<
  <Message, Message2>(
    f: (message: Message2) => Message
  ) => <Output>(self: Logger.Logger<Message, Output>) => Logger.Logger<Message2, Output>,
  <Output, Message, Message2>(
    self: Logger.Logger<Message, Output>,
    f: (message: Message2) => Message
  ) => Logger.Logger<Message2, Output>
>(2, (restore) =>
  (self, f) =>
    makeLogger(
      (fiberId, logLevel, message, cause, context, spans, annotations) =>
        self.log(fiberId, logLevel, restore(f)(message), cause, context, spans, annotations)
    ))

/** @internal */
export const filterLogLevel = Debug.untracedDual<
  (
    f: (logLevel: LogLevel.LogLevel) => boolean
  ) => <Message, Output>(self: Logger.Logger<Message, Output>) => Logger.Logger<Message, Option.Option<Output>>,
  <Message, Output>(
    self: Logger.Logger<Message, Output>,
    f: (logLevel: LogLevel.LogLevel) => boolean
  ) => Logger.Logger<Message, Option.Option<Output>>
>(2, (restore) =>
  (self, f) =>
    makeLogger(
      (fiberId, logLevel, message, cause, context, spans, annotations) =>
        restore(f)(logLevel)
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
          : Option.none()
    ))

/** @internal */
export const map = Debug.untracedDual<
  <Output, Output2>(
    f: (output: Output) => Output2
  ) => <Message>(self: Logger.Logger<Message, Output>) => Logger.Logger<Message, Output2>,
  <Message, Output, Output2>(
    self: Logger.Logger<Message, Output>,
    f: (output: Output) => Output2
  ) => Logger.Logger<Message, Output2>
>(2, (restore) =>
  (self, f) =>
    makeLogger(
      (fiberId, logLevel, message, cause, context, spans, annotations) =>
        restore(f)(self.log(fiberId, logLevel, message, cause, context, spans, annotations))
    ))

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
export const sync = <A>(evaluate: LazyArg<A>): Logger.Logger<unknown, A> => {
  return simple(evaluate)
}

/** @internal */
export const zip = dual<
  <Message2, Output2>(
    that: Logger.Logger<Message2, Output2>
  ) => <Message, Output>(
    self: Logger.Logger<Message, Output>
  ) => Logger.Logger<Message & Message2, readonly [Output, Output2]>,
  <Message, Output, Message2, Output2>(
    self: Logger.Logger<Message, Output>,
    that: Logger.Logger<Message2, Output2>
  ) => Logger.Logger<Message & Message2, readonly [Output, Output2]>
>(2, (self, that) =>
  makeLogger((fiberId, logLevel, message, cause, context, spans, annotations) =>
    [
      self.log(fiberId, logLevel, message, cause, context, spans, annotations),
      that.log(fiberId, logLevel, message, cause, context, spans, annotations)
    ] as const
  ))

/** @internal */
export const zipLeft = dual<
  <Message2, Output2>(
    that: Logger.Logger<Message2, Output2>
  ) => <Message, Output>(
    self: Logger.Logger<Message, Output>
  ) => Logger.Logger<Message & Message2, Output>,
  <Message, Output, Message2, Output2>(
    self: Logger.Logger<Message, Output>,
    that: Logger.Logger<Message2, Output2>
  ) => Logger.Logger<Message & Message2, Output>
>(2, (self, that) => map(zip(self, that), (tuple) => tuple[0]))

/** @internal */
export const zipRight = dual<
  <Message2, Output2>(
    that: Logger.Logger<Message2, Output2>
  ) => <Message, Output>(
    self: Logger.Logger<Message, Output>
  ) => Logger.Logger<Message & Message2, Output2>,
  <Message, Output, Message2, Output2>(
    self: Logger.Logger<Message, Output>,
    that: Logger.Logger<Message2, Output2>
  ) => Logger.Logger<Message & Message2, Output2>
>(2, (self, that) => map(zip(self, that), (tuple) => tuple[1]))
