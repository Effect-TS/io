/**
 * @since 1.0.0
 */
import * as _Effect from "@effect/io/internal/runtime"
import type { Equal } from "@fp-ts/data/Equal"

/**
 * @since 1.0.0
 */
export const EffectTypeId: unique symbol = _Effect.EffectTypeId

/**
 * @since 1.0.0
 */
export type EffectTypeId = typeof EffectTypeId

/**
 * @since 1.0.0
 */
export interface Effect<R, E, A> extends Variance<R, E, A>, Equal {}

/**
 * @since 1.0.0
 */
export interface Variance<R, E, A> {
  readonly [EffectTypeId]: {
    readonly _R: (_: never) => R
    readonly _E: (_: never) => E
    readonly _A: (_: never) => A
  }
}

/**
 * @since 1.0.0
 */
export const async = _Effect.async

/**
 * @since 1.0.0
 */
export const succeed = _Effect.succeed

/**
 * @since 1.0.0
 */
export const sync = _Effect.sync

/**
 * @since 1.0.0
 */
export const whileLoop = _Effect.whileLoop

/**
 * @since 1.0.0
 */
export const yieldNow = _Effect.yieldNow
