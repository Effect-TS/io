import * as Context from "@effect/data/Context"
import * as Debug from "@effect/data/Debug"
import type * as Either from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import type * as FiberRef from "@effect/io/FiberRef"
import * as FiberRefs from "@effect/io/FiberRefs"
import * as CausePretty from "@effect/io/internal_effect_untraced/cause-pretty"
import * as core from "@effect/io/internal_effect_untraced/core"
import * as FiberRuntime from "@effect/io/internal_effect_untraced/fiberRuntime"
import * as fiberScope from "@effect/io/internal_effect_untraced/fiberScope"
import * as OpCodes from "@effect/io/internal_effect_untraced/opCodes/effect"
import * as runtimeFlags from "@effect/io/internal_effect_untraced/runtimeFlags"
import * as _supervisor from "@effect/io/internal_effect_untraced/supervisor"
import type * as Runtime from "@effect/io/Runtime"
import * as _scheduler from "@effect/io/Scheduler"

/** @internal */
export const unsafeFork = <R>(runtime: Runtime.Runtime<R>) =>
  Debug.methodWithTrace((trace) =>
    <E, A>(
      self: Effect.Effect<R, E, A>,
      options?: Runtime.RunForkOptions
    ): Fiber.RuntimeFiber<E, A> => {
      const fiberId = FiberId.unsafeMake()
      const effect = self.traced(trace)

      let fiberRefs = FiberRefs.updatedAs(
        runtime.fiberRefs,
        fiberId,
        core.currentContext,
        runtime.context as Context.Context<never>
      )

      if (options?.scheduler) {
        fiberRefs = FiberRefs.updatedAs(
          fiberRefs,
          fiberId,
          core.currentScheduler,
          options.scheduler
        )
      }

      if (options?.updateRefs) {
        fiberRefs = options.updateRefs(fiberRefs, fiberId)
      }

      const fiberRuntime: FiberRuntime.FiberRuntime<E, A> = new FiberRuntime.FiberRuntime<E, A>(
        fiberId,
        FiberRefs.forkAs(fiberRefs, fiberId),
        runtime.runtimeFlags
      )

      const supervisor = fiberRuntime.getSupervisor()

      if (supervisor !== _supervisor.none) {
        supervisor.onStart(runtime.context, effect, Option.none(), fiberRuntime)

        fiberRuntime.unsafeAddObserver((exit) => supervisor.onEnd(exit, fiberRuntime))
      }

      fiberScope.globalScope.add(runtime.runtimeFlags, fiberRuntime)

      fiberRuntime.start(effect)

      return fiberRuntime
    }
  )

/** @internal */
export const unsafeRunCallback = <R>(runtime: Runtime.Runtime<R>) =>
  Debug.methodWithTrace((trace) =>
    <E, A>(
      effect: Effect.Effect<R, E, A>,
      onExit?: (exit: Exit.Exit<E, A>) => void
    ): ((fiberId?: FiberId.FiberId, onExit?: (exit: Exit.Exit<E, A>) => void) => void) => {
      const fiberRuntime = unsafeFork(runtime)(effect.traced(trace))

      if (onExit) {
        fiberRuntime.unsafeAddObserver((exit) => {
          onExit(exit)
        })
      }

      return (id, onExitInterrupt) =>
        unsafeRunCallback(runtime)(
          pipe(fiberRuntime, Fiber.interruptAs(id ?? FiberId.none)),
          onExitInterrupt ?
            (exit) => onExitInterrupt(Exit.flatten(exit)) :
            void 0
        )
    }
  )

/** @internal */
export const unsafeRunSync = <R>(runtime: Runtime.Runtime<R>) =>
  Debug.methodWithTrace((trace) =>
    <E, A>(effect: Effect.Effect<R, E, A>): A => {
      const scheduler = new _scheduler.SyncScheduler()
      const fiberRuntime = unsafeFork(runtime)(effect.traced(trace), { scheduler })
      scheduler.flush()
      const result = fiberRuntime.unsafePoll()
      if (result) {
        if (result._tag === "Failure") {
          throw fiberFailure(result.i0)
        } else {
          return result.i0
        }
      }
      throw new AsyncFiber(fiberRuntime)
    }
  )

