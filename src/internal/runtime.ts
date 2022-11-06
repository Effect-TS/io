import * as Cause from "@effect/io/Cause"
import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as FiberScope from "@effect/io/Fiber/Scope"
import type * as FiberRef from "@effect/io/FiberRef"
import * as FiberRefs from "@effect/io/FiberRefs"
import * as core from "@effect/io/internal/core"
import * as FiberRuntime from "@effect/io/internal/fiberRuntime"
import * as OpCodes from "@effect/io/internal/opCodes/effect"
import * as Scheduler from "@effect/io/internal/scheduler"
import type * as Runtime from "@effect/io/Runtime"
import * as Supervisor from "@effect/io/Supervisor"
import * as Context from "@fp-ts/data/Context"
import { constVoid, identity, pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/** @internal */
export class AsyncFiber<E, A> implements Runtime.AsyncFiber<E, A> {
  readonly _tag = "AsyncFiber"
  constructor(readonly fiber: FiberRuntime.FiberRuntime<E, A>) {}
}

/** @internal */
export class RuntimeImpl<R> implements Runtime.Runtime<R> {
  constructor(
    readonly context: Context.Context<R>,
    readonly runtimeFlags: RuntimeFlags.RuntimeFlags,
    readonly fiberRefs: FiberRefs.FiberRefs
  ) {}

  unsafeFork = <E, A>(effect: Effect.Effect<R, E, A>) => {
    const fiberId = FiberId.unsafeMake()

    const fiberRefs = pipe(
      this.fiberRefs,
      FiberRefs.updateAs(
        fiberId,
        core.currentEnvironment,
        this.context as Context.Context<never>
      )
    )

    const fiberRuntime = new FiberRuntime.FiberRuntime<E, A>(
      fiberId,
      fiberRefs,
      this.runtimeFlags
    )

    const supervisor = fiberRuntime.getSupervisor()

    if (supervisor !== Supervisor.none) {
      supervisor.onStart(this.context, effect, Option.none, fiberRuntime)

      fiberRuntime.unsafeAddObserver((exit) => supervisor.onEnd(exit, fiberRuntime))
    }

    fiberRuntime.start(effect)

    FiberScope.globalScope.add(this.runtimeFlags, fiberRuntime)

    return fiberRuntime
  }

  unsafeRunWith = <E, A>(
    effect: Effect.Effect<R, E, A>,
    k: (exit: Exit.Exit<E, A>) => void
  ): ((fiberId: FiberId.FiberId) => (_: (exit: Exit.Exit<E, A>) => void) => void) => {
    const fiberId = FiberId.unsafeMake()

    const fiberRefs = pipe(
      this.fiberRefs,
      FiberRefs.updateAs(
        fiberId,
        core.currentEnvironment,
        this.context as Context.Context<never>
      )
    )

    const fiberRuntime = new FiberRuntime.FiberRuntime<E, A>(
      fiberId,
      fiberRefs,
      this.runtimeFlags
    )

    const supervisor = fiberRuntime.getSupervisor()

    if (supervisor !== Supervisor.none) {
      supervisor.onStart(this.context, effect, Option.none, fiberRuntime)

      fiberRuntime.unsafeAddObserver((exit) => supervisor.onEnd(exit, fiberRuntime))
    }

    fiberRuntime.start(effect)

    FiberScope.globalScope.add(this.runtimeFlags, fiberRuntime)

    fiberRuntime.unsafeAddObserver((exit) => {
      k(exit)
    })

    return (id) =>
      (k) => this.unsafeRunAsyncWith(pipe(fiberRuntime, Fiber.interruptWith(id)), (exit) => k(Exit.flatten(exit)))
  }

  unsafeRunSync = <E, A>(
    effect: Effect.Effect<R, E, A>
  ): A => {
    const exit = this.unsafeRunSyncExit(effect)
    if (exit.op === OpCodes.OP_FAILURE) {
      throw pipe(exit.cause, Cause.squashWith(identity))
    }
    return exit.value
  }

  unsafeRunSyncExit = <E, A>(
    effect: Effect.Effect<R, E, A>
  ): Exit.Exit<E, A> => {
    const fiberId = FiberId.unsafeMake()

    const scheduler = new Scheduler.StagedScheduler()

    const fiberRefs = pipe(
      this.fiberRefs,
      FiberRefs.updateAs(
        fiberId,
        core.currentEnvironment,
        this.context as Context.Context<never>
      ),
      FiberRefs.updateAs(
        fiberId,
        core.currentScheduler,
        scheduler
      )
    )

    const fiberRuntime = new FiberRuntime.FiberRuntime<E, A>(
      fiberId,
      fiberRefs,
      this.runtimeFlags
    )

    const supervisor = fiberRuntime.getSupervisor()

    if (supervisor !== Supervisor.none) {
      supervisor.onStart(this.context, effect, Option.none, fiberRuntime)

      fiberRuntime.unsafeAddObserver((exit) => supervisor.onEnd(exit, fiberRuntime))
    }

    fiberRuntime.start(effect)

    FiberScope.globalScope.add(this.runtimeFlags, fiberRuntime)

    scheduler.flush()

    const result = fiberRuntime.unsafePoll()

    if (result) {
      return result
    }

    return Exit.die(new AsyncFiber(fiberRuntime))
  }

  unsafeRunAsync = <E, A>(effect: Effect.Effect<R, E, A>): void => {
    return this.unsafeRunAsyncWith(effect, constVoid)
  }

  unsafeRunAsyncWith = <E, A>(
    effect: Effect.Effect<R, E, A>,
    k: (exit: Exit.Exit<E, A>) => void
  ): void => {
    this.unsafeRunWith(effect, k)
  }

  unsafeRunPromise = <E, A>(
    effect: Effect.Effect<R, E, A>
  ): Promise<A> => {
    return new Promise((resolve, reject) => {
      this.unsafeRunAsyncWith(effect, (exit) => {
        switch (exit.op) {
          case OpCodes.OP_SUCCESS: {
            resolve(exit.value)
            break
          }
          case OpCodes.OP_FAILURE: {
            reject(pipe(exit.cause, Cause.squashWith(identity)))
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
      this.unsafeRunAsyncWith(effect, (exit) => {
        resolve(exit)
      })
    })
  }
}

/** @internal */
export const runtime = <R>(): Effect.Effect<R, never, RuntimeImpl<R>> => {
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
export const defaultRuntimeFlags = RuntimeFlags.make(
  RuntimeFlags.FiberRoots,
  RuntimeFlags.Interruption,
  RuntimeFlags.CooperativeYielding
)

/** @internal */
export const defaultRuntime = new RuntimeImpl<never>(
  Context.empty(),
  defaultRuntimeFlags,
  FiberRefs.unsafeMake(new Map())
)

/** @internal */
export const unsafeRunPromise = defaultRuntime.unsafeRunPromise

/** @internal */
export const unsafeRunAsync = defaultRuntime.unsafeRunAsync

/** @internal */
export const unsafeFork = defaultRuntime.unsafeFork

/** @internal */
export const unsafeRunAsyncWith = defaultRuntime.unsafeRunAsyncWith

/** @internal */
export const unsafeRunPromiseExit = defaultRuntime.unsafeRunPromiseExit

/** @internal */
export const unsafeRunWith = defaultRuntime.unsafeRunWith

/** @internal */
export const unsafeRunSync = defaultRuntime.unsafeRunSync

/** @internal */
export const unsafeRunSyncExit = defaultRuntime.unsafeRunSyncExit

// circular with Effect

/** @internal */
export const asyncEffect = <R, E, A, R2, E2, X>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => Effect.Effect<R2, E2, X>
): Effect.Effect<R | R2, E | E2, A> => {
  const trace = getCallTrace()
  return pipe(
    core.makeDeferred<E | E2, A>(),
    core.flatMap((deferred) =>
      pipe(
        runtime<R | R2>(),
        core.flatMap((runtime) =>
          core.uninterruptibleMask((restore) =>
            pipe(
              restore(
                pipe(
                  register((cb) => runtime.unsafeRunAsync(pipe(cb, core.intoDeferred(deferred)))),
                  core.catchAllCause((cause) => pipe(deferred, core.failCauseDeferred(cause as Cause.Cause<E | E2>)))
                )
              ),
              FiberRuntime.fork,
              core.zipRight(core.awaitDeferred(deferred))
            )
          )
        )
      )
    )
  ).traced(trace)
}
