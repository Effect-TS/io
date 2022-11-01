import { IllegalArgumentException } from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as STM from "@effect/io/internal/stm"
import * as Ref from "@effect/io/internal/stm/ref"
import type * as Scope from "@effect/io/Scope"
import type * as Semaphore from "@effect/io/Semaphore"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
const SemaphoreSymbolKey = "@effect/io/Ref/Semaphore"

/** @internal */
export const SemaphoreTypeId: Semaphore.SemaphoreTypeId = Symbol.for(
  SemaphoreSymbolKey
) as Semaphore.SemaphoreTypeId

/** @internal */
class SemaphoreImpl implements Semaphore.Semaphore {
  readonly [SemaphoreTypeId]: Semaphore.SemaphoreTypeId = SemaphoreTypeId
  constructor(readonly permits: Ref.Ref<number>) {}
}

/** @internal */
export const make = (permits: number): STM.STM<never, never, Semaphore.Semaphore> => {
  return pipe(
    Ref.make(() => permits),
    STM.map((permits) => new SemaphoreImpl(permits))
  )
}

/** @internal */
export function available(self: Semaphore.Semaphore): STM.STM<never, never, number> {
  return Ref.get(self.permits)
}

/** @internal */
export const acquire = (self: Semaphore.Semaphore): STM.STM<never, never, void> => {
  return pipe(self, acquireN(1))
}

/** @internal */
export const acquireN = (n: number) => {
  return (self: Semaphore.Semaphore): STM.STM<never, never, void> => {
    return STM.effect((journal) => {
      if (n < 0) {
        throw new IllegalArgumentException(`Unexpected negative value ${n} passed to Semaphore.acquireN`)
      }
      const value = pipe(self.permits, Ref.unsafeGet(journal))
      if (value < n) {
        throw new STM.STMRetryException()
      } else {
        return pipe(self.permits, Ref.unsafeSet(value - n, journal))
      }
    })
  }
}

/** @internal */
export const release = (self: Semaphore.Semaphore): STM.STM<never, never, void> => {
  return pipe(self, releaseN(1))
}

/** @internal */
export const releaseN = (n: number) => {
  return (self: Semaphore.Semaphore): STM.STM<never, never, void> => {
    return STM.effect((journal) => {
      if (n < 0) {
        throw new IllegalArgumentException(`Unexpected negative value ${n} passed to Semaphore.releaseN`)
      }
      const current = pipe(self.permits, Ref.unsafeGet(journal))
      return pipe(self.permits, Ref.unsafeSet(current + n, journal))
    })
  }
}

/** @internal */
export const withPermit = (semaphore: Semaphore.Semaphore) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(self, withPermits(1)(semaphore))
  }
}

/** @internal */
export const withPermits = (permits: number) => {
  return (semaphore: Semaphore.Semaphore) => {
    return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
      return core.uninterruptibleMask((restore) =>
        pipe(
          restore(STM.commit(acquireN(permits)(semaphore))),
          core.zipRight(
            pipe(
              restore(self),
              effect.ensuring(STM.commit(releaseN(permits)(semaphore)))
            )
          )
        )
      )
    }
  }
}

/** @internal */
export const withPermitScoped = (self: Semaphore.Semaphore): Effect.Effect<Scope.Scope, never, void> => {
  return pipe(self, withPermitsScoped(1))
}

/** @internal */
export const withPermitsScoped = (permits: number) => {
  return (self: Semaphore.Semaphore): Effect.Effect<Scope.Scope, never, void> =>
    effect.acquireReleaseInterruptible(
      pipe(self, acquireN(permits), STM.commit),
      () => pipe(self, releaseN(permits), STM.commit)
    )
}

/** @internal */
export const unsafeMake = (permits: number): Semaphore.Semaphore => {
  return new SemaphoreImpl(new Ref.RefImpl(permits))
}
