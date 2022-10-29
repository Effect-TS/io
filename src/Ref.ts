import type * as Effect from "@effect/io/Effect"
import * as runtime from "@effect/io/internal/runtime"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RefTypeId: unique symbol = runtime.RefTypeId

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
 * @category constructors
 * @since 1.0.0
 */
export const make = runtime.refMake

/**
 * @category getters
 * @since 1.0.0
 */
export const get = runtime.refGet

/**
 * @category mutations
 * @since 1.0.0
 */
export const getAndSet = runtime.refGetAndSet

/**
 * @category mutations
 * @since 1.0.0
 */
export const getAndUpdate = runtime.refGetAndUpdate

/**
 * @category mutations
 * @since 1.0.0
 */
export const getAndUpdateSome = runtime.refGetAndUpdateSome

/**
 * @category mutations
 * @since 1.0.0
 */
export const modify = runtime.refModify

/**
 * @category mutations
 * @since 1.0.0
 */
export const modifySome = runtime.refModifySome

/**
 * @category mutations
 * @since 1.0.0
 */
export const set = runtime.refSet

/**
 * @category mutations
 * @since 1.0.0
 */
export const setAndGet = runtime.refSetAndGet

/**
 * @category unsafe
 * @since 1.0.0
 */
export const unsafeMake = runtime.refUnsafeMake

/**
 * @category unsafe
 * @since 1.0.0
 */
export const update = runtime.refUpdate

/**
 * @category unsafe
 * @since 1.0.0
 */
export const updateSome = runtime.refUpdateSome

/**
 * @category unsafe
 * @since 1.0.0
 */
export const updateSomeAndGet = runtime.refUpdateSomeAndGet
