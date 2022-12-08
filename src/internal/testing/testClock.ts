import type * as Clock from "@effect/io/Clock"
import { getCallTrace } from "@effect/io/Debug"
import type { Deferred } from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import type * as Fiber from "@effect/io/Fiber"
import type * as FiberId from "@effect/io/Fiber/Id"
import * as FiberStatus from "@effect/io/Fiber/Status"
import * as clock from "@effect/io/internal/clock"
import * as core from "@effect/io/internal/core"
import * as defaultServices from "@effect/io/internal/defaultServices"
import * as effect from "@effect/io/internal/effect"
import * as circular from "@effect/io/internal/effect/circular"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as layer from "@effect/io/internal/layer"
import * as ref from "@effect/io/internal/ref"
import * as synchronized from "@effect/io/internal/synchronizedRef"
import * as Annotations from "@effect/io/internal/testing/annotations"
import * as Live from "@effect/io/internal/testing/live"
import * as Data from "@effect/io/internal/testing/testClock/data"
import * as SuspendedWarningData from "@effect/io/internal/testing/testClock/suspendedWarningData"
import * as WarningData from "@effect/io/internal/testing/testClock/warningData"
import type * as Layer from "@effect/io/Layer"
import type * as Ref from "@effect/io/Ref"
import type * as Synchronized from "@effect/io/Ref/Synchronized"
import * as Order from "@fp-ts/core/typeclass/Order"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import * as Duration from "@fp-ts/data/Duration"
import * as Equal from "@fp-ts/data/Equal"
import { constVoid, identity, pipe } from "@fp-ts/data/Function"
import * as HashMap from "@fp-ts/data/HashMap"
import * as number from "@fp-ts/data/Number"
import * as Option from "@fp-ts/data/Option"
import type * as SortedSet from "@fp-ts/data/SortedSet"

/**
 * A `TestClock` makes it easy to deterministically and efficiently test effects
 * involving the passage of time.
 *
 * Instead of waiting for actual time to pass, `sleep` and methods implemented
 * in terms of it schedule effects to take place at a given clock time. Users
 * can adjust the clock time using the `adjust` and `setTime` methods, and all
 * effects scheduled to take place on or before that time will automatically be
 * run in order.
 *
 * For example, here is how we can test `Effect.timeout` using `TestClock`:
 *
 * ```ts
 * import * as Effect from "@effect/io/Effect"
 * import * as Fiber from "@effect/io/Fiber"
 * import * as TestClock from "@effect/test/TestClock"
 * import * as Duration from "@fp-ts/data/Duration"
 * import * as Option from "@fp-ts/data/Option"
 *
 * Effect.gen(function*() {
 *   const fiber = yield* pipe(
 *     Effect.sleep(Duration.minutes(5)),
 *     Effect.timeout(Duration.minutes(1)),
 *     Effect.fork
 *   )
 *   yield* TestClock.adjust(Duration.minutes(1))
 *   const result = yield* Fiber.join(fiber)
 *   assert.deepStrictEqual(result, Option.none)
 * })
 * ```
 *
 * Note how we forked the fiber that `sleep` was invoked on. Calls to `sleep`
 * and methods derived from it will semantically block until the time is set to
 * on or after the time they are scheduled to run. If we didn't fork the fiber
 * on which we called sleep we would never get to set the time on the line
 * below. Thus, a useful pattern when using `TestClock` is to fork the effect
 * being tested, then adjust the clock time, and finally verify that the
 * expected effects have been performed.
 */
export interface TestClock extends Clock.Clock {
  /**
   * @macro traced
   */
  adjust(duration: Duration.Duration): Effect.Effect<never, never, void>
  /**
   * @macro traced
   */
  adjustWith(duration: Duration.Duration): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  /**
   * @macro traced
   */
  save(): Effect.Effect<never, never, Effect.Effect<never, never, void>>
  /**
   * @macro traced
   */
  setTime(time: number): Effect.Effect<never, never, void>
  /**
   * @macro traced
   */
  sleeps(): Effect.Effect<never, never, Chunk.Chunk<number>>
}

export const Tag: Context.Tag<TestClock> = Context.Tag<TestClock>()

/**
 * The warning message that will be displayed if a test is using time but is
 * not advancing the `TestClock`.
 */
const warning = "Warning: A test is using time, but is not advancing " +
  "the test clock, which may result in the test hanging. Use TestClock.adjust to " +
  "manually advance the time."

/**
 * The warning message that will be displayed if a test is advancing the clock
 * but a fiber is still running.
 */
const suspendedWarning = "Warning: A test is advancing the test clock, " +
  "but a fiber is not suspending, which may result in the test hanging. Use " +
  "TestAspect.diagnose to identity the fiber that is not suspending."

