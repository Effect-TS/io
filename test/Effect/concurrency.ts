import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import { withLatch } from "@effect/io/test/utils/latch"
import * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"
import { assert, describe } from "vitest"

export const ExampleError = new Error("Oh noes!")

const fib = (n: number): number => {
  if (n <= 1) {
    return n
  }
  return fib(n - 1) + fib(n - 2)
}

const concurrentFib = (n: number): Effect.Effect<never, never, number> => {
  if (n <= 1) {
    return Effect.succeed(n)
  }
  return Effect.gen(function*($) {
    const fiber1 = yield* $(Effect.fork(concurrentFib(n - 1)))
    const fiber2 = yield* $(Effect.fork(concurrentFib(n - 2)))
    const v1 = yield* $(Fiber.join(fiber1))
    const v2 = yield* $(Fiber.join(fiber2))
    return v1 + v2
  })
}

describe.concurrent("Effect", () => {
  it.effect("shallow fork/join identity", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(Effect.succeed(42), Effect.fork, Effect.flatMap(Fiber.join)))
      assert.strictEqual(result, 42)
    }))
  it.effect("deep fork/join identity", () =>
    Effect.gen(function*($) {
      const result = yield* $(concurrentFib(20))
      assert.strictEqual(result, fib(20))
    }))
  it.effect("asyncEffect creation is interruptible", () =>
    Effect.gen(function*($) {
      const release = yield* $(Deferred.make<never, number>())
      const acquire = yield* $(Deferred.make<never, void>())
      const fiber = yield* $(pipe(
        Effect.asyncEffect<never, unknown, unknown, never, unknown, unknown>((_) =>
          // This will never complete because the callback is never invoked
          Effect.acquireUseRelease(
            pipe(acquire, Deferred.succeed<void>(void 0)),
            () => Effect.never(),
            () => pipe(release, Deferred.succeed(42), Effect.asUnit)
          )
        ),
        Effect.fork
      ))
      yield* $(Deferred.await(acquire))
      yield* $(Fiber.interrupt(fiber))
      const result = yield* $(Deferred.await(release))
      assert.strictEqual(result, 42)
    }))
  it.effect("daemon fiber is unsupervised", () =>
    Effect.gen(function*($) {
      const child = (ref: Ref.Ref<boolean>) => {
        return withLatch((release) =>
          pipe(release, Effect.zipRight(Effect.never()), Effect.ensuring(pipe(ref, Ref.set(true))))
        )
      }
      const ref = yield* $(Ref.make(false))
      const fiber1 = yield* $(pipe(child(ref), Effect.forkDaemon, Effect.fork))
      const fiber2 = yield* $(Fiber.join(fiber1))
      const result = yield* $(Ref.get(ref))
      yield* $(Fiber.interrupt(fiber2))
      assert.isFalse(result)
    }))
  it.effect("daemon fiber race interruption", () =>
    Effect.gen(function*($) {
      const plus1 = <X>(latch: Deferred.Deferred<never, void>, finalizer: Effect.Effect<never, never, X>) => {
        return pipe(
          latch,
          Deferred.succeed<void>(void 0),
          Effect.zipRight(Effect.sleep(Duration.hours(1))),
          Effect.onInterrupt(() => pipe(finalizer, Effect.map((x) => x)))
        )
      }
      const interruptionRef = yield* $(Ref.make(0))
      const latch1Start = yield* $(Deferred.make<never, void>())
      const latch2Start = yield* $(Deferred.make<never, void>())
      const inc = pipe(interruptionRef, Ref.updateAndGet((n) => n + 1))
      const left = plus1(latch1Start, inc)
      const right = plus1(latch2Start, inc)
      const fiber = yield* $(pipe(left, Effect.race(right), Effect.fork))
      yield* $(
        pipe(
          Deferred.await(latch1Start),
          Effect.zipRight(Deferred.await(latch2Start)),
          Effect.zipRight(Fiber.interrupt(fiber))
        )
      )
      const result = yield* $(Ref.get(interruptionRef))
      assert.strictEqual(result, 2)
    }))
  it.effect("race in daemon is executed", () =>
    Effect.gen(function*($) {
      const latch1 = yield* $(Deferred.make<never, void>())
      const latch2 = yield* $(Deferred.make<never, void>())
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const loser1 = Effect.acquireUseRelease(pipe(latch1, Deferred.succeed<void>(void 0)), () =>
        Effect.never(), () =>
        pipe(deferred1, Deferred.succeed<void>(void 0)))
      const loser2 = Effect.acquireUseRelease(pipe(latch2, Deferred.succeed<void>(void 0)), () =>
        Effect.never(), () =>
        pipe(deferred2, Deferred.succeed<void>(void 0)))
      const fiber = yield* $(pipe(loser1, Effect.race(loser2), Effect.forkDaemon))
      yield* $(Deferred.await(latch1))
      yield* $(Deferred.await(latch2))
      yield* $(Fiber.interrupt(fiber))
      const res1 = yield* $(Deferred.await(deferred1))
      const res2 = yield* $(Deferred.await(deferred2))
      assert.isUndefined(res1)
      assert.isUndefined(res2)
    }))
  it.live("supervise fibers", () =>
    Effect.gen(function*($) {
      const makeChild = (n: number): Effect.Effect<never, never, Fiber.Fiber<never, void>> => {
        return pipe(Effect.sleep(Duration.millis(20 * n)), Effect.zipRight(Effect.never()), Effect.fork)
      }
      const ref = yield* $(Ref.make(0))
      yield* $(pipe(
        makeChild(1),
        Effect.zipRight(makeChild(2)),
        Effect.ensuringChildren((fs) =>
          Array.from(fs).reduce(
            (acc, fiber) =>
              pipe(acc, Effect.zipRight(Fiber.interrupt(fiber)), Effect.zipRight(pipe(ref, Ref.update((n) => n + 1)))),
            Effect.unit()
          )
        )
      ))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 2)
    }))
  it.effect("race of fail with success", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(Effect.fail(42), Effect.race(Effect.succeed(24)), Effect.either))
      assert.deepStrictEqual(result, Either.right(24))
    }))
  it.effect("race of terminate with success", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(Effect.dieSync(() => new Error()), Effect.race(Effect.succeed(24))))
      assert.strictEqual(result, 24)
    }))
  it.effect("race of fail with fail", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(Effect.fail(42), Effect.race(Effect.fail(24)), Effect.either))
      assert.deepStrictEqual(result, Either.left(42))
    }))
  it.effect("race of value and never", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(Effect.succeed(42), Effect.race(Effect.never())))
      assert.strictEqual(result, 42)
    }))
  it.effect("race in uninterruptible region", () =>
    Effect.gen(function*($) {
      const awaiter = Deferred.unsafeMake<never, void>(FiberId.none)
      const program = pipe(Effect.unit(), Effect.race(pipe(awaiter, Deferred.await)), Effect.uninterruptible)
      const result = yield* $(program)
      yield* $(pipe(awaiter, Deferred.succeed<void>(void 0)))
      assert.isUndefined(result)
    }))
  it.effect("race of two forks does not interrupt winner", () =>
    Effect.gen(function*($) {
      const forkWaiter = (
        interrupted: Ref.Ref<number>,
        latch: Deferred.Deferred<never, void>,
        done: Deferred.Deferred<never, void>
      ) => {
        return Effect.uninterruptibleMask((restore) =>
          pipe(
            restore(Deferred.await(latch)),
            Effect.onInterrupt(() =>
              pipe(interrupted, Ref.update((_) => _ + 1), Effect.zipRight(pipe(done, Deferred.succeed<void>(void 0))))
            ),
            Effect.fork
          )
        )
      }
      const interrupted = yield* $(Ref.make(0))
      const latch1 = yield* $(Deferred.make<never, void>())
      const latch2 = yield* $(Deferred.make<never, void>())
      const done1 = yield* $(Deferred.make<never, void>())
      const done2 = yield* $(Deferred.make<never, void>())
      const forkWaiter1 = forkWaiter(interrupted, latch1, done1)
      const forkWaiter2 = forkWaiter(interrupted, latch2, done2)
      yield* $(pipe(forkWaiter1, Effect.race(forkWaiter2)))
      const count = yield* $(
        pipe(
          latch1,
          Deferred.succeed<void>(void 0),
          Effect.zipRight(Deferred.await(done1)),
          Effect.zipRight(Deferred.await(done2)),
          Effect.zipRight(Ref.get(interrupted))
        )
      )
      assert.equal(count, 2)
    }))
  it.effect("firstSuccessOf of values", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Effect.firstSuccessOf([
          Effect.fail(0),
          Effect.succeed(100)
        ]),
        Effect.either
      ))
      assert.deepStrictEqual(result, Either.right(100))
    }))
  it.live("firstSuccessOf of failures", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Effect.firstSuccessOf([
          pipe(Effect.fail(0), Effect.delay(Duration.millis(10))),
          Effect.fail(101)
        ]),
        Effect.either
      ))
      assert.deepStrictEqual(result, Either.left(101))
    }))
  it.live("firstSuccessOf of failures & 1 success", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Effect.firstSuccessOf([
          Effect.fail(0),
          pipe(Effect.succeed(102), Effect.delay(Duration.millis(1)))
        ]),
        Effect.either
      ))
      assert.deepStrictEqual(result, Either.right(102))
    }))
  it.effect("raceFirst interrupts loser on success", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      const effect = yield* $(Deferred.make<never, number>())
      const winner = Effect.fromEither(Either.right(void 0))
      const loser = Effect.acquireUseRelease(pipe(deferred, Deferred.succeed<void>(void 0)), () =>
        Effect.never(), () =>
        pipe(effect, Deferred.succeed(42)))
      yield* $(pipe(winner, Effect.raceFirst(loser)))
      const result = yield* $(Deferred.await(effect))
      assert.strictEqual(result, 42)
    }))
  it.effect("raceFirst interrupts loser on failure", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      const effect = yield* $(Deferred.make<never, number>())
      const winner = pipe(Deferred.await(deferred), Effect.zipRight(Effect.fromEither(Either.left(new Error()))))
      const loser = Effect.acquireUseRelease(pipe(deferred, Deferred.succeed<void>(void 0)), () =>
        Effect.never(), () =>
        pipe(effect, Deferred.succeed(42)))
      yield* $(pipe(winner, Effect.raceFirst(loser), Effect.either))
      const result = yield* $(Deferred.await(effect))
      assert.strictEqual(result, 42)
    }))
  it.effect("mergeAll", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(["a", "aa", "aaa", "aaaa"].map((a) => Effect.succeed(a)), Effect.mergeAll(0, (b, a) => b + a.length))
      )
      assert.strictEqual(result, 10)
    }))
  it.effect("mergeAll - empty", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe([] as ReadonlyArray<Effect.Effect<never, never, number>>, Effect.mergeAll(0, (b, a) => b + a))
      )
      assert.strictEqual(result, 0)
    }))
  it.effect("reduceAll", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe([2, 3, 4].map((n) => Effect.succeed(n)), Effect.reduceAll(Effect.succeed(1), (acc, a) => acc + a))
      )
      assert.strictEqual(result, 10)
    }))
  it.effect("reduceAll - empty list", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [] as ReadonlyArray<Effect.Effect<never, never, number>>,
          Effect.reduceAll(Effect.succeed(1), (acc, a) => acc + a)
        )
      )
      assert.strictEqual(result, 1)
    }))
  it.effect("timeout of failure", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(Effect.fail("uh oh"), Effect.timeout(Duration.hours(1)), Effect.exit))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail("uh oh"))
    }))
  it.effect("timeout of terminate", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(Effect.die(ExampleError), Effect.timeout(Duration.hours(1)), Effect.exit))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.die(ExampleError))
    }))
})
