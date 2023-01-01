import type * as Clock from "@effect/io/Clock"
import type { Config } from "@effect/io/Config"
import type { ConfigProvider } from "@effect/io/Config/Provider"
import { getCallTrace } from "@effect/io/Debug"
import type * as DefaultServices from "@effect/io/DefaultServices"
import type * as Effect from "@effect/io/Effect"
import * as clock from "@effect/io/internal/clock"
import * as configProvider from "@effect/io/internal/configProvider"
import * as core from "@effect/io/internal/core"
import * as random from "@effect/io/internal/random"
import type * as Random from "@effect/io/Random"
import type * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import type * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
export const liveServices: Context.Context<DefaultServices.DefaultServices> = pipe(
  Context.empty(),
  Context.add(clock.clockTag)(clock.make()),
  Context.add(random.randomTag)(random.make((Math.random() * 4294967296) >>> 0)),
  Context.add(configProvider.configProviderTag)(configProvider.env())
)

/**
 * The `FiberRef` holding the default `Effect` services.
 *
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentServices = core.fiberRefUnsafeMakeEnvironment(liveServices)

// circular with Clock

/** @internal */
export const currentTimeMillis = (): Effect.Effect<never, never, number> => {
  const trace = getCallTrace()
  return clockWith((clock) => clock.currentTimeMillis()).traced(trace)
}

/** @internal */
export const sleep = (duration: Duration.Duration): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return clockWith((clock) => clock.sleep(duration)).traced(trace)
}

/** @internal */
export const clockWith = <R, E, A>(f: (clock: Clock.Clock) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.fiberRefGetWith(currentServices)((services) =>
    f(
      pipe(services, Context.get(clock.clockTag))
    )
  ).traced(trace)
}

/** @internal */
export const withClock = <A extends Clock.Clock>(value: A) => {
  const trace = getCallTrace()
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return core.fiberRefLocallyWith(currentServices)(Context.add(clock.clockTag)(value))(effect).traced(trace)
  }
}

// circular with ConfigProvider

/** @internal */
export const withConfigProvider = (value: ConfigProvider) => {
  const trace = getCallTrace()
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return core.fiberRefLocallyWith(currentServices)(
      Context.add(configProvider.configProviderTag)(value)
    )(effect).traced(trace)
  }
}

/** @internal */
export const configProviderWith = <R, E, A>(
  f: (configProvider: ConfigProvider) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.fiberRefGetWith(currentServices)((services) =>
    f(pipe(services, Context.get(configProvider.configProviderTag)))
  ).traced(trace)
}

/** @internal */
export const config = <A>(config: Config<A>) => configProviderWith((_) => _.load(config))

/** @internal */
export const configOrDie = <A>(config: Config<A>) => core.orDie(configProviderWith((_) => _.load(config)))

// circular with Random

/** @internal */
export const randomWith = <R, E, A>(f: (random: Random.Random) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.fiberRefGetWith(currentServices)((services) =>
    f(
      pipe(services, Context.get(random.randomTag))
    )
  ).traced(trace)
}

/** @internal */
export const next = (): Effect.Effect<never, never, number> => {
  const trace = getCallTrace()
  return randomWith((random) => random.next()).traced(trace)
}

/** @internal */
export const nextInt = (): Effect.Effect<never, never, number> => {
  const trace = getCallTrace()
  return randomWith((random) => random.nextInt()).traced(trace)
}

/** @internal */
export const nextBoolean = (): Effect.Effect<never, never, boolean> => {
  const trace = getCallTrace()
  return randomWith((random) => random.nextBoolean()).traced(trace)
}

/** @internal */
export const nextRange = (min: number, max: number): Effect.Effect<never, never, number> => {
  const trace = getCallTrace()
  return randomWith((random) => random.nextRange(min, max)).traced(trace)
}

/** @internal */
export const nextIntBetween = (min: number, max: number): Effect.Effect<never, never, number> => {
  const trace = getCallTrace()
  return randomWith((random) => random.nextIntBetween(min, max)).traced(trace)
}

/** @internal */
export const shuffle = <A>(elements: Iterable<A>): Effect.Effect<never, never, Chunk.Chunk<A>> => {
  const trace = getCallTrace()
  return randomWith((random) => random.shuffle(elements)).traced(trace)
}
