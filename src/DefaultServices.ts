/**
 * @since 1.0.0
 */
import * as Clock from "@effect/io/Clock"
import * as core from "@effect/io/internal/core"
import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * @since 1.0.0
 * @category models
 */
export type DefaultServices = Clock.Clock /* | Random */

/**
 * @since 1.0.0
 * @category constructors
 */
export const liveServices: Context.Context<DefaultServices> = pipe(
  Context.empty(),
  Context.add(Clock.Tag)(Clock.make())
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
