import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as defaultServices from "@effect/io/internal/defaultServices"
import * as effect from "@effect/io/internal/effect"
import * as layer from "@effect/io/internal/layer"
import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * The `Live` trait provides access to the "live" default Effect services from
 * within tests for workflows such as printing test results to the console or
 * timing out tests where it is necessary to access the real implementations of
 * these services.
 */
export interface Live {
  /**
   * @macro traced
   */
  provide<R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
}

export const Tag: Context.Tag<Live> = Context.Tag<Live>()

/**
 * Constructs a new `Live` service that implements the `Live` interface. This
 * typically should not be necessary as the `TestEnvironment` already includes
 * the `Live` service but could be useful if you are mixing in interfaces to
 * create your own environment type.
 */
export const defaultLive = layer.fromEffect(Tag)(
  effect.environmentWith<never, Live>((env) => ({
    provide: (effect) =>
      pipe(
        effect,
        pipe(
          defaultServices.currentServices,
          core.fiberRefLocallyWith(Context.merge(env))
        )
      )
  }))
)

/**
 * Provides a workflow with the "live" default Effect services.
 *
 * @macro traced
 */
export const live = <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R | Live, E, A> => {
  const trace = getCallTrace()
  return core.serviceWithEffect(Tag)((live) => live.provide(effect)).traced(trace)
}

/**
 * Runs a transformation function with the live default Effect services while
 * ensuring that the workflow itself is run with the test services.
 *
 * @macro traced
 */
export const withLive = <R, E, A, R2, E2, A2>(f: (effect: Effect.Effect<R, E, A>) => Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return (effect: Effect.Effect<R, E, A>): Effect.Effect<R | R2 | Live, E | E2, A2> => {
    return pipe(
      defaultServices.currentServices,
      core.fiberRefGetWith((services) =>
        live(
          f(
            pipe(
              effect,
              pipe(defaultServices.currentServices, core.fiberRefLocally(services))
            )
          )
        )
      )
    ).traced(trace)
  }
}
