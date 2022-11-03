/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal/schedule/decision"
import type * as Intervals from "@effect/io/Schedule/Intervals"

/**
 * @since 1.0.0
 * @category models
 */
export type ScheduleDecision = Continue | Done

/**
 * @since 1.0.0
 * @category models
 */
export interface Continue {
  readonly op: internal.OP_CONTINUE
  readonly intervals: Intervals.Intervals
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Done {
  readonly op: internal.OP_DONE
}

const _continue = internal.continue
export {
  /**
   * @since 1.0.0
   * @category constructors
   */
  _continue as continue
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const continueWith = internal.continueWith

/**
 * @since 1.0.0
 * @category constructors
 */
export const done = internal.done
