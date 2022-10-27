/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import type { TODO } from "@effect/io/internal/todo"

/**
 * @since 1.0.0
 * @category model
 */
export type FiberRef<A> = TODO<A>

/**
 * @since 1.0.0
 * @category mutations
 */
export declare const locally: <A>(
  value: A
) => (
  self: FiberRef<A>
) => <R, E, B>(
  use: Effect.Effect<R, E, B>
) => Effect.Effect<R, E, B>
