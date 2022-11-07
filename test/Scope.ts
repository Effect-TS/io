import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Ref from "@effect/io/Ref"
import type * as Scope from "@effect/io/Scope"
import * as it from "@effect/io/test/extend"
import { pipe } from "@fp-ts/data/Function"

type Action = Acquire | Use | Release

const OP_ACQUIRE = 0 as const
type OP_ACQUIRE = typeof OP_ACQUIRE

const OP_USE = 1 as const
type OP_USE = typeof OP_USE

const OP_RELEASE = 2 as const
type OP_RELEASE = typeof OP_RELEASE

interface Acquire {
  readonly op: OP_ACQUIRE
  readonly id: number
}

interface Use {
  readonly op: OP_USE
  readonly id: number
}

interface Release {
  readonly op: OP_RELEASE
  readonly id: number
}

const acquire = (id: number): Action => ({ op: OP_ACQUIRE, id })
const use = (id: number): Action => ({ op: OP_USE, id })
const release = (id: number): Action => ({ op: OP_RELEASE, id })

const isAcquire = (self: Action): self is Use => self.op === OP_ACQUIRE
const isUse = (self: Action): self is Use => self.op === OP_USE
const isRelease = (self: Action): self is Use => self.op === OP_RELEASE

const resource = (
  id: number,
  ref: Ref.Ref<ReadonlyArray<Action>>
): Effect.Effect<Scope.Scope, never, number> => {
  return pipe(
    ref,
    Ref.update((actions) => [...actions, acquire(id)]),
    Effect.as(id),
    Effect.uninterruptible,
    Effect.ensuring(
      Effect.scopeWith((scope) =>
        scope.addFinalizer(() => pipe(ref, Ref.update((actions) => [...actions, release(id)])))
      )
    )
  )
}

describe.concurrent("Scope", () => {
  it.effect("runs finalizers when the scope is closed", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<ReadonlyArray<Action>>([])
      yield* Effect.scoped(
        pipe(
          resource(1, ref),
          Effect.flatMap((id) => pipe(ref, Ref.update((actions) => [...actions, use(id)])))
        )
      )
      const result = yield* Ref.get(ref)
      assert.deepStrictEqual(result, [acquire(1), use(1), release(1)])
    }))

  it.effect("runs finalizers in parallel", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<never, void>()
      const result = yield* pipe(
        Effect.addFinalizer(() => pipe(deferred, Deferred.succeed<void>(void 0))),
        Effect.zipRight(Effect.addFinalizer(() => Deferred.await(deferred))),
        Effect.parallelFinalizers,
        Effect.scoped,
        Effect.asUnit
      )
      assert.isUndefined(result)
    }))

  it.effect("runs finalizers in parallel when the scope is closed", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<ReadonlyArray<Action>>([])
      yield* Effect.scoped(
        pipe(
          Effect.parallelFinalizers(resource(1, ref)),
          Effect.zipPar(resource(2, ref)),
          Effect.flatMap(([resource1, resource2]) =>
            pipe(
              ref,
              Ref.update((actions) => [...actions, use(resource1)]),
              Effect.zipPar(pipe(ref, Ref.update((actions) => [...actions, use(resource2)])))
            )
          )
        )
      )
      const result = yield* Ref.get(ref)
      assert.isTrue(result.slice(0, 2).some((action) => isAcquire(action) && action.id === 1))
      assert.isTrue(result.slice(0, 2).some((action) => isAcquire(action) && action.id === 2))
      assert.isTrue(result.slice(2, 4).some((action) => isUse(action) && action.id === 1))
      assert.isTrue(result.slice(2, 4).some((action) => isUse(action) && action.id === 2))
      assert.isTrue(result.slice(4, 6).some((action) => isRelease(action) && action.id === 1))
      assert.isTrue(result.slice(4, 6).some((action) => isRelease(action) && action.id === 2))
    }))
})
