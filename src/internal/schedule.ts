import * as Cause from "@effect/io/Cause"
import * as Clock from "@effect/io/Clock"
import { getCallTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as Random from "@effect/io/Random"
import * as Ref from "@effect/io/Ref"
import type * as Schedule from "@effect/io/Schedule"
import * as ScheduleDecision from "@effect/io/Schedule/Decision"
import * as Interval from "@effect/io/Schedule/Interval"
import * as Intervals from "@effect/io/Schedule/Intervals"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import { constVoid, pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

/** @internal */
const ScheduleSymbolKey = "@effect/io/Schedule"

/** @internal */
export const ScheduleTypeId: Schedule.ScheduleTypeId = Symbol.for(
  ScheduleSymbolKey
) as Schedule.ScheduleTypeId

/** @internal */
const ScheduleDriverSymbolKey = "@effect/io/Schedule/Driver"

/** @internal */
export const ScheduleDriverTypeId: Schedule.ScheduleDriverTypeId = Symbol.for(
  ScheduleDriverSymbolKey
) as Schedule.ScheduleDriverTypeId

/** @internal */
const scheduleVariance = {
  _Env: (_: never) => _,
  _In: (_: unknown) => _,
  _Out: (_: never) => _
}

const scheduleDriverVariance = {
  _Env: (_: never) => _,
  _In: (_: unknown) => _,
  _Out: (_: never) => _
}

/** @internal */
class ScheduleImpl<S, Env, In, Out> implements Schedule.Schedule<Env, In, Out> {
  [ScheduleTypeId] = scheduleVariance
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
class ScheduleDriverImpl<Env, In, Out> implements Schedule.ScheduleDriver<Env, In, Out> {
  [ScheduleDriverTypeId] = scheduleDriverVariance

  constructor(
    readonly schedule: Schedule.Schedule<Env, In, Out>,
    readonly ref: Ref.Ref<readonly [Option.Option<Out>, any]>
  ) {}

  state(): Effect.Effect<never, never, unknown> {
    const trace = getCallTrace()
    return pipe(Ref.get(this.ref), core.map((tuple) => tuple[1])).traced(trace)
  }

  last(): Effect.Effect<never, Cause.NoSuchElementException, Out> {
    const trace = getCallTrace()
    return pipe(
      Ref.get(this.ref),
      core.flatMap(([element, _]) => {
        switch (element._tag) {
          case "None": {
            return core.failSync(() => new Cause.NoSuchElementException())
          }
          case "Some": {
            return core.succeed(element.value)
          }
        }
      })
    ).traced(trace)
  }

  reset(): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return pipe(
      this.ref,
      Ref.set([Option.none as Option.Option<Out>, this.schedule.initial] as const)
    ).traced(trace)
  }

  next(input: In): Effect.Effect<Env, Option.Option<never>, Out> {
    const trace = getCallTrace()
    return pipe(
      Ref.get(this.ref),
      core.map((tuple) => tuple[1]),
      core.flatMap((state) =>
        pipe(
          Clock.currentTimeMillis(),
          core.flatMap((now) =>
            pipe(
              this.schedule.step(now, input, state),
              core.flatMap(([state, out, decision]) =>
                ScheduleDecision.isDone(decision) ?
                  pipe(
                    this.ref,
                    Ref.set([Option.some(out), state] as const),
                    core.zipRight(core.fail(Option.none))
                  ) :
                  pipe(
                    this.ref,
                    Ref.set([Option.some(out), state] as const),
                    core.zipRight(effect.sleep(Duration.millis(Intervals.start(decision.intervals) - now))),
                    core.as(out)
                  )
              )
            )
          )
        )
      )
    ).traced(trace)
  }
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
export const addDelay = <Out>(f: (out: Out) => Duration.Duration) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out> => {
    return pipe(self, addDelayEffect((out) => core.sync(() => f(out))))
  }
}

/** @internal */
export const addDelayEffect = <Out, Env2>(
  f: (out: Out) => Effect.Effect<Env2, never, Duration.Duration>
) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env | Env2, In, Out> => {
    return pipe(
      self,
      modifyDelayEffect((out, duration) =>
        pipe(
          f(out),
          core.map((delay) => Duration.millis(duration.millis + delay.millis))
        )
      )
    )
  }
}

/** @internal */
export const andThen = <Env1, In1, Out2>(that: Schedule.Schedule<Env1, In1, Out2>) => {
  return <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<
    Env | Env1,
    In & In1,
    Out | Out2
  > => {
    return pipe(self, andThenEither(that), map(Either.toUnion))
  }
}

/** @internal */
export const andThenEither = <Env2, In2, Out2>(that: Schedule.Schedule<Env2, In2, Out2>) => {
  return <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<
    Env | Env2,
    In & In2,
    Either.Either<Out, Out2>
  > => {
    return makeWithState(
      [self.initial, that.initial, true as boolean] as const,
      (now, input, state) => {
        const trace = getCallTrace()
        return state[2] ?
          pipe(
            self.step(now, input, state[0]),
            core.flatMap(([lState, out, decision]) => {
              if (ScheduleDecision.isDone(decision)) {
                return pipe(
                  that.step(now, input, state[1]),
                  core.map(([rState, out, decision]) =>
                    [
                      [lState, rState, false as boolean] as const,
                      Either.right(out) as Either.Either<Out, Out2>,
                      decision as ScheduleDecision.ScheduleDecision
                    ] as const
                  )
                )
              }
              return core.succeed(
                [
                  [lState, state[1], true as boolean] as const,
                  Either.left(out),
                  decision
                ] as const
              )
            })
          ).traced(trace) :
          pipe(
            that.step(now, input, state[1]),
            core.map(([rState, out, decision]) =>
              [
                [state[0], rState, false as boolean] as const,
                Either.right(out) as Either.Either<Out, Out2>,
                decision
              ] as const
            )
          ).traced(trace)
      }
    )
  }
}

/** @internal */
export const as = <Out2>(out2: Out2) => {
  return <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out2> => {
    return pipe(self, map(() => out2))
  }
}

/** @internal */
export const asUnit = <Env, In, Out>(
  self: Schedule.Schedule<Env, In, Out>
): Schedule.Schedule<Env, In, void> => {
  return pipe(self, map(constVoid))
}

/** @internal */
export const bothInOut = <Env2, In2, Out2>(that: Schedule.Schedule<Env2, In2, Out2>) => {
  return <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<
    Env | Env2,
    readonly [In, In2],
    readonly [Out, Out2]
  > => {
    return makeWithState([self.initial, that.initial] as const, (now, [in1, in2], state) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, in1, state[0]),
        core.zipWith(
          that.step(now, in2, state[1]),
          ([lState, out, lDecision], [rState, out2, rDecision]) => {
            if (ScheduleDecision.isContinue(lDecision) && ScheduleDecision.isContinue(rDecision)) {
              const interval = pipe(lDecision.intervals, Intervals.union(rDecision.intervals))
              return [
                [lState, rState] as const,
                [out, out2] as const,
                ScheduleDecision.continue(interval)
              ] as const
            }
            return [[lState, rState] as const, [out, out2] as const, ScheduleDecision.done] as const
          }
        )
      ).traced(trace)
    })
  }
}

