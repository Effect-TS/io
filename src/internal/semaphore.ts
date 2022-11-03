import type * as Effect from "@effect/io/Effect"
import * as circular from "@effect/io/internal/effect/circular"
import * as STM from "@effect/io/internal/stm"
import * as Ref from "@effect/io/internal/stm/ref"
import type * as Scope from "@effect/io/Scope"
import type * as Semaphore from "@effect/io/Semaphore"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
export const make = (permits: number): STM.STM<never, never, Semaphore.Semaphore> => {
  return pipe(
    Ref.make(() => permits),
    STM.map((permits) => new circular.SemaphoreImpl(permits))
  )
}

/** @internal */
export function available(self: Semaphore.Semaphore): STM.STM<never, never, number> {
  return Ref.get(self.permits)
}

/** @internal */
export const acquire = (self: Semaphore.Semaphore): STM.STM<never, never, void> => {
  return pipe(self, circular.acquireN(1))
}

/** @internal */
export const release = (self: Semaphore.Semaphore): STM.STM<never, never, void> => {
  return pipe(self, circular.releaseN(1))
}

/** @internal */
export const withPermit = (semaphore: Semaphore.Semaphore) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(self, circular.withPermits(1)(semaphore))
  }
}

/** @internal */
export const withPermitScoped = (self: Semaphore.Semaphore): Effect.Effect<Scope.Scope, never, void> => {
  return pipe(self, circular.withPermitsScoped(1))
}
