/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import type * as FiberScope from "@effect/io/Fiber/Scope"
import type * as FiberRef from "@effect/io/FiberRef"
import type { TODO } from "@effect/io/internal/todo"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as Option from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface Runtime<E, A> extends Fiber.RuntimeFiber<E, A> {
  scope: FiberScope.FiberScope
  log(
    message: string,
    cause: Cause.Cause<any>,
    overrideLogLevel: Option.Option<LogLevel.LogLevel>
  ): void
  startFork<R>(effect: Effect.Effect<R, E, A>): void
  addObserver(observer: (exit: Exit.Exit<E, A>) => void): void
  deleteFiberRef<X>(ref: FiberRef.FiberRef<X>): void
  getFiberRef<X>(ref: FiberRef.FiberRef<X>): X
  setFiberRef<X>(ref: FiberRef.FiberRef<X>, x: X): X
  todo: TODO<[E, A]>
}