/** @internal */
export const check = <In, Out>(test: (input: In, output: Out) => boolean) => {
  return <Env>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out> => {
    return pipe(self, checkEffect((input, out) => Effect.sync(() => test(input, out))))
  }
}

/** @internal */
export const checkEffect = <In, Out, Env2>(
  test: (input: In, output: Out) => Effect.Effect<Env2, never, boolean>
) => {
  return <Env>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env | Env2, In, Out> => {
    return makeWithState(self.initial, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, input, state),
        core.flatMap(([state, out, decision]) => {
          if (ScheduleDecision.isDone(decision)) {
            return Effect.succeed([state, out, ScheduleDecision.done] as const)
          }
          return pipe(
            test(input, out),
            core.map((cont) =>
              cont ?
                [state, out, decision] as const :
                [state, out, ScheduleDecision.done] as const
            )
          )
        })
      ).traced(trace)
    })
  }
}

/** @internal */
export const choose = <Env2, In2, Out2>(that: Schedule.Schedule<Env2, In2, Out2>) => {
  return <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<
    Env | Env2,
    Either.Either<In, In2>,
    Either.Either<Out, Out2>
  > =>
    makeWithState(
      [self.initial, that.initial] as const,
      (now, either, state): Effect.Effect<
        Env | Env2,
        never,
        readonly [readonly [any, any], Either.Either<Out, Out2>, ScheduleDecision.ScheduleDecision]
      > => {
        const trace = getCallTrace()
        switch (either._tag) {
          case "Left": {
            return pipe(
              self.step(now, either.left, state[0]),
              core.map(([lState, out, decision]) => [[lState, state[1]] as const, Either.left(out), decision] as const)
            ).traced(trace)
          }
          case "Right": {
            return pipe(
              that.step(now, either.right, that.initial),
              core.map(([rState, out2, decision]) =>
                [[state[0], rState] as const, Either.right(out2), decision] as const
              )
            ).traced(trace)
          }
        }
      }
    )
}

/** @internal */
export const chooseMerge = <Env2, In2, Out2>(that: Schedule.Schedule<Env2, In2, Out2>) => {
  return <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env2, Either.Either<In, In2>, Out | Out2> => {
    return pipe(self, choose(that), map(Either.toUnion))
  }
}

/** @internal */
export const collectAllInputs = <A>(): Schedule.Schedule<never, A, Chunk.Chunk<A>> => {
  return collectAllOutputs(identity<A>())
}

/** @internal */
export const collectAllOutputs = <Env, In, Out>(
  self: Schedule.Schedule<Env, In, Out>
): Schedule.Schedule<Env, In, Chunk.Chunk<Out>> => {
  return pipe(self, fold(Chunk.empty as Chunk.Chunk<Out>, (outs, out) => pipe(outs, Chunk.append(out))))
}

/** @internal */
export const collectUntil = <A>(f: Predicate<A>): Schedule.Schedule<never, A, Chunk.Chunk<A>> => {
  return collectAllOutputs(recurUntil(f))
}

/** @internal */
export const collectUntilEffect = <Env, A>(
  f: (a: A) => Effect.Effect<Env, never, boolean>
): Schedule.Schedule<Env, A, Chunk.Chunk<A>> => {
  return collectAllOutputs(recurUntilEffect(f))
}

/** @internal */
export const collectWhile = <A>(f: Predicate<A>): Schedule.Schedule<never, A, Chunk.Chunk<A>> => {
  return collectAllOutputs(recurWhile(f))
}

/** @internal */
export const collectWhileEffect = <Env, A>(
  f: (a: A) => Effect.Effect<Env, never, boolean>
): Schedule.Schedule<Env, A, Chunk.Chunk<A>> => {
  return collectAllOutputs(recurWhileEffect(f))
}

/** @internal */
export const compose = <Env1, Out, Out2>(that: Schedule.Schedule<Env1, Out, Out2>) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env | Env1, In, Out2> => {
    return makeWithState([self.initial, that.initial] as const, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, input, state[0]),
        core.flatMap(([lState, out, lDecision]) =>
          pipe(
            that.step(now, out, state[1]),
            core.map(([rState, out2, rDecision]) =>
              ScheduleDecision.isDone(lDecision)
                ? [[lState, rState] as const, out2, ScheduleDecision.done] as const
                : ScheduleDecision.isDone(rDecision)
                ? [[lState, rState] as const, out2, ScheduleDecision.done] as const
                : [
                  [lState, rState] as const,
                  out2,
                  ScheduleDecision.continue(pipe(lDecision.intervals, Intervals.max(rDecision.intervals)))
                ] as const
            )
          )
        )
      ).traced(trace)
    })
  }
}

/** @internal */
export const contramap = <In, In2>(f: (in2: In2) => In) => {
  return <Env, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In2, Out> => {
    return pipe(self, contramapEffect((input2) => core.sync(() => f(input2))))
  }
}

/** @internal */
export const contramapEffect = <In, Env1, In2>(f: (in2: In2) => Effect.Effect<Env1, never, In>) => {
  return <Env, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env | Env1, In2, Out> => {
    return makeWithState(self.initial, (now, input2, state) => {
      const trace = getCallTrace()
      return pipe(f(input2), core.flatMap((input) => self.step(now, input, state))).traced(trace)
    })
  }
}

/** @internal */
export const count = (): Schedule.Schedule<never, unknown, number> => {
  return unfold(0, (n) => n + 1)
}

