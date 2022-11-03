import type * as Effect from "@effect/io/Effect"
import type * as Schedule from "@effect/io/Schedule"
import type * as ScheduleDecision from "@effect/io/Schedule/Decision"

/** @internal */
const ScheduleSymbolKey = "@effect/io/Schedule"

/** @internal */
export const ScheduleTypeId: Schedule.ScheduleTypeId = Symbol.for(
  ScheduleSymbolKey
) as Schedule.ScheduleTypeId

/** @internal */
const variance = {
  _Env: (_: never) => _,
  _In: (_: unknown) => _,
  _Out: (_: never) => _
}

/** @internal */
export class ScheduleImpl<S, Env, In, Out> implements Schedule.Schedule<Env, In, Out> {
  [ScheduleTypeId] = variance

  constructor(
    readonly initial: S,
    readonly step: (
      now: number,
      input: In,
      state: S
    ) => Effect.Effect<Env, never, readonly [S, Out, ScheduleDecision.ScheduleDecision]>
  ) {}
}
