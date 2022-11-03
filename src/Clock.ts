/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/clock"
import * as defaultServices from "@effect/io/internal/defaultServices"
import type * as Context from "@fp-ts/data/Context"
import type * as Duration from "@fp-ts/data/Duration"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ClockTypeId: unique symbol = internal.ClockTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ClockTypeId = typeof ClockTypeId

/**
 * Represents a time-based cloock which provides functionality related to time
 * and scheduling.
 *
 * @since 1.0.0
 * @category models
 */
export interface Clock {
  readonly [ClockTypeId]: ClockTypeId
  /**
   * Unsafely returns the current time in milliseconds.
   */
  unsafeCurrentTimeMillis(): number
  /**
   * Returns the current time in milliseconds.
   * @macro traced
   */
  currentTimeMillis(): Effect.Effect<never, never, number>
  /**
   * Returns the scheduler for the `Clock`.
   * @macro traced
   */
  scheduler(): Effect.Effect<never, never, ClockScheduler>
  /**
   * Asynchronously sleeps for the specified duration.
   * @macro traced
   */
  sleep(duration: Duration.Duration): Effect.Effect<never, never, void>
}

/**
 * @since 1.0.0
 * @category models
 */
export type CancelToken = () => boolean

/**
 * @since 1.0.0
 * @category models
 */
export type Task = () => void

/**
 * @since 1.0.0
 * @category models
 */
export interface ClockScheduler {
  /**
   * Unsafely schedules the specified task for the specified duration.
   */
  readonly unsafeSchedule: (task: Task, duration: Duration.Duration) => CancelToken
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const sleep = defaultServices.sleep

/**
 * @since 1.0.0
 * @category constructors
 */
export const currentTimeMillis = defaultServices.currentTimeMillis

/**
 * @since 1.0.0
 * @category constructors
 */
export const clockWith = defaultServices.clockWith

/**
 * @since 1.0.0
 * @category environment
 */
export const Tag: Context.Tag<Clock> = internal.clockTag
