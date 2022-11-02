import type * as Clock from "@effect/io/Clock"
import { getCallTrace } from "@effect/io/Debug"
import type * as DefaultServices from "@effect/io/DefaultServices"
import type * as Effect from "@effect/io/Effect"
import * as clock from "@effect/io/internal/clock"
import * as core from "@effect/io/internal/core"
import * as Context from "@fp-ts/data/Context"
import type * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
export const liveServices: Context.Context<DefaultServices.DefaultServices> = pipe(
  Context.empty(),
  Context.add(clock.clockTag)(clock.make())
  // TODO(Max): implement after Random
  // Context.add(Random.Tag)(Random.default)
)

/**
 * The `FiberRef` holding the default `Effect` services.
 *
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentServices = core.unsafeMakeEnvironmentFiberRef(liveServices)

// circular

/** @internal */
export const currentTimeMillis = (): Effect.Effect<never, never, number> => {
  const trace = getCallTrace()
  return clockWith((clock) => clock.currentTimeMillis).traced(trace)
}

/** @internal */
export const sleep = (duration: Duration.Duration): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return clockWith((clock) => clock.sleep(duration)).traced(trace)
}

/** @internal */
export const clockWith = <R, E, A>(f: (clock: Clock.Clock) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return pipe(
    currentServices,
    core.getWithFiberRef((services) => f(pipe(services, Context.get(clock.clockTag))))
  ).traced(trace)
}
