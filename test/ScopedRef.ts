import * as Effect from "@effect/io/Effect"
import * as Ref from "@effect/io/Ref"
import type * as Scope from "@effect/io/Scope"
import * as ScopedRef from "@effect/io/ScopedRef"
import * as it from "@effect/io/test/utils/extend"
import { pipe } from "@fp-ts/data/Function"
import { assert, describe } from "vitest"

interface Counter {
  acquire(): Effect.Effect<Scope.Scope, never, number>
  incrementAcquire(): Effect.Effect<never, never, number>
  incrementRelease(): Effect.Effect<never, never, number>
  acquired(): Effect.Effect<never, never, number>
  released(): Effect.Effect<never, never, number>
}

class CounterImpl implements Counter {
  constructor(readonly ref: Ref.Ref<readonly [number, number]>) {}

  acquire(): Effect.Effect<Scope.Scope, never, number> {
    return pipe(
      this.incrementAcquire(),
      Effect.zipRight(Effect.addFinalizer(() => this.incrementRelease())),
      Effect.zipRight(this.acquired()),
      Effect.uninterruptible
    )
  }

  incrementAcquire(): Effect.Effect<never, never, number> {
    return pipe(
      this.ref,
      Ref.modify(([acquire, release]) => [acquire + 1, [acquire + 1, release] as const] as const)
    )
  }

  incrementRelease(): Effect.Effect<never, never, number> {
    return pipe(
      this.ref,
      Ref.modify(([acquire, release]) => [release + 1, [acquire, release + 1] as const] as const)
    )
  }

  acquired(): Effect.Effect<never, never, number> {
    return pipe(
      Ref.get(this.ref),
      Effect.map((tuple) => tuple[0])
    )
  }

  released(): Effect.Effect<never, never, number> {
    return pipe(
      Ref.get(this.ref),
      Effect.map((tuple) => tuple[1])
    )
  }
}

const makeCounter = (): Effect.Effect<never, never, Counter> => {
  return pipe(
    Ref.make([0, 0] as const),
    Effect.map((ref) => new CounterImpl(ref))
  )
}

describe.concurrent("ScopedRef", () => {
  it.scoped("single set", () =>
    Effect.gen(function*() {
      const counter = yield* makeCounter()
      const ref = yield* ScopedRef.make(() => 0)
      yield* pipe(ref, ScopedRef.set(counter.acquire()))
      const result = yield* ScopedRef.get(ref)
      assert.strictEqual(result, 1)
    }))

  it.scoped("dual set", () =>
    Effect.gen(function*() {
      const counter = yield* makeCounter()
      const ref = yield* ScopedRef.make(() => 0)
      yield* pipe(
        ref,
        ScopedRef.set(counter.acquire()),
        Effect.zipRight(pipe(ref, ScopedRef.set(counter.acquire())))
      )
      const result = yield* ScopedRef.get(ref)
      assert.strictEqual(result, 2)
    }))

  it.scoped("release on swap", () =>
    Effect.gen(function*() {
      const counter = yield* makeCounter()
      const ref = yield* ScopedRef.make(() => 0)
      yield* pipe(
        ref,
        ScopedRef.set(counter.acquire()),
        Effect.zipRight(pipe(ref, ScopedRef.set(counter.acquire())))
      )
      const acquired = yield* counter.acquired()
      const released = yield* counter.released()
      assert.strictEqual(acquired, 2)
      assert.strictEqual(released, 1)
    }))

  it.scoped("double release on double swap", () =>
    Effect.gen(function*() {
      const counter = yield* makeCounter()
      const ref = yield* ScopedRef.make(() => 0)
      yield* pipe(
        ref,
        ScopedRef.set(counter.acquire()),
        Effect.zipRight(pipe(ref, ScopedRef.set(counter.acquire()))),
        Effect.zipRight(pipe(ref, ScopedRef.set(counter.acquire())))
      )
      const acquired = yield* counter.acquired()
      const released = yield* counter.released()
      assert.strictEqual(acquired, 3)
      assert.strictEqual(released, 2)
    }))

  it.effect("full release", () =>
    Effect.gen(function*() {
      const counter = yield* makeCounter()
      yield* pipe(
        ScopedRef.make(() => 0),
        Effect.flatMap((ref) =>
          pipe(
            ref,
            ScopedRef.set(counter.acquire()),
            Effect.zipRight(pipe(ref, ScopedRef.set(counter.acquire()))),
            Effect.zipRight(pipe(ref, ScopedRef.set(counter.acquire())))
          )
        ),
        Effect.scoped
      )
      const acquired = yield* counter.acquired()
      const released = yield* counter.released()
      assert.strictEqual(acquired, 3)
      assert.strictEqual(released, 3)
    }))
})
