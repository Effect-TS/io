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
  /** @internal */
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
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.refMake

/**
 * @since 1.0.0
 * @category getters
 */
export const get = internal.refGet

/**
 * @since 1.0.0
 * @category mutations
 */
export const getAndSet = internal.refGetAndSet

/**
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdate = internal.refGetAndUpdate

/**
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateSome = internal.refGetAndUpdateSome

/**
 * @since 1.0.0
 * @category mutations
 */
export const modify = internal.refModify

/**
 * @since 1.0.0
 * @category mutations
 */
export const modifySome = internal.refModifySome

/**
 * @since 1.0.0
 * @category mutations
 */
export const set = internal.refSet

/**
 * @since 1.0.0
 * @category mutations
 */
export const setAndGet = internal.refSetAndGet

/**
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeMake = internal.refUnsafeMake

/**
 * @since 1.0.0
 * @category unsafe
 */
export const update = internal.refUpdate

/**
 * @since 1.0.0
 * @category unsafe
 */
export const updateSome = internal.refUpdateSome

/**
 * @since 1.0.0
 * @category unsafe
 */
export const updateSomeAndGet = internal.refUpdateSomeAndGet
