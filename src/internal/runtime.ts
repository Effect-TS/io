import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import type * as FiberRef from "@effect/io/FiberRef"
import * as FiberRefs from "@effect/io/FiberRefs"
import * as internalCause from "@effect/io/internal/cause"
import * as core from "@effect/io/internal/core"
import * as FiberRuntime from "@effect/io/internal/fiberRuntime"
import * as fiberScope from "@effect/io/internal/fiberScope"
import * as OpCodes from "@effect/io/internal/opCodes/effect"
import * as runtimeFlags from "@effect/io/internal/runtimeFlags"
import * as _scheduler from "@effect/io/internal/scheduler"
import * as _supervisor from "@effect/io/internal/supervisor"
import type * as Runtime from "@effect/io/Runtime"
import type * as Scheduler from "@effect/io/Scheduler"
import * as Context from "@fp-ts/data/Context"
import type { Either } from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import { identity, pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/** @internal */
export class AsyncFiber<E, A> implements Runtime.AsyncFiber<E, A> {
  readonly _tag = "AsyncFiber"
  constructor(readonly fiber: FiberRuntime.FiberRuntime<E, A>) {
    Equal.considerByRef(this)
  }
}

/** @internal */
export class RuntimeImpl<R> implements Runtime.Runtime<R> {
  constructor(
    readonly context: Context.Context<R>,
    readonly runtimeFlags: RuntimeFlags.RuntimeFlags,
    readonly fiberRefs: FiberRefs.FiberRefs
  ) {
    Equal.considerByRef(this)
  }

  unsafeRunSyncEither: <E, A>(effect: Effect.Effect<R, E, A>) => Either<E, A> = (effect) =>
    this.unsafeRunSync(core.either(effect))

  unsafeRunPromiseEither: <E, A>(effect: Effect.Effect<R, E, A>) => Promise<Either<E, A>> = (effect) =>
    this.unsafeRunPromise(core.either(effect))

  unsafeFork = <E, A>(effect: Effect.Effect<R, E, A>, scheduler?: Scheduler.Scheduler) => {
    const fiberId = FiberId.unsafeMake()

    let fiberRefs = pipe(
      this.fiberRefs,
      FiberRefs.updatedAs(
        fiberId,
        core.currentEnvironment,
        this.context as Context.Context<never>
      )
    )

    if (scheduler) {
      fiberRefs = pipe(
        fiberRefs,
        FiberRefs.updatedAs(
          fiberId,
          core.currentScheduler,
          scheduler
        )
      )
    }

    const fiberRuntime: FiberRuntime.FiberRuntime<E, A> = new FiberRuntime.FiberRuntime<E, A>(
      fiberId,
      pipe(fiberRefs, FiberRefs.forkAs(fiberId)),
      this.runtimeFlags,
      this
    )

    const supervisor = fiberRuntime.getSupervisor()

    if (supervisor !== _supervisor.none) {
      supervisor.onStart(this.context, effect, Option.none, fiberRuntime)

      fiberRuntime.unsafeAddObserver((exit) => supervisor.onEnd(exit, fiberRuntime))
    }

    fiberScope.globalScope.add(this.runtimeFlags, fiberRuntime)

    fiberRuntime.start(effect)

    return fiberRuntime
  }

  unsafeRun = <E, A>(
    effect: Effect.Effect<R, E, A>,
    onExit?: (exit: Exit.Exit<E, A>) => void
  ): ((fiberId?: FiberId.FiberId, onExit?: (exit: Exit.Exit<E, A>) => void) => void) => {
    const fiberRuntime = this.unsafeFork(effect)

    if (onExit) {
      fiberRuntime.unsafeAddObserver((exit) => {
        onExit(exit)
      })
    }

    return (id, onExitInterrupt) =>
      this.unsafeRun(
        pipe(fiberRuntime, Fiber.interruptAs(id ?? FiberId.none)),
        onExitInterrupt ?
          (exit) => {
            return onExitInterrupt(Exit.flatten(exit))
          } :
          void 0
      )
  }

  unsafeRunSync = <E, A>(
    effect: Effect.Effect<R, E, A>
  ): A => {
    const exit = this.unsafeRunSyncExit(effect)
    if (exit._tag === OpCodes.OP_FAILURE) {
      throw pipe(exit.cause, internalCause.squashWith(identity))
    }
    return exit.value
  }

  unsafeRunSyncExit = <E, A>(
    effect: Effect.Effect<R, E, A>
  ): Exit.Exit<E, A> => {
    const scheduler = new _scheduler.SyncScheduler()

    const fiberRuntime = this.unsafeFork(effect, scheduler)

    scheduler.flush()

    const result = fiberRuntime.unsafePoll()

    if (result) {
      return result
    }

    return Exit.die(new AsyncFiber(fiberRuntime))
  }

  unsafeRunPromise = <E, A>(
    effect: Effect.Effect<R, E, A>
  ): Promise<A> => {
    return new Promise((resolve, reject) => {
      this.unsafeRun(effect, (exit) => {
        switch (exit._tag) {
          case OpCodes.OP_SUCCESS: {
            resolve(exit.value)
            break
          }
          case OpCodes.OP_FAILURE: {
            reject(pipe(exit.cause, internalCause.squashWith(identity)))
            break
          }
        }
      })
    })
  }

  unsafeRunPromiseExit = <E, A>(
    effect: Effect.Effect<R, E, A>
  ): Promise<Exit.Exit<E, A>> => {
    return new Promise((resolve) => {
      this.unsafeRun(effect, (exit) => {
        resolve(exit)
      })
    })
  }
}

/** @internal */
export const make = <R>(
  context: Context.Context<R>,
  runtimeFlags: RuntimeFlags.RuntimeFlags,
  fiberRefs: FiberRefs.FiberRefs
): Runtime.Runtime<R> => new RuntimeImpl(context, runtimeFlags, fiberRefs)

/** @internal */
export const runtime = <R>(): Effect.Effect<R, never, Runtime.Runtime<R>> => {
  return core.withFiberRuntime<R, never, RuntimeImpl<R>>((state, status) =>
    core.succeed(
      new RuntimeImpl<R>(
        state.getFiberRef(core.currentEnvironment as unknown as FiberRef.FiberRef<Context.Context<R>>),
        status.runtimeFlags,
        state.unsafeGetFiberRefs()
      )
    )
  )
}

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
export const unsafeRun = defaultRuntime.unsafeRun

/** @internal */
export const unsafeFork = defaultRuntime.unsafeFork

/** @internal */
export const unsafeRunPromise = defaultRuntime.unsafeRunPromise

/** @internal */
export const unsafeRunPromiseEither = defaultRuntime.unsafeRunPromiseEither

/** @internal */
export const unsafeRunPromiseExit = defaultRuntime.unsafeRunPromiseExit

/** @internal */
export const unsafeRunSync = defaultRuntime.unsafeRunSync

/** @internal */
export const unsafeRunSyncExit = defaultRuntime.unsafeRunSyncExit

/** @internal */
export const unsafeRunSyncEither = defaultRuntime.unsafeRunSyncEither

// circular with Effect

/** @internal */
export const asyncEffect = <R, E, A, R2, E2, X>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => Effect.Effect<R2, E2, X>
): Effect.Effect<R | R2, E | E2, A> => {
  const trace = getCallTrace()
  return pipe(
    core.deferredMake<E | E2, A>(),
    core.flatMap((deferred) =>
      pipe(
        runtime<R | R2>(),
        core.flatMap((runtime) =>
          core.uninterruptibleMask((restore) =>
            pipe(
              restore(
                pipe(
                  register((cb) => runtime.unsafeRun(pipe(cb, core.intoDeferred(deferred)))),
                  core.catchAllCause((cause) => core.deferredFailCause(deferred)(cause))
                )
              ),
              FiberRuntime.fork,
              core.zipRight(restore(core.deferredAwait(deferred)))
            )
          )
        )
      )
    )
  ).traced(trace)
}
