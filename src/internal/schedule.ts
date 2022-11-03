import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import type * as Schedule from "@effect/io/Schedule"
import * as ScheduleDecision from "@effect/io/Schedule/Decision"
import * as Intervals from "@effect/io/Schedule/Intervals"
import { pipe } from "@fp-ts/data/Function"

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
class ScheduleImpl<S, Env, In, Out> implements Schedule.Schedule<Env, In, Out> {
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

/** @internal */
export const makeWithState = <S, Env, In, Out>(
  initial: S,
  step: (
    now: number,
    input: In,
    state: S
  ) => Effect.Effect<Env, never, readonly [S, Out, ScheduleDecision.ScheduleDecision]>
): Schedule.Schedule<Env, In, Out> => {
  return new ScheduleImpl(initial, step)
}

/** @internal */
export const intersectWith = <Env2, In2, Out2>(
  that: Schedule.Schedule<Env2, In2, Out2>,
  f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
) => {
  return <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<
    Env | Env2,
    In & In2,
    readonly [Out, Out2]
  > =>
    makeWithState([self.initial, that.initial] as const, (now, input: In & In2, state) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, input, state[0]),
        core.zipWith(
          that.step(now, input, state[1]),
          (a, b) => [a, b] as const
        ),
        core.flatMap(([
          [lState, out, lDecision],
          [rState, out2, rDecision]
        ]) => {
          if (ScheduleDecision.isContinue(lDecision) && ScheduleDecision.isContinue(rDecision)) {
            return intersectWithLoop(
              self,
              that,
              input,
              lState,
              out,
              lDecision.intervals,
              rState,
              out2,
              rDecision.intervals,
              f
            )
          }
          return core.succeed(
            [
              [lState, rState] as const,
              [out, out2] as const,
              ScheduleDecision.done
            ] as const
          )
        })
      ).traced(trace)
    })
}

function intersectWithLoop<State, State1, Env, In, Out, Env1, In1, Out2>(
  self: Schedule.Schedule<Env, In, Out>,
  that: Schedule.Schedule<Env1, In1, Out2>,
  input: In & In1,
  lState: State,
  out: Out,
  lInterval: Intervals.Intervals,
  rState: State1,
  out2: Out2,
  rInterval: Intervals.Intervals,
  f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
): Effect.Effect<
  Env | Env1,
  never,
  readonly [readonly [State, State1], readonly [Out, Out2], ScheduleDecision.ScheduleDecision]
> {
  const combined = f(lInterval, rInterval)
  if (Intervals.isNonEmpty(combined)) {
    return core.succeed([
      [lState, rState],
      [out, out2],
      ScheduleDecision.continue(combined)
    ])
  }

  if (pipe(lInterval, Intervals.lessThan(rInterval))) {
    return pipe(
      self.step(Intervals.end(lInterval), input, lState),
      core.flatMap(([lState, out, decision]) => {
        if (ScheduleDecision.isDone(decision)) {
          return core.succeed([
            [lState, rState],
            [out, out2],
            ScheduleDecision.done
          ])
        }
        return intersectWithLoop(
          self,
          that,
          input,
          lState,
          out,
          decision.intervals,
          rState,
          out2,
          rInterval,
          f
        )
      })
    )
  }
  return pipe(
    that.step(Intervals.end(rInterval), input, rState),
    core.flatMap(([rState, out2, decision]) => {
      if (ScheduleDecision.isDone(decision)) {
        return core.succeed([
          [lState, rState],
          [out, out2],
          ScheduleDecision.done
        ])
      }
      return intersectWithLoop(
        self,
        that,
        input,
        lState,
        out,
        lInterval,
        rState,
        out2,
        decision.intervals,
        f
      )
    })
  )
}
