/**
 * @since 1.0.0
 */
import * as core from "@effect/io/internal/core"
import type { Equal } from "@fp-ts/data/Equal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const EffectTypeId: unique symbol = core.EffectTypeId

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
export const isEffect = core.isEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const async = core.async

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchAllCause = core.catchAllCause

/**
 * Effectually accesses the environment of the effect.
 *
 * @macro traced
 * @category environment
 * @since 1.0.0
 */
export const environmentWithEffect = core.environmentWithEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const fail = core.fail

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const failCause = core.failCause

/**
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flatMap = core.flatMap

/**
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const flatten = core.flatten

/**
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const forEach = core.forEach

/**
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const forEachPar = core.forEachPar

/**
 * @macro traced
 * @since 1.0.0
 * @category concurrency
 */
export const withParallelism = core.withParallelism

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const foldCauseEffect = core.foldCauseEffect

/**
 * Ensures that a cleanup functions runs, whether this effect succeeds, fails,
 * or is interrupted.
 *
 * @macro traced
 * @category finalization
 * @since 1.0.0
 */
export const onExit = core.onExit

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @macro traced
 * @category environment
 * @since 1.0.0
 */
export const provideSomeEnvironment = core.provideSomeEnvironment

/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @macro traced
 * @category environment
 * @since 1.0.0
 */
export const provideEnvironment = core.provideEnvironment

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const succeed = core.succeed

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const sync = core.sync

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const suspendSucceed = core.suspendSucceed

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const updateRuntimeFlags = core.updateRuntimeFlags

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptible = core.interruptible

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptibleMask = core.interruptibleMask

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const uninterruptible = core.uninterruptible

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const uninterruptibleMask = core.uninterruptibleMask

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const whileLoop = core.whileLoop

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const withRuntimeFlags = core.withRuntimeFlags

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const withFiberRuntime = core.withFiberRuntime

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const yieldNow = core.yieldNow

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const unit = core.unit

/**
 * @since 1.0.0
 * @category tracing
 */
export const traced = core.traced

/**
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const exit = core.exit
