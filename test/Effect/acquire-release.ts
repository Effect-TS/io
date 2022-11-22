import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("acquireUseRelease - happy path", () =>
    Effect.gen(function*() {
      const release = yield* Ref.make(false)
      const result = yield* Effect.acquireUseRelease(
        Effect.succeed(42),
        (n) => Effect.succeed(n + 1),
        () => pipe(release, Ref.set(true))
      )
      const released = yield* Ref.get(release)
      assert.strictEqual(result, 43)
      assert.isTrue(released)
    }))

  it.effect("acquireUseRelease - happy path + disconnect", () =>
    Effect.gen(function*() {
      const release = yield* Ref.make(false)
      const result = yield* pipe(
        Effect.acquireUseRelease(
          Effect.succeed(42),
          (n) => Effect.succeed(n + 1),
          () => pipe(release, Ref.set(true))
        ),
        Effect.disconnect
      )
      const released = yield* Ref.get(release)
      assert.strictEqual(result, 43)
      assert.isTrue(released)
    }))

  it.effect("acquireUseRelease - error handling", () =>
    Effect.gen(function*() {
      const releaseDied = Cause.RuntimeException("release died")
      const exit = yield* pipe(
        Effect.acquireUseRelease(
          Effect.succeed(42),
          () => Effect.fail("use failed"),
          () => Effect.die(releaseDied)
        ),
        Effect.exit
      )
      const result = yield* pipe(
        exit,
        Exit.matchEffect(
          Effect.succeed,
          () => Effect.fail("effect should have failed")
        )
      )
      assert.deepStrictEqual(Cause.failures(result), List.of("use failed"))
      assert.deepStrictEqual(Cause.defects(result), List.of(releaseDied))
    }))

  it.effect("acquireUseRelease - error handling + disconnect", () =>
    Effect.gen(function*() {
      const releaseDied = Cause.RuntimeException("release died")
      const exit = yield* pipe(
        Effect.acquireUseRelease(
          Effect.succeed(42),
          () => Effect.fail("use failed"),
          () => Effect.die(releaseDied)
        ),
        Effect.disconnect,
        Effect.exit
      )
      const result = yield* pipe(
        exit,
        Exit.matchEffect(
          Effect.succeed,
          () => Effect.fail("effect should have failed")
        )
      )
      assert.deepStrictEqual(Cause.failures(result), List.of("use failed"))
      assert.deepStrictEqual(Cause.defects(result), List.of(releaseDied))
    }))

  it.effect("acquireUseRelease - beast mode error handling + disconnect", () =>
    Effect.gen(function*() {
      const useDied = Cause.RuntimeException("use died")
      const release = yield* Ref.make(false)
      const exit = yield* pipe(
        Effect.acquireUseRelease(
          Effect.succeed(42),
          (): Effect.Effect<never, unknown, unknown> => {
            throw useDied
          },
          () => pipe(release, Ref.set(true))
        ),
        Effect.disconnect,
        Effect.exit
      )
      const result = yield* pipe(
        exit,
        Exit.matchEffect(
          Effect.succeed,
          () => Effect.fail("effect should have failed")
        )
      )
      const released = yield* Ref.get(release)
      assert.deepStrictEqual(Cause.defects(result), List.of(useDied))
      assert.isTrue(released)
    }))
})
