/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/ref"
import type * as Option from "@fp-ts/data/Option"

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
export const make: <A>(value: A) => Effect.Effect<never, never, Ref<A>> = internal.make

/**
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const get: <A>(self: Ref<A>) => Effect.Effect<never, never, A> = internal.get

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndSet: <A>(self: Ref<A>) => (value: A) => Effect.Effect<never, never, A> = internal.getAndSet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdate: <A>(self: Ref<A>) => (f: (a: A) => A) => Effect.Effect<never, never, A> =
  internal.getAndUpdate

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateSome: <A>(self: Ref<A>) => (pf: (a: A) => Option.Option<A>) => Effect.Effect<never, never, A> =
  internal.getAndUpdateSome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modify: <A>(self: Ref<A>) => <B>(f: (a: A) => readonly [B, A]) => Effect.Effect<never, never, B> =
  internal.modify

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modifySome: <A>(
  self: Ref<A>
) => <B>(fallback: B, pf: (a: A) => Option.Option<readonly [B, A]>) => Effect.Effect<never, never, B> =
  internal.modifySome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const set: <A>(self: Ref<A>) => (value: A) => Effect.Effect<never, never, void> = internal.set

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const setAndGet: <A>(self: Ref<A>) => (value: A) => Effect.Effect<never, never, A> = internal.setAndGet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const update: <A>(self: Ref<A>) => (f: (a: A) => A) => Effect.Effect<never, never, void> = internal.update

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateAndGet: <A>(self: Ref<A>) => (f: (a: A) => A) => Effect.Effect<never, never, A> =
  internal.updateAndGet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSome: <A>(self: Ref<A>) => (f: (a: A) => Option.Option<A>) => Effect.Effect<never, never, void> =
  internal.updateSome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSomeAndGet: <A>(self: Ref<A>) => (pf: (a: A) => Option.Option<A>) => Effect.Effect<never, never, A> =
  internal.updateSomeAndGet

/**
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeMake: <A>(value: A) => Ref<A> = internal.unsafeMake
