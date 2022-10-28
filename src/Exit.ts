/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/exit"

/**
 * @since 1.0.0
 * @category models
 */
export type Exit<E, A> = Failure<E> | Success<A>

/**
 * @since 1.0.0
 * @category models
 */
export interface Failure<E> extends Effect.Effect<never, E, never> {
  readonly _tag: "Failure"
  readonly body: {
    readonly error: Cause.Cause<E>
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Success<A> extends Effect.Effect<never, never, A> {
  readonly _tag: "Success"
  readonly body: {
    readonly value: A
  }
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isExit = internal.isExit

/**
 * @since 1.0.0
 * @category constructors
 */
export const succeed = internal.succeed

/**
 * @since 1.0.0
 * @category constructors
 */
export const failCause = internal.failCause

/**
 * @since 1.0.0
 * @category folding
 */
export const match = internal.match
