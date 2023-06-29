import type * as Chunk from "@effect/data/Chunk"
import * as Context from "@effect/data/Context"
import * as Debug from "@effect/data/Debug"
import type * as Duration from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as List from "@effect/data/List"
import type * as Clock from "@effect/io/Clock"
import type * as Config from "@effect/io/Config"
import type * as ConfigProvider from "@effect/io/Config/Provider"
import type * as DefaultServices from "@effect/io/DefaultServices"
import type * as Effect from "@effect/io/Effect"
import type { FiberRefs } from "@effect/io/FiberRefs"
import * as Cause from "@effect/io/internal_effect_untraced/cause"
import * as Pretty from "@effect/io/internal_effect_untraced/cause-pretty"
import * as clock from "@effect/io/internal_effect_untraced/clock"
import * as configProvider from "@effect/io/internal_effect_untraced/configProvider"
import * as core from "@effect/io/internal_effect_untraced/core"
import * as _fiberId from "@effect/io/internal_effect_untraced/fiberId"
import * as fiberRefs from "@effect/io/internal_effect_untraced/fiberRefs"
import { makeLogger } from "@effect/io/internal_effect_untraced/logger"
import * as random from "@effect/io/internal_effect_untraced/random"
import * as tracer from "@effect/io/internal_effect_untraced/tracer"
import type * as Logger from "@effect/io/Logger"
import * as LogSpan from "@effect/io/Logger/Span"
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

//
// Logger circular
//

/** @internal */
export const stringLogger: Logger.Logger<string, string> = makeLogger<string, string>(
  (fiberId, logLevel, message, cause, _context, spans, annotations) => {
    const now = new Date(getLogger(_context).unsafeCurrentTimeMillis())
    const nowMillis = now.getTime()

    const outputArray = [
      `timestamp=${now.toISOString()}`,
      `level=${logLevel.label}`,
      `fiber=${_fiberId.threadName(fiberId)}`
    ]

    let output = outputArray.join(" ")

    if (message.length > 0) {
      output = output + " message="
      output = appendQuoted(message, output)
    }

    if (cause != null && cause != Cause.empty) {
      output = output + " cause="
      output = appendQuoted(Pretty.pretty(cause), output)
    }

    if (List.isCons(spans)) {
      output = output + " "

      let first = true
      for (const span of spans) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = output + pipe(span, LogSpan.render(nowMillis))
      }
    }

    if (pipe(annotations, HashMap.size) > 0) {
      output = output + " "

      let first = true
      for (const [key, value] of annotations) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = output + filterKeyName(key)
        output = output + "="
        output = appendQuoted(value, output)
      }
    }

    return output
  }
)

/** @internal */
const escapeDoubleQuotes = (str: string) => `"${str.replace(/\\([\s\S])|(")/g, "\\$1$2")}"`

const textOnly = /^[^\s"=]+$/

/** @internal */
const appendQuoted = (label: string, output: string): string =>
  output + (label.match(textOnly) ? label : escapeDoubleQuotes(label))

const getLogger = (refs: FiberRefs) => {
  const services = fiberRefs.getOrDefault(refs, currentServices)
  return Context.get(services, clock.clockTag)
}

/** @internal */
export const logfmtLogger = makeLogger<string, string>(
  (fiberId, logLevel, message, cause, _context, spans, annotations) => {
    const now = new Date(getLogger(_context).unsafeCurrentTimeMillis())
    const nowMillis = now.getTime()

    const outputArray = [
      `timestamp=${now.toISOString()}`,
      `level=${logLevel.label}`,
      `fiber=${_fiberId.threadName(fiberId)}`
    ]

    let output = outputArray.join(" ")

    if (message.length > 0) {
      output = output + " message="
      output = appendQuotedLogfmt(message, output)
    }

    if (cause != null && cause != Cause.empty) {
      output = output + " cause="
      output = appendQuotedLogfmt(Pretty.pretty(cause), output)
    }

    if (List.isCons(spans)) {
      output = output + " "

      let first = true
      for (const span of spans) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = output + pipe(span, renderLogSpanLogfmt(nowMillis))
      }
    }

    if (pipe(annotations, HashMap.size) > 0) {
      output = output + " "

      let first = true
      for (const [key, value] of annotations) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = output + filterKeyName(key)
        output = output + "="
        output = appendQuotedLogfmt(value, output)
      }
    }

    return output
  }
)

/** @internal */
const filterKeyName = (key: string) => key.replace(/[\s="]/g, "_")

/** @internal */
const escapeDoubleQuotesLogfmt = (str: string) => JSON.stringify(str)

/** @internal */
const appendQuotedLogfmt = (label: string, output: string): string =>
  output + (label.match(textOnly) ? label : escapeDoubleQuotesLogfmt(label))

/** @internal */
const renderLogSpanLogfmt = (now: number) =>
  (self: LogSpan.LogSpan): string => {
    const label = filterKeyName(self.label)
    return `${label}=${now - self.startTime}ms`
  }