/** @internal */
export const dayOfMonth = (day: number): Schedule.Schedule<never, unknown, number> => {
  return makeWithState(
    [Number.NEGATIVE_INFINITY, 0] as readonly [number, number],
    (now, _, state) => {
      const trace = getCallTrace()
      if (!Number.isInteger(day) || day < 1 || 31 < day) {
        return Effect.dieSync(() =>
          new Cause.IllegalArgumentException(
            `Invalid argument in: dayOfMonth(${day}). Must be in range 1...31`
          )
        ).traced(trace)
      }
      const [end0, n] = state
      const now0 = Math.max(end0, now)
      const day0 = nextDayOfMonth(now0, day)
      const start = Math.max(beginningOfDay(day0), now0)
      const end = endOfDay(day0)
      const interval = Interval.make(start, end)
      return core.succeed(
        [
          [end, n + 1] as const,
          n,
          ScheduleDecision.continueWith(interval)
        ] as const
      ).traced(trace)
    }
  )
}

/** @internal */
export const dayOfWeek = (day: number): Schedule.Schedule<never, unknown, number> => {
  return makeWithState(
    [Number.MIN_SAFE_INTEGER, 0] as readonly [number, number],
    (now, _, state) => {
      const trace = getCallTrace()
      if (!Number.isInteger(day) || day < 1 || 7 < day) {
        return Effect.dieSync(() =>
          new Cause.IllegalArgumentException(
            `Invalid argument in: dayOfWeek(${day}). Must be in range 1 (Monday)...7 (Sunday)`
          )
        ).traced(trace)
      }
      const [end0, n] = state
      const now0 = Math.max(end0, now)
      const day0 = nextDay(now0, day)
      const start = Math.max(beginningOfDay(day0), now0)
      const end = endOfDay(day0)
      const interval = Interval.make(start, end)
      return core.succeed(
        [
          [end, n + 1] as const,
          n,
          ScheduleDecision.continueWith(interval)
        ] as const
      ).traced(trace)
    }
  )
}

/** @internal */
export const delayed = (f: (duration: Duration.Duration) => Duration.Duration) => {
  return <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out> => {
    return pipe(self, delayedEffect((duration) => core.sync(() => f(duration))))
  }
}

/** @internal */
export const delayedEffect = <Env2>(
  f: (duration: Duration.Duration) => Effect.Effect<Env2, never, Duration.Duration>
) => {
  return <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env2, In, Out> => {
    return pipe(self, modifyDelayEffect((_, delay) => f(delay)))
  }
}

/** @internal */
export const delayedSchedule = <Env, In>(
  schedule: Schedule.Schedule<Env, In, Duration.Duration>
): Schedule.Schedule<Env, In, Duration.Duration> => {
  return pipe(schedule, addDelay((x) => x))
}

/** @internal */
export const delays = <Env, In, Out>(
  self: Schedule.Schedule<Env, In, Out>
): Schedule.Schedule<Env, In, Duration.Duration> => {
  return makeWithState(self.initial, (now, input, state) => {
    return pipe(
      self.step(now, input, state),
      core.flatMap((
        [state, _, decision]
      ): Effect.Effect<never, never, readonly [any, Duration.Duration, ScheduleDecision.ScheduleDecision]> => {
        if (ScheduleDecision.isDone(decision)) {
          return core.succeed([state, Duration.zero, decision] as const)
        }
        return core.succeed(
          [
            state,
            Duration.millis(Intervals.start(decision.intervals) - now),
            decision
          ] as const
        )
      })
    )
  })
}

/** @internal */
export function dimap<In, Out, In2, Out2>(f: (in2: In2) => In, g: (out: Out) => Out2) {
  return <Env>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In2, Out2> => {
    return pipe(self, contramap(f), map(g))
  }
}

/** @internal */
export const dimapEffect = <In2, Env2, In, Out, Env3, Out2>(
  f: (input: In2) => Effect.Effect<Env2, never, In>,
  g: (out: Out) => Effect.Effect<Env3, never, Out2>
) => {
  return <Env>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env2 | Env3, In2, Out2> => {
    return pipe(self, contramapEffect(f), mapEffect(g))
  }
}

/** @internal */
export const driver = <Env, In, Out>(
  self: Schedule.Schedule<Env, In, Out>
): Effect.Effect<never, never, Schedule.ScheduleDriver<Env, In, Out>> => {
  const trace = getCallTrace()
  return pipe(
    Ref.make<readonly [Option.Option<Out>, any]>([Option.none, self.initial]),
    core.map((ref) => new ScheduleDriverImpl(self, ref))
  ).traced(trace)
}

/** @internal */
export const duration = (
  duration: Duration.Duration
): Schedule.Schedule<never, unknown, Duration.Duration> => {
  return makeWithState(true as boolean, (now, _, state) => {
    const trace = getCallTrace()
    return core.succeed(
      state
        ? [false, duration, ScheduleDecision.continueWith(Interval.after(now + duration.millis))] as const
        : [false, Duration.zero, ScheduleDecision.done] as const
    ).traced(trace)
  })
}

/** @internal */
export const either = <Env2, In2, Out2>(that: Schedule.Schedule<Env2, In2, Out2>) => {
  return <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<
    Env | Env2,
    In & In2,
    readonly [Out, Out2]
  > => {
    return pipe(self, union(that))
  }
}

/** @internal */
export const eitherWith = <Env2, In2, Out2, Out, Out3>(
  that: Schedule.Schedule<Env2, In2, Out2>,
  f: (out: Out, out2: Out2) => Out3
) => {
  return <Env, In>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env2, In & In2, Out3> => {
    return pipe(self, union(that), map(([out, out2]) => f(out, out2)))
  }
}

/** @internal */
export const elapsed = (): Schedule.Schedule<never, unknown, Duration.Duration> => {
  return makeWithState(Option.none as Option.Option<number>, (now, _, state) => {
    const trace = getCallTrace()
    switch (state._tag) {
      case "None": {
        return core.succeed(
          [
            Option.some(now),
            Duration.zero,
            ScheduleDecision.continueWith(Interval.after(now))
          ] as const
        ).traced(trace)
      }
      case "Some": {
        return core.succeed(
          [
            Option.some(state.value),
            Duration.millis(now - state.value),
            ScheduleDecision.continueWith(Interval.after(now))
          ] as const
        ).traced(trace)
      }
    }
  })
}

