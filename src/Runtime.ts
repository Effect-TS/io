/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import type * as FiberRefs from "@effect/io/FiberRefs"
import * as internal from "@effect/io/internal/runtime"
import type { Scheduler } from "@effect/io/Scheduler"
import type * as Context from "@fp-ts/data/Context"
import type { Either } from "@fp-ts/data/Either"

/**
 * @since 1.0.0
 * @category models
 */
export interface AsyncFiber<E, A> {
  readonly _tag: "AsyncFiber"
  readonly fiber: Fiber.RuntimeFiber<E, A>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Runtime<R> {
  /**
   * Executes the effect using the provided Scheduler or using the global
   * Scheduler if not provided
   */
  unsafeFork: <E, A>(effect: Effect.Effect<R, E, A>, scheduler?: Scheduler) => Fiber.RuntimeFiber<E, A>

  /**
   * Executes the effect asynchronously, eventually passing the exit value to
   * the specified callback.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRun: <E, A>(
    effect: Effect.Effect<R, E, A>,
    k?: (exit: Exit.Exit<E, A>) => void
  ) => (fiberId: FiberId.FiberId) => (_: (exit: Exit.Exit<E, A>) => void) => void

  /**
   * Executes the effect synchronously returning the successful result or throwing otherwise.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunSync: <E, A>(effect: Effect.Effect<R, E, A>) => A

  /**
   * Executes the effect synchronously returning the exit.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunSyncExit: <E, A>(effect: Effect.Effect<R, E, A>) => Exit.Exit<E, A>

  /**
   * Executes the effect synchronously returning either the result or a failure.
   *
   * Throwing in case of defects and interruptions.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunSyncEither: <E, A>(effect: Effect.Effect<R, E, A>) => Either<E, A>

  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the value of the effect once the effect has been executed, or will be
   * rejected with the first error or exception throw by the effect.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   */
  unsafeRunPromise: <E, A>(effect: Effect.Effect<R, E, A>) => Promise<A>

  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the `Exit` state of the effect once the effect has been executed.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   */
  unsafeRunPromiseExit: <E, A>(effect: Effect.Effect<R, E, A>) => Promise<Exit.Exit<E, A>>

  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the either a success or a failure. The promise will be rejected in case
   * of defects and interruption.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   */
  unsafeRunPromiseEither: <E, A>(effect: Effect.Effect<R, E, A>) => Promise<Either<E, A>>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const defaultRuntime: Runtime<never> = internal.defaultRuntime

/**
 * @since 1.0.0
 * @category constructors
 */
export const defaultRuntimeFlags: RuntimeFlags.RuntimeFlags = internal.defaultRuntimeFlags

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <R>(
  context: Context.Context<R>,
  runtimeFlags: RuntimeFlags.RuntimeFlags,
  fiberRefs: FiberRefs.FiberRefs
) => Runtime<R> = internal.make
