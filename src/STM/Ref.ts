/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal/ref"
import type * as Journal from "@effect/io/internal/stm/journal"
import type * as TxnId from "@effect/io/internal/stm/txnId"
import type * as Versioned from "@effect/io/internal/stm/versioned"
import type * as STM from "@effect/io/STM"

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
export interface RefConstructor {
  new<A>(value: A): Ref<A>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Ref<A> extends Ref.Variance<A> {
  /**
   * Note: the method is unbound, exposed only for potential extensions.
   */
  modify<B>(f: (a: A) => readonly [B, A]): STM.STM<never, never, B>
  /** @internal */
  todos: Map<TxnId.TxnId, Journal.Todo>
  /** @internal */
  versioned: Versioned.Versioned<A>
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
 * @category unsafe
 */
export const UnsafeRef: RefConstructor = internal.RefImpl

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make

/**
 * @since 1.0.0
 * @category getters
 */
export const get = internal.get

/**
 * @since 1.0.0
 * @category mutations
 */
export const getAndSet = internal.getAndSet

/**
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdate = internal.getAndUpdate

/**
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateSome = internal.getAndUpdateSome

/**
 * @since 1.0.0
 * @category mutations
 */
export const set = internal.set

/**
 * @since 1.0.0
 * @category mutations
 */
export const modify = internal.modify

/**
 * @since 1.0.0
 * @category mutations
 */
export const modifySome = internal.modifySome

/**
 * @category mutations
 * @since 1.0.0
 */
export const update = internal.update

/**
 * @category mutations
 * @since 1.0.0
 */
export const updateAndGet = internal.updateAndGet

/**
 * @category mutations
 * @since 1.0.0
 */
export const updateSome = internal.updateSome

/**
 * @category mutations
 * @since 1.0.0
 */
export const updateSomeAndGet = internal.updateSomeAndGet