/** @internal */
export const ensuring = <X>(finalizer: Effect.Effect<never, never, X>) => {
  return <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env, In, Out> => {
    return makeWithState(self.initial, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, input, state),
        core.flatMap(([state, out, decision]) =>
          ScheduleDecision.isDone(decision)
            ? pipe(
              finalizer,
              core.as([state, out, decision as ScheduleDecision.ScheduleDecision] as const)
            )
            : core.succeed([state, out, decision] as const)
        )
      ).traced(trace)
    })
  }
}

/** @internal */
export const exponential = (
  base: Duration.Duration,
  factor = 2.0
): Schedule.Schedule<never, unknown, Duration.Duration> => {
  return delayedSchedule(
    pipe(forever(), map((i) => Duration.millis(base.millis * Math.pow(factor, i))))
  )
}

/** @internal */
export const fibonacci = (
  one: Duration.Duration
): Schedule.Schedule<never, unknown, Duration.Duration> => {
  return delayedSchedule(
    pipe(
      unfold(
        [one, one] as const,
        ([a, b]) => [b, pipe(a, Duration.add(b))] as const
      ),
      map((out) => out[0])
    )
  )
}

/** @internal */
export const fixed = (interval: Duration.Duration): Schedule.Schedule<never, unknown, number> => {
  return makeWithState(
    [Option.none, 0] as readonly [Option.Option<readonly [number, number]>, number],
    (now, _, [option, n]) => {
      const trace = getCallTrace()
      return core.sync(() => {
        const intervalMillis = interval.millis
        switch (option._tag) {
          case "None": {
            return [
              [Option.some([now, now + intervalMillis] as const), n + 1] as const,
              n,
              ScheduleDecision.continueWith(Interval.after(now + intervalMillis))
            ] as const
          }
          case "Some": {
            const [startMillis, lastRun] = option.value
            const runningBehind = now > (lastRun + intervalMillis)
            const boundary = Equal.equals(interval, Duration.zero)
              ? interval
              : Duration.millis(intervalMillis - ((now - startMillis) % intervalMillis))
            const sleepTime = Equal.equals(boundary, Duration.zero) ? interval : boundary
            const nextRun = runningBehind ? now : now + sleepTime.millis
            return [
              [Option.some([startMillis, nextRun] as const), n + 1] as const,
              n,
              ScheduleDecision.continueWith(Interval.after(nextRun))
            ] as const
          }
        }
      }).traced(trace)
    }
  )
}

/** @internal */
export const fold = <Out, Z>(zero: Z, f: (z: Z, out: Out) => Z) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Z> => {
    return pipe(self, foldEffect(zero, (z, out) => core.sync(() => f(z, out))))
  }
}

/** @internal */
export const foldEffect = <Out, Env1, Z>(
  zero: Z,
  f: (z: Z, out: Out) => Effect.Effect<Env1, never, Z>
) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env | Env1, In, Z> => {
    return makeWithState([self.initial, zero] as const, (now, input, [s, z]) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, input, s),
        core.flatMap(([s, out, decision]) =>
          ScheduleDecision.isDone(decision)
            ? core.succeed([[s, z], z, decision as ScheduleDecision.ScheduleDecision] as const)
            : pipe(f(z, out), core.map((z2) => [[s, z2], z, decision] as const))
        )
      ).traced(trace)
    })
  }
}

/** @internal */
export const forever = (): Schedule.Schedule<never, unknown, number> => {
  return unfold(0, (n) => n + 1)
}

/** @internal */
export const fromDelay = (
  delay: Duration.Duration
): Schedule.Schedule<never, unknown, Duration.Duration> => {
  return duration(delay)
}

/** @internal */
export const fromDelays = (
  delay: Duration.Duration,
  ...delays: Array<Duration.Duration>
): Schedule.Schedule<never, unknown, Duration.Duration> => {
  return makeWithState(
    [[delay, ...delays] as Array<Duration.Duration>, true as boolean] as const,
    (now, _, [durations, cont]) => {
      const trace = getCallTrace()
      return core.sync(() => {
        if (cont) {
          const x = durations[0]!
          const interval = Interval.after(now + x.millis)
          if (durations.length >= 2) {
            return [
              [durations.slice(1), true] as const,
              x,
              ScheduleDecision.continueWith(interval)
            ] as const
          }
          const y = durations.slice(1)
          return [
            [[x, ...y] as Array<Duration.Duration>, false] as const,
            x,
            ScheduleDecision.continueWith(interval)
          ] as const
        }
        return [[durations, false] as const, Duration.zero, ScheduleDecision.done] as const
      }).traced(trace)
    }
  )
}

/** @internal */
export const fromFunction = <A, B>(f: (a: A) => B): Schedule.Schedule<never, A, B> => {
  return pipe(identity<A>(), map(f))
}

/** @internal */
export const hourOfDay = (hour: number): Schedule.Schedule<never, unknown, number> => {
  return makeWithState(
    [Number.NEGATIVE_INFINITY, 0] as readonly [number, number],
    (now, _, state) => {
      const trace = getCallTrace()
      if (!Number.isInteger(hour) || hour < 0 || 23 < hour) {
        return Effect.dieSync(() =>
          new Cause.IllegalArgumentException(
            `Invalid argument in: hourOfDay(${hour}). Must be in range 0...23`
          )
        ).traced(trace)
      }
      const [end0, n] = state
      const now0 = Math.max(end0, now)
      const hour0 = nextHour(now0, hour)
      const start = Math.max(beginningOfHour(hour0), now0)
      const end = endOfHour(hour0)
      const interval = Interval.make(start, end)
      return core.succeed(
        [
          [end, n + 1] as const,
          n,
          ScheduleDecision.continueWith(interval)
        ] as const
      ).traced(trace)
    }
  )
}

/** @internal */
export const identity = <A>(): Schedule.Schedule<never, A, A> => {
  return makeWithState(void 0, (now, input, state) => {
    const trace = getCallTrace()
    return core.succeed(
      [
        state,
        input,
        ScheduleDecision.continueWith(Interval.after(now))
      ] as const
    ).traced(trace)
  })
}

