import type * as Chunk from "@effect/data/Chunk"
import * as Context from "@effect/data/Context"
import * as Debug from "@effect/data/Debug"
import type * as Duration from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as List from "@effect/data/List"
import * as Option from "@effect/data/Option"
import type * as Clock from "@effect/io/Clock"
import type * as Config from "@effect/io/Config"
import type * as ConfigProvider from "@effect/io/Config/Provider"
import type * as DefaultServices from "@effect/io/DefaultServices"
import type * as Effect from "@effect/io/Effect"
import * as clock from "@effect/io/internal_effect_untraced/clock"
import * as configProvider from "@effect/io/internal_effect_untraced/configProvider"
import * as core from "@effect/io/internal_effect_untraced/core"
import * as random from "@effect/io/internal_effect_untraced/random"
import * as tracer from "@effect/io/internal_effect_untraced/tracer"
import type * as Random from "@effect/io/Random"
import type * as Tracer from "@effect/io/Tracer"

/** @internal */
export const liveServices: Context.Context<DefaultServices.DefaultServices> = pipe(
  Context.empty(),
  Context.add(clock.clockTag, clock.make()),
  Context.add(random.randomTag, random.make((Math.random() * 4294967296) >>> 0)),
  Context.add(configProvider.configProviderTag, configProvider.fromEnv()),
  Context.add(tracer.tracerTag, tracer.nativeTracer)
)

/**
 * The `FiberRef` holding the default `Effect` services.
 *
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentServices = core.fiberRefUnsafeMakeContext(liveServices)

// circular with Clock

/** @internal */
export const currentTimeMillis = Debug.methodWithTrace((trace) =>
  (): Effect.Effect<never, never, number> => clockWith((clock) => clock.currentTimeMillis()).traced(trace)
)

/** @internal */
export const sleep = Debug.methodWithTrace((trace) =>
  (duration: Duration.Duration): Effect.Effect<never, never, void> =>
    clockWith((clock) => clock.sleep(duration)).traced(trace)
)

/** @internal */
export const clockWith = Debug.methodWithTrace((trace, restore) =>
  <R, E, A>(f: (clock: Clock.Clock) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
    core.fiberRefGetWith(currentServices, (services) => restore(f)(pipe(services, Context.get(clock.clockTag))))
      .traced(trace)
)

/** @internal */
export const withClock = Debug.dualWithTrace<
  <A extends Clock.Clock>(value: A) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A extends Clock.Clock>(effect: Effect.Effect<R, E, A>, value: A) => Effect.Effect<R, E, A>
>(2, (trace) =>
  (effect, value) =>
    core.fiberRefLocallyWith(
      currentServices,
      Context.add(clock.clockTag, value)
    )(effect).traced(trace))

// circular with ConfigProvider

/** @internal */
export const withConfigProvider = Debug.dualWithTrace<
  (value: ConfigProvider.ConfigProvider) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, value: ConfigProvider.ConfigProvider) => Effect.Effect<R, E, A>
>(2, (trace) =>
  (effect, value) =>
    core.fiberRefLocallyWith(
      currentServices,
      Context.add(configProvider.configProviderTag, value)
    )(effect).traced(trace))

/** @internal */
export const configProviderWith = Debug.methodWithTrace((trace, restore) =>
  <R, E, A>(
    f: (configProvider: ConfigProvider.ConfigProvider) => Effect.Effect<R, E, A>
  ): Effect.Effect<R, E, A> =>
    core.fiberRefGetWith(
      currentServices,
      (services) => restore(f)(pipe(services, Context.get(configProvider.configProviderTag)))
    ).traced(trace)
)

/** @internal */
export const config = Debug.methodWithTrace((trace) =>
  <A>(config: Config.Config<A>) => configProviderWith((_) => _.load(config)).traced(trace)
)

/** @internal */
export const configOrDie = Debug.methodWithTrace((trace) =>
  <A>(config: Config.Config<A>) => core.orDie(configProviderWith((_) => _.load(config))).traced(trace)
)

// circular with Random