/** @internal */
export class AsyncFiber<E, A> implements Runtime.AsyncFiber<E, A> {
  readonly _tag = "AsyncFiber"
  constructor(readonly fiber: Fiber.RuntimeFiber<E, A>) {}
  toString() {
    return `Fiber #${this.fiber.id().id} has suspended work asyncroniously`
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString()
  }
}

/** @internal */
export const FiberFailureId: Runtime.FiberFailureId = Symbol.for("@effect/io/Runtime/FiberFailure") as any
/** @internal */
export const FiberFailureCauseId: Runtime.FiberFailureCauseId = Symbol.for(
  "@effect/io/Runtime/FiberFailure/Cause"
) as any

type Mutable<A> = {
  -readonly [k in keyof A]: A[k]
}
/** @internal */
export const NodePrint: Runtime.NodePrint = Symbol.for("nodejs.util.inspect.custom") as any

/** @internal */
export const fiberFailure = <E>(cause: Cause.Cause<E>): Runtime.FiberFailure => {
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = 0
  const error = (new Error()) as Mutable<Runtime.FiberFailure>
  Error.stackTraceLimit = limit
  const pretty = CausePretty.prettyErrors(cause)
  if (pretty.length > 0) {
    error.name = pretty[0].message.split(":")[0]
    error.message = pretty[0].message.substring(error.name.length + 2)
    error.stack = `${error.name}: ${error.message}\n${pretty[0].stack}`
  }
  error[FiberFailureId] = FiberFailureId
  error[FiberFailureCauseId] = cause
  error.toString = () => {
    return CausePretty.pretty(cause)
  }
  error[NodePrint] = () => {
    return error.toString()
  }
  return error
}

/** @internal */
export const isFiberFailure = (u: unknown): u is Runtime.FiberFailure =>
  typeof u === "object" && u !== null && FiberFailureId in u

/** @internal */
export const unsafeRunSyncExit = <R>(runtime: Runtime.Runtime<R>) =>
  Debug.methodWithTrace((trace) =>
    <E, A>(effect: Effect.Effect<R, E, A>) => {
      const scheduler = new _scheduler.SyncScheduler()
      const fiberRuntime = unsafeFork(runtime)(core.exit(effect).traced(trace), { scheduler })
      scheduler.flush()
      const result = fiberRuntime.unsafePoll()
      if (result) {
        if (result._tag === "Failure") {
          throw fiberFailure(result.i0)
        } else {
          return result.i0
        }
      }
      throw new AsyncFiber(fiberRuntime)
    }
  )

/** @internal */
export const unsafeRunSyncEither = <R>(runtime: Runtime.Runtime<R>) =>
  <E, A>(effect: Effect.Effect<R, E, A>): Either.Either<E, A> =>
    Debug.untraced(() => unsafeRunSync(runtime)(core.either(effect)))

/** @internal */
export const unsafeRunPromise = <R>(runtime: Runtime.Runtime<R>) =>
  Debug.methodWithTrace((trace) =>
    <E, A>(effect: Effect.Effect<R, E, A>): Promise<A> =>
      new Promise((resolve, reject) => {
        unsafeFork(runtime)(effect.traced(trace))
          .unsafeAddObserver((result) => {
            switch (result._tag) {
              case OpCodes.OP_SUCCESS: {
                resolve(result.i0)
                break
              }
              case OpCodes.OP_FAILURE: {
                reject(fiberFailure(result.i0))
                break
              }
            }
          })
      })
  )