/** @internal */
export const intersect = <Env2, In2, Out2>(that: Schedule.Schedule<Env2, In2, Out2>) => {
  return <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<
    Env | Env2,
    In & In2,
    readonly [Out, Out2]
  > => {
    return pipe(
      self,
      intersectWith(that, (selfIntervals, thatIntervals) =>
        pipe(
          selfIntervals,
          Intervals.intersect(thatIntervals)
        ))
    )
  }
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

/** @internal */
const intersectWithLoop = <State, State1, Env, In, Out, Env1, In1, Out2>(
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
> => {
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

/** @internal */
export const jittered = (min = 0.8, max = 1.2) => {
  return <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Random.Random, In, Out> => {
    return pipe(
      self,
      delayedEffect((duration) =>
        pipe(
          Random.next(),
          core.map((random) => {
            const d = duration.millis
            const jittered = d * min * (1 - random) + d * max * random
            return Duration.millis(jittered)
          })
        )
      )
    )
  }
}

/** @internal */
export const left = <Env, In, Out, X>(
  self: Schedule.Schedule<Env, In, Out>
): Schedule.Schedule<Env, Either.Either<In, X>, Either.Either<Out, X>> => {
  return pipe(self, choose(identity<X>()))
}

/** @internal */
export const linear = (
  base: Duration.Duration
): Schedule.Schedule<never, unknown, Duration.Duration> => {
  return delayedSchedule(
    pipe(forever(), map((i) => Duration.millis(base.millis * (i + 1))))
  )
}

/** @internal */
export const map = <Out, Out2>(f: (out: Out) => Out2) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out2> => {
    return pipe(self, mapEffect((out) => core.sync(() => f(out))))
  }
}

/** @internal */
export const mapEffect = <Out, Env2, Out2>(f: (out: Out) => Effect.Effect<Env2, never, Out2>) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env | Env2, In, Out2> => {
    return makeWithState(self.initial, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, input, state),
        core.flatMap(([state, out, decision]) =>
          pipe(
            f(out),
            core.map((out2) => [state, out2, decision] as const)
          )
        )
      ).traced(trace)
    })
  }
}

/** @internal */
export const minuteOfHour = (minute: number): Schedule.Schedule<never, unknown, number> => {
  return makeWithState(
    [Number.MIN_SAFE_INTEGER, 0] as readonly [number, number],
    (now, _, state) => {
      const trace = getCallTrace()
      if (!Number.isInteger(minute) || minute < 0 || 59 < minute) {
        return Effect.dieSync(() =>
          new Cause.IllegalArgumentException(
            `Invalid argument in: minuteOfHour(${minute}). Must be in range 0...59`
          )
        ).traced(trace)
      }
      const [end0, n] = state
      const now0 = Math.max(end0, now)
      const minute0 = nextMinute(Math.max(end0, now0), minute)
      const start = Math.max(beginningOfMinute(minute0), now0)
      const end = endOfMinute(minute0)
      const interval = Interval.make(start, end)
      return core.succeed(
        [
          [end, n + 1],
          n,
          ScheduleDecision.continueWith(interval)
        ] as const
      ).traced(trace)
    }
  )
}

/** @internal */
export const modifyDelay = <Out>(
  f: (out: Out, duration: Duration.Duration) => Duration.Duration
) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out> => {
    return pipe(self, modifyDelayEffect((out, duration) => core.sync(() => f(out, duration))))
  }
}

/** @internal */
export const modifyDelayEffect = <Out, Env2>(
  f: (out: Out, duration: Duration.Duration) => Effect.Effect<Env2, never, Duration.Duration>
) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env | Env2, In, Out> => {
    return makeWithState(self.initial, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, input, state),
        core.flatMap(([state, out, decision]) => {
          if (ScheduleDecision.isDone(decision)) {
            return core.succeed([state, out, decision] as const)
          }
          const intervals = decision.intervals
          const delay = Interval.size(Interval.make(now, Intervals.start(intervals)))
          return pipe(
            f(out, delay),
            core.map((duration) => {
              const oldStart = Intervals.start(intervals)
              const newStart = now + duration.millis
              const delta = newStart - oldStart
              const newEnd = Math.min(Math.max(0, Intervals.end(intervals) + delta), Number.MAX_SAFE_INTEGER)
              const newInterval = Interval.make(newStart, newEnd)
              return [state, out, ScheduleDecision.continueWith(newInterval)] as const
            })
          )
        })
      ).traced(trace)
    })
  }
}

/** @internal */
export const onDecision = <Out, Env2, X>(
  f: (out: Out, decision: ScheduleDecision.ScheduleDecision) => Effect.Effect<Env2, never, X>
) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env | Env2, In, Out> => {
    return makeWithState(self.initial, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, input, state),
        core.flatMap(([state, out, decision]) =>
          pipe(
            f(out, decision),
            core.as([state, out, decision] as const)
          )
        )
      ).traced(trace)
    })
  }
}

/** @internal */
export const once = (): Schedule.Schedule<never, unknown, void> => {
  return asUnit(recurs(1))
}

/** @internal */
export const passthrough = <Env, Input, Output>(
  self: Schedule.Schedule<Env, Input, Output>
): Schedule.Schedule<Env, Input, Input> => {
  return makeWithState(self.initial, (now, input, state) => {
    const trace = getCallTrace()
    return pipe(
      self.step(now, input, state),
      core.map(([state, _, decision]) => [state, input, decision] as const)
    ).traced(trace)
  })
}

/** @internal */
export const provideEnvironment = <R>(context: Context.Context<R>) => {
  return <In, Out>(self: Schedule.Schedule<R, In, Out>): Schedule.Schedule<never, In, Out> => {
    return makeWithState(self.initial, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, input, state),
        core.provideEnvironment(context)
      ).traced(trace)
    })
  }
}

/** @internal */
export const provideService = <T, T1 extends T>(tag: Context.Tag<T>, service: T1) => {
  return <R, In, Out>(
    self: Schedule.Schedule<R | T, In, Out>
  ): Schedule.Schedule<Exclude<R, T>, In, Out> => {
    return makeWithState(self.initial, (now, input, state) => {
      const trace = getCallTrace()
      return core.environmentWithEffect((env: Context.Context<Exclude<R, T>>) =>
        pipe(
          self.step(now, input, state),
          // @ts-expect-error
          core.provideEnvironment(pipe(env, Context.add(tag)(service)) as Exclude<R, T>)
        )
      ).traced(trace)
    })
  }
}

/** @internal */
export const provideSomeEnvironment = <R0, R>(f: (env0: Context.Context<R0>) => Context.Context<R>) => {
  return <In, Out>(self: Schedule.Schedule<R, In, Out>): Schedule.Schedule<R0, In, Out> => {
    return makeWithState(self.initial, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(self.step(now, input, state), core.provideSomeEnvironment(f)).traced(trace)
    })
  }
}

