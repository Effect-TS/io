/**
 * @since 1.0.0
 */
import * as _Effect from "@effect/io/internal/runtime"
import type { Equal } from "@fp-ts/data/Equal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const EffectTypeId: unique symbol = _Effect.EffectTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type EffectTypeId = typeof EffectTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Effect<R, E, A> extends Variance<R, E, A>, Equal {
  /** @internal */
  traced(trace: string | undefined): Effect<R, E, A>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Variance<R, E, A> {
  readonly [EffectTypeId]: {
    readonly _R: (_: never) => R
    readonly _E: (_: never) => E
    readonly _A: (_: never) => A
  }
}

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const async = _Effect.async

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const fail = _Effect.fail

/**
 * @macro traced
 * @since 1.0.0
 * @category alternatives
 */
export const catchAllCause = _Effect.catchAllCause

/**
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flatMap = _Effect.flatMap

/**
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const foldCauseEffect = _Effect.foldCauseEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeed = _Effect.succeed

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const sync = _Effect.sync

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const updateRuntimeFlags = _Effect.updateRuntimeFlags

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptible = _Effect.interruptible

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptibleMask = _Effect.interruptibleMask

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const uninterruptible = _Effect.uninterruptible

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const uninterruptibleMask = _Effect.uninterruptibleMask

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const whileLoop = _Effect.whileLoop

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const withRuntimeFlags = _Effect.withRuntimeFlags

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const withFiberRuntime = _Effect.withFiberRuntime

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const yieldNow = _Effect.yieldNow

/**
 * @since 1.0.0
 * @category tracing
 */
export const traced = _Effect.traced
