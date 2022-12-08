/**
 * A `Supervisor<T>` is allowed to supervise the launching and termination of
 * fibers, producing some visible value of type `T` from the supervision.
 *
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import * as circular from "@effect/io/internal/layer/circular"
import * as internal from "@effect/io/internal/supervisor"
import type * as Layer from "@effect/io/Layer"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Context from "@fp-ts/data/Context"
import type * as MutableRef from "@fp-ts/data/MutableRef"
import type * as Option from "@fp-ts/data/Option"
import type * as SortedSet from "@fp-ts/data/SortedSet"

/**
 * @since 1.0.0
 * @category symbols
 */
export const SupervisorTypeId: unique symbol = internal.SupervisorTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type SupervisorTypeId = typeof SupervisorTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Supervisor<T> extends Supervisor.Variance<T> {
  /**
   * Returns an `Effect` that succeeds with the value produced by this
   * supervisor. This value may change over time, reflecting what the supervisor
   * produces as it supervises fibers.
   * @macro traced
   */
  value(): Effect.Effect<never, never, T>

  /**
   * Supervises the start of a `Fiber`.
   */
  onStart<R, E, A>(
    context: Context.Context<R>,
    effect: Effect.Effect<R, E, A>,
    parent: Option.Option<Fiber.RuntimeFiber<any, any>>,
    fiber: Fiber.RuntimeFiber<E, A>
  ): void

  /**
   * Supervises the end of a `Fiber`.
   */
  onEnd<E, A>(value: Exit.Exit<E, A>, fiber: Fiber.RuntimeFiber<E, A>): void

  /**
   * Supervises the execution of an `Effect` by a `Fiber`.
   */
  onEffect<E, A>(fiber: Fiber.RuntimeFiber<E, A>, effect: Effect.Effect<any, any, any>): void

  /**
   * Supervises the suspension of a computation running within a `Fiber`.
   */
  onSuspend<E, A>(fiber: Fiber.RuntimeFiber<E, A>): void

  /**
   * Supervises the resumption of a computation running within a `Fiber`.
   */
  onResume<E, A>(fiber: Fiber.RuntimeFiber<E, A>): void

  /**
   * Maps this supervisor to another one, which has the same effect, but whose
   * value has been transformed by the specified function.
   */
  map<B>(f: (a: T) => B): Supervisor<B>

  /**
   * Returns a new supervisor that performs the function of this supervisor, and
   * the function of the specified supervisor, producing a tuple of the outputs
   * produced by both supervisors.
   */
  zip<A>(right: Supervisor<A>): Supervisor<readonly [T, A]>
}

/**
 * @since 1.0.0
 */
export declare namespace Supervisor {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<T> {
    readonly [SupervisorTypeId]: {
      readonly _T: (_: never) => T
    }
  }
}

/**
 * @since 1.0.0
 * @category environment
 */
export const addSupervisor: <A>(supervisor: Supervisor<A>) => Layer.Layer<never, never, never> = circular.addSupervisor

/**
 * Creates a new supervisor that tracks children in a set.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const fibersIn: (
  ref: MutableRef.MutableRef<SortedSet.SortedSet<Fiber.RuntimeFiber<any, any>>>
) => Effect.Effect<never, never, Supervisor<SortedSet.SortedSet<Fiber.RuntimeFiber<any, any>>>> = internal.fibersIn

/**
 * Creates a new supervisor that constantly yields effect when polled
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromEffect: <A>(effect: Effect.Effect<never, never, A>) => Supervisor<A> = internal.fromEffect

/**
 * A supervisor that doesn't do anything in response to supervision events.
 *
 * @since 1.0.0
 * @category constructors
 */
export const none: Supervisor<void> = internal.none

/**
 * Creates a new supervisor that tracks children in a set.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const track: () => Effect.Effect<never, never, Supervisor<Chunk.Chunk<Fiber.RuntimeFiber<any, any>>>> =
  internal.track

/**
 * Unsafely creates a new supervisor that tracks children in a set.
 *
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeTrack: () => Supervisor<Chunk.Chunk<Fiber.RuntimeFiber<any, any>>> = internal.unsafeTrack
