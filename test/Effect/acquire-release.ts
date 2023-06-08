import * as Chunk from "@effect/data/Chunk"
import { equals } from "@effect/data/Equal"
import { pipe } from "@effect/data/Function"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("acquireUseRelease - happy path", () =>
    Effect.gen(function*($) {
      const release = yield* $(Ref.make(false))
      const result = yield* $(
        Effect.acquireUseRelease({
          acquire: Effect.succeed(42),
          use: (n) => Effect.succeed(n + 1),
          release: () => Ref.set(release, true)
        })
      )
      const released = yield* $(Ref.get(release))
      assert.strictEqual(result, 43)
      assert.isTrue(released)
    }))
  it.effect("acquireUseRelease - happy path + disconnect", () =>
    Effect.gen(function*($) {
      const release = yield* $(Ref.make(false))
      const result = yield* $(
        Effect.acquireUseRelease({
          acquire: Effect.succeed(42),
          use: (n) => Effect.succeed(n + 1),
          release: () => Ref.set(release, true)
        }),
        Effect.disconnect
      )
      const released = yield* $(Ref.get(release))
      assert.strictEqual(result, 43)
      assert.isTrue(released)
    }))
  it.effect("acquireUseRelease - error handling", () =>
    Effect.gen(function*($) {
      const releaseDied = Cause.RuntimeException("release died")
      const exit = yield* $(
        Effect.acquireUseRelease({
          acquire: Effect.succeed(42),
          use: () => Effect.fail("use failed"),
          release: () => Effect.die(releaseDied)
        }),
        Effect.exit
      )
      const result = yield* $(
        exit,
        Exit.matchEffect({ onFailure: Effect.succeed, onSuccess: () => Effect.fail("effect should have failed") })
      )
      assert.isTrue(equals(Cause.failures(result), Chunk.of("use failed")))
      assert.isTrue(equals(Cause.defects(result), Chunk.of(releaseDied)))
    }))
  it.effect("acquireUseRelease - error handling + disconnect", () =>
    Effect.gen(function*($) {
      const releaseDied = Cause.RuntimeException("release died")
      const exit = yield* $(
        Effect.acquireUseRelease({
          acquire: Effect.succeed(42),
          use: () => Effect.fail("use failed"),
          release: () => Effect.die(releaseDied)
        }),
        Effect.disconnect,
        Effect.exit
      )
      const result = yield* $(
        exit,
        Exit.matchEffect({
          onFailure: Effect.succeed,
          onSuccess: () => Effect.fail("effect should have failed")
        })
      )
      assert.isTrue(equals(Cause.failures(result), Chunk.of("use failed")))
      assert.isTrue(equals(Cause.defects(result), Chunk.of(releaseDied)))
    }))
  it.effect("acquireUseRelease - beast mode error handling + disconnect", () =>
    Effect.gen(function*($) {
      const useDied = Cause.RuntimeException("use died")
      const release = yield* $(Ref.make(false))
      const exit = yield* $(
        pipe(
          Effect.acquireUseRelease({
            acquire: Effect.succeed(42),
            use: (): Effect.Effect<never, unknown, unknown> => {
              throw useDied
            },
            release: () => Ref.set(release, true)
          }),
          Effect.disconnect,
          Effect.exit
        )
      )
      const result = yield* $(
        pipe(
          exit,
          Exit.matchEffect({
            onFailure: Effect.succeed,
            onSuccess: () => Effect.fail("effect should have failed")
          })
        )
      )
      const released = yield* $(Ref.get(release))
      assert.isTrue(equals(Cause.defects(result), Chunk.of(useDied)))
      assert.isTrue(released)
    }))
})
