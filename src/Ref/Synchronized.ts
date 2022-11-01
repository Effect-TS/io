/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/synchronizedRef"
import type * as Ref from "@effect/io/Ref"

/**
 * @since 1.0.0
 * @category symbols
 */
export const SynchronizedTypeId: unique symbol = internal.SynchronizedTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type SynchronizedTypeId = typeof SynchronizedTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Synchronized<A> extends Synchronized.Variance<A>, Ref.Ref<A> {
  /**
   * @macro traced
   */
  modifyEffect<R, E, B>(f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): Effect.Effect<R, E, B>
}

/**
 * @since 1.0.0
 */
export declare namespace Synchronized {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [SynchronizedTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make

/**
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const get = internal.get

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndSet = internal.getAndSet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdate = internal.getAndUpdate

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateEffect = internal.getAndUpdateEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateSome = internal.getAndUpdateSome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateSomeEffect = internal.getAndUpdateSomeEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modify = internal.modify

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modifyEffect = internal.modifyEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modifySome = internal.modifySome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modifySomeEffect = internal.modifySomeEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const set = internal.set

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const setAndGet = internal.setAndGet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const update = internal.update

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateEffect = internal.updateEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateAndGetEffect = internal.updateAndGetEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSome = internal.updateSome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSomeEffect = internal.updateSomeEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSomeAndGet = internal.updateSomeAndGet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSomeAndGetEffect = internal.updateSomeAndGetEffect

/**
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeMake = internal.unsafeMake
