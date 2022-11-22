/**
 * @since 1.0.0
 */
import * as core from "@effect/io/internal/core"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as logger from "@effect/io/internal/logger"

/**
 * @since 1.0.0
 * @category symbols
 */
export const FiberRefTypeId: unique symbol = core.FiberRefTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type FiberRefTypeId = typeof FiberRefTypeId

/**
 * @since 1.0.0
 * @category model
 */
export interface FiberRef<A> extends Variance<A> {
  /** @internal */
  readonly initial: A
  /** @internal */
  readonly diff: (oldValue: A, newValue: A) => unknown
  /** @internal */
  readonly combine: (first: unknown, second: unknown) => unknown
  /** @internal */
  readonly patch: (patch: unknown) => (oldValue: A) => A
  /** @internal */
  readonly fork: unknown
  /** @internal */
  readonly join: (oldValue: A, newValue: A) => A
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Variance<A> {
  readonly [FiberRefTypeId]: {
    readonly _A: (_: never) => A
  }
}

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const make = fiberRuntime.fiberRefMake

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const makeWith = fiberRuntime.fiberRefMakeWith

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const makeEnvironment = fiberRuntime.fiberRefMakeEnvironment

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const makeRuntimeFlags = fiberRuntime.fiberRefMakeRuntimeFlags

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMake = core.fiberRefUnsafeMake

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeHashSet = core.fiberRefUnsafeMakeHashSet

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeEnvironment = core.fiberRefUnsafeMakeEnvironment

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeSupervisor = fiberRuntime.fiberRefUnsafeMakeSupervisor

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakePatch = core.fiberRefUnsafeMakePatch

/**
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const get = core.fiberRefGet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndSet = core.fiberRefGetAndSet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdate = core.fiberRefgetAndUpdate

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateSome = core.fiberRefGetAndUpdateSome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getWith = core.fiberRefGetWith

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const set = core.fiberRefSet

const _delete = core.fiberRefDelete
export {
  /**
   * @macro traced
   * @since 1.0.0
   * @category mutations
   */
  _delete as delete
}

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const reset = core.fiberRefReset

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modify = core.fiberRefModify

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modifySome = core.fiberRefModifySome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const update = core.fiberRefUpdate

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSome = core.fiberRefUpdateSome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateAndGet = core.fiberRefUpdateAndGet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSomeAndGet = core.fiberRefUpdateSomeAndGet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const locally = core.fiberRefLocally

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const locallyWith = core.fiberRefLocallyWith

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const locallyScoped = fiberRuntime.fiberRefLocallyScoped

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const locallyScopedWith = fiberRuntime.fiberRefLocallyScoped

/**
 * @macro traced
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentEnvironment = core.currentEnvironment

/**
 * @macro traced
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLogAnnotations = core.currentLogAnnotations

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLoggers = logger.currentLoggers

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLogLevel = core.currentLogLevel

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLogSpan = core.currentLogSpan

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentRuntimeFlags = fiberRuntime.currentRuntimeFlags

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentScheduler = core.currentScheduler

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentParallelism = core.currentParallelism

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentSupervisor = fiberRuntime.currentSupervisor

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const forkScopeOverride = core.forkScopeOverride

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const interruptedCause = core.interruptedCause
