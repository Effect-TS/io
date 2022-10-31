/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal/ref"
import type * as Journal from "@effect/io/internal/stm/journal"
import type * as TxnId from "@effect/io/internal/stm/txnId"
import type * as Versioned from "@effect/io/internal/stm/versioned"
import type * as HashMap from "@fp-ts/data/HashMap"
import type * as MutableRef from "@fp-ts/data/mutable/MutableRef"

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
  readonly todos: MutableRef.MutableRef<HashMap.HashMap<TxnId.TxnId, Journal.Todo>>
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
export const unsafeMake = internal.unsafeMake

/**
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeGet = internal.unsafeGet

/**
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeSet = internal.unsafeSet

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeCommit = internal.makeCommit

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
