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
 * @category finalization
 */
export const addFinalizerExit = core.addFinalizerExit

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const acquireRelease = core.acquireRelease

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const acquireUseRelease = core.acquireUseRelease

/**
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const as = core.as

/**
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const asUnit = core.asUnit

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const async = core.async

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const asyncInterrupt = core.asyncInterrupt

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const catchAllCause = core.catchAllCause

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const done = core.done

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const die = core.die

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const dieSync = core.dieSync

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
 * @category environment
 * @since 1.0.0
 */
export const environment = core.environment

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
export const failSync = core.failSync

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const failCause = core.failCause

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const failCauseSync = core.failCauseSync

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
export const forEachDiscard = core.forEachDiscard

/**
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const forEachPar = core.forEachPar

/**
 * @macro traced
 * @since 1.0.0
 * @category folding
 */
export const forEachParDiscard = core.forEachParDiscard

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const foldCause = core.foldCause

/**
 * @macro traced
 * @since 1.0.0
 * @category error handling
 */
export const foldCauseEffect = core.foldCauseEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mapping
 */
export const map = core.map

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
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @macro traced
 * @category environment
 * @since 1.0.0
 */
export const provideSomeEnvironment = core.provideSomeEnvironment

/**
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const scope = core.scope

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
 * @category environment
 */
export const service = core.service

/**
 * @macro traced
 * @since 1.0.0
 * @category environment
 */
export const serviceWithEffect = core.serviceWithEffect

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
 * @category utilities
 */
export const intoDeferred = core.intoDeferred

/**
 * @macro traced
 * @since 1.0.0
 * @category sequencing
 */
export const tap = core.tap

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
 * @category interruption
 */
export const interrupt = core.interrupt

/**
 * @macro traced
 * @since 1.0.0
 * @category interruption
 */
export const interruptAs = core.interruptAs

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
 * @macro traced
 * @since 1.0.0
 * @category finalization
 */
export const onInterrupt = core.onInterrupt

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const whileLoop = core.whileLoop

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const whenEffect = core.whenEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const withFiberRuntime = core.withFiberRuntime

/**
 * @macro traced
 * @since 1.0.0
 * @category concurrency
 */
export const withParallelism = core.withParallelism

/**
 * @macro traced
 * @since 1.0.0
 * @category runtime
 */
export const withRuntimeFlags = core.withRuntimeFlags

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
 * @category utilities
 */
export const exit = core.exit

/**
 * @macro traced
 * @since 1.0.0
 * @category utilities
 */
export const fiberId = core.fiberId

/**
 * @macro traced
 * @since 1.0.0
 * @category products
 */
export const zip = core.zip

/**
 * @macro traced
 * @since 1.0.0
 * @category products
 */
export const zipLeft = core.zipLeft

/**
 * @macro traced
 * @since 1.0.0
 * @category products
 */
export const zipRight = core.zipRight

/**
 * @macro traced
 * @since 1.0.0
 * @category products
 */
export const zipWith = core.zipWith
