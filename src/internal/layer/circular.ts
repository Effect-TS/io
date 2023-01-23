import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as layer from "@effect/io/internal/layer"
import * as runtimeFlags from "@effect/io/internal/runtimeFlags"
import * as runtimeFlagsPatch from "@effect/io/internal/runtimeFlagsPatch"
import * as _supervisor from "@effect/io/internal/supervisor"
import type * as Layer from "@effect/io/Layer"
import type * as Logger from "@effect/io/Logger"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as Supervisor from "@effect/io/Supervisor"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

// circular with Logger

/** @internal */
export const minimumLogLevel = (level: LogLevel.LogLevel): Layer.Layer<never, never, never> =>
  layer.scopedDiscard(fiberRuntime.fiberRefLocallyScoped(fiberRuntime.currentMinimumLogLevel, level))

/** @internal */
export const withMinimumLogLevel = (
  level: LogLevel.LogLevel
): <R, E, B>(use: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B> =>
  core.fiberRefLocally(fiberRuntime.currentMinimumLogLevel, level)

/** @internal */
export const addLogger = <A>(logger: Logger.Logger<string, A>): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.fiberRefLocallyScopedWith(fiberRuntime.currentLoggers, HashSet.add(logger))
  )
}

/** @internal */
export const removeLogger = <A>(logger: Logger.Logger<string, A>): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.fiberRefLocallyScopedWith(fiberRuntime.currentLoggers, HashSet.remove(logger))
  )
}

/** @internal */
export const replaceLogger = <A, B>(
  logger: Logger.Logger<string, A>,
  that: Logger.Logger<string, B>
): Layer.Layer<never, never, never> => {
  return pipe(removeLogger(logger), layer.flatMap(() => addLogger(that)))
}

/** @internal */
export const addSupervisor = <A>(supervisor: Supervisor.Supervisor<A>): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.fiberRefLocallyScopedWith(
      fiberRuntime.currentSupervisor,
      (current) => new _supervisor.Zip(current, supervisor)
    )
  )
}

/** @internal */
export const enableCooperativeYielding = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.enable(runtimeFlags.CooperativeYielding))
  )
}

/** @internal */
export const enableInterruption = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.enable(runtimeFlags.Interruption))
  )
}

/** @internal */
export const enableOpSupervision = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.enable(runtimeFlags.OpSupervision))
  )
}

/** @internal */
export const enableRuntimeMetrics = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.enable(runtimeFlags.RuntimeMetrics))
  )
}

/** @internal */
export const enableWindDown = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.enable(runtimeFlags.WindDown))
  )
}

/** @internal */
export const disableCooperativeYielding = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.disable(runtimeFlags.CooperativeYielding))
  )
}

/** @internal */
export const disableInterruption = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.disable(runtimeFlags.Interruption))
  )
}

/** @internal */
export const disableOpSupervision = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.disable(runtimeFlags.OpSupervision))
  )
}

/** @internal */
export const disableRuntimeMetrics = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.disable(runtimeFlags.RuntimeMetrics))
  )
}

/** @internal */
export const disableWindDown = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.disable(runtimeFlags.WindDown))
  )
}