/** @internal */
export class TestClockImpl implements TestClock {
  [clock.ClockTypeId]: Clock.ClockTypeId = clock.ClockTypeId
  constructor(
    readonly clockState: Ref.Ref<Data.Data>,
    readonly live: Live.Live,
    readonly annotations: Annotations.Annotations,
    readonly warningState: Synchronized.Synchronized<WarningData.WarningData>,
    readonly suspendedWarningState: Synchronized.Synchronized<SuspendedWarningData.SuspendedWarningData>
  ) {}
  /**
   * Returns the current clock time in milliseconds.
   *
   * @macro traced
   */
  currentTimeMillis(): Effect.Effect<never, never, number> {
    const trace = getCallTrace()
    return pipe(ref.get(this.clockState), core.map((data) => data.instant)).traced(trace)
  }
  /**
   * Saves the `TestClock`'s current state in an effect which, when run, will
   * restore the `TestClock` state to the saved state.
   *
   * @macro traced
   */
  save(): Effect.Effect<never, never, Effect.Effect<never, never, void>> {
    const trace = getCallTrace()
    return pipe(ref.get(this.clockState), core.map((data) => pipe(this.clockState, ref.set(data)))).traced(trace)
  }
  /**
   * Sets the current clock time to the specified instant. Any effects that
   * were scheduled to occur on or before the new time will be run in order.
   *
   * @macro traced
   */
  setTime(instant: number): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return pipe(this.warningDone(), core.zipRight(this.run(() => instant))).traced(trace)
  }
  /**
   * Semantically blocks the current fiber until the clock time is equal to or
   * greater than the specified duration. Once the clock time is adjusted to
   * on or after the duration, the fiber will automatically be resumed.
   *
   * @macro traced
   */
  sleep(duration: Duration.Duration): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return pipe(
      core.deferredMake<never, void>(),
      core.flatMap((deferred) =>
        pipe(
          this.clockState,
          ref.modify((data) => {
            const end = data.instant + duration.millis
            if (end > data.instant) {
              return [
                true,
                Data.make(data.instant, pipe(data.sleeps, Chunk.prepend([end, deferred] as const)))
              ] as const
            }
            return [false, data] as const
          }),
          core.flatMap((shouldAwait) =>
            shouldAwait ?
              pipe(this.warningStart(), core.zipRight(core.deferredAwait(deferred))) :
              pipe(deferred, core.deferredSucceed<void>(void 0), core.asUnit)
          )
        )
      )
    ).traced(trace)
  }
  /**
   * Returns a list of the times at which all queued effects are scheduled to
   * resume.
   *
   * @macro traced
   */
  sleeps(): Effect.Effect<never, never, Chunk.Chunk<number>> {
    const trace = getCallTrace()
    return pipe(ref.get(this.clockState), core.map((data) => pipe(data.sleeps, Chunk.map((_) => _[0])))).traced(trace)
  }
  /**
   * Increments the current clock time by the specified duration. Any effects
   * that were scheduled to occur on or before the new time will be run in
   * order.
   *
   * @macro traced
   */
  adjust(duration: Duration.Duration): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return pipe(this.warningDone(), core.zipRight(this.run((n) => n + duration.millis))).traced(trace)
  }
  /**
   * Increments the current clock time by the specified duration. Any effects
   * that were scheduled to occur on or before the new time will be run in
   * order.
   *
   * @macro traced
   */
  adjustWith(duration: Duration.Duration) {
    const trace = getCallTrace()
    return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
      return pipe(effect, circular.zipParLeft(this.adjust(duration))).traced(trace)
    }
  }
  /**
   * Returns a set of all fibers in this test.
   *
   * @macro traced
   */
  supervisedFibers(): Effect.Effect<never, never, SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>> {
    const trace = getCallTrace()
    return this.annotations.supervisedFibers().traced(trace)
  }
  /**
   * Captures a "snapshot" of the identifier and status of all fibers in this
   * test other than the current fiber. Fails with the `Unit` value if any of
   * these fibers are not done or suspended. Note that because we cannot
   * synchronize on the status of multiple fibers at the same time this
   * snapshot may not be fully consistent.
   *
   * @macro traced
   */
  freeze(): Effect.Effect<never, void, HashMap.HashMap<FiberId.FiberId, FiberStatus.FiberStatus>> {
    const trace = getCallTrace()
    return pipe(
      this.supervisedFibers(),
      core.flatMap((fibers) =>
        pipe(
          fibers,
          effect.reduce(HashMap.empty<FiberId.FiberId, FiberStatus.FiberStatus>(), (map, fiber) =>
            pipe(
              fiber.status(),
              core.flatMap((status) => {
                if (FiberStatus.isDone(status)) {
                  return core.succeed(
                    pipe(map, HashMap.set(fiber.id() as FiberId.FiberId, status as FiberStatus.FiberStatus))
                  )
                }
                if (FiberStatus.isSuspended(status)) {
                  return core.succeed(
                    pipe(map, HashMap.set(fiber.id() as FiberId.FiberId, status as FiberStatus.FiberStatus))
                  )
                }
                return core.fail(void 0)
              })
            ))
        )
      )
    ).traced(trace)
  }
  /**
   * Forks a fiber that will display a warning message if a test is using time
   * but is not advancing the `TestClock`.
   *
   * @macro traced
   */
  warningStart(): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return pipe(
      this.warningState,
      synchronized.updateSomeEffect((data) =>
        WarningData.isStart(data) ?
          Option.some(
            pipe(
              this.live.provide(pipe(effect.logWarning(warning), effect.delay(Duration.seconds(5)))),
              core.interruptible,
              fiberRuntime.fork,
              core.map((fiber) => WarningData.pending(fiber))
            )
          ) :
          Option.none
      )
    ).traced(trace)
  }
  /**
   * Cancels the warning message that is displayed if a test is using time but
   * is not advancing the `TestClock`.
   *
   * @macro traced
   */
  warningDone(): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return pipe(
      this.warningState,
      synchronized.updateSomeEffect((warningData) => {
        if (WarningData.isStart(warningData)) {
          return Option.some(core.succeed(WarningData.done))
        }
        if (WarningData.isPending(warningData)) {
          return Option.some(pipe(core.interruptFiber(warningData.fiber), core.as(WarningData.done)))
        }
        return Option.none
      })
    ).traced(trace)
  }
  /**
   * Returns whether all descendants of this fiber are done or suspended.
   *
   * @macro traced
   */
  suspended(): Effect.Effect<never, void, HashMap.HashMap<FiberId.FiberId, FiberStatus.FiberStatus>> {
    const trace = getCallTrace()
    return pipe(
      this.freeze(),
      core.zip(this.live.provide(pipe(effect.sleep(Duration.millis(5)), core.zipRight(this.freeze())))),
      core.flatMap(([first, last]) =>
        Equal.equals(first, last) ?
          core.succeed(first) :
          core.fail(void 0)
      )
    ).traced(trace)
  }
  /**
   * Polls until all descendants of this fiber are done or suspended.
   *
   * @macro traced
   */
  awaitSuspended(): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return pipe(
      this.suspendedWarningStart(),
      core.zipRight(
        pipe(
          this.suspended(),
          core.zipWith(
            pipe(this.live.provide(effect.sleep(Duration.millis(10))), core.zipRight(this.suspended())),
            Equal.equals
          ),
          effect.filterOrFail(identity, constVoid),
          effect.eventually
        )
      ),
      core.zipRight(this.suspendedWarningDone())
    ).traced(trace)
  }
  /**
   * Forks a fiber that will display a warning message if a test is advancing
   * the `TestClock` but a fiber is not suspending.
   *
   * @macro traced
   */
  suspendedWarningStart(): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return pipe(
      this.suspendedWarningState,
      synchronized.updateSomeEffect((suspendedWarningData) => {
        if (SuspendedWarningData.isStart(suspendedWarningData)) {
          return Option.some(
            pipe(
              this.live.provide(
                pipe(
                  effect.logWarning(suspendedWarning),
                  core.zipRight(pipe(this.suspendedWarningState, synchronized.set(SuspendedWarningData.done))),
                  effect.delay(Duration.seconds(5))
                )
              ),
              core.interruptible,
              fiberRuntime.fork,
              core.map((fiber) => SuspendedWarningData.pending(fiber))
            )
          )
        }
        return Option.none
      })
    ).traced(trace)
  }
  /**
   * Cancels the warning message that is displayed if a test is advancing the
   * `TestClock` but a fiber is not suspending.
   *
   * @macro traced
   */
  suspendedWarningDone(): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return pipe(
      this.suspendedWarningState,
      synchronized.updateSomeEffect((suspendedWarningData) => {
        if (SuspendedWarningData.isPending(suspendedWarningData)) {
          return Option.some(pipe(core.interruptFiber(suspendedWarningData.fiber), core.as(SuspendedWarningData.start)))
        }
        return Option.none
      })
    ).traced(trace)
  }
  /**
   * Runs all effects scheduled to occur on or before the specified instant,
   * which may depend on the current time, in order.
   *
   * @macro traced
   */
  run(f: (instant: number) => number): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return pipe(
      this.awaitSuspended(),
      core.zipRight(pipe(
        this.clockState,
        ref.modify((data) => {
          const end = f(data.instant)
          const sorted = pipe(
            data.sleeps,
            Chunk.sort<readonly [number, Deferred<never, void>]>(pipe(number.Order, Order.contramap((_) => _[0])))
          )
          if (Chunk.isNonEmpty(sorted)) {
            const [instant, deferred] = Chunk.headNonEmpty(sorted)
            if (instant <= end) {
              return [
                Option.some([end, deferred] as const),
                Data.make(instant, Chunk.tailNonEmpty(sorted))
              ] as const
            }
          }
          return [Option.none, Data.make(end, data.sleeps)] as const
        }),
        core.flatMap((option) => {
          switch (option._tag) {
            case "None": {
              return core.unit()
            }
            case "Some": {
              const [end, deferred] = option.value
              return pipe(
                deferred,
                core.deferredSucceed<void>(void 0),
                core.zipRight(core.yieldNow()),
                core.zipRight(this.run(() => end))
              )
            }
          }
        })
      ))
    ).traced(trace)
  }
}

