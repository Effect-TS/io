import type * as Effect from "@effect/io/Effect"
import * as circular from "@effect/io/internal/effect/circular"
import * as STM from "@effect/io/internal/stm"
import * as Ref from "@effect/io/internal/stm/ref"
import type * as Scope from "@effect/io/Scope"
import { pipe } from "@fp-ts/data/Function"

export const make = (permits: number): STM.STM<never, never, circular.Semaphore> => {
  return pipe(
    Ref.make(() => permits),
    STM.map((permits) => new circular.SemaphoreImpl(permits))
  )
}

export function available(self: circular.Semaphore): STM.STM<never, never, number> {
  return Ref.get(self.permits)
}

export const acquire = (self: circular.Semaphore): STM.STM<never, never, void> => {
  return pipe(self, circular.acquireN(1))
}

export const release = (self: circular.Semaphore): STM.STM<never, never, void> => {
  return pipe(self, circular.releaseN(1))
}

export const withPermit = (semaphore: circular.Semaphore) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(self, circular.withPermits(1)(semaphore))
  }
}

export const withPermitScoped = (self: circular.Semaphore): Effect.Effect<Scope.Scope, never, void> => {
  return pipe(self, circular.withPermitsScoped(1))
}
