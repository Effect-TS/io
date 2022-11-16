import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as layer from "@effect/io/internal/layer"
import type * as Layer from "@effect/io/Layer"
import * as Context from "@fp-ts/data/Context"

/**
 * The `TestConfig` service provides access to default configuration settings
 * used by tests, including the number of times to repeat tests to ensure
 * they are stable, the number of times to retry flaky tests, the sufficient
 * number of samples to check from a random variable, and the maximum number of
 * shrinkings to minimize large failures.
 */
export interface TestConfig {
  /**
   * The number of times to repeat tests to ensure they are stable.
   */
  readonly repeats: number
  /**
   * The number of times to retry flaky tests.
   */
  readonly retries: number
  /**
   * The number of sufficient samples to check for a random variable.
   */
  readonly samples: number
  /**
   * The maximum number of shrinkings to minimize large failures
   */
  readonly shrinks: number
}

export const Tag: Context.Tag<TestConfig> = Context.Tag<TestConfig>()

export const make = (params: {
  readonly repeats: number
  readonly retries: number
  readonly samples: number
  readonly shrinks: number
}): TestConfig => params

/**
 * Constructs a new `TestConfig` service with the specified settings.
 */
export const live = (
  params: {
    readonly repeats: number
    readonly retries: number
    readonly samples: number
    readonly shrinks: number
  }
): Layer.Layer<never, never, TestConfig> => {
  return layer.succeed(Tag)(make(params))
}

/**
 * Constructs a new `TestConfig` with the default settings.
 */
export const defaultTestConfig: Layer.Layer<never, never, TestConfig> = live({
  repeats: 100,
  retries: 100,
  samples: 200,
  shrinks: 1000
})

/**
 * The number of times to repeat tests to ensure they are stable.
 *
 * @macro traced
 */
export const repeats = (): Effect.Effect<TestConfig, never, number> => {
  const trace = getCallTrace()
  return core.serviceWith(Tag)((config) => config.repeats).traced(trace)
}

/**
 * The number of times to retry flaky tests.
 *
 * @macro traced
 */
export const retries = (): Effect.Effect<TestConfig, never, number> => {
  const trace = getCallTrace()
  return core.serviceWith(Tag)((config) => config.retries).traced(trace)
}

/**
 * The number of sufficient samples to check for a random variable.
 *
 * @macro traced
 */
export const samples = (): Effect.Effect<TestConfig, never, number> => {
  const trace = getCallTrace()
  return core.serviceWith(Tag)((config) => config.samples).traced(trace)
}

/**
 * The maximum number of shrinkings to minimize large failures.
 *
 * @macro traced
 */
export const shrinks = (): Effect.Effect<TestConfig, never, number> => {
  const trace = getCallTrace()
  return core.serviceWith(Tag)((config) => config.shrinks).traced(trace)
}
