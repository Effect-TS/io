/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as Exit from "@effect/io/Exit"
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRef from "@effect/io/FiberRef"
import type { TODO } from "@effect/io/internal/todo"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as Option from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export type Runtime<E, A> = {
  id: FiberId.FiberId
  log(
    message: string,
    cause: Cause.Cause<any>,
    overrideLogLevel: Option.Option<LogLevel.LogLevel>
  ): void
  addObserver(observer: (exit: Exit.Exit<E, A>) => void): void
  deleteFiberRef<X>(ref: FiberRef.FiberRef<X>): void
  getFiberRef<X>(ref: FiberRef.FiberRef<X>): X
  setFiberRef<X>(ref: FiberRef.FiberRef<X>, x: X): X
  todo: TODO<[E, A]>
}