/** @internal */
export const unsafeRunPromiseExit = <R>(runtime: Runtime.Runtime<R>) =>
  Debug.methodWithTrace((trace) =>
    <E, A>(effect: Effect.Effect<R, E, A>): Promise<Exit.Exit<E, A>> =>
      new Promise((resolve, reject) => {
        unsafeFork(runtime)(core.exit(effect).traced(trace))
          .unsafeAddObserver((exit) => {
            switch (exit._tag) {
              case OpCodes.OP_SUCCESS: {
                resolve(exit.i0)
                break
              }
              case OpCodes.OP_FAILURE: {
                reject(fiberFailure(exit.i0))
                break
              }
            }
          })
      })
  )

/** @internal */
export const unsafeRunPromiseEither = <R>(runtime: Runtime.Runtime<R>) =>
  <E, A>(effect: Effect.Effect<R, E, A>): Promise<Either.Either<E, A>> => unsafeRunPromise(runtime)(core.either(effect))

/** @internal */
export class RuntimeImpl<R> implements Runtime.Runtime<R> {
  constructor(
    readonly context: Context.Context<R>,
    readonly runtimeFlags: RuntimeFlags.RuntimeFlags,
    readonly fiberRefs: FiberRefs.FiberRefs
  ) {}
}

/** @internal */
export const make = <R>(
  context: Context.Context<R>,
  runtimeFlags: RuntimeFlags.RuntimeFlags,
  fiberRefs: FiberRefs.FiberRefs
): Runtime.Runtime<R> => new RuntimeImpl(context, runtimeFlags, fiberRefs)

/** @internal */
export const runtime = Debug.methodWithTrace((trace) =>
  <R>(): Effect.Effect<R, never, Runtime.Runtime<R>> =>
    core.withFiberRuntime<R, never, RuntimeImpl<R>>((state, status) =>
      core.succeed(
        new RuntimeImpl<R>(
          state.getFiberRef(core.currentContext as unknown as FiberRef.FiberRef<Context.Context<R>>),
          status.runtimeFlags,
          state.unsafeGetFiberRefs()
        )
      )
    ).traced(trace)
)

/** @internal */
export const defaultRuntimeFlags: RuntimeFlags.RuntimeFlags = runtimeFlags.make(
  runtimeFlags.Interruption,
  runtimeFlags.CooperativeYielding
)

/** @internal */
export const defaultRuntime = make(
  Context.empty(),
  defaultRuntimeFlags,
  FiberRefs.unsafeMake(new Map())
)

/** @internal */
export const unsafeRunEffect = unsafeRunCallback(defaultRuntime)

/** @internal */
export const unsafeForkEffect = unsafeFork(defaultRuntime)

/** @internal */
export const unsafeRunPromiseEffect = unsafeRunPromise(defaultRuntime)

/** @internal */
export const unsafeRunPromiseEitherEffect = unsafeRunPromiseEither(defaultRuntime)

/** @internal */
export const unsafeRunPromiseExitEffect = unsafeRunPromiseExit(defaultRuntime)

/** @internal */
export const unsafeRunSyncEffect = unsafeRunSync(defaultRuntime)

/** @internal */
export const unsafeRunSyncExitEffect = unsafeRunSyncExit(defaultRuntime)

/** @internal */
export const unsafeRunSyncEitherEffect = unsafeRunSyncEither(defaultRuntime)

// circular with Effect

/** @internal */
export const asyncEffect = Debug.methodWithTrace((trace, restoreTrace) =>
  <R, E, A, R2, E2, X>(
    register: (callback: (_: Effect.Effect<R, E, A>) => void) => Effect.Effect<R2, E2, X>
  ): Effect.Effect<R | R2, E | E2, A> =>
    core.flatMap(core.deferredMake<E | E2, A>(), (deferred) =>
      core.flatMap(runtime<R | R2>(), (runtime) =>
        core.uninterruptibleMask((restore) =>
          core.zipRight(
            FiberRuntime.fork(restore(
              core.catchAllCause(
                restoreTrace(register)((cb) =>
                  unsafeRunCallback(runtime)(pipe(cb, core.intoDeferred(deferred)))
                ),
                (cause) => core.deferredFailCause(deferred, cause)
              )
            )),
            restore(core.deferredAwait(deferred))
          )
        ))).traced(trace)
)
