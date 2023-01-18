/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as circular from "@effect/io/internal/effect/circular"
import * as internal from "@effect/io/internal/synchronizedRef"
import type * as Ref from "@effect/io/Ref"
import type * as Option from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 * @category symbols
 */
export const SynchronizedTypeId: unique symbol = circular.SynchronizedTypeId

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
export const make: <A>(value: A) => Effect.Effect<never, never, Synchronized<A>> = circular.makeSynchronized

/**
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const get: <A>(self: Synchronized<A>) => Effect.Effect<never, never, A> = internal.get

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndSet: <A>(self: Synchronized<A>, value: A) => Effect.Effect<never, never, A> = internal.getAndSet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdate: <A>(self: Synchronized<A>, f: (a: A) => A) => Effect.Effect<never, never, A> =
  internal.getAndUpdate

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateEffect: <A, R, E>(
  self: Synchronized<A>,
  f: (a: A) => Effect.Effect<R, E, A>
) => Effect.Effect<R, E, A> = internal.getAndUpdateEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateSome: <A>(
  self: Synchronized<A>,
  f: (a: A) => Option.Option<A>
) => Effect.Effect<never, never, A> = internal.getAndUpdateSome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateSomeEffect: <A, R, E>(
  self: Synchronized<A>,
  pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
) => Effect.Effect<R, E, A> = internal.getAndUpdateSomeEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modify: <A, B>(self: Synchronized<A>, f: (a: A) => readonly [B, A]) => Effect.Effect<never, never, B> =
  internal.modify

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modifyEffect: <A, R, E, B>(
  self: Synchronized<A>,
  f: (a: A) => Effect.Effect<R, E, readonly [B, A]>
) => Effect.Effect<R, E, B> = internal.modifyEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modifySome: <A, B>(
  self: Synchronized<A>,
  fallback: B,
  f: (a: A) => Option.Option<readonly [B, A]>
) => Effect.Effect<never, never, B> = internal.modifySome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modifySomeEffect: <A, B, R, E>(
  self: Synchronized<A>,
  fallback: B,
  pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>
) => Effect.Effect<R, E, B> = internal.modifySomeEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const set: <A>(self: Synchronized<A>, value: A) => Effect.Effect<never, never, void> = internal.set

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const setAndGet: <A>(self: Synchronized<A>, value: A) => Effect.Effect<never, never, A> = internal.setAndGet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const update: <A>(self: Synchronized<A>, f: (a: A) => A) => Effect.Effect<never, never, void> = internal.update

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateEffect: <A, R, E>(
  self: Synchronized<A>,
  f: (a: A) => Effect.Effect<R, E, A>
) => Effect.Effect<R, E, void> = internal.updateEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateAndGetEffect: <A, R, E>(
  self: Synchronized<A>,
  f: (a: A) => Effect.Effect<R, E, A>
) => Effect.Effect<R, E, A> = internal.updateAndGetEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSome: <A>(
  self: Synchronized<A>,
  f: (a: A) => Option.Option<A>
) => Effect.Effect<never, never, void> = internal.updateSome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSomeEffect: <A, R, E>(
  self: Synchronized<A>,
  pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
) => Effect.Effect<R, E, void> = internal.updateSomeEffect

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSomeAndGet: <A>(
  self: Synchronized<A>,
  f: (a: A) => Option.Option<A>
) => Effect.Effect<never, never, A> = internal.updateSomeAndGet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSomeAndGetEffect: <A, R, E>(
  self: Synchronized<A>,
  pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
) => Effect.Effect<R, E, A> = circular.updateSomeAndGetEffectSynchronized

/**
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeMake: <A>(value: A) => Synchronized<A> = circular.unsafeMakeSynchronized
