/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RefTypeId: unique symbol = core.RefTypeId

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
export const make = core.refMake

/**
 * @category getters
 * @since 1.0.0
 */
export const get = core.refGet

/**
 * @category mutations
 * @since 1.0.0
 */
export const getAndSet = core.refGetAndSet

/**
 * @category mutations
 * @since 1.0.0
 */
export const getAndUpdate = core.refGetAndUpdate

/**
 * @category mutations
 * @since 1.0.0
 */
export const getAndUpdateSome = core.refGetAndUpdateSome

/**
 * @category mutations
 * @since 1.0.0
 */
export const modify = core.refModify

/**
 * @category mutations
 * @since 1.0.0
 */
export const modifySome = core.refModifySome

/**
 * @category mutations
 * @since 1.0.0
 */
export const set = core.refSet

/**
 * @category mutations
 * @since 1.0.0
 */
export const setAndGet = core.refSetAndGet

/**
 * @category unsafe
 * @since 1.0.0
 */
export const unsafeMake = core.refUnsafeMake

/**
 * @category mutations
 * @since 1.0.0
 */
export const update = core.refUpdate

/**
 * @category mutations
 * @since 1.0.0
 */
export const updateAndGet = core.refUpdateAndGet

/**
 * @category mutations
 * @since 1.0.0
 */
export const updateSome = core.refUpdateSome

/**
 * @category mutations
 * @since 1.0.0
 */
export const updateSomeAndGet = core.refUpdateSomeAndGet
