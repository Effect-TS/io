import { runtimeDebug } from "@effect/io/Debug"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as layer from "@effect/io/internal/layer"
import * as _logger from "@effect/io/internal/logger"
import * as runtimeFlags from "@effect/io/internal/runtimeFlags"
import * as runtimeFlagsPatch from "@effect/io/internal/runtimeFlagsPatch"
import * as _supervisor from "@effect/io/internal/supervisor"
import type * as Layer from "@effect/io/Layer"
import type * as Logger from "@effect/io/Logger"
import * as LogLevel from "@effect/io/Logger/Level"
import type * as Supervisor from "@effect/io/Supervisor"
import { constVoid, pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

// circular with Logger

/** @internal */
export const consoleLoggerLayer = (
  minLevel: LogLevel.LogLevel = LogLevel.Info
): Layer.Layer<never, never, never> => {
  const newMin = runtimeDebug.logLevelOverride ?
    runtimeDebug.logLevelOverride :
    minLevel
  return pipe(
    removeDefaultLoggers(),
    layer.flatMap(() =>
      addLogger(
        pipe(
          _logger.consoleLogger(),
          _logger.filterLogLevel(LogLevel.greaterThanEqual(newMin)),
          _logger.map(constVoid)
        )
      )
    )
  )
}

/** @internal */
export const addLogger = <A>(logger: Logger.Logger<string, A>): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      _logger.currentLoggers,
      fiberRuntime.fiberRefLocallyScopedWith(HashSet.add(logger))
    )
  )
}

/** @internal */
export const removeDefaultLoggers = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      _logger.currentLoggers,
      fiberRuntime.fiberRefLocallyScopedWith(HashSet.remove(_logger.defaultLogger))
    )
  )
}

/** @internal */
export const addSupervisor = <A>(supervisor: Supervisor.Supervisor<A>): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.currentSupervisor,
      fiberRuntime.fiberRefLocallyScopedWith((current) => new _supervisor.Zip(current, supervisor))
    )
  )
}

/** @internal */
export const enableCooperativeYielding = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.enable(runtimeFlags.CooperativeYielding))
    )
  )
}

/** @internal */
export const enableCurrentFiber = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.enable(runtimeFlags.CurrentFiber))
    )
  )
}

/** @internal */
export const enableInterruption = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.enable(runtimeFlags.Interruption))
    )
  )
}

/** @internal */
export const enableFiberRoots = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.enable(runtimeFlags.FiberRoots))
    )
  )
}

/** @internal */
export const enableOpSupervision = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.enable(runtimeFlags.OpSupervision))
    )
  )
}

/** @internal */
export const enableRuntimeMetrics = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.enable(runtimeFlags.RuntimeMetrics))
    )
  )
}

/** @internal */
export const enableWindDown = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.enable(runtimeFlags.WindDown))
    )
  )
}

/** @internal */
export const disableCooperativeYielding = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.disable(runtimeFlags.CooperativeYielding))
    )
  )
}

/** @internal */
export const disableCurrentFiber = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.disable(runtimeFlags.CurrentFiber))
    )
  )
}

/** @internal */
export const disableInterruption = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.disable(runtimeFlags.Interruption))
    )
  )
}

/** @internal */
export const disableFiberRoots = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.disable(runtimeFlags.FiberRoots))
    )
  )
}

/** @internal */
export const disableOpSupervision = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.disable(runtimeFlags.OpSupervision))
    )
  )
}

/** @internal */
export const disableRuntimeMetrics = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.disable(runtimeFlags.RuntimeMetrics))
    )
  )
}

/** @internal */
export const disableWindDown = (): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      fiberRuntime.withRuntimeFlagsScoped(runtimeFlagsPatch.disable(runtimeFlags.WindDown))
    )
  )
}
