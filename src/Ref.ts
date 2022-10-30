/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as ref from "@effect/io/internal/ref"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RefTypeId: unique symbol = ref.RefTypeId

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
export const make = ref.refMake

/**
 * @category getters
 * @since 1.0.0
 */
export const get = ref.refGet

/**
 * @category mutations
 * @since 1.0.0
 */
export const getAndSet = ref.refGetAndSet

/**
 * @category mutations
 * @since 1.0.0
 */
export const getAndUpdate = ref.refGetAndUpdate

/**
 * @category mutations
 * @since 1.0.0
 */
export const getAndUpdateSome = ref.refGetAndUpdateSome

/**
 * @category mutations
 * @since 1.0.0
 */
export const modify = ref.refModify

/**
 * @category mutations
 * @since 1.0.0
 */
export const modifySome = ref.refModifySome

/**
 * @category mutations
 * @since 1.0.0
 */
export const set = ref.refSet

/**
 * @category mutations
 * @since 1.0.0
 */
export const setAndGet = ref.refSetAndGet

/**
 * @category unsafe
 * @since 1.0.0
 */
export const unsafeMake = ref.refUnsafeMake

/**
 * @category mutations
 * @since 1.0.0
 */
export const update = ref.refUpdate

/**
 * @category mutations
 * @since 1.0.0
 */
export const updateAndGet = ref.refUpdateAndGet

/**
 * @category mutations
 * @since 1.0.0
 */
export const updateSome = ref.refUpdateSome

/**
 * @category mutations
 * @since 1.0.0
 */
export const updateSomeAndGet = ref.refUpdateSomeAndGet
