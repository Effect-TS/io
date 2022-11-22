import { runtimeDebug } from "@effect/io/Debug"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as layer from "@effect/io/internal/layer"
import * as _logger from "@effect/io/internal/logger"
import type * as Layer from "@effect/io/Layer"
import type * as Logger from "@effect/io/Logger"
import * as LogLevel from "@effect/io/Logger/Level"
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
  return loggerLayer(
    pipe(
      _logger.consoleLogger(),
      _logger.filterLogLevel(LogLevel.greaterThanEqual(newMin)),
      _logger.map(constVoid)
    )
  )
}

/** @internal */
export const loggerLayer = <B>(logger: Logger.Logger<string, B>): Layer.Layer<never, never, never> => {
  return layer.scopedDiscard(
    pipe(
      _logger.currentLoggers,
      fiberRuntime.fiberRefLocallyScopedWith(HashSet.add(logger))
    )
  )
}
