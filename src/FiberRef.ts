/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal/runtime"

/**
 * @since 1.0.0
 * @category symbols
 */
export const FiberRefTypeId: unique symbol = internal.FiberRefTypeId

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
export const make = internal.makeFiberRef

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWith = internal.makeWithFiberRef

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeEnvironment = internal.makeEnvironmentFiberRef

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMake = internal.unsafeMakeFiberRef

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeHashSet = internal.unsafeMakeHashSetFiberRef

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeEnvironment = internal.unsafeMakeEnvironmentFiberRef

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakePatch = internal.unsafeMakePatchFiberRef

/**
 * @since 1.0.0
 * @category getters
 */
export const get = internal.getFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const getAndSet = internal.getAndSetFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdate = internal.getAndUpdateFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateSome = internal.getAndUpdateSomeFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const getWith = internal.getWithFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const set = internal.setFiberRef

const _delete = internal.deleteFiberRef
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
export const reset = internal.resetFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const modify = internal.modifyFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const modifySomeFiberRef = internal.modifySomeFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const update = internal.updateFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const updateSome = internal.updateSomeFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const updateAndGet = internal.updateAndGetFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const updateSomeAndGet = internal.updateSomeAndGetFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const locally = internal.locallyFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const locallyWith = internal.locallyWithFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const locallyScoped = internal.locallyScopedFiberRef

/**
 * @since 1.0.0
 * @category mutations
 */
export const locallyScopedWith = internal.locallyScopedFiberRef

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentEnvironment = internal.currentEnvironment

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLogLevel = internal.currentLogLevel
