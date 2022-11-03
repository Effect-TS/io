import type * as Schedule from "@effect/io/Schedule"

/** @internal */
const ScheduleSymbolKey = "@effect/io/Schedule"

/** @internal */
export const ScheduleTypeId: Schedule.ScheduleTypeId = Symbol.for(
  ScheduleSymbolKey
) as Schedule.ScheduleTypeId
