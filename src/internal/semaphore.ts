import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as circular from "@effect/io/internal/effect/circular"
import * as STM from "@effect/io/internal/stm"
import * as Ref from "@effect/io/internal/stm/ref"
import type * as Scope from "@effect/io/Scope"
import { pipe } from "@fp-ts/data/Function"

/**
 * @macro traced
 */
export const make = (permits: number): STM.STM<never, never, circular.Semaphore> => {
  const trace = getCallTrace()
  return pipe(
    Ref.make(permits),
    STM.map((permits) => new circular.SemaphoreImpl(permits))
  ).traced(trace)
}

/**
 * @macro traced
 */
export function available(self: circular.Semaphore): STM.STM<never, never, number> {
  const trace = getCallTrace()
  return Ref.get(self.permits).traced(trace)
}

/**
 * @macro traced
 */
export const acquire = (self: circular.Semaphore): STM.STM<never, never, void> => {
  const trace = getCallTrace()
  return pipe(self, circular.acquireN(1)).traced(trace)
}

/**
 * @macro traced
 */
export const release = (self: circular.Semaphore): STM.STM<never, never, void> => {
  const trace = getCallTrace()
  return pipe(self, circular.releaseN(1)).traced(trace)
}

/**
 * @macro traced
 */
export const withPermit = (semaphore: circular.Semaphore) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(self, circular.withPermits(1)(semaphore)).traced(trace)
  }
}

/**
 * @macro traced
 */
export const withPermitScoped = (self: circular.Semaphore): Effect.Effect<Scope.Scope, never, void> => {
  const trace = getCallTrace()
  return pipe(self, circular.withPermitsScoped(1)).traced(trace)
}
