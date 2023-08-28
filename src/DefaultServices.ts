/**
 * @since 1.0.0
 */
import type * as Context from "@effect/data/Context"
import type * as Clock from "@effect/io/Clock"
import type * as ConfigProvider from "@effect/io/ConfigProvider"
import type * as Console from "@effect/io/Console"
import type * as FiberRef from "@effect/io/FiberRef"
import * as internal from "@effect/io/internal/defaultServices"
import type * as Random from "@effect/io/Random"
import type * as Tracer from "@effect/io/Tracer"

/**
 * @since 1.0.0
 * @category models
 */
export type DefaultServices =
  | Clock.Clock
  | Console.Console
  | Random.Random
  | ConfigProvider.ConfigProvider
  | Tracer.Tracer

/**
 * @since 1.0.0
 * @category constructors
 */
export const liveServices: Context.Context<DefaultServices> = internal.liveServices

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentServices: FiberRef.FiberRef<Context.Context<DefaultServices>> = internal.currentServices
