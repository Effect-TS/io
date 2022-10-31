import type * as FiberId from "@effect/io/Fiber/Id"
import * as internal from "@effect/io/internal/stm/tExit"
import type * as Equal from "@fp-ts/data/Equal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const TExitTypeId: unique symbol = internal.TExitTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type TExitTypeId = typeof TExitTypeId

/**
 * @since 1.0.0
 * @category models
 */
export type TExit<E, A> = Fail<E> | Die | Interrupt | Succeed<A> | Retry

/**
 * @since 1.0.0
 */
export declare namespace TExit {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [TExitTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export type OP_FAIL = 0

/**
 * @since 1.0.0
 * @category op codes
 */
export const OP_FAIL = internal.OP_FAIL

/**
 * @since 1.0.0
 * @category models
 */
export type OP_DIE = 1

/**
 * @since 1.0.0
 * @category op codes
 */
export const OP_DIE = internal.OP_DIE

/**
 * @since 1.0.0
 * @category models
 */
export type OP_INTERRUPT = 2

/**
 * @since 1.0.0
 * @category op codes
 */
export const OP_INTERRUPT = internal.OP_INTERRUPT

/**
 * @since 1.0.0
 * @category models
 */
export type OP_SUCCEED = 3

/**
 * @since 1.0.0
 * @category op codes
 */
export const OP_SUCCEED = internal.OP_SUCCEED

/**
 * @since 1.0.0
 * @category models
 */
export type OP_RETRY = 4

/**
 * @since 1.0.0
 * @category op codes
 */
export const OP_RETRY = internal.OP_RETRY

/**
 * @since 1.0.0
 * @category models
 */
export interface Fail<E> extends TExit.Variance<E, never>, Equal.Equal {
  readonly op: OP_FAIL
  readonly error: E
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Die extends TExit.Variance<never, never>, Equal.Equal {
  readonly op: OP_DIE
  readonly defect: unknown
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Interrupt extends TExit.Variance<never, never>, Equal.Equal {
  readonly op: OP_INTERRUPT
  readonly fiberId: FiberId.FiberId
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Succeed<A> extends TExit.Variance<never, A>, Equal.Equal {
  readonly op: OP_SUCCEED
  readonly value: A
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Retry extends TExit.Variance<never, never>, Equal.Equal {
  readonly op: OP_RETRY
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isTExit = internal.isTExit

/**
 * @since 1.0.0
 * @category refinements
 */
export const isFail = internal.isFail

/**
 * @since 1.0.0
 * @category refinements
 */
export const isDie = internal.isDie

/**
 * @since 1.0.0
 * @category refinements
 */
export const isInterrupt = internal.isInterrupt

/**
 * @since 1.0.0
 * @category refinements
 */
export const isSuccess = internal.isSuccess

/**
 * @since 1.0.0
 * @category refinements
 */
export const isRetry = internal.isRetry

/**
 * @since 1.0.0
 * @category constructors
 */
export const fail = internal.fail

/**
 * @since 1.0.0
 * @category constructors
 */
export const die = internal.die

/**
 * @since 1.0.0
 * @category constructors
 */
export const interrupt = internal.interrupt

/**
 * @since 1.0.0
 * @category constructors
 */
export const succeed = internal.succeed

/**
 * @since 1.0.0
 * @category constructors
 */
export const retry = internal.retry

/**
 * @since 1.0.0
 * @category constructors
 */
export const unit = internal.unit
