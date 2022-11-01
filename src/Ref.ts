/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/ref"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RefTypeId: unique symbol = internal.RefTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type RefTypeId = typeof RefTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Ref<A> extends Ref.Variance<A> {
  /**
   * @macro traced
   */
  modify<B>(f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
}

/**
 * @since 1.0.0
 * @category models
 */
export namespace Ref {
  export interface Variance<A> {
    readonly [RefTypeId]: {
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
export const getAndUpdateSome = internal.getAndUpdateSome

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
export const modifySome = internal.modifySome

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
export const updateSome = internal.updateSome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSomeAndGet = internal.updateSomeAndGet

/**
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeMake = internal.unsafeMake