/** @internal */
export const reconsider = <Out, Out2>(
  f: (
    out: Out,
    decision: ScheduleDecision.ScheduleDecision
  ) => Either.Either<Out2, readonly [Out2, Interval.Interval]>
) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out2> => {
    return pipe(self, reconsiderEffect((out, decision) => core.sync(() => f(out, decision))))
  }
}

/** @internal */
export const reconsiderEffect = <Out, Env2, Out2>(
  f: (
    out: Out,
    decision: ScheduleDecision.ScheduleDecision
  ) => Effect.Effect<Env2, never, Either.Either<Out2, readonly [Out2, Interval.Interval]>>
) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env | Env2, In, Out2> => {
    return makeWithState(self.initial, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, input, state),
        core.flatMap(([state, out, decision]) =>
          ScheduleDecision.isDone(decision)
            ? pipe(
              f(out, decision),
              core.map((either) => {
                switch (either._tag) {
                  case "Left": {
                    return [state, either.left, ScheduleDecision.done] as const
                  }
                  case "Right": {
                    const [out2] = either.right
                    return [state, out2, ScheduleDecision.done] as const
                  }
                }
              })
            )
            : pipe(
              f(out, decision),
              core.map((either) => {
                switch (either._tag) {
                  case "Left": {
                    return [state, either.left, ScheduleDecision.done] as const
                  }
                  case "Right": {
                    const [out2, interval] = either.right
                    return [state, out2, ScheduleDecision.continueWith(interval)] as const
                  }
                }
              })
            )
        )
      ).traced(trace)
    })
  }
}

/** @internal */
export const recurUntil = <A>(f: Predicate<A>): Schedule.Schedule<never, A, A> => {
  return pipe(identity<A>(), untilInput(f))
}

/** @internal */
export const recurUntilEffect = <Env, A>(
  f: (a: A) => Effect.Effect<Env, never, boolean>
): Schedule.Schedule<Env, A, A> => {
  return pipe(identity<A>(), untilInputEffect(f))
}

/** @internal */
export const recurUntilEquals = <A>(value: A): Schedule.Schedule<never, A, A> => {
  return pipe(identity<A>(), untilInput((input) => Equal.equals(input, value)))
}

/** @internal */
export const recurUntilOption = <A, B>(
  pf: (a: A) => Option.Option<B>
): Schedule.Schedule<never, A, Option.Option<B>> => {
  return pipe(identity<A>(), map(pf), untilOutput(Option.isSome))
}

/** @internal */
export const recurUpTo = (
  duration: Duration.Duration
): Schedule.Schedule<never, unknown, Duration.Duration> => {
  return pipe(elapsed(), whileOutput((elapsed) => pipe(elapsed, Duration.lessThan(duration))))
}

/** @internal */
export const recurWhile = <A>(f: Predicate<A>): Schedule.Schedule<never, A, A> => {
  return pipe(identity<A>(), whileInput(f))
}

/** @internal */
export const recurWhileEffect = <Env, A>(
  f: (a: A) => Effect.Effect<Env, never, boolean>
): Schedule.Schedule<Env, A, A> => {
  return pipe(identity<A>(), whileInputEffect(f))
}

/** @internal */
export const recurWhileEquals = <A>(value: A): Schedule.Schedule<never, A, A> => {
  return pipe(identity<A>(), whileInput((input) => Equal.equals(input, value)))
}

/** @internal */
export const recurs = (n: number): Schedule.Schedule<never, unknown, number> => {
  return pipe(forever(), whileOutput((out) => out < n))
}

/** @internal */
export const repeatForever = <Env, In, Out>(
  self: Schedule.Schedule<Env, In, Out>
): Schedule.Schedule<Env, In, Out> => {
  return makeWithState(self.initial, (now, input, state) => {
    const step = (
      now: number,
      input: In,
      state: any
    ): Effect.Effect<Env, never, readonly [any, Out, ScheduleDecision.ScheduleDecision]> => {
      return pipe(
        self.step(now, input, state),
        core.flatMap(([state, out, decision]) =>
          ScheduleDecision.isDone(decision)
            ? step(now, input, self.initial)
            : core.succeed([state, out, decision])
        )
      )
    }
    return step(now, input, state)
  })
}

/** @internal */
export const repetitions = <Env, In, Out>(
  self: Schedule.Schedule<Env, In, Out>
): Schedule.Schedule<Env, In, number> => {
  return pipe(self, fold(0, (n, _) => n + 1))
}

/** @internal */
export const resetAfter = (duration: Duration.Duration) => {
  return <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env, In, Out> => {
    return pipe(
      self,
      intersect(elapsed()),
      resetWhen(([, time]) => pipe(time, Duration.greaterThanOrEqualTo(duration))),
      map((out) => out[0])
    )
  }
}

/** @internal */
export const resetWhen = <Out>(f: Predicate<Out>) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out> => {
    return makeWithState(self.initial, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, input, state),
        core.flatMap(([state, out, decision]) =>
          f(out)
            ? self.step(now, input, self.initial)
            : core.succeed([state, out, decision] as const)
        )
      ).traced(trace)
    })
  }
}

/** @internal */
export const right = <Env, In, Out, X>(
  self: Schedule.Schedule<Env, In, Out>
): Schedule.Schedule<Env, Either.Either<X, In>, Either.Either<X, Out>> => {
  return pipe(identity<X>(), choose(self))
}

/** @internal */
export const run = <In>(now: number, input: Iterable<In>) => {
  const trace = getCallTrace()
  return <Env, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ): Effect.Effect<Env, never, Chunk.Chunk<Out>> => {
    return pipe(
      runLoop(self, now, List.fromIterable(input), self.initial, List.nil()),
      core.map((list) => Chunk.fromIterable(List.reverse(list)))
    ).traced(trace)
  }
}

/** @internal */
const runLoop = <Env, In, Out>(
  self: Schedule.Schedule<Env, In, Out>,
  now: number,
  inputs: List.List<In>,
  state: any,
  acc: List.List<Out>
): Effect.Effect<Env, never, List.List<Out>> => {
  if (List.isNil(inputs)) {
    return Effect.succeed(acc)
  }
  const input = inputs.head
  const nextInputs = inputs.tail
  return pipe(
    self.step(now, input, state),
    core.flatMap(([state, out, decision]) => {
      if (ScheduleDecision.isDone(decision)) {
        return core.sync(() => pipe(acc, List.prepend(out)))
      }
      return runLoop(
        self,
        Intervals.start(decision.intervals),
        nextInputs,
        state,
        pipe(acc, List.prepend(out))
      )
    })
  )
}

