/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import * as _runtime from "@effect/io/internal/runtime"

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
    readonly error: E
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
 * @category constructors
 */
export const succeed: <A>(value: A) => Exit<never, A> = _runtime.succeed as any

/**
 * @since 1.0.0
 * @category constructors
 */
export const failCause: <E>(error: Cause.Cause<E>) => Exit<E, never> = _runtime.failCause as any
