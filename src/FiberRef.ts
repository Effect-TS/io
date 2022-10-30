/**
 * @since 1.0.0
 */
import * as core from "@effect/io/internal/core"

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
 * @since 1.0.0
 * @category constructors
 */
export const make = core.makeFiberRef

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWith = core.makeWithFiberRef

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeEnvironment = core.makeEnvironmentFiberRef

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMake = core.unsafeMakeFiberRef

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeHashSet = core.unsafeMakeHashSetFiberRef

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeEnvironment = core.unsafeMakeEnvironmentFiberRef

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakePatch = core.unsafeMakePatchFiberRef

/**
 * @since 1.0.0
 * @category getters
 */
export const get = core.getFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const getAndSet = core.getAndSetFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdate = core.getAndUpdateFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateSome = core.getAndUpdateSomeFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const getWith = core.getWithFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const set = core.setFiberRef

const _delete = core.deleteFiberRef
export {
  /**
   * @since 1.0.0
   * @category mutations
   */
  _delete as delete
}

/**
 * @since 1.0.0
 * @category mutations
 */
export const reset = core.resetFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const modify = core.modifyFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const modifySomeFiberRef = core.modifySomeFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const update = core.updateFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const updateSome = core.updateSomeFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const updateAndGet = core.updateAndGetFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const updateSomeAndGet = core.updateSomeAndGetFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const locally = core.locallyFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const locallyWith = core.locallyWithFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const locallyScoped = core.locallyScopedFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const locallyScopedWith = core.locallyScopedFiberRef

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentEnvironment = core.currentEnvironment

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLogLevel = core.currentLogLevel
