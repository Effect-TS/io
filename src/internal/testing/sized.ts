import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import type * as FiberRef from "@effect/io/FiberRef"
import * as core from "@effect/io/internal/core"
import * as Context from "@fp-ts/data/Context"

/** @internal */
export const SizedTypeId = Symbol.for("@effect/test/Sized")

/** @internal */
export type SizedTypeId = typeof SizedTypeId

/** @internal */
export interface Sized {
  readonly [SizedTypeId]: SizedTypeId
  /** @internal */
  readonly fiberRef: FiberRef.FiberRef<number>
  /** @macro traced */
  size(): Effect.Effect<never, never, number>
  /** @macro traced */
  withSize(size: number): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
}

/** @internal */
export const Tag: Context.Tag<Sized> = Context.Tag()

/** @internal */
class SizedImpl implements Sized {
  readonly [SizedTypeId]: SizedTypeId = SizedTypeId
  constructor(readonly fiberRef: FiberRef.FiberRef<number>) {}
  size(): Effect.Effect<never, never, number> {
    const trace = getCallTrace()
    return core.fiberRefGet(this.fiberRef).traced(trace)
  }
  withSize(size: number) {
    const trace = getCallTrace()
    return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
      core.fiberRefLocally(this.fiberRef, size)(effect).traced(trace)
  }
}

/** @internal */
export const make = (size: number): Sized => new SizedImpl(core.fiberRefUnsafeMake(size))

/** @internal */
export const fromFiberRef = (fiberRef: FiberRef.FiberRef<number>): Sized => new SizedImpl(fiberRef)
