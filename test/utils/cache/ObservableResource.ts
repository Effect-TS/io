import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import * as Ref from "@effect/io/Ref"
import * as Scope from "@effect/io/Scope"
import { expect } from "bun:test"

export interface ObservableResource<E, V> {
  readonly scoped: Effect.Effect<Scope.Scope, E, V>
  assertNotAcquired(): Effect.Effect<never, never, void>
  assertAcquiredOnceAndCleaned(): Effect.Effect<never, never, void>
  assertAcquiredOnceAndNotCleaned(): Effect.Effect<never, never, void>
}

class ObservableResourceImpl<E, V> implements ObservableResource<E, V> {
  constructor(
    readonly scoped: Effect.Effect<Scope.Scope, E, V>,
    readonly getState: Effect.Effect<never, never, readonly [number, number]>
  ) {}

  assertNotAcquired(): Effect.Effect<never, never, void> {
    return Effect.map(this.getState, ([numAcquisition, numCleaned]) => {
      expect(numAcquisition).toBe(0)
      expect(numCleaned).toBe(0)
    })
  }

  assertAcquiredOnceAndCleaned(): Effect.Effect<never, never, void> {
    return Effect.map(this.getState, ([numAcquisition, numCleaned]) => {
      expect(numAcquisition).toBe(1)
      expect(numCleaned).toBe(1)
    })
  }

  assertAcquiredOnceAndNotCleaned(): Effect.Effect<never, never, void> {
    return Effect.map(this.getState, ([numAcquisition, numCleaned]) => {
      expect(numAcquisition).toBe(1)
      expect(numCleaned).toBe(0)
    })
  }
}

export const makeUnit = (): Effect.Effect<never, never, ObservableResource<never, void>> => make(void 0)

export const make = <V>(value: V): Effect.Effect<never, never, ObservableResource<never, V>> =>
  makeEffect(Effect.succeed(value))

export const makeEffect = <E, V>(
  effect: Effect.Effect<never, E, V>
): Effect.Effect<never, never, ObservableResource<E, V>> =>
  pipe(
    Effect.zip(Ref.make(0), Ref.make(0)),
    Effect.map(([resourceAcquisitionCount, resourceAcquisitionReleasing]) => {
      const getState = Effect.zip(
        Ref.get(resourceAcquisitionCount),
        Ref.get(resourceAcquisitionReleasing)
      )
      const scoped = Effect.uninterruptibleMask((restore) =>
        Effect.gen(function*($) {
          const parent = yield* $(Effect.scope)
          const child = yield* $(Scope.fork(parent, ExecutionStrategy.sequential))
          yield* $(Ref.update(resourceAcquisitionCount, (n) => n + 1))
          yield* $(Scope.addFinalizer(child, Ref.update(resourceAcquisitionReleasing, (n) => n + 1)))
          return yield* $(Effect.acquireReleaseInterruptible(
            restore(effect),
            (exit) => Scope.close(child, exit)
          ))
        })
      )
      return new ObservableResourceImpl(scoped, getState)
    })
  )