/** @internal */
export const secondOfMinute = (second: number): Schedule.Schedule<never, unknown, number> => {
  return makeWithState(
    [Number.NEGATIVE_INFINITY, 0] as readonly [number, number],
    (now, _, state) => {
      const trace = getCallTrace()
      if (!Number.isInteger(second) || second < 0 || 59 < second) {
        return Effect.dieSync(() =>
          new Cause.IllegalArgumentException(
            `Invalid argument in: secondOfMinute(${second}). Must be in range 0...59`
          )
        )
      }
      const [end0, n] = state
      const now0 = Math.max(end0, now)
      const second0 = nextSecond(now0, second)
      const start = Math.max(beginningOfSecond(second0), now0)
      const end = endOfSecond(second0)
      const interval = Interval.make(start, end)
      return core.succeed(
        [
          [end, n + 1],
          n,
          ScheduleDecision.continueWith(interval)
        ] as const
      ).traced(trace)
    }
  )
}

/** @internal */
export const spaced = (duration: Duration.Duration): Schedule.Schedule<never, unknown, number> => {
  return pipe(forever(), addDelay(() => duration))
}

/** @internal */
export const stop = (): Schedule.Schedule<never, unknown, void> => {
  return asUnit(recurs(0))
}

/** @internal */
export const succeed = <A>(value: A): Schedule.Schedule<never, unknown, A> => {
  return pipe(forever(), map(() => value))
}

/** @internal */
export const sync = <A>(evaluate: () => A): Schedule.Schedule<never, unknown, A> => {
  return pipe(forever(), map(evaluate))
}

/** @internal */
export const tapInput = <Env2, In2, X>(
  f: (input: In2) => Effect.Effect<Env2, never, X>
) => {
  return <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env2, In & In2, Out> => {
    return makeWithState(self.initial, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(f(input), core.zipRight(self.step(now, input, state))).traced(trace)
    })
  }
}

/** @internal */
export const tapOutput = <Out, Env2, X>(f: (out: Out) => Effect.Effect<Env2, never, X>) => {
  return <Env, In>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env2, In, Out> => {
    return makeWithState(self.initial, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(self.step(now, input, state), core.tap(([, out]) => f(out))).traced(trace)
    })
  }
}

/** @internal */
export const unfold = <A>(
  initial: A,
  f: (a: A) => A
): Schedule.Schedule<never, unknown, A> => {
  return makeWithState(initial, (now, _, state) => {
    const trace = getCallTrace()
    return core.sync(() =>
      [
        f(state),
        state,
        ScheduleDecision.continueWith(Interval.after(now))
      ] as const
    ).traced(trace)
  })
}

/** @internal */
export const union = <Env2, In2, Out2>(that: Schedule.Schedule<Env2, In2, Out2>) => {
  return <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<
    Env | Env2,
    In & In2,
    readonly [Out, Out2]
  > => {
    return pipe(
      self,
      unionWith(that, (selfIntervals, thatIntervals) =>
        pipe(
          selfIntervals,
          Intervals.union(thatIntervals)
        ))
    )
  }
}

/** @internal */
export const unionWith = <Env2, In2, Out2>(
  that: Schedule.Schedule<Env2, In2, Out2>,
  f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
) => {
  return <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<
    Env | Env2,
    In & In2,
    readonly [Out, Out2]
  > =>
    makeWithState([self.initial, that.initial] as const, (now, input, state) => {
      const trace = getCallTrace()
      return pipe(
        self.step(now, input, state[0]),
        core.zipWith(
          that.step(now, input, state[1]),
          ([lState, l, lDecision], [rState, r, rDecision]) => {
            if (ScheduleDecision.isDone(lDecision) && ScheduleDecision.isDone(rDecision)) {
              return [[lState, rState] as const, [l, r] as const, ScheduleDecision.done] as const
            }
            if (ScheduleDecision.isDone(lDecision) && ScheduleDecision.isContinue(rDecision)) {
              return [
                [lState, rState] as const,
                [l, r] as const,
                ScheduleDecision.continue(rDecision.intervals)
              ] as const
            }
            if (ScheduleDecision.isContinue(lDecision) && ScheduleDecision.isDone(rDecision)) {
              return [
                [lState, rState] as const,
                [l, r],
                ScheduleDecision.continue(lDecision.intervals)
              ] as const
            }
            if (ScheduleDecision.isContinue(lDecision) && ScheduleDecision.isContinue(rDecision)) {
              const combined = f(lDecision.intervals, rDecision.intervals)
              return [
                [lState, rState] as const,
                [l, r],
                ScheduleDecision.continue(combined)
              ] as const
            }
            throw new Error(
              "BUG: Schedule.unionWith - please report an issue at https://github.com/Effect-TS/io/issues"
            )
          }
        )
      ).traced(trace)
    })
}

/** @internal */
export const untilInput = <In>(f: Predicate<In>) => {
  return <Env, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out> => {
    return pipe(self, check((input, _) => !f(input)))
  }
}

/** @internal */
export const untilInputEffect = <In, Env2>(
  f: (input: In) => Effect.Effect<Env2, never, boolean>
) => {
  return <Env, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env2, In, Out> => {
    return pipe(self, checkEffect((input, _) => effect.negate(f(input))))
  }
}

/** @internal */
export const untilOutput = <Out>(f: Predicate<Out>) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out> => {
    return pipe(self, check((_, out) => !f(out)))
  }
}

/** @internal */
export const untilOutputEffect = <Out, Env2>(
  f: (out: Out) => Effect.Effect<Env2, never, boolean>
) => {
  return <Env, In>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env2, In, Out> => {
    return pipe(self, checkEffect((_, out) => effect.negate(f(out))))
  }
}

/** @internal */
export const upTo = (duration: Duration.Duration) => {
  return <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out> => {
    return pipe(self, zipLeft(recurUpTo(duration)))
  }
}

/** @internal */
export const whileInput = <In>(f: Predicate<In>) => {
  return <Env, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out> => {
    return pipe(self, check((input, _) => f(input)))
  }
}