/** @internal */
export const randomWith = Debug.methodWithTrace((trace, restore) =>
  <R, E, A>(f: (random: Random.Random) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
    core.fiberRefGetWith(
      currentServices,
      (services) => restore(f)(pipe(services, Context.get(random.randomTag)))
    ).traced(trace)
)

/** @internal */
export const next = Debug.methodWithTrace((trace) =>
  (): Effect.Effect<never, never, number> => randomWith((random) => random.next()).traced(trace)
)

/** @internal */
export const nextInt = Debug.methodWithTrace((trace) =>
  (): Effect.Effect<never, never, number> => randomWith((random) => random.nextInt()).traced(trace)
)

/** @internal */
export const nextBoolean = Debug.methodWithTrace((trace) =>
  (): Effect.Effect<never, never, boolean> => randomWith((random) => random.nextBoolean()).traced(trace)
)

/** @internal */
export const nextRange = Debug.methodWithTrace((trace) =>
  (min: number, max: number): Effect.Effect<never, never, number> =>
    randomWith((random) => random.nextRange(min, max)).traced(trace)
)

/** @internal */
export const nextIntBetween = Debug.methodWithTrace((trace) =>
  (min: number, max: number): Effect.Effect<never, never, number> =>
    randomWith((random) => random.nextIntBetween(min, max)).traced(trace)
)

/** @internal */
export const shuffle = Debug.methodWithTrace((trace) =>
  <A>(elements: Iterable<A>): Effect.Effect<never, never, Chunk.Chunk<A>> =>
    randomWith((random) => random.shuffle(elements)).traced(trace)
)

// circular with Tracer

/** @internal */
export const tracerWith = Debug.methodWithTrace((trace, restore) =>
  <R, E, A>(f: (tracer: Tracer.Tracer) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
    core.fiberRefGetWith(currentServices, (services) => restore(f)(pipe(services, Context.get(tracer.tracerTag))))
      .traced(trace)
)

/** @internal */
export const withTracer = Debug.dualWithTrace<
  (value: Tracer.Tracer) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, value: Tracer.Tracer) => Effect.Effect<R, E, A>
>(2, (trace) =>
  (effect, value) =>
    core.fiberRefLocallyWith(
      currentServices,
      Context.add(tracer.tracerTag, value)
    )(effect).traced(trace))

/** @internal */
export const currentSpan: () => Effect.Effect<never, never, Option.Option<Tracer.Span>> = Debug.methodWithTrace((
  trace
) => () => core.map(core.fiberRefGet(core.currentTracerSpan), List.head).traced(trace))

/** @internal */
export const useSpan: {
  <R, E, A>(name: string, evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
  <R, E, A>(name: string, options: {
    attributes?: Record<string, string>
    parent?: Tracer.ParentSpan
    root?: boolean
  }, evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
} = Debug.methodWithTrace(() =>
  <R, E, A>(
    name: string,
    ...args: [evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A>] | [
      options: any,
      evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A>
    ]
  ) => {
    const options: {
      attributes?: Record<string, string>
      parent?: Tracer.ParentSpan
      root?: boolean
    } | undefined = args.length === 1 ? undefined : args[0]
    const evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A> = args[args.length - 1]

    return core.acquireUseRelease(
      tracerWith((tracer) =>
        core.flatMap(
          core.zip(
            core.fiberRefGet(core.currentTracerSpan),
            clockWith((clock) => clock.currentTimeMillis())
          ),
          ([stack, startTime]) =>
            core.sync(() => {
              const parent = Option.orElse(
                Option.fromNullable(options?.parent),
                () => options?.root === true ? Option.none() : List.head(stack)
              )

              const span = tracer.span(name, parent, startTime)

              Object.entries(options?.attributes ?? {}).forEach(([k, v]) => {
                span.attribute(k, v)
              })

              return span
            })
        )
      ),
      evaluate,
      (span, exit) =>
        core.flatMap(
          clockWith((clock) => clock.currentTimeMillis()),
          (endTime) => core.sync(() => span.end(endTime, exit))
        )
    )
  }
)

/** @internal */
export const withSpan = Debug.dualWithTrace<
  (name: string, options?: {
    attributes?: Record<string, string>
    parent?: Tracer.ParentSpan
    root?: boolean
  }) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, name: string, options?: {
    attributes?: Record<string, string>
    parent?: Tracer.ParentSpan
    root?: boolean
  }) => Effect.Effect<R, E, A>
>(
  (args) => typeof args[0] !== "string",
  () =>
    (self, name, options) =>
      useSpan(
        name,
        options ?? {},
        (span) =>
          core.flatMap(
            core.fiberRefGet(core.currentTracerSpan),
            (stack) =>
              core.fiberRefLocally(
                self,
                core.currentTracerSpan,
                List.prepend(stack, span)
              )
          )
      )
)
