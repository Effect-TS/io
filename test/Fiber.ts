import * as Cause from "@effect/io/Cause"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import * as FiberRef from "@effect/io/FiberRef"
import * as it from "@effect/io/test/utils/extend"
import { withLatch } from "@effect/io/test/utils/latch"
import { constVoid, pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

const initial = "initial"
const update = "update"

describe.concurrent("Fiber", () => {
  it.effect("should track blockingOn in await", () =>
    Effect.gen(function*() {
      const fiber1 = yield* pipe(Effect.never(), Effect.fork)
      const fiber2 = yield* pipe(Fiber.await(fiber1), Effect.fork)
      const blockingOn = yield* pipe(
        Fiber.status(fiber2),
        Effect.continueOrFail(constVoid, (status) =>
          status._tag === "Suspended"
            ? Option.some(status.blockingOn)
            : Option.none),
        Effect.eventually
      )
      assert.deepStrictEqual(blockingOn, Fiber.id(fiber1))
    }))

  it.scoped("inheritLocals works for Fiber created using map", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const child = yield* withLatch((release) =>
        pipe(fiberRef, FiberRef.set(update), Effect.zipRight(release), Effect.fork)
      )
      yield* pipe(child, Fiber.map(constVoid), Fiber.inheritAll)
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, update)
    }))

  it.scoped("inheritLocals works for Fiber created using orElse", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const latch1 = yield* Deferred.make<never, void>()
      const latch2 = yield* Deferred.make<never, void>()
      const child1 = yield* pipe(
        fiberRef,
        FiberRef.set("child1"),
        Effect.zipRight(pipe(latch1, Deferred.succeed<void>(void 0))),
        Effect.fork
      )
      const child2 = yield* pipe(
        fiberRef,
        FiberRef.set("child2"),
        Effect.zipRight(pipe(latch2, Deferred.succeed<void>(void 0))),
        Effect.fork
      )
      yield* pipe(Deferred.await(latch1), Effect.zipRight(Deferred.await(latch2)))
      yield* pipe(child1, Fiber.orElse(child2), Fiber.inheritAll)
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, "child1")
    }))

  it.scoped("inheritLocals works for Fiber created using zip", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const latch1 = yield* Deferred.make<never, void>()
      const latch2 = yield* Deferred.make<never, void>()
      const child1 = yield* pipe(
        fiberRef,
        FiberRef.set("child1"),
        Effect.zipRight(pipe(latch1, Deferred.succeed<void>(void 0))),
        Effect.fork
      )
      const child2 = yield* pipe(
        fiberRef,
        FiberRef.set("child2"),
        Effect.zipRight(pipe(latch2, Deferred.succeed<void>(void 0))),
        Effect.fork
      )
      yield* pipe(Deferred.await(latch1), Effect.zipRight(Deferred.await(latch2)))
      yield* pipe(child1, Fiber.zip(child2), Fiber.inheritAll)
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, "child1")
    }))

  it.effect("join on interrupted Fiber is an inner interruption", () =>
    Effect.gen(function*() {
      const fiberId = FiberId.make(0, 123)
      const result = yield* pipe(Fiber.interrupted(fiberId), Fiber.join, Effect.exit)
      assert.deepStrictEqual(result, Exit.interrupt(fiberId))
    }))

  // TODO(Mike/Max): bug with finalization
  // it.effect("scoped should create a new Fiber and scope it", () =>
  //   Effect.gen(function*() {
  //     const ref = yield* Ref.make(false)
  //     const fiber = yield* withLatch((release) =>
  //       pipe(
  //         Effect.acquireUseRelease(
  //           pipe(release, Effect.zipRight(Effect.unit())),
  //           () => Effect.never(),
  //           (_, __) => pipe(ref, Ref.set(true))
  //         ),
  //         Effect.fork
  //       )
  //     )
  //     yield* Effect.scoped(Fiber.scoped(fiber))
  //     yield* Fiber.await(fiber)
  //     const result = yield* Ref.get(ref)
  //     assert.isTrue(result)
  //   }))

  it.effect("if one composed fiber fails then all must fail - await", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Fiber.fail("fail"), Fiber.zip(Fiber.never()), Fiber.await)
      if (Exit.isFailure(result)) {
        assert.deepStrictEqual(Cause.failures(result.cause), List.of("fail"))
      } else {
        assert.fail("The received Exit value was expected to be a Failure")
      }
    }))

  it.effect("if one composed fiber fails then all must fail - join", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Fiber.fail("fail"),
        Fiber.zip(Fiber.never()),
        Fiber.join,
        Effect.exit
      )
      if (Exit.isFailure(result)) {
        assert.deepStrictEqual(Cause.failures(result.cause), List.of("fail"))
      } else {
        assert.fail("The received Exit value was expected to be a Failure")
      }
    }))

  it.effect("if one composed fiber fails then all must fail - awaitAll", () =>
    Effect.gen(function*() {
      const fibers = [
        Fiber.fail("fail"),
        ...Array.from({ length: 100 }, () => Fiber.never())
      ]
      const result = yield* pipe(Fiber.awaitAll(fibers), Effect.exit)
      assert.deepStrictEqual(result, Exit.unit())
    }))

  // TODO(Mike/Max): times out
  // it.effect("if one composed fiber fails then all must fail - shard example", () =>
  //   Effect.gen(function*() {
  //     const shard = <R, E, A>(
  //       queue: Queue.Queue<A>,
  //       n: number,
  //       worker: (a: A) => Effect.Effect<R, E, void>
  //     ): Effect.Effect<R, E, void> => {
  //       const worker1 = pipe(
  //         Queue.take(queue),
  //         Effect.flatMap((a) => Effect.uninterruptible(worker(a))),
  //         Effect.forever
  //       )
  //       return pipe(
  //         Effect.forkAll(Array.from({ length: n }, () => worker1)),
  //         Effect.flatMap(Fiber.join),
  //         Effect.zipRight(Effect.never())
  //       )
  //     }
  //     const queue = yield* Queue.unbounded<number>()
  //     yield* pipe(queue, Queue.offerAll([...Array(100).slice(1).keys()]))
  //     const worker = (n: number): Effect.Effect<never, string, void> => {
  //       return n === 100 ?
  //         Effect.fail("fail") :
  //         pipe(queue, Queue.offer(n), Effect.asUnit)
  //     }
  //     const result = yield* pipe(shard(queue, 4, worker), Effect.exit)
  //     yield* Queue.shutdown(queue)
  //     assert.isTrue(Exit.isFailure(result))
  //   }))

  // TODO(Mike/Max): times out
  // it.effect("grandparent interruption is propagated to grandchild despite parent termination", () =>
  //   Effect.gen(function*() {
  //     const latch1 = yield* Deferred.make<never, void>()
  //     const latch2 = yield* Deferred.make<never, void>()
  //     const c = pipe(
  //       Effect.never(),
  //       Effect.interruptible,
  //       Effect.onInterrupt(() => pipe(latch2, Deferred.succeed<void>(void 0)))
  //     )
  //     const a = pipe(
  //       latch1,
  //       Deferred.succeed<void>(void 0),
  //       Effect.zipRight(Effect.fork(Effect.fork(c))),
  //       Effect.uninterruptible,
  //       Effect.zipRight(Effect.never())
  //     )
  //     const result = yield* pipe(
  //       Effect.fork(a),
  //       Effect.tap(() => Deferred.await(latch1)),
  //       Effect.tap((fiber) => Fiber.interrupt(fiber)),
  //       Effect.tap(() => Deferred.await(latch2)),
  //       Effect.exit
  //     )
  //     assert.isTrue(Exit.isSuccess(result))
  //   }))
})
