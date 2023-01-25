import * as Debug from "@effect/io/Debug"
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
export const minimumLogLevel = Debug.untracedMethod(() =>
  (level: LogLevel.LogLevel): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.fiberRefLocallyScoped(
        fiberRuntime.currentMinimumLogLevel,
        level
      )
    )
)

/** @internal */
export const withMinimumLogLevel = Debug.dualWithTrace<
  <R, E, A>(self: Effect.Effect<R, E, A>, level: LogLevel.LogLevel) => Effect.Effect<R, E, A>,
  (level: LogLevel.LogLevel) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
>(2, (trace) =>
  (self, level) =>
    core.fiberRefLocally(
      fiberRuntime.currentMinimumLogLevel,
      level
    )(self).traced(trace))

/** @internal */
export const addLogger = Debug.methodWithTrace((trace) =>
  <A>(logger: Logger.Logger<string, A>): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.fiberRefLocallyScopedWith(
        fiberRuntime.currentLoggers,
        HashSet.add(logger)
      ).traced(trace)
    )
)

/** @internal */
export const removeLogger = Debug.untracedMethod(() =>
  <A>(logger: Logger.Logger<string, A>): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.fiberRefLocallyScopedWith(
        fiberRuntime.currentLoggers,
        HashSet.remove(logger)
      )
    )
)

/** @internal */
export const replaceLogger = Debug.untracedMethod(() =>
  <A, B>(logger: Logger.Logger<string, A>, that: Logger.Logger<string, B>): Layer.Layer<never, never, never> =>
    pipe(removeLogger(logger), layer.flatMap(() => addLogger(that)))
)

/** @internal */
export const addSupervisor = Debug.untracedMethod(() =>
  <A>(supervisor: Supervisor.Supervisor<A>): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.fiberRefLocallyScopedWith(
        fiberRuntime.currentSupervisor,
        (current) => new _supervisor.Zip(current, supervisor)
      )
    )
)

/** @internal */
export const enableCooperativeYielding = Debug.untracedMethod(() =>
  (): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.withRuntimeFlagsScoped(
        runtimeFlagsPatch.enable(runtimeFlags.CooperativeYielding)
      )
    )
)

/** @internal */
export const enableInterruption = Debug.untracedMethod(() =>
  (): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.withRuntimeFlagsScoped(
        runtimeFlagsPatch.enable(runtimeFlags.Interruption)
      )
    )
)

/** @internal */
export const enableOpSupervision = Debug.untracedMethod(() =>
  (): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.withRuntimeFlagsScoped(
        runtimeFlagsPatch.enable(runtimeFlags.OpSupervision)
      )
    )
)

/** @internal */
export const enableRuntimeMetrics = Debug.untracedMethod(() =>
  (): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.withRuntimeFlagsScoped(
        runtimeFlagsPatch.enable(runtimeFlags.RuntimeMetrics)
      )
    )
)

/** @internal */
export const enableWindDown = Debug.untracedMethod(() =>
  (): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.withRuntimeFlagsScoped(
        runtimeFlagsPatch.enable(runtimeFlags.WindDown)
      )
    )
)

/** @internal */
export const disableCooperativeYielding = Debug.untracedMethod(() =>
  (): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.withRuntimeFlagsScoped(
        runtimeFlagsPatch.disable(runtimeFlags.CooperativeYielding)
      )
    )
)

/** @internal */
export const disableInterruption = Debug.untracedMethod(() =>
  (): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.withRuntimeFlagsScoped(
        runtimeFlagsPatch.disable(runtimeFlags.Interruption)
      )
    )
)

/** @internal */
export const disableOpSupervision = Debug.untracedMethod(() =>
  (): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.withRuntimeFlagsScoped(
        runtimeFlagsPatch.disable(runtimeFlags.OpSupervision)
      )
    )
)

/** @internal */
export const disableRuntimeMetrics = Debug.untracedMethod(() =>
  (): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.withRuntimeFlagsScoped(
        runtimeFlagsPatch.disable(runtimeFlags.RuntimeMetrics)
      )
    )
)

/** @internal */
export const disableWindDown = Debug.untracedMethod(() =>
  (): Layer.Layer<never, never, never> =>
    layer.scopedDiscard(
      fiberRuntime.withRuntimeFlagsScoped(
        runtimeFlagsPatch.disable(runtimeFlags.WindDown)
      )
    )
)
