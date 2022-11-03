import type * as ScheduleDecision from "@effect/io/Schedule/Decision"
import type * as Interval from "@effect/io/Schedule/Interval"
import * as Intervals from "@effect/io/Schedule/Intervals"
import * as List from "@fp-ts/data/List"

/** @internal */
export const OP_CONTINUE = 0 as const

/** @internal */
export type OP_CONTINUE = typeof OP_CONTINUE

/** @internal */
export const OP_DONE = 1 as const

/** @internal */
export type OP_DONE = typeof OP_DONE

/** @internal */
const _continue = (intervals: Intervals.Intervals): ScheduleDecision.ScheduleDecision => {
  return {
    op: OP_CONTINUE,
    intervals
  }
}
export { _continue as continue }

/** @internal */
export const continueWith = (interval: Interval.Interval): ScheduleDecision.ScheduleDecision => {
  return {
    op: OP_CONTINUE,
    intervals: Intervals.make(List.of(interval))
  }
}

/** @internal */
export const done: ScheduleDecision.ScheduleDecision = {
  op: OP_DONE
}

/** @internal */
export const isContinue = (self: ScheduleDecision.ScheduleDecision): self is ScheduleDecision.Continue => {
  return self.op === OP_CONTINUE
}

/** @internal */
export const isDone = (self: ScheduleDecision.ScheduleDecision): self is ScheduleDecision.Done => {
  return self.op === OP_DONE
}
