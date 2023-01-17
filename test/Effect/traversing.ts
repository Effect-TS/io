import * as Cause from "@effect/io/Cause"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Either from "@fp-ts/data/Either"
import { constVoid, identity, pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("dropWhile - happy path", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [1, 2, 3, 4, 5],
          Effect.dropWhile((n) => Effect.succeed(n % 2 === 1))
        )
      )
      assert.deepStrictEqual(Array.from(result), [2, 3, 4, 5])
    }))
  it.effect("dropWhile - error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [1, 1, 1],
          Effect.dropWhile(() => Effect.fail("Ouch")),
          Effect.either
        )
      )
      assert.deepStrictEqual(result, Either.left("Ouch"))
    }))
  it.effect("exists - determines whether any element satisfies the effectual predicate", () =>
    Effect.gen(function*($) {
      const array = [1, 2, 3, 4, 5]
      const result1 = yield* $(pipe(array, Effect.exists((n) => Effect.succeed(n > 3))))
      const result2 = yield* $(pipe(array, Effect.exists((n) => Effect.succeed(n > 5))))
      assert.isTrue(result1)
      assert.isFalse(result2)
    }))
  it.effect("forAll - determines whether all elements satisfy the effectual predicate", () =>
    Effect.gen(function*($) {
      const array = [1, 2, 3, 4, 5, 6]
      const result1 = yield* $(pipe(array, Effect.forAll((n) => Effect.succeed(n > 3))))
      const result2 = yield* $(pipe(array, Effect.forAll((n) => Effect.succeed(n > 0))))
      assert.isFalse(result1)
      assert.isTrue(result2)
    }))
  it.effect("iterate - iterates with the specified effectual function", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.iterate(100, (n) => n > 0)((n) => Effect.succeed(n - 1)))
      assert.strictEqual(result, 0)
    }))
  it.effect("loop - loops with the specified effectual function", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(Chunk.empty<number>()))
      yield* $(Effect.loop(0, (n) => n < 5, (n) => n + 1, (n) => Ref.update(ref)(Chunk.prepend(n))))
      const result = yield* $(pipe(Ref.get(ref), Effect.map(Chunk.reverse)))
      assert.deepStrictEqual(result, Chunk.make(0, 1, 2, 3, 4))
    }))
  it.effect("loopDiscard - loops with the specified effectual function", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(Chunk.empty<number>()))
      yield* $(Effect.loopDiscard(0, (n) => n < 5, (n) => n + 1, (n) => Ref.update(ref)(Chunk.prepend(n))))
      const result = yield* $(pipe(Ref.get(ref), Effect.map(Chunk.reverse)))
      assert.deepStrictEqual(result, Chunk.make(0, 1, 2, 3, 4))
    }))
  it.effect("replicate - zero", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.collectAll(pipe(Effect.succeed(12), Effect.replicate(0))))
      assert.strictEqual(result.length, 0)
    }))
  it.effect("replicate - negative", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.collectAll(pipe(Effect.succeed(12), Effect.replicate(-2))))
      assert.strictEqual(result.length, 0)
    }))
  it.effect("replicate - positive", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.collectAll(pipe(Effect.succeed(12), Effect.replicate(2))))
      assert.deepStrictEqual(Array.from(result), [12, 12])
    }))
  it.effect(" - returns the list of results", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe([1, 2, 3, 4, 5, 6], Effect.forEach((n) => Effect.succeed(n + 1))))
      assert.deepStrictEqual(Array.from(result), [2, 3, 4, 5, 6, 7])
    }))
  it.effect("forEach - both evaluates effects and returns results in the same order", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(Chunk.empty<string>()))
      const result = yield* $(pipe(
        Chunk.make("1", "2", "3"),
        Effect.forEach((s) =>
          pipe(
            Ref.update(ref)(Chunk.prepend(s)),
            Effect.zipRight(Effect.sync(() => Number.parseInt(s)))
          )
        )
      ))
      const effects = yield* $(pipe(Ref.get(ref), Effect.map(Chunk.reverse)))
      assert.deepStrictEqual(Array.from(effects), ["1", "2", "3"])
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("forEach - fails if one of the effects fails", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        ["1", "h", "3"],
        Effect.forEach((s) =>
          Effect.sync(() => {
            const n = Number.parseInt(s)
            if (Number.isNaN(n)) {
              throw Cause.IllegalArgumentException()
            }
            return n
          })
        ),
        Effect.exit
      ))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.die(Cause.IllegalArgumentException()))
    }))
  it.effect("forEachDiscard - runs effects in order", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(Chunk.empty<number>()))
      yield* $(pipe([1, 2, 3, 4, 5], Effect.forEachDiscard((n) => Ref.update(ref)(Chunk.prepend(n)))))
      const result = yield* $(pipe(Ref.get(ref), Effect.map(Chunk.reverse)))
      assert.deepStrictEqual(result, Chunk.make(1, 2, 3, 4, 5))
    }))
  it.effect("forEachDiscard - can be run twice", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const effect = pipe([1, 2, 3, 4, 5], Effect.forEachDiscard((n) => Ref.update(ref)((_) => _ + n)))
      yield* $(effect)
      yield* $(effect)
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 30)
    }))
  it.effect("forEachOption - succeeds with None given None", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(Option.none as Option.Option<string>, Effect.forEachOption((s) => Effect.succeed(s.length)))
      )
      assert.deepStrictEqual(result, Option.none)
    }))
  it.effect("forEachOption - succeeds with Some given Some", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(Option.some("success"), Effect.forEachOption((s) => Effect.succeed(s.length))))
      assert.deepStrictEqual(result, Option.some(7))
    }))
  it.effect("forEachOption - fails if the optional effect fails", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Option.some("help"),
        Effect.forEachOption((s) =>
          Effect.sync(() => {
            const n = Number.parseInt(s)
            if (Number.isNaN(n)) {
              throw Cause.IllegalArgumentException()
            }
            return n
          })
        ),
        Effect.exit
      ))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.die(Cause.IllegalArgumentException()))
    }))
  it.effect("forEachPar - runs single task", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe([2], Effect.forEachPar((n) => Effect.succeed(n * 2))))
      assert.deepStrictEqual(Array.from(result), [4])
    }))
  it.effect("forEachPar - runs two tasks", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe([2, 3], Effect.forEachPar((n) => Effect.succeed(n * 2))))
      assert.deepStrictEqual(Array.from(result), [4, 6])
    }))
  it.effect("forEachPar - runs many tasks", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 100 }, (_, i) => i + 1)
      const result = yield* $(pipe(array, Effect.forEachPar((n) => Effect.succeed(n * 2))))
      assert.deepStrictEqual(Array.from(result), array.map((n) => n * 2))
    }))
  it.effect("forEachPar - runs a task that fails", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Array.from({ length: 10 }, (_, i) => i + 1),
        Effect.forEachPar((n) => n === 5 ? Effect.fail("boom") : Effect.succeed(n * 2)),
        Effect.flip
      ))
      assert.strictEqual(result, "boom")
    }))
  it.effect("forEachPar - runs two failed tasks", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Array.from({ length: 10 }, (_, i) => i + 1),
        Effect.forEachPar((n) =>
          n === 5
            ? Effect.fail("boom1")
            : n === 8
            ? Effect.fail("boom2")
            : Effect.succeed(n * 2)
        ),
        Effect.flip
      ))
      assert.isTrue(result === "boom1" || result === "boom2")
    }))
  it.effect("forEachPar - runs a task that dies", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Array.from({ length: 10 }, (_, i) => i + 1),
        Effect.forEachPar((n) => n === 5 ? Effect.dieMessage("boom") : Effect.succeed(n * 2)),
        Effect.exit
      ))
      assert.isTrue(Exit.isFailure(result) && Cause.isDie(result.cause))
    }))
  it.effect("forEachPar - runs a task that is interrupted", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Array.from({ length: 10 }, (_, i) => i + 1),
        Effect.forEachPar((n) => n === 5 ? Effect.interrupt() : Effect.succeed(n * 2)),
        Effect.exit
      ))
      assert.isTrue(Exit.isInterrupted(result))
    }))
  it.effect("forEachPar - runs a task that throws an unsuspended exception", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        [1],
        Effect.forEachPar((n) =>
          Effect.sync(() => {
            throw new Error(n.toString())
          })
        ),
        Effect.exit
      ))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.die(new Error("1")))
    }))
  it.effect("forEachPar - returns results in the same order", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(["1", "2", "3"], Effect.forEachPar((s) => Effect.sync(() => Number.parseInt(s)))))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("forEachPar - runs effects in parallel", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      yield* $(
        pipe([Effect.never(), pipe(deferred, Deferred.succeed<void>(void 0))], Effect.forEachPar(identity), Effect.fork)
      )
      const result = yield* $(Deferred.await(deferred))
      assert.isUndefined(result)
    }))
  it.effect("forEachPar - propagates error", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        [1, 2, 3, 4, 5, 6],
        Effect.forEachPar((n) => n % 2 !== 0 ? Effect.succeed(n) : Effect.fail("not odd")),
        Effect.flip
      ))
      assert.strictEqual(result, "not odd")
    }))
  it.effect("forEachPar - interrupts effects on first failure", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const deferred = yield* $(Deferred.make<never, void>())
      const actions = [
        Effect.never(),
        Effect.succeed(1),
        Effect.fail("C"),
        pipe(Deferred.await(deferred), Effect.zipRight(Ref.set(ref)(true)), Effect.as(1))
      ]
      const error = yield* $(pipe(actions, Effect.forEachPar(identity), Effect.flip))
      const value = yield* $(Ref.get(ref))
      assert.strictEqual(error, "C")
      assert.isFalse(value)
    }))
  it.effect("forEachPar - does not kill fiber when forked on the parent scope", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const fibers = yield* $(pipe(
        Array.from({ length: 100 }, (_, i) => i + 1),
        Effect.forEachPar(() => pipe(Ref.update(ref)((_) => _ + 1), Effect.fork))
      ))
      yield* $(pipe(fibers, Effect.forEach(Fiber.await)))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 100)
    }))
  it.effect("forEachPar - parallelism - returns the results in the appropriate order", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe([1, 2, 3], Effect.forEachPar((n) => pipe(Effect.succeed(n.toString()))), Effect.withParallelism(2))
      )
      assert.deepStrictEqual(Array.from(result), ["1", "2", "3"])
    }))
  it.effect("forEachPar - parallelism - works on large lists", () =>
    Effect.gen(function*($) {
      const parallelism = 10
      const array = Array.from({ length: 100000 }, (_, i) => i)
      const result = yield* $(
        pipe(array, Effect.forEachPar((n) => Effect.succeed(n)), Effect.withParallelism(parallelism))
      )
      assert.deepStrictEqual(Array.from(result), array)
    }))
  it.effect("forEachPar - parallelism - runs effects in parallel", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      yield* $(
        pipe(
          [Effect.never(), pipe(deferred, Deferred.succeed<void>(void 0))],
          Effect.forEachPar(identity),
          Effect.withParallelism(2),
          Effect.fork
        )
      )
      const result = yield* $(Deferred.await(deferred))
      assert.isUndefined(result)
    }))
  it.effect("forEachPar - parallelism - propagates error", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        [1, 2, 3, 4, 5, 6],
        Effect.forEachPar((n) => n % 2 !== 0 ? Effect.succeed(n) : Effect.fail("not odd")),
        Effect.withParallelism(4),
        Effect.either
      ))
      assert.deepStrictEqual(result, Either.left("not odd"))
    }))
  it.effect("forEachPar - parallelism - interrupts effects on first failure", () =>
    Effect.gen(function*($) {
      const actions = [
        Effect.never(),
        Effect.succeed(1),
        Effect.fail("C")
      ]
      const result = yield* $(pipe(actions, Effect.forEachPar(identity), Effect.withParallelism(4), Effect.either))
      assert.deepStrictEqual(result, Either.left("C"))
    }))
  it.effect("forEachParDiscard - accumulates errors", () =>
    Effect.gen(function*($) {
      const task = (
        started: Ref.Ref<number>,
        trigger: Deferred.Deferred<never, void>,
        n: number
      ): Effect.Effect<never, number, void> => {
        return pipe(
          Ref.updateAndGet(started)((n) => n + 1),
          Effect.flatMap((count) =>
            pipe(
              trigger,
              Deferred.succeed<void>(void 0),
              Effect.when(() => count === 3),
              Effect.zipRight(Deferred.await(trigger)),
              Effect.zipRight(Effect.fail(n))
            )
          )
        )
      }
      const started = yield* $(Ref.make(0))
      const trigger = yield* $(Deferred.make<never, void>())
      const result = yield* $(pipe(
        [1, 2, 3],
        Effect.forEachParDiscard((n) => pipe(task(started, trigger, n), Effect.uninterruptible)),
        Effect.matchCause(Cause.failures, () => Chunk.empty<number>())
      ))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("forEachParDiscard - runs all effects", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(Chunk.empty<number>()))
      yield* $(pipe([1, 2, 3, 4, 5], Effect.forEachParDiscard((n) => Ref.update(ref)(Chunk.prepend(n)))))
      const result = yield* $(pipe(Ref.get(ref), Effect.map(Chunk.reverse)))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3, 4, 5])
    }))
  it.effect("forEachParDiscard - completes on empty input", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe([], Effect.forEachParDiscard(() => Effect.unit())))
      assert.isUndefined(result)
    }))
  it.effect("forEachParDiscard - parallelism - runs all effects", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(Chunk.empty<number>()))
      yield* $(pipe(
        [1, 2, 3, 4, 5],
        Effect.forEachParDiscard((n) => Ref.update(ref)(Chunk.prepend(n))),
        Effect.withParallelism(2)
      ))
      const result = yield* $(pipe(Ref.get(ref), Effect.map(Chunk.reverse)))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3, 4, 5])
    }))
  it.effect("merge - on flipped result", () =>
    Effect.gen(function*($) {
      const effect: Effect.Effect<never, number, number> = Effect.succeed(1)
      const a = yield* $(Effect.merge(effect))
      const b = yield* $(Effect.merge(Effect.flip(effect)))
      assert.strictEqual(a, b)
    }))
  it.effect("mergeAll - return zero element on empty input", () =>
    Effect.gen(function*($) {
      const zeroElement = 42
      const nonZero = 43
      const result = yield* $(
        pipe([] as ReadonlyArray<Effect.Effect<never, never, unknown>>, Effect.mergeAll(zeroElement, () => nonZero))
      )
      assert.strictEqual(result, zeroElement)
    }))
  it.effect("mergeAll - merge list using function", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe([3, 5, 7].map(Effect.succeed), Effect.mergeAll(1, (b, a) => b + a)))
      assert.strictEqual(result, 1 + 3 + 5 + 7)
    }))
  it.effect("mergeAll - return error if it exists in list", () =>
    Effect.gen(function*($) {
      const effects: ReadonlyArray<Effect.Effect<never, number, void>> = [Effect.unit(), Effect.fail(1)]
      const result = yield* $(pipe(effects, Effect.mergeAll(void 0 as void, constVoid), Effect.exit))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(1))
    }))
  it.effect("mergeAllPar - return zero element on empty input", () =>
    Effect.gen(function*($) {
      const zeroElement = 42
      const nonZero = 43
      const result = yield* $(
        pipe([] as ReadonlyArray<Effect.Effect<never, never, unknown>>, Effect.mergeAllPar(zeroElement, () => nonZero))
      )
      assert.strictEqual(result, zeroElement)
    }))
  it.effect("mergeAllPar - merge list using function", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe([3, 5, 7].map(Effect.succeed), Effect.mergeAllPar(1, (b, a) => b + a)))
      assert.strictEqual(result, 1 + 3 + 5 + 7)
    }))
  it.effect("mergeAllPar - return error if it exists in list", () =>
    Effect.gen(function*($) {
      const effects: ReadonlyArray<Effect.Effect<never, number, void>> = [Effect.unit(), Effect.fail(1)]
      const result = yield* $(pipe(effects, Effect.mergeAllPar(void 0 as void, constVoid), Effect.exit))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.failCause(Cause.parallel(Cause.empty, Cause.fail(1))))
    }))
  it.effect("partition - collects only successes", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const [left, right] = yield* $(pipe(array, Effect.partition(Effect.succeed)))
      assert.deepStrictEqual(Array.from(left), [])
      assert.deepStrictEqual(Array.from(right), array)
    }))
  it.effect("partition - collects only failures", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, () => 0)
      const [left, right] = yield* $(pipe(array, Effect.partition(Effect.fail)))
      assert.deepStrictEqual(Array.from(left), array)
      assert.deepStrictEqual(Array.from(right), [])
    }))
  it.effect("partition - collects failures and successes", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const [left, right] = yield* $(
        pipe(array, Effect.partition((n) => n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n)))
      )
      assert.deepStrictEqual(Array.from(left), [0, 2, 4, 6, 8])
      assert.deepStrictEqual(Array.from(right), [1, 3, 5, 7, 9])
    }))
  it.effect("partition - evaluates effects in correct order", () =>
    Effect.gen(function*($) {
      const array = [2, 4, 6, 3, 5, 6]
      const ref = yield* $(Ref.make(Chunk.empty<number>()))
      yield* $(pipe(array, Effect.partition((n) => Ref.update(ref)(Chunk.prepend(n)))))
      const result = yield* $(pipe(Ref.get(ref), Effect.map(Chunk.reverse)))
      assert.deepStrictEqual(Array.from(result), [2, 4, 6, 3, 5, 6])
    }))
  it.effect("partitionPar - collects successes", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 1000 }, (_, i) => i)
      const [left, right] = yield* $(pipe(array, Effect.partitionPar(Effect.succeed)))
      assert.deepStrictEqual(Array.from(left), [])
      assert.deepStrictEqual(Array.from(right), array)
    }))
  it.effect("partitionPar - collects failures", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, () => 0)
      const [left, right] = yield* $(pipe(array, Effect.partitionPar(Effect.fail)))
      assert.deepStrictEqual(Array.from(left), array)
      assert.deepStrictEqual(Array.from(right), [])
    }))
  it.effect("partitionPar - collects failures and successes", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const [left, right] = yield* $(
        pipe(array, Effect.partitionPar((n) => n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n)))
      )
      assert.deepStrictEqual(Array.from(left), [0, 2, 4, 6, 8])
      assert.deepStrictEqual(Array.from(right), [1, 3, 5, 7, 9])
    }))
  it.effect("partitionPar - parallelism - collects successes", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 1000 }, (_, i) => i)
      const [left, right] = yield* $(pipe(array, Effect.partitionPar(Effect.succeed), Effect.withParallelism(3)))
      assert.deepStrictEqual(Array.from(left), [])
      assert.deepStrictEqual(Array.from(right), array)
    }))
  it.effect("partitionPar - parallelism - collects failures", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, () => 0)
      const [left, right] = yield* $(pipe(array, Effect.partitionPar(Effect.fail), Effect.withParallelism(3)))
      assert.deepStrictEqual(Array.from(left), array)
      assert.deepStrictEqual(Array.from(right), [])
    }))
  it.effect("partitionPar - parallelism - collects failures and successes", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const [left, right] = yield* $(pipe(
        array,
        Effect.partitionPar((n) => n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n)),
        Effect.withParallelism(3)
      ))
      assert.deepStrictEqual(Array.from(left), [0, 2, 4, 6, 8])
      assert.deepStrictEqual(Array.from(right), [1, 3, 5, 7, 9])
    }))
  it.effect("reduce - with a successful step function sums the list properly", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe([1, 2, 3, 4, 5], Effect.reduce(0, (acc, curr) => Effect.succeed(acc + curr))))
      assert.strictEqual(result, 15)
    }))
  it.effect("reduce - with a failing step function returns a failed IO", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe([1, 2, 3, 4, 5], Effect.reduce(0, () => Effect.fail("fail")), Effect.exit))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail("fail"))
    }))
  it.effect("reduce - run sequentially from left to right", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe([1, 2, 3, 4, 5], Effect.reduce([] as ReadonlyArray<number>, (acc, curr) => Effect.succeed([...acc, curr])))
      )
      assert.deepStrictEqual(result, [1, 2, 3, 4, 5])
    }))
  it.effect("reduceRight - with a successful step function sums the list properly", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe([1, 2, 3, 4, 5], Effect.reduceRight(0, (acc, curr) => Effect.succeed(acc + curr))))
      assert.strictEqual(result, 15)
    }))
  it.effect("reduceRight - with a failing step function returns a failed IO", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe([1, 2, 3, 4, 5], Effect.reduceRight(0, () => Effect.fail("fail")), Effect.exit))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail("fail"))
    }))
  it.effect("reduceRight - run sequentially from right to left", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        [1, 2, 3, 4, 5],
        Effect.reduceRight([] as ReadonlyArray<number>, (curr, acc) => Effect.succeed([curr, ...acc]))
      ))
      assert.deepStrictEqual(result, [1, 2, 3, 4, 5])
    }))
  it.effect("reduceAllPar - return zero element on empty input", () =>
    Effect.gen(function*($) {
      const zeroElement = 42
      const nonZero = 43
      const result = yield* $(
        pipe(
          [] as ReadonlyArray<Effect.Effect<never, never, number>>,
          Effect.reduceAllPar(Effect.succeed(zeroElement), () => nonZero)
        )
      )
      assert.strictEqual(result, zeroElement)
    }))
  it.effect("reduceAllPar - reduce list using function", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe([3, 5, 7].map(Effect.succeed), Effect.reduceAllPar(Effect.succeed(1), (acc, a) => acc + a))
      )
      assert.strictEqual(result, 1 + 3 + 5 + 7)
    }))
  it.effect("reduceAllPar - return error if zero is an error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe([Effect.unit(), Effect.unit()], Effect.reduceAllPar(Effect.fail(1), constVoid), Effect.exit)
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.failCause(Cause.parallel(Cause.empty, Cause.fail(1))))
    }))
  it.effect("reduceAllPar - return error if it exists in list", () =>
    Effect.gen(function*($) {
      const effects: ReadonlyArray<Effect.Effect<never, number, void>> = [Effect.unit(), Effect.fail(1)]
      const result = yield* $(
        pipe(effects, Effect.reduceAllPar(Effect.unit() as Effect.Effect<never, number, void>, constVoid), Effect.exit)
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.failCause(Cause.parallel(Cause.empty, Cause.fail(1))))
    }))
  it.effect("takeWhile - happy path", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [1, 2, 3, 4, 5],
          Effect.takeWhile((n) => Effect.succeed(n % 2 === 1))
        )
      )
      assert.deepStrictEqual(Array.from(result), [1])
    }))
  it.effect("takeWhile - error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [1, 1, 1],
          Effect.takeWhile(() => Effect.fail("Ouch")),
          Effect.either
        )
      )
      assert.deepStrictEqual(result, Either.left("Ouch"))
    }))
})
