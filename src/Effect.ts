/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal/runtime"
import type { Equal } from "@fp-ts/data/Equal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const EffectTypeId: unique symbol = internal.EffectTypeId

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
 * @since 1.0.0
 * @category refinements
 */
export const isEffect = internal.isEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const async = internal.async

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const fail = internal.fail

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const failCause = internal.failCause

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchAllCause = internal.catchAllCause

/**
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flatMap = internal.flatMap

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const foldCauseEffect = internal.foldCauseEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeed = internal.succeed

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const sync = internal.sync

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const suspendSucceed = internal.suspendSucceed

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const updateRuntimeFlags = internal.updateRuntimeFlags

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptible = internal.interruptible

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptibleMask = internal.interruptibleMask

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const uninterruptible = internal.uninterruptible

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const uninterruptibleMask = internal.uninterruptibleMask

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const whileLoop = internal.whileLoop

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const withRuntimeFlags = internal.withRuntimeFlags

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const withFiberRuntime = internal.withFiberRuntime

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const yieldNow = internal.yieldNow

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const unit = internal.unit

/**
 * @since 1.0.0
 * @category tracing
 */
export const traced = internal.traced

/**
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const exit = internal.exit
