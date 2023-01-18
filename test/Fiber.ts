import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import * as FiberStatus from "@effect/io/Fiber/Status"
import * as FiberRef from "@effect/io/FiberRef"
import * as Queue from "@effect/io/Queue"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import { withLatch } from "@effect/io/test/utils/latch"
import * as Chunk from "@fp-ts/data/Chunk"
import { constVoid, identity, pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as Option from "@fp-ts/data/Option"
import { assert, describe } from "vitest"

const initial = "initial"
const update = "update"
const fibers = Array.from({ length: 10000 }, Fiber.unit)

describe.concurrent("Fiber", () => {
  it.effect("should track blockingOn in await", () =>
    Effect.gen(function*($) {
      const fiber1 = yield* $(pipe(Effect.never(), Effect.fork))
      const fiber2 = yield* $(pipe(Fiber.await(fiber1), Effect.fork))
      const blockingOn = yield* $(pipe(
        Fiber.status(fiber2),
        Effect.continueOrFail(constVoid, (status) =>
          FiberStatus.isSuspended(status)
            ? Option.some(status.blockingOn)
            : Option.none),
        Effect.eventually
      ))
      assert.deepStrictEqual(blockingOn, Fiber.id(fiber1))
    }))
  it.effect("should track blockingOn in race", () =>
    Effect.gen(function*($) {
      const fiber = yield* $(pipe(Effect.never(), Effect.race(Effect.never()), Effect.fork))
      const blockingOn = yield* $(pipe(
        Fiber.status(fiber),
        Effect.continueOrFail(
          void 0 as void,
          (status) => FiberStatus.isSuspended(status) ? Option.some(status.blockingOn) : Option.none
        ),
        Effect.eventually
      ))
      assert.strictEqual(HashSet.size(FiberId.toSet(blockingOn)), 2)
    }))
  it.scoped("inheritLocals works for Fiber created using map", () =>
    Effect.gen(function*($) {
      const fiberRef = yield* $(FiberRef.make(initial))
      const child = yield* $(
        withLatch((release) => pipe(FiberRef.set(fiberRef)(update), Effect.zipRight(release), Effect.fork))
      )
      yield* $(pipe(child, Fiber.map(constVoid), Fiber.inheritAll))
      const result = yield* $(FiberRef.get(fiberRef))
      assert.strictEqual(result, update)
    }))
  it.scoped("inheritLocals works for Fiber created using orElse", () =>
    Effect.gen(function*($) {
      const fiberRef = yield* $(FiberRef.make(initial))
      const latch1 = yield* $(Deferred.make<never, void>())
      const latch2 = yield* $(Deferred.make<never, void>())
      const child1 = yield* $(
        pipe(
          FiberRef.set(fiberRef)("child1"),
          Effect.zipRight(Deferred.succeed(latch1, void 0)),
          Effect.fork
        )
      )
      const child2 = yield* $(
        pipe(
          FiberRef.set(fiberRef)("child2"),
          Effect.zipRight(Deferred.succeed(latch2, void 0)),
          Effect.fork
        )
      )
      yield* $(pipe(Deferred.await(latch1), Effect.zipRight(Deferred.await(latch2))))
      yield* $(pipe(child1, Fiber.orElse(child2), Fiber.inheritAll))
      const result = yield* $(FiberRef.get(fiberRef))
      assert.strictEqual(result, "child1")
    }))
  it.scoped("inheritLocals works for Fiber created using zip", () =>
    Effect.gen(function*($) {
      const fiberRef = yield* $(FiberRef.make(initial))
      const latch1 = yield* $(Deferred.make<never, void>())
      const latch2 = yield* $(Deferred.make<never, void>())
      const child1 = yield* $(
        pipe(
          FiberRef.set(fiberRef)("child1"),
          Effect.zipRight(Deferred.succeed(latch1, void 0)),
          Effect.fork
        )
      )
      const child2 = yield* $(
        pipe(
          FiberRef.set(fiberRef)("child2"),
          Effect.zipRight(Deferred.succeed(latch2, void 0)),
          Effect.fork
        )
      )
      yield* $(pipe(Deferred.await(latch1), Effect.zipRight(Deferred.await(latch2))))
      yield* $(pipe(child1, Fiber.zip(child2), Fiber.inheritAll))
      const result = yield* $(FiberRef.get(fiberRef))
      assert.strictEqual(result, "child1")
    }))
  it.effect("join on interrupted Fiber is an inner interruption", () =>
    Effect.gen(function*($) {
      const fiberId = FiberId.make(0, 123)
      const result = yield* $(pipe(Fiber.interrupted(fiberId), Fiber.join, Effect.exit))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.interrupt(fiberId))
    }))
  it.effect("scoped should create a new Fiber and scope it", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const fiber = yield* $(withLatch((release) =>
        pipe(
          Effect.acquireUseRelease(
            pipe(
              release,
              Effect.zipRight(Effect.unit())
            ),
            () => Effect.never(),
            (_, __) => Ref.set(ref, true)
          ),
          Effect.fork
        )
      ))
      yield* $(Effect.scoped(Fiber.scoped(fiber)))
      yield* $(Fiber.await(fiber))
      const result = yield* $(Ref.get(ref))
      assert.isTrue(result)
    }))
  it.effect("shard example", () =>
    Effect.gen(function*($) {
      const shard = <R, E, A>(
        queue: Queue.Queue<A>,
        n: number,
        worker: (a: A) => Effect.Effect<R, E, void>
      ): Effect.Effect<R, E, never> => {
        const worker1 = pipe(
          Queue.take(queue),
          Effect.flatMap((a) => Effect.uninterruptible(worker(a))),
          Effect.forever
        )
        return pipe(
          Effect.forkAll(Array.from({ length: n }, () => worker1)),
          Effect.flatMap(Fiber.join),
          Effect.zipRight(Effect.never())
        )
      }
      const worker = (n: number) => {
        if (n === 100) {
          return pipe(Queue.shutdown(queue), Effect.zipRight(Effect.fail("fail")))
        }
        return pipe(queue, Queue.offer(n), Effect.asUnit)
      }
      const queue = yield* $(Queue.unbounded<number>())
      yield* $(pipe(queue, Queue.offerAll(Array.from(Array(100), (_, i) => i + 1))))
      const result = yield* $(Effect.exit(shard(queue, 4, worker)))
      yield* $(Queue.shutdown(queue))
      assert.isTrue(Exit.isFailure(result))
    }))
  it.effect("child becoming interruptible is interrupted due to auto-supervision of uninterruptible parent", () =>
    Effect.gen(function*($) {
      const latch = yield* $(Deferred.make<never, void>())
      const child = pipe(
        Effect.interruptible(Effect.never()),
        Effect.onInterrupt(() => pipe(Deferred.succeed(latch, void 0))),
        Effect.fork
      )
      yield* $(Effect.uninterruptible(Effect.fork(child)))
      const result = yield* $(Deferred.await(latch))
      assert.isUndefined(result)
    }))
  it.effect("dual roots", () =>
    Effect.gen(function*($) {
      const rootContains = (fiber: Fiber.RuntimeFiber<any, any>): Effect.Effect<never, never, boolean> => {
        return pipe(Fiber.roots(), Effect.map(Chunk.elem(fiber)))
      }
      const fiber1 = yield* $(Effect.forkDaemon(Effect.never()))
      const fiber2 = yield* $(Effect.forkDaemon(Effect.never()))
      yield* $(pipe(
        rootContains(fiber1),
        Effect.flatMap((a) => a ? rootContains(fiber2) : Effect.succeed(false)),
        Effect.repeatUntil(identity)
      ))
      const result = yield* $(pipe(Fiber.interrupt(fiber1), Effect.zipRight(Fiber.interrupt(fiber2))))
      assert.isTrue(Exit.isInterrupted(result))
    }))
  it.effect("interruptAll interrupts fibers in parallel", () =>
    Effect.gen(function*($) {
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const fiber1 = yield* $(
        pipe(Deferred.succeed(deferred1, void 0), Effect.zipRight(Effect.never()), Effect.forkDaemon)
      )
      const fiber2 = yield* $(
        pipe(
          Deferred.succeed(deferred2, void 0),
          Effect.zipRight(Fiber.await(fiber1)),
          Effect.uninterruptible,
          Effect.forkDaemon
        )
      )
      yield* $(Deferred.await(deferred1))
      yield* $(Deferred.await(deferred2))
      yield* $(Fiber.interruptAll([fiber2, fiber1]))
      const result = yield* $(Fiber.await(fiber2))
      assert.isTrue(Exit.isInterrupted(result))
    }))
  it.effect("await does not return until all fibers have completed execution", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const fiber = yield* $(Effect.forkAll(Array.from({ length: 100 }, () => Ref.set(ref, 10))))
      yield* $(Fiber.interrupt(fiber))
      yield* $(Ref.set(ref, -1))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, -1)
    }))
  it.effect("awaitAll - stack safety", () =>
    Effect.gen(function*($) {
      const result = yield* $(Fiber.awaitAll(fibers))
      assert.isUndefined(result)
    }), 10000)
  it.effect("joinAll - stack safety", () =>
    Effect.gen(function*($) {
      const result = yield* $(Fiber.joinAll(fibers))
      assert.isUndefined(result)
    }), 10000)
  it.effect("collectAll - stack safety", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(Fiber.join(Fiber.collectAll(fibers)), Effect.asUnit))
      assert.isUndefined(result)
    }), 10000)
})
