---
title: Schedule.ts
nav_order: 39
parent: Modules
---

## Schedule overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [alternatives](#alternatives)
  - [choose](#choose)
  - [chooseMerge](#choosemerge)
  - [either](#either)
  - [eitherWith](#eitherwith)
- [constructors](#constructors)
  - [asUnit](#asunit)
  - [collectAllInputs](#collectallinputs)
  - [count](#count)
  - [dayOfMonth](#dayofmonth)
  - [dayOfWeek](#dayofweek)
  - [delayedEffect](#delayedeffect)
  - [delayedSchedule](#delayedschedule)
  - [delays](#delays)
  - [duration](#duration)
  - [elapsed](#elapsed)
  - [exponential](#exponential)
  - [fibonacci](#fibonacci)
  - [fixed](#fixed)
  - [forever](#forever)
  - [fromDelay](#fromdelay)
  - [fromDelays](#fromdelays)
  - [fromFunction](#fromfunction)
  - [hourOfDay](#hourofday)
  - [identity](#identity)
  - [jittered](#jittered)
  - [linear](#linear)
  - [makeWithState](#makewithstate)
  - [minuteOfHour](#minuteofhour)
  - [once](#once)
  - [recurs](#recurs)
  - [repeatForever](#repeatforever)
  - [secondOfMinute](#secondofminute)
  - [spaced](#spaced)
  - [stop](#stop)
  - [succeed](#succeed)
  - [sync](#sync)
  - [unfold](#unfold)
  - [windowed](#windowed)
- [destructors](#destructors)
  - [run](#run)
- [environment](#environment)
  - [provideEnvironment](#provideenvironment)
  - [provideService](#provideservice)
  - [provideSomeEnvironment](#providesomeenvironment)
- [finalization](#finalization)
  - [ensuring](#ensuring)
- [folding](#folding)
  - [fold](#fold)
  - [foldEffect](#foldeffect)
- [getter](#getter)
  - [driver](#driver)
- [mapping](#mapping)
  - [as](#as)
  - [contramap](#contramap)
  - [contramapEffect](#contramapeffect)
  - [dimap](#dimap)
  - [dimapEffect](#dimapeffect)
  - [map](#map)
  - [mapEffect](#mapeffect)
- [model](#model)
  - [Schedule (interface)](#schedule-interface)
- [models](#models)
  - [ScheduleDriver (interface)](#scheduledriver-interface)
- [mutations](#mutations)
  - [addDelay](#adddelay)
  - [addDelayEffect](#adddelayeffect)
  - [bothInOut](#bothinout)
  - [check](#check)
  - [checkEffect](#checkeffect)
  - [collectAllOutputs](#collectalloutputs)
  - [collectUntil](#collectuntil)
  - [collectUntilEffect](#collectuntileffect)
  - [collectWhile](#collectwhile)
  - [collectWhileEffect](#collectwhileeffect)
  - [compose](#compose)
  - [delayed](#delayed)
  - [intersect](#intersect)
  - [intersectWith](#intersectwith)
  - [left](#left)
  - [modifyDelay](#modifydelay)
  - [modifyDelayEffect](#modifydelayeffect)
  - [onDecision](#ondecision)
  - [passthrough](#passthrough)
  - [reconsider](#reconsider)
  - [reconsiderEffect](#reconsidereffect)
  - [recurUntil](#recuruntil)
  - [recurUntilEffect](#recuruntileffect)
  - [recurUntilEquals](#recuruntilequals)
  - [recurUntilOption](#recuruntiloption)
  - [recurUpTo](#recurupto)
  - [recurWhile](#recurwhile)
  - [recurWhileEffect](#recurwhileeffect)
  - [recurWhileEquals](#recurwhileequals)
  - [repetitions](#repetitions)
  - [resetAfter](#resetafter)
  - [resetWhen](#resetwhen)
  - [right](#right)
  - [union](#union)
  - [unionWith](#unionwith)
  - [untilInput](#untilinput)
  - [untilInputEffect](#untilinputeffect)
  - [untilOutput](#untiloutput)
  - [untilOutputEffect](#untiloutputeffect)
  - [upTo](#upto)
  - [whileInput](#whileinput)
  - [whileInputEffect](#whileinputeffect)
  - [whileOutput](#whileoutput)
  - [whileOutputEffect](#whileoutputeffect)
- [sequencing](#sequencing)
  - [andThen](#andthen)
  - [andThenEither](#andtheneither)
  - [tapInput](#tapinput)
  - [tapOutput](#tapoutput)
- [symbols](#symbols)
  - [ScheduleDriverTypeId](#scheduledrivertypeid)
  - [ScheduleDriverTypeId (type alias)](#scheduledrivertypeid-type-alias)
  - [ScheduleTypeId](#scheduletypeid)
  - [ScheduleTypeId (type alias)](#scheduletypeid-type-alias)
- [zipping](#zipping)
  - [zipLeft](#zipleft)
  - [zipRight](#zipright)
  - [zipWith](#zipwith)

---

# alternatives

## choose

Returns a new schedule that allows choosing between feeding inputs to this
schedule, or feeding inputs to the specified schedule.

**Signature**

```ts
export declare const choose: <Env2, In2, Out2>(
  that: Schedule<Env2, In2, Out2>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, Either<In, In2>, Either<Out, Out2>>
```

Added in v1.0.0

## chooseMerge

Returns a new schedule that chooses between two schedules with a common
output.

**Signature**

```ts
export declare const chooseMerge: <Env2, In2, Out2>(
  that: Schedule<Env2, In2, Out2>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, Either<In, In2>, Out2 | Out>
```

Added in v1.0.0

## either

Returns a new schedule that performs a geometric union on the intervals
defined by both schedules.

**Signature**

```ts
export declare const either: <Env2, In2, Out2>(
  that: Schedule<Env2, In2, Out2>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, readonly [Out, Out2]>
```

Added in v1.0.0

## eitherWith

The same as `either` followed by `map`.

**Signature**

```ts
export declare const eitherWith: <Env2, In2, Out2, Out, Out3>(
  that: Schedule<Env2, In2, Out2>,
  f: (out: Out, out2: Out2) => Out3
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, Out3>
```

Added in v1.0.0

# constructors

## asUnit

Returns a new schedule that maps the output of this schedule to unit.

**Signature**

```ts
export declare const asUnit: <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, void>
```

Added in v1.0.0

## collectAllInputs

A schedule that recurs anywhere, collecting all inputs into a `Chunk`.

**Signature**

```ts
export declare const collectAllInputs: <A>() => Schedule<never, A, Chunk<A>>
```

Added in v1.0.0

## count

A schedule that always recurs, which counts the number of recurrences.

**Signature**

```ts
export declare const count: () => Schedule<never, unknown, number>
```

Added in v1.0.0

## dayOfMonth

Cron-like schedule that recurs every specified `day` of month. Won't recur
on months containing less days than specified in `day` param.

It triggers at zero hour of the day. Producing a count of repeats: 0, 1, 2.

NOTE: `day` parameter is validated lazily. Must be in range 1...31.

**Signature**

```ts
export declare const dayOfMonth: (day: number) => Schedule<never, unknown, number>
```

Added in v1.0.0

## dayOfWeek

Cron-like schedule that recurs every specified `day` of each week. It
triggers at zero hour of the week. Producing a count of repeats: 0, 1, 2.

NOTE: `day` parameter is validated lazily. Must be in range 1 (Monday)...7
(Sunday).

**Signature**

```ts
export declare const dayOfWeek: (day: number) => Schedule<never, unknown, number>
```

Added in v1.0.0

## delayedEffect

Returns a new schedule with the specified effectfully computed delay added
before the start of each interval produced by this schedule.

**Signature**

```ts
export declare const delayedEffect: <Env2>(
  f: (duration: Duration) => Effect.Effect<Env2, never, Duration>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
```

Added in v1.0.0

## delayedSchedule

Takes a schedule that produces a delay, and returns a new schedule that
uses this delay to further delay intervals in the resulting schedule.

**Signature**

```ts
export declare const delayedSchedule: <Env, In>(schedule: Schedule<Env, In, Duration>) => Schedule<Env, In, Duration>
```

Added in v1.0.0

## delays

Returns a new schedule that outputs the delay between each occurence.

**Signature**

```ts
export declare const delays: <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Duration>
```

Added in v1.0.0

## duration

A schedule that can recur one time, the specified amount of time into the
future.

**Signature**

```ts
export declare const duration: (duration: Duration) => Schedule<never, unknown, Duration>
```

Added in v1.0.0

## elapsed

A schedule that occurs everywhere, which returns the total elapsed duration
since the first step.

**Signature**

```ts
export declare const elapsed: () => Schedule<never, unknown, Duration>
```

Added in v1.0.0

## exponential

A schedule that always recurs, but will wait a certain amount between
repetitions, given by `base * factor.pow(n)`, where `n` is the number of
repetitions so far. Returns the current duration between recurrences.

**Signature**

```ts
export declare const exponential: (base: Duration, factor?: number) => Schedule<never, unknown, Duration>
```

Added in v1.0.0

## fibonacci

A schedule that always recurs, increasing delays by summing the preceding
two delays (similar to the fibonacci sequence). Returns the current
duration between recurrences.

**Signature**

```ts
export declare const fibonacci: (one: Duration) => Schedule<never, unknown, Duration>
```

Added in v1.0.0

## fixed

A schedule that recurs on a fixed interval. Returns the number of
repetitions of the schedule so far.

If the action run between updates takes longer than the interval, then the
action will be run immediately, but re-runs will not "pile up".

```
|-----interval-----|-----interval-----|-----interval-----|
|---------action--------||action|-----|action|-----------|
```

**Signature**

```ts
export declare const fixed: (interval: Duration) => Schedule<never, unknown, number>
```

Added in v1.0.0

## forever

A schedule that always recurs, producing a count of repeats: 0, 1, 2.

**Signature**

```ts
export declare const forever: () => Schedule<never, unknown, number>
```

Added in v1.0.0

## fromDelay

A schedule that recurs once with the specified delay.

**Signature**

```ts
export declare const fromDelay: (delay: Duration) => Schedule<never, unknown, Duration>
```

Added in v1.0.0

## fromDelays

A schedule that recurs once for each of the specified durations, delaying
each time for the length of the specified duration. Returns the length of
the current duration between recurrences.

**Signature**

```ts
export declare const fromDelays: (delay: Duration, ...delays: Duration[]) => Schedule<never, unknown, Duration>
```

Added in v1.0.0

## fromFunction

A schedule that always recurs, mapping input values through the specified
function.

**Signature**

```ts
export declare const fromFunction: <A, B>(f: (a: A) => B) => Schedule<never, A, B>
```

Added in v1.0.0

## hourOfDay

Cron-like schedule that recurs every specified `hour` of each day. It
triggers at zero minute of the hour. Producing a count of repeats: 0, 1, 2.

NOTE: `hour` parameter is validated lazily. Must be in range 0...23.

**Signature**

```ts
export declare const hourOfDay: (hour: number) => Schedule<never, unknown, number>
```

Added in v1.0.0

## identity

A schedule that always recurs, which returns inputs as outputs.

**Signature**

```ts
export declare const identity: <A>() => Schedule<never, A, A>
```

Added in v1.0.0

## jittered

Returns a new schedule that randomly modifies the size of the intervals of
this schedule.

The new interval size is between `min * old interval size` and `max * old interval size`.

**Signature**

```ts
export declare const jittered: (
  min?: number,
  max?: number
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env | Random, In, Out>
```

Added in v1.0.0

## linear

A schedule that always recurs, but will repeat on a linear time interval,
given by `base * n` where `n` is the number of repetitions so far. Returns
the current duration between recurrences.

**Signature**

```ts
export declare const linear: (base: Duration) => Schedule<never, unknown, Duration>
```

Added in v1.0.0

## makeWithState

Constructs a new `Schedule` with the specified `initial` state and the
specified `step` function.

**Signature**

```ts
export declare const makeWithState: <S, Env, In, Out>(
  initial: S,
  step: (
    now: number,
    input: In,
    state: S
  ) => Effect.Effect<Env, never, readonly [S, Out, ScheduleDecision.ScheduleDecision]>
) => Schedule<Env, In, Out>
```

Added in v1.0.0

## minuteOfHour

Cron-like schedule that recurs every specified `minute` of each hour. It
triggers at zero second of the minute. Producing a count of repeats: 0, 1, 2.

NOTE: `minute` parameter is validated lazily. Must be in range 0...59.

**Signature**

```ts
export declare const minuteOfHour: (minute: number) => Schedule<never, unknown, number>
```

Added in v1.0.0

## once

A schedule that recurs one time.

**Signature**

```ts
export declare const once: () => Schedule<never, unknown, void>
```

Added in v1.0.0

## recurs

A schedule spanning all time, which can be stepped only the specified
number of times before it terminates.

**Signature**

```ts
export declare const recurs: (n: number) => Schedule<never, unknown, number>
```

Added in v1.0.0

## repeatForever

Returns a new schedule that loops this one continuously, resetting the
state when this schedule is done.

**Signature**

```ts
export declare const repeatForever: () => Schedule<never, unknown, number>
```

Added in v1.0.0

## secondOfMinute

Cron-like schedule that recurs every specified `second` of each minute. It
triggers at zero nanosecond of the second. Producing a count of repeats: 0,
1, 2.

NOTE: `second` parameter is validated lazily. Must be in range 0...59.

**Signature**

```ts
export declare const secondOfMinute: (second: number) => Schedule<never, unknown, number>
```

Added in v1.0.0

## spaced

Returns a schedule that recurs continuously, each repetition spaced the
specified duration from the last run.

**Signature**

```ts
export declare const spaced: (duration: Duration) => Schedule<never, unknown, number>
```

Added in v1.0.0

## stop

A schedule that does not recur, it just stops.

**Signature**

```ts
export declare const stop: () => Schedule<never, unknown, void>
```

Added in v1.0.0

## succeed

Returns a schedule that repeats one time, producing the specified constant
value.

**Signature**

```ts
export declare const succeed: <A>(value: A) => Schedule<never, unknown, A>
```

Added in v1.0.0

## sync

Returns a schedule that repeats one time, producing the specified constant
value.

**Signature**

```ts
export declare const sync: <A>(evaluate: () => A) => Schedule<never, unknown, A>
```

Added in v1.0.0

## unfold

Unfolds a schedule that repeats one time from the specified state and
iterator.

**Signature**

```ts
export declare const unfold: <A>(initial: A, f: (a: A) => A) => Schedule<never, unknown, A>
```

Added in v1.0.0

## windowed

A schedule that divides the timeline to `interval`-long windows, and sleeps
until the nearest window boundary every time it recurs.

For example, `windowed(Duration.seconds(10))` would produce a schedule as
follows:

```
     10s        10s        10s       10s
|----------|----------|----------|----------|
|action------|sleep---|act|-sleep|action----|
```

**Signature**

```ts
export declare const windowed: (interval: Duration) => Schedule<never, unknown, number>
```

Added in v1.0.0

# destructors

## run

Runs a schedule using the provided inputs, and collects all outputs.

**Signature**

```ts
export declare const run: <In>(
  now: number,
  input: Iterable<In>
) => <Env, Out>(self: Schedule<Env, In, Out>) => Effect.Effect<Env, never, Chunk<Out>>
```

Added in v1.0.0

# environment

## provideEnvironment

Returns a new schedule with its environment provided to it, so the
resulting schedule does not require any environment.

**Signature**

```ts
export declare const provideEnvironment: <R>(
  context: Context<R>
) => <In, Out>(self: Schedule<R, In, Out>) => Schedule<never, In, Out>
```

Added in v1.0.0

## provideService

Returns a new schedule with the single service it requires provided to it.
If the schedule requires multiple services use `provideEnvironment`
instead.

**Signature**

```ts
export declare const provideService: <T, T1 extends T>(
  tag: Tag<T>,
  service: T1
) => <R, In, Out>(self: Schedule<T | R, In, Out>) => Schedule<Exclude<R, T>, In, Out>
```

Added in v1.0.0

## provideSomeEnvironment

Transforms the environment being provided to this schedule with the
specified function.

**Signature**

```ts
export declare const provideSomeEnvironment: <R0, R>(
  f: (env0: Context<R0>) => Context<R>
) => <In, Out>(self: Schedule<R, In, Out>) => Schedule<R0, In, Out>
```

Added in v1.0.0

# finalization

## ensuring

Returns a new schedule that will run the specified finalizer as soon as the
schedule is complete. Note that unlike `Effect.ensuring`, this method does not
guarantee the finalizer will be run. The `Schedule` may not initialize or
the driver of the schedule may not run to completion. However, if the
`Schedule` ever decides not to continue, then the finalizer will be run.

**Signature**

```ts
export declare const ensuring: <X>(
  finalizer: Effect.Effect<never, never, X>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
```

Added in v1.0.0

# folding

## fold

Returns a new schedule that folds over the outputs of this one.

**Signature**

```ts
export declare const fold: <Out, Z>(
  zero: Z,
  f: (z: Z, out: Out) => Z
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Z>
```

Added in v1.0.0

## foldEffect

Returns a new schedule that effectfully folds over the outputs of this one.

**Signature**

```ts
export declare const foldEffect: <Out, Env1, Z>(
  zero: Z,
  f: (z: Z, out: Out) => Effect.Effect<Env1, never, Z>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env1 | Env, In, Z>
```

Added in v1.0.0

# getter

## driver

Returns a driver that can be used to step the schedule, appropriately
handling sleeping.

**Signature**

```ts
export declare const driver: <Env, In, Out>(
  self: Schedule<Env, In, Out>
) => Effect.Effect<never, never, ScheduleDriver<Env, In, Out>>
```

Added in v1.0.0

# mapping

## as

Returns a new schedule that maps this schedule to a constant output.

**Signature**

```ts
export declare const as: <Out2>(out2: Out2) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out2>
```

Added in v1.0.0

## contramap

Returns a new schedule that deals with a narrower class of inputs than this
schedule.

**Signature**

```ts
export declare const contramap: <In, In2>(
  f: (in2: In2) => In
) => <Env, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In2, Out>
```

Added in v1.0.0

## contramapEffect

Returns a new schedule that deals with a narrower class of inputs than this
schedule.

**Signature**

```ts
export declare const contramapEffect: <In, Env1, In2>(
  f: (in2: In2) => Effect.Effect<Env1, never, In>
) => <Env, Out>(self: Schedule<Env, In, Out>) => Schedule<Env1 | Env, In2, Out>
```

Added in v1.0.0

## dimap

Returns a new schedule that contramaps the input and maps the output.

**Signature**

```ts
export declare const dimap: typeof internal.dimap
```

Added in v1.0.0

## dimapEffect

Returns a new schedule that contramaps the input and maps the output.

**Signature**

```ts
export declare const dimapEffect: <In2, Env2, In, Out, Env3, Out2>(
  f: (input: In2) => Effect.Effect<Env2, never, In>,
  g: (out: Out) => Effect.Effect<Env3, never, Out2>
) => <Env>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env3 | Env, In2, Out2>
```

Added in v1.0.0

## map

Returns a new schedule that maps the output of this schedule through the
specified function.

**Signature**

```ts
export declare const map: <Out, Out2>(
  f: (out: Out) => Out2
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out2>
```

Added in v1.0.0

## mapEffect

Returns a new schedule that maps the output of this schedule through the
specified effectful function.

**Signature**

```ts
export declare const mapEffect: <Out, Env2, Out2>(
  f: (out: Out) => Effect.Effect<Env2, never, Out2>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out2>
```

Added in v1.0.0

# model

## Schedule (interface)

A `Schedule<Env, In, Out>` defines a recurring schedule, which consumes
values of type `In`, and which returns values of type `Out`.

Schedules are defined as a possibly infinite set of intervals spread out over
time. Each interval defines a window in which recurrence is possible.

When schedules are used to repeat or retry effects, the starting boundary of
each interval produced by a schedule is used as the moment when the effect
will be executed again.

Schedules compose in the following primary ways:

- Union: performs the union of the intervals of two schedules
- Intersection: performs the intersection of the intervals of two schedules
- Sequence: concatenates the intervals of one schedule onto another

In addition, schedule inputs and outputs can be transformed, filtered (to
terminate a schedule early in response to some input or output), and so
forth.

A variety of other operators exist for transforming and combining schedules,
and the companion object for `Schedule` contains all common types of
schedules, both for performing retrying, as well as performing repetition.

**Signature**

```ts
export interface Schedule<Env, In, Out> extends Schedule.Variance<Env, In, Out> {
  /** @internal */
  readonly initial: any
  /**
   * @macro traced
   * @internal
   */
  readonly step: (
    now: number,
    input: In,
    state: any
  ) => Effect.Effect<Env, never, readonly [any, Out, ScheduleDecision.ScheduleDecision]>
}
```

Added in v1.0.0

# models

## ScheduleDriver (interface)

**Signature**

```ts
export interface ScheduleDriver<Env, In, Out> extends Schedule.DriverVariance<Env, In, Out> {
  /**
   * @macro traced
   */
  state(): Effect.Effect<never, never, unknown>
  /**
   * @macro traced
   */
  last(): Effect.Effect<never, Cause.NoSuchElementException, Out>
  /**
   * @macro traced
   */
  reset(): Effect.Effect<never, never, void>
  /**
   * @macro traced
   */
  next(input: In): Effect.Effect<Env, Option.Option<never>, Out>
}
```

Added in v1.0.0

# mutations

## addDelay

Returns a new schedule with the given delay added to every interval defined
by this schedule.

**Signature**

```ts
export declare const addDelay: <Out>(
  f: (out: Out) => Duration
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
```

Added in v1.0.0

## addDelayEffect

Returns a new schedule with the given effectfully computed delay added to
every interval defined by this schedule.

**Signature**

```ts
export declare const addDelayEffect: <Out, Env2>(
  f: (out: Out) => Effect.Effect<Env2, never, Duration>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
```

Added in v1.0.0

## bothInOut

Returns a new schedule that has both the inputs and outputs of this and the
specified schedule.

**Signature**

```ts
export declare const bothInOut: <Env2, In2, Out2>(
  that: Schedule<Env2, In2, Out2>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, readonly [In, In2], readonly [Out, Out2]>
```

Added in v1.0.0

## check

Returns a new schedule that passes each input and output of this schedule
to the specified function, and then determines whether or not to continue
based on the return value of the function.

**Signature**

```ts
export declare const check: <In, Out>(
  test: (input: In, output: Out) => boolean
) => <Env>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
```

Added in v1.0.0

## checkEffect

Returns a new schedule that passes each input and output of this schedule
to the specified function, and then determines whether or not to continue
based on the return value of the function.

**Signature**

```ts
export declare const checkEffect: <In, Out, Env2>(
  test: (input: In, output: Out) => Effect.Effect<Env2, never, boolean>
) => <Env>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
```

Added in v1.0.0

## collectAllOutputs

Returns a new schedule that collects the outputs of this one into a chunk.

**Signature**

```ts
export declare const collectAllOutputs: <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Chunk<Out>>
```

Added in v1.0.0

## collectUntil

A schedule that recurs until the condition f fails, collecting all inputs
into a list.

**Signature**

```ts
export declare const collectUntil: <A>(f: Predicate<A>) => Schedule<never, A, Chunk<A>>
```

Added in v1.0.0

## collectUntilEffect

A schedule that recurs until the effectful condition f fails, collecting
all inputs into a list.

**Signature**

```ts
export declare const collectUntilEffect: <Env, A>(
  f: (a: A) => Effect.Effect<Env, never, boolean>
) => Schedule<Env, A, Chunk<A>>
```

Added in v1.0.0

## collectWhile

A schedule that recurs as long as the condition f holds, collecting all
inputs into a list.

**Signature**

```ts
export declare const collectWhile: <A>(f: Predicate<A>) => Schedule<never, A, Chunk<A>>
```

Added in v1.0.0

## collectWhileEffect

A schedule that recurs as long as the effectful condition holds, collecting
all inputs into a list.

**Signature**

```ts
export declare const collectWhileEffect: <Env, A>(
  f: (a: A) => Effect.Effect<Env, never, boolean>
) => Schedule<Env, A, Chunk<A>>
```

Added in v1.0.0

## compose

Returns the composition of this schedule and the specified schedule, by
piping the output of this one into the input of the other. Effects
described by this schedule will always be executed before the effects
described by the second schedule.

**Signature**

```ts
export declare const compose: <Env1, Out, Out2>(
  that: Schedule<Env1, Out, Out2>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env1 | Env, In, Out2>
```

Added in v1.0.0

## delayed

Returns a new schedule with the specified effectfully computed delay added
before the start of each interval produced by this schedule.

**Signature**

```ts
export declare const delayed: (
  f: (duration: Duration) => Duration
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
```

Added in v1.0.0

## intersect

Returns a new schedule that performs a geometric intersection on the
intervals defined by both schedules.

**Signature**

```ts
export declare const intersect: <Env2, In2, Out2>(
  that: Schedule<Env2, In2, Out2>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, readonly [Out, Out2]>
```

Added in v1.0.0

## intersectWith

Returns a new schedule that combines this schedule with the specified
schedule, continuing as long as both schedules want to continue and merging
the next intervals according to the specified merge function.

**Signature**

```ts
export declare const intersectWith: <Env2, In2, Out2>(
  that: Schedule<Env2, In2, Out2>,
  f: (x: Intervals, y: Intervals) => Intervals
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, readonly [Out, Out2]>
```

Added in v1.0.0

## left

Returns a new schedule that makes this schedule available on the `Left`
side of an `Either` input, allowing propagating some type `X` through this
channel on demand.

**Signature**

```ts
export declare const left: <Env, In, Out, X>(
  self: Schedule<Env, In, Out>
) => Schedule<Env, Either<In, X>, Either<Out, X>>
```

Added in v1.0.0

## modifyDelay

Returns a new schedule that modifies the delay using the specified
function.

**Signature**

```ts
export declare const modifyDelay: <Out>(
  f: (out: Out, duration: Duration) => Duration
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
```

Added in v1.0.0

## modifyDelayEffect

Returns a new schedule that modifies the delay using the specified
effectual function.

**Signature**

```ts
export declare const modifyDelayEffect: <Out, Env2>(
  f: (out: Out, duration: Duration) => Effect.Effect<Env2, never, Duration>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
```

Added in v1.0.0

## onDecision

Returns a new schedule that applies the current one but runs the specified
effect for every decision of this schedule. This can be used to create
schedules that log failures, decisions, or computed values.

**Signature**

```ts
export declare const onDecision: <Out, Env2, X>(
  f: (out: Out, decision: ScheduleDecision.ScheduleDecision) => Effect.Effect<Env2, never, X>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
```

Added in v1.0.0

## passthrough

Returns a new schedule that passes through the inputs of this schedule.

**Signature**

```ts
export declare const passthrough: <Env, Input, Output>(
  self: Schedule<Env, Input, Output>
) => Schedule<Env, Input, Input>
```

Added in v1.0.0

## reconsider

Returns a new schedule that reconsiders every decision made by this
schedule, possibly modifying the next interval and the output type in the
process.

**Signature**

```ts
export declare const reconsider: <Out, Out2>(
  f: (out: Out, decision: ScheduleDecision.ScheduleDecision) => Either<Out2, readonly [Out2, Interval]>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out2>
```

Added in v1.0.0

## reconsiderEffect

Returns a new schedule that effectfully reconsiders every decision made by
this schedule, possibly modifying the next interval and the output type in
the process.

**Signature**

```ts
export declare const reconsiderEffect: <Out, Env2, Out2>(
  f: (
    out: Out,
    decision: ScheduleDecision.ScheduleDecision
  ) => Effect.Effect<Env2, never, Either<Out2, readonly [Out2, Interval]>>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out2>
```

Added in v1.0.0

## recurUntil

A schedule that recurs for until the predicate evaluates to true.

**Signature**

```ts
export declare const recurUntil: <A>(f: Predicate<A>) => Schedule<never, A, A>
```

Added in v1.0.0

## recurUntilEffect

A schedule that recurs for until the predicate evaluates to true.

**Signature**

```ts
export declare const recurUntilEffect: <Env, A>(f: (a: A) => Effect.Effect<Env, never, boolean>) => Schedule<Env, A, A>
```

Added in v1.0.0

## recurUntilEquals

A schedule that recurs for until the predicate is equal.

**Signature**

```ts
export declare const recurUntilEquals: <A>(value: A) => Schedule<never, A, A>
```

Added in v1.0.0

## recurUntilOption

A schedule that recurs for until the input value becomes applicable to
partial function and then map that value with given function.

**Signature**

```ts
export declare const recurUntilOption: <A, B>(pf: (a: A) => Option.Option<B>) => Schedule<never, A, Option.Option<B>>
```

Added in v1.0.0

## recurUpTo

A schedule that recurs during the given duration.

**Signature**

```ts
export declare const recurUpTo: (duration: Duration) => Schedule<never, unknown, Duration>
```

Added in v1.0.0

## recurWhile

A schedule that recurs for as long as the predicate evaluates to true.

**Signature**

```ts
export declare const recurWhile: <A>(f: Predicate<A>) => Schedule<never, A, A>
```

Added in v1.0.0

## recurWhileEffect

A schedule that recurs for as long as the effectful predicate evaluates to
true.

**Signature**

```ts
export declare const recurWhileEffect: <Env, A>(f: (a: A) => Effect.Effect<Env, never, boolean>) => Schedule<Env, A, A>
```

Added in v1.0.0

## recurWhileEquals

A schedule that recurs for as long as the predicate is equal to the
specified value.

**Signature**

```ts
export declare const recurWhileEquals: <A>(value: A) => Schedule<never, A, A>
```

Added in v1.0.0

## repetitions

Returns a new schedule that outputs the number of repetitions of this one.

**Signature**

```ts
export declare const repetitions: <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, number>
```

Added in v1.0.0

## resetAfter

Return a new schedule that automatically resets the schedule to its initial
state after some time of inactivity defined by `duration`.

**Signature**

```ts
export declare const resetAfter: (
  duration: Duration
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
```

Added in v1.0.0

## resetWhen

Resets the schedule when the specified predicate on the schedule output
evaluates to true.

**Signature**

```ts
export declare const resetWhen: <Out>(
  f: Predicate<Out>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
```

Added in v1.0.0

## right

Returns a new schedule that makes this schedule available on the `Right`
side of an `Either` input, allowing propagating some type `X` through this
channel on demand.

**Signature**

```ts
export declare const right: <Env, In, Out, X>(
  self: Schedule<Env, In, Out>
) => Schedule<Env, Either<X, In>, Either<X, Out>>
```

Added in v1.0.0

## union

Returns a new schedule that performs a geometric union on the intervals
defined by both schedules.

**Signature**

```ts
export declare const union: <Env2, In2, Out2>(
  that: Schedule<Env2, In2, Out2>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, readonly [Out, Out2]>
```

Added in v1.0.0

## unionWith

Returns a new schedule that combines this schedule with the specified
schedule, continuing as long as either schedule wants to continue and
merging the next intervals according to the specified merge function.

**Signature**

```ts
export declare const unionWith: <Env2, In2, Out2>(
  that: Schedule<Env2, In2, Out2>,
  f: (x: Intervals, y: Intervals) => Intervals
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, readonly [Out, Out2]>
```

Added in v1.0.0

## untilInput

Returns a new schedule that continues until the specified predicate on the
input evaluates to true.

**Signature**

```ts
export declare const untilInput: <In>(
  f: Predicate<In>
) => <Env, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
```

Added in v1.0.0

## untilInputEffect

Returns a new schedule that continues until the specified effectful
predicate on the input evaluates to true.

**Signature**

```ts
export declare const untilInputEffect: <In, Env2>(
  f: (input: In) => Effect.Effect<Env2, never, boolean>
) => <Env, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
```

Added in v1.0.0

## untilOutput

Returns a new schedule that continues until the specified predicate on the
output evaluates to true.

**Signature**

```ts
export declare const untilOutput: <Out>(
  f: Predicate<Out>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
```

Added in v1.0.0

## untilOutputEffect

Returns a new schedule that continues until the specified effectful
predicate on the output evaluates to true.

**Signature**

```ts
export declare const untilOutputEffect: <Out, Env2>(
  f: (out: Out) => Effect.Effect<Env2, never, boolean>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
```

Added in v1.0.0

## upTo

A schedule that recurs during the given duration.

**Signature**

```ts
export declare const upTo: (
  duration: Duration
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
```

Added in v1.0.0

## whileInput

Returns a new schedule that continues for as long the specified predicate
on the input evaluates to true.

**Signature**

```ts
export declare const whileInput: <In>(
  f: Predicate<In>
) => <Env, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
```

Added in v1.0.0

## whileInputEffect

Returns a new schedule that continues for as long the specified effectful
predicate on the input evaluates to true.

**Signature**

```ts
export declare const whileInputEffect: <In, Env1>(
  f: (input: In) => Effect.Effect<Env1, never, boolean>
) => <Env, Out>(self: Schedule<Env, In, Out>) => Schedule<Env1 | Env, In, Out>
```

Added in v1.0.0

## whileOutput

Returns a new schedule that continues for as long the specified predicate
on the output evaluates to true.

**Signature**

```ts
export declare const whileOutput: <Out>(
  f: Predicate<Out>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
```

Added in v1.0.0

## whileOutputEffect

Returns a new schedule that continues for as long the specified effectful
predicate on the output evaluates to true.

**Signature**

```ts
export declare const whileOutputEffect: <Out, Env1>(
  f: (out: Out) => Effect.Effect<Env1, never, boolean>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env1 | Env, In, Out>
```

Added in v1.0.0

# sequencing

## andThen

The same as `andThenEither`, but merges the output.

**Signature**

```ts
export declare const andThen: <Env1, In1, Out2>(
  that: Schedule<Env1, In1, Out2>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env1 | Env, In & In1, Out2 | Out>
```

Added in v1.0.0

## andThenEither

Returns a new schedule that first executes this schedule to completion, and
then executes the specified schedule to completion.

**Signature**

```ts
export declare const andThenEither: <Env2, In2, Out2>(
  that: Schedule<Env2, In2, Out2>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, Either<Out, Out2>>
```

Added in v1.0.0

## tapInput

Returns a new schedule that effectfully processes every input to this
schedule.

**Signature**

```ts
export declare const tapInput: <Env2, In2, X>(
  f: (input: In2) => Effect.Effect<Env2, never, X>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, Out>
```

Added in v1.0.0

## tapOutput

Returns a new schedule that effectfully processes every output from this
schedule.

**Signature**

```ts
export declare const tapOutput: <Out, Env2, X>(
  f: (out: Out) => Effect.Effect<Env2, never, X>
) => <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
```

Added in v1.0.0

# symbols

## ScheduleDriverTypeId

**Signature**

```ts
export declare const ScheduleDriverTypeId: typeof ScheduleDriverTypeId
```

Added in v1.0.0

## ScheduleDriverTypeId (type alias)

**Signature**

```ts
export type ScheduleDriverTypeId = typeof ScheduleDriverTypeId
```

Added in v1.0.0

## ScheduleTypeId

**Signature**

```ts
export declare const ScheduleTypeId: typeof ScheduleTypeId
```

Added in v1.0.0

## ScheduleTypeId (type alias)

**Signature**

```ts
export type ScheduleTypeId = typeof ScheduleTypeId
```

Added in v1.0.0

# zipping

## zipLeft

The same as `intersect` but ignores the right output.

**Signature**

```ts
export declare const zipLeft: <Env2, In2, Out2>(
  that: Schedule<Env2, In2, Out2>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, Out>
```

Added in v1.0.0

## zipRight

The same as `intersect` but ignores the left output.

**Signature**

```ts
export declare const zipRight: <Env2, In2, Out2>(
  that: Schedule<Env2, In2, Out2>
) => <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, Out2>
```

Added in v1.0.0

## zipWith

Equivalent to `intersect` followed by `map`.

**Signature**

```ts
export declare const zipWith: typeof internal.zipWith
```

Added in v1.0.0