export const live = (data: Data.Data): Layer.Layer<Annotations.Annotations | Live.Live, never, TestClock> => {
  return layer.scoped(Tag)(effect.gen(function*($) {
    const live = yield* $(core.service(Live.Tag))
    const annotations = yield* $(core.service(Annotations.Tag))
    const clockState = yield* $(core.sync(() => ref.unsafeMake(data)))
    const warningState = yield* $(circular.makeSynchronized(WarningData.start))
    const suspendedWarningState = yield* $(circular.makeSynchronized(SuspendedWarningData.start))
    const testClock = new TestClockImpl(clockState, live, annotations, warningState, suspendedWarningState)
    yield* $(fiberRuntime.withClockScoped(testClock))
    yield* $(
      fiberRuntime.addFinalizer(() => pipe(testClock.warningDone(), core.zipRight(testClock.suspendedWarningDone())))
    )
    return testClock
  }))
}

export const defaultTestClock: Layer.Layer<Annotations.Annotations | Live.Live, never, TestClock> = live(
  Data.make(new Date(0).getTime(), Chunk.empty())
)

/**
 * Accesses a `TestClock` instance in the environment and increments the time
 * by the specified duration, running any actions scheduled for on or before
 * the new time in order.
 *
 * @macro traced
 */
export const adjust = (duration: Duration.Duration): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return testClockWith((testClock) => testClock.adjust(duration)).traced(trace)
}

