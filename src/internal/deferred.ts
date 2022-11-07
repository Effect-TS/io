import type * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"

/** @internal */
const DeferredSymbolKey = "@effect/io/Deferred"

/** @internal */
export const DeferredTypeId: Deferred.DeferredTypeId = Symbol.for(
  DeferredSymbolKey
) as Deferred.DeferredTypeId

/** @internal */
export const deferredVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export type State<E, A> = Pending<E, A> | Done<E, A>

/** @internal */
export const OP_STATE_PENDING = 0 as const

/** @internal */
export type OP_STATE_PENDING = typeof OP_STATE_PENDING

/** @internal */
export const OP_STATE_DONE = 1 as const

/** @internal */
export type OP_STATE_DONE = typeof OP_STATE_DONE

/** @internal */
export interface Pending<E, A> {
  readonly op: OP_STATE_PENDING
  readonly joiners: Array<(effect: Effect.Effect<never, E, A>) => void>
}

/** @internal */
export interface Done<E, A> {
  readonly op: OP_STATE_DONE
  readonly effect: Effect.Effect<never, E, A>
}

/** @internal */
export const pending = <E, A>(
  joiners: Array<(effect: Effect.Effect<never, E, A>) => void>
): State<E, A> => {
  return { op: OP_STATE_PENDING, joiners }
}

/** @internal */
export const done = <E, A>(effect: Effect.Effect<never, E, A>): State<E, A> => {
  return { op: OP_STATE_DONE, effect }
}
