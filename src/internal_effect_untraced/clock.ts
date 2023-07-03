import * as Context from "@effect/data/Context"
import * as Debug from "@effect/data/Debug"
import type * as Duration from "@effect/data/Duration"
import * as Either from "@effect/data/Either"
import { constFalse } from "@effect/data/Function"
import type * as Clock from "@effect/io/Clock"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal_effect_untraced/core"

/** @internal */
const ClockSymbolKey = "@effect/io/Clock"

/** @internal */
export const ClockTypeId: Clock.ClockTypeId = Symbol.for(ClockSymbolKey) as Clock.ClockTypeId

/** @internal */
export const clockTag: Context.Tag<Clock.Clock, Clock.Clock> = Context.Tag(ClockTypeId)

/** @internal */
export const MAX_TIMER_MILLIS = 2 ** 31 - 1

/** @internal */
export const globalClockScheduler: Clock.ClockScheduler = {
  unsafeSchedule(task: Clock.Task, duration: Duration.Duration): Clock.CancelToken {
    // If the duration is greater than the value allowable by the JS timer
    // functions, treat the value as an infinite duration
    if (duration.millis > MAX_TIMER_MILLIS) {
      return constFalse
    }
    let completed = false
    const handle = setTimeout(() => {
      completed = true
      task()
    }, duration.millis)
    return () => {
      clearTimeout(handle)
      return !completed
    }
  }
}

const performanceNowNanos = (function() {
  const origin = BigInt(Math.round(performance.timeOrigin * 1_000_000))
  return () => {
    const now = performance.now()
    const millis = Math.floor(now)
    return origin + BigInt(millis * 1000000) + BigInt(Math.round((now - millis) * 1_000_000))
  }
})()

/** @internal */
class ClockImpl implements Clock.Clock {
  readonly [ClockTypeId]: Clock.ClockTypeId = ClockTypeId

  readonly processHrtime = typeof process === "object" && "hrtime" in process ? process.hrtime : undefined
  readonly timeOrigin = this.processHrtime ?
    performanceNowNanos() - this.processHrtime.bigint() :
    0n

  unsafeCurrentTimeMillis(): number {
    return Date.now()
  }

  unsafeCurrentTimeNanos(): bigint {
    return this.processHrtime ?
      this.timeOrigin + this.processHrtime.bigint() :
      performanceNowNanos()
  }

  currentTimeMillis(): Effect.Effect<never, never, number> {
    return Debug.bodyWithTrace((trace) => core.sync(() => this.unsafeCurrentTimeMillis()).traced(trace))
  }

  currentTimeNanos(): Effect.Effect<never, never, bigint> {
    return Debug.bodyWithTrace((trace) => core.sync(() => this.unsafeCurrentTimeNanos()).traced(trace))
  }

  scheduler(): Effect.Effect<never, never, Clock.ClockScheduler> {
    return Debug.bodyWithTrace((trace) => core.succeed(globalClockScheduler).traced(trace))
  }

  sleep(duration: Duration.Duration): Effect.Effect<never, never, void> {
    return Debug.bodyWithTrace((trace) =>
      core.asyncInterruptEither<never, never, void>((cb) => {
        const canceler = globalClockScheduler.unsafeSchedule(() => cb(core.unit()), duration)
        return Either.left(core.asUnit(core.sync(canceler)))
      }).traced(trace)
    )
  }
}

/** @internal */
export const make = (): Clock.Clock => new ClockImpl()
