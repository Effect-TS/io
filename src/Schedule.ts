/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/schedule"
import type * as ScheduleDecision from "@effect/io/Schedule/Decision"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ScheduleTypeId: unique symbol = internal.ScheduleTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ScheduleTypeId = typeof ScheduleTypeId

/**
 * A `Schedule<Env, In, Out>` defines a recurring schedule, which consumes
 * values of type `In`, and which returns values of type `Out`.
 *
 * Schedules are defined as a possibly infinite set of intervals spread out over
 * time. Each interval defines a window in which recurrence is possible.
 *
 * When schedules are used to repeat or retry effects, the starting boundary of
 * each interval produced by a schedule is used as the moment when the effect
 * will be executed again.
 *
 * Schedules compose in the following primary ways:
 *
 * - Union: performs the union of the intervals of two schedules
 * - Intersection: performs the intersection of the intervals of two schedules
 * - Sequence: concatenates the intervals of one schedule onto another
 *
 * In addition, schedule inputs and outputs can be transformed, filtered (to
 * terminate a schedule early in response to some input or output), and so
 * forth.
 *
 * A variety of other operators exist for transforming and combining schedules,
 * and the companion object for `Schedule` contains all common types of
 * schedules, both for performing retrying, as well as performing repetition.
 *
 * @tsplus type effect/core/io/Schedule
 * @category model
 * @since 1.0.0
 */
export interface Schedule<Env, In, Out> extends Schedule.Variance<Env, In, Out> {
  /** @internal */
  readonly initial: unknown
  /** @internal */
  readonly step: (
    now: number,
    input: In,
    state: unknown
  ) => Effect.Effect<Env, never, readonly [unknown, Out, ScheduleDecision.ScheduleDecision]>
}

/**
 * @since 1.0.0
 */
export declare namespace Schedule {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<Env, In, Out> {
    readonly [ScheduleTypeId]: {
      _Env: (_: never) => Env
      _In: (_: In) => void
      _Out: (_: never) => Out
    }
  }
}
