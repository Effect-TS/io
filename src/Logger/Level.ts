/**
 * @since 1.0.0
 */
import type { Effect } from "@effect/io/Effect"
import * as FiberRef from "@effect/io/FiberRef"
import * as FiberRuntime from "@effect/io/internal/runtime"
import * as order from "@fp-ts/core/typeclass/Order"
import { pipe } from "@fp-ts/data/Function"
import * as number from "@fp-ts/data/Number"

/**
 * A `LogLevel` represents the log level associated with an individual logging
 * operation. Log levels are used both to describe the granularity (or
 * importance) of individual log statements, as well as to enable tuning
 * verbosity of log output.
 *
 * @since 1.0.0
 * @category model
 * @property ordinal - The priority of the log message. Larger values indicate higher priority.
 * @property label - A label associated with the log level.
 * @property syslog -The syslog severity level of the log level.
 */
export type LogLevel = All | Fatal | Error | Warning | Info | Debug | Trace | None

/**
 * @since 1.0.0
 * @category model
 */
export interface All {
  readonly _tag: "All"
  readonly label: "ALL"
  readonly syslog: 0
  readonly ordinal: number
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Fatal {
  readonly _tag: "Fatal"
  readonly label: "FATAL"
  readonly syslog: 2
  readonly ordinal: number
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Error {
  readonly _tag: "Error"
  readonly label: "ERROR"
  readonly syslog: 3
  readonly ordinal: number
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Warning {
  readonly _tag: "Warning"
  readonly label: "WARN"
  readonly syslog: 4
  readonly ordinal: number
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Info {
  readonly _tag: "Info"
  readonly label: "INFO"
  readonly syslog: 6
  readonly ordinal: number
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Debug {
  readonly _tag: "Debug"
  readonly label: "DEBUG"
  readonly syslog: 7
  readonly ordinal: number
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Trace {
  readonly _tag: "Trace"
  readonly label: "TRACE"
  readonly syslog: 7
  readonly ordinal: number
}

/**
 * @since 1.0.0
 * @category model
 */
export interface None {
  readonly _tag: "None"
  readonly label: "OFF"
  readonly syslog: 7
  readonly ordinal: number
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const All: LogLevel = {
  _tag: "All",
  syslog: 0,
  label: "ALL",
  ordinal: Number.MIN_SAFE_INTEGER
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const Fatal: LogLevel = {
  _tag: "Fatal",
  syslog: 2,
  label: "FATAL",
  ordinal: 50000
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const Error: LogLevel = {
  _tag: "Error",
  syslog: 3,
  label: "ERROR",
  ordinal: 40000
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const Warning: LogLevel = {
  _tag: "Warning",
  syslog: 4,
  label: "WARN",
  ordinal: 30000
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const Info: LogLevel = {
  _tag: "Info",
  syslog: 6,
  label: "INFO",
  ordinal: 20000
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const Debug: LogLevel = {
  _tag: "Debug",
  syslog: 7,
  label: "DEBUG",
  ordinal: 10000
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const Trace: LogLevel = {
  _tag: "Trace",
  syslog: 7,
  label: "TRACE",
  ordinal: 0
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const None: LogLevel = {
  _tag: "None",
  syslog: 7,
  label: "OFF",
  ordinal: Number.MAX_SAFE_INTEGER
}

/**
 * Locally applies the specified `LogLevel` to an `Effect` workflow, reverting
 * to the previous `LogLevel` after the `Effect` workflow completes.
 *
 * @since 1.0.0
 * @category mutations
 */
export const locally = (self: LogLevel): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> => {
  return FiberRef.locally(self)(FiberRuntime.currentLogLevel)
}

/**
 * @since 1.0.0
 * @category instances
 */
export const Order = pipe(
  number.Order,
  order.contramap((level: LogLevel) => level.ordinal)
)

/**
 * @since 1.0.0
 * @category ordering
 */
export const lessThan = order.lessThan(
  Order
)

/**
 * @since 1.0.0
 * @category ordering
 */
export const lessThanEqual = order.lessThanOrEqualTo(Order)

/**
 * @since 1.0.0
 * @category ordering
 */
export const greaterThan = order.greaterThan(Order)

/**
 * @since 1.0.0
 * @category ordering
 */
export const greaterThanEqual = order.greaterThanOrEqualTo(Order)