/** @internal */
export const whileInputEffect = <In, Env1>(
  f: (input: In) => Effect.Effect<Env1, never, boolean>
) => {
  return <Env, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env1, In, Out> => {
    return pipe(self, checkEffect((input, _) => f(input)))
  }
}

/** @internal */
export const whileOutput = <Out>(f: Predicate<Out>) => {
  return <Env, In>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out> => {
    return pipe(self, check((_, out) => f(out)))
  }
}

/** @internal */
export const whileOutputEffect = <Out, Env1>(
  f: (out: Out) => Effect.Effect<Env1, never, boolean>
) => {
  return <Env, In>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env1, In, Out> => {
    return pipe(self, checkEffect((_, out) => f(out)))
  }
}

/** @internal */
export const windowed = (
  interval: Duration.Duration
): Schedule.Schedule<never, unknown, number> => {
  const millis = interval.millis
  return makeWithState(
    [Option.none, 0] as readonly [Option.Option<number>, number],
    (now, _, [option, n]) => {
      const trace = getCallTrace()
      switch (option._tag) {
        case "None": {
          return core.succeed(
            [
              [Option.some(now), n + 1],
              n,
              ScheduleDecision.continueWith(Interval.after(now + millis))
            ] as const
          ).traced(trace)
        }
        case "Some": {
          return core.succeed(
            [
              [Option.some(option.value), n + 1],
              n,
              ScheduleDecision.continueWith(
                Interval.after(now + (millis - ((now - option.value) % millis)))
              )
            ] as const
          ).traced(trace)
        }
      }
    }
  )
}

/** @internal */
export const zipLeft = <Env2, In2, Out2>(that: Schedule.Schedule<Env2, In2, Out2>) => {
  return <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env2, In & In2, Out> => {
    return pipe(self, intersect(that), map((out) => out[0]))
  }
}

/** @internal */
export const zipRight = <Env2, In2, Out2>(that: Schedule.Schedule<Env2, In2, Out2>) => {
  return <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env2, In & In2, Out2> => {
    return pipe(self, intersect(that), map((out) => out[1]))
  }
}

/** @internal */
export function zipWith<Env2, In2, Out2, Out, Out3>(
  that: Schedule.Schedule<Env2, In2, Out2>,
  f: (out: Out, out2: Out2) => Out3
) {
  return <Env, In>(
    self: Schedule.Schedule<Env, In, Out>
  ): Schedule.Schedule<Env | Env2, In & In2, Out3> => {
    return pipe(self, intersect(that), map(([out, out2]) => f(out, out2)))
  }
}

// -----------------------------------------------------------------------------
// Seconds
// -----------------------------------------------------------------------------

/** @internal */
export const beginningOfSecond = (now: number): number => {
  const date = new Date(now)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    0
  ).getTime()
}

/** @internal */
export const endOfSecond = (now: number): number => {
  const date = new Date(beginningOfSecond(now))
  return date.setSeconds(date.getSeconds() + 1)
}

/** @internal */
export const nextSecond = (now: number, second: number): number => {
  const date = new Date(now)
  if (date.getSeconds() === second) {
    return now
  }
  if (date.getSeconds() < second) {
    return date.setSeconds(second)
  }
  // Set seconds to the provided value and add one minute
  const newDate = new Date(date.setSeconds(second))
  return newDate.setTime(newDate.getTime() + 1000 * 60)
}

// -----------------------------------------------------------------------------
// Minutes
// -----------------------------------------------------------------------------

/** @internal */
export const beginningOfMinute = (now: number): number => {
  const date = new Date(now)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    0,
    0
  ).getTime()
}

/** @internal */
export const endOfMinute = (now: number): number => {
  const date = new Date(beginningOfMinute(now))
  return date.setMinutes(date.getMinutes() + 1)
}

/** @internal */
export const nextMinute = (now: number, minute: number): number => {
  const date = new Date(now)
  if (date.getMinutes() === minute) {
    return now
  }
  if (date.getMinutes() < minute) {
    return date.setMinutes(minute)
  }
  // Set minutes to the provided value and add one hour
  const newDate = new Date(date.setMinutes(minute))
  return newDate.setTime(newDate.getTime() + 1000 * 60 * 60)
}

// -----------------------------------------------------------------------------
// Hours
// -----------------------------------------------------------------------------

/** @internal */
export const beginningOfHour = (now: number): number => {
  const date = new Date(now)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    0,
    0,
    0
  ).getTime()
}

/** @internal */
export const endOfHour = (now: number): number => {
  const date = new Date(beginningOfHour(now))
  return date.setHours(date.getHours() + 1)
}

/** @internal */
export const nextHour = (now: number, hour: number): number => {
  const date = new Date(now)
  if (date.getHours() === hour) {
    return now
  }
  if (date.getHours() < hour) {
    return date.setHours(hour)
  }
  // Set hours to the provided value and add one day
  const newDate = new Date(date.setHours(hour))
  return newDate.setTime(newDate.getTime() + 1000 * 60 * 60 * 24)
}

// -----------------------------------------------------------------------------
// Days
// -----------------------------------------------------------------------------

/** @internal */
export const beginningOfDay = (now: number): number => {
  const date = new Date(now)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  ).getTime()
}

/** @internal */
export const endOfDay = (now: number): number => {
  const date = new Date(beginningOfDay(now))
  return date.setDate(date.getDate() + 1)
}

/** @internal */
export const nextDay = (now: number, dayOfWeek: number): number => {
  const date = new Date(now)
  if (date.getDay() === dayOfWeek) {
    return now
  }
  return date.setDate(date.getDate() + ((7 + dayOfWeek - date.getDay()) % 7))
}

/** @internal */
export const nextDayOfMonth = (now: number, day: number): number => {
  const date = new Date(now)
  if (date.getDate() === day) {
    return now
  }
  if (date.getDate() < day) {
    return date.setDate(day)
  }
  return findNextMonth(now, day, 1)
}

/** @internal */
export const findNextMonth = (now: number, day: number, months: number): number => {
  const d = new Date(now)
  const tmp1 = new Date(d.setDate(day))
  const tmp2 = new Date(tmp1.setMonth(tmp1.getMonth() + months))
  if (tmp2.getDate() === day) {
    const d2 = new Date(now)
    const tmp3 = new Date(d2.setDate(day))
    return tmp3.setMonth(tmp3.getMonth() + months)
  }
  return findNextMonth(now, day, months + 1)
}
