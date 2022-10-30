/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import type * as FiberId from "@effect/io/Fiber/Id"
import * as internal from "@effect/io/internal/stm"

/**
 * @since 1.0.0
 * @category symbols
 */
export const STMTypeId: unique symbol = internal.STMTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type STMTypeId = typeof STMTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const STMFailExceptionTypeId: unique symbol = internal.STMFailExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type STMFailExceptionTypeId = typeof STMFailExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const STMDieExceptionTypeId: unique symbol = internal.STMDieExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type STMDieExceptionTypeId = typeof STMDieExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const STMInterruptExceptionTypeId: unique symbol = internal.STMInterruptExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type STMInterruptExceptionTypeId = typeof STMInterruptExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const STMRetryExceptionTypeId: unique symbol = internal.STMRetryExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type STMRetryExceptionTypeId = typeof STMRetryExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export interface STM<R, E, A> extends Effect.Effect<R, E, A> {
  readonly [STMTypeId]: {
    readonly _R: (_: never) => R
    readonly _E: (_: never) => E
    readonly _A: (_: never) => A
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Variance<R, E, A> {
  readonly [STMTypeId]: {
    readonly _R: (_: never) => R
    readonly _E: (_: never) => E
    readonly _A: (_: never) => A
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface STMFailException<E> {
  readonly [STMFailExceptionTypeId]: STMFailExceptionTypeId
  readonly error: E
}

/**
 * @since 1.0.0
 * @category models
 */
export interface STMDieException {
  readonly [STMDieExceptionTypeId]: STMDieExceptionTypeId
  readonly defect: unknown
}

/**
 * @since 1.0.0
 * @category models
 */
export interface STMInterruptException {
  readonly [STMInterruptExceptionTypeId]: STMInterruptExceptionTypeId
  readonly fiberId: FiberId.FiberId
}

/**
 * @since 1.0.0
 * @category models
 */
export interface STMRetryException {
  readonly [STMRetryExceptionTypeId]: STMRetryExceptionTypeId
}