/**
 * @macro traced
 */
export const adjustWith = (duration: Duration.Duration) => {
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    const trace = getCallTrace()
    return testClockWith((testClock) => testClock.adjustWith(duration)(effect)).traced(trace)
  }
}

/**
 * Accesses the current time of a `TestClock` instance in the environment in
 * milliseconds.
 *
 * @macro traced
 */
export const currentTimeMillis = (): Effect.Effect<never, never, number> => {
  const trace = getCallTrace()
  return testClockWith((testClock) => testClock.currentTimeMillis()).traced(trace)
}

/**
 * Accesses a `TestClock` instance in the environment and saves the clock
 * state in an effect which, when run, will restore the `TestClock` to the
 * saved state.
 *
 * @macro traced
 */
export const save = (): Effect.Effect<never, never, Effect.Effect<never, never, void>> => {
  const trace = getCallTrace()
  return testClockWith((testClock) => testClock.save()).traced(trace)
}

/**
 * Accesses a `TestClock` instance in the environment and sets the clock time
 * to the specified `Instant`, running any actions scheduled for on or before
 * the new time in order.
 *
 * @macro traced
 */
export const setTime = (instant: number): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return testClockWith((testClock) => testClock.setTime(instant)).traced(trace)
}

/**
 * Semantically blocks the current fiber until the clock time is equal to or
 * greater than the specified duration. Once the clock time is adjusted to
 * on or after the duration, the fiber will automatically be resumed.
 *
 * @macro traced
 */
export const sleep = (duration: Duration.Duration): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return testClockWith((testClock) => testClock.sleep(duration)).traced(trace)
}

/**
 * Accesses a `TestClock` instance in the environment and returns a list of
 * times that effects are scheduled to run.
 *
 * @macro traced
 */
export const sleeps = (): Effect.Effect<never, never, Chunk.Chunk<number>> => {
  const trace = getCallTrace()
  return testClockWith((testClock) => testClock.sleeps()).traced(trace)
}

/**
 * Retrieves the `TestClock` service for this test.
 *
 * @macro traced
 */
export const testClock = (): Effect.Effect<never, never, TestClock> => {
  const trace = getCallTrace()
  return testClockWith(core.succeed).traced(trace)
}

/**
 * Retrieves the `TestClock` service for this test and uses it to run the
 * specified workflow.
 *
 * @macro traced
 */
export const testClockWith = <R, E, A>(f: (testClock: TestClock) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return pipe(
    defaultServices.currentServices,
    core.fiberRefGetWith((services) => f(pipe(services, Context.get(clock.clockTag)) as TestClock))
  ).traced(trace)
}
