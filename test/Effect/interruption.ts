import * as Cause from "@effect/io/Cause"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import { withLatch, withLatchAwait } from "@effect/io/test/utils/latch"
import * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import { constVoid, pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("sync forever is interruptible", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(
        Effect.succeed(1),
        Effect.forever,
        Effect.fork
      )
      const result = yield* Fiber.interrupt(fiber)
      assert.isTrue(Exit.isFailure(result) && Cause.isInterruptedOnly(result.cause))
    }))

  it.effect("interrupt of never is interrupted with cause", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(Effect.never(), Effect.fork)
      const result = yield* Fiber.interrupt(fiber)
      assert.isTrue(Exit.isFailure(result) && Cause.isInterruptedOnly(result.cause))
    }))

  it.effect("asyncEffect is interruptible", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(
        Effect.asyncEffect<never, never, never, never, never, never>(() => Effect.never()),
        Effect.fork
      )
      const result = yield* Fiber.interrupt(fiber)
      assert.isTrue(Exit.isFailure(result) && Cause.isInterruptedOnly(result.cause))
    }))

  it.effect("async is interruptible", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(Effect.async<never, never, void>(constVoid), Effect.fork)
      const result = yield* Fiber.interrupt(fiber)
      assert.isTrue(Exit.isFailure(result) && Cause.isInterruptedOnly(result.cause))
    }))

  it.effect("acquireUseRelease is uninterruptible", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<never, void>()
      const fiber = yield* pipe(
        Effect.acquireUseRelease(
          pipe(deferred, Deferred.succeed<void>(void 0), Effect.zipLeft(Effect.never())),
          () => Effect.unit(),
          () => Effect.unit()
        ),
        Effect.forkDaemon
      )
      const result = yield* pipe(
        Deferred.await(deferred),
        Effect.zipRight(
          pipe(
            Fiber.interrupt(fiber),
            Effect.timeoutTo(42, () => 0, Duration.seconds(1))
          )
        )
      )
      assert.strictEqual(result, 42)
    }))

  it.effect("acquireUseRelease use is interruptible", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(
        Effect.acquireUseRelease(
          Effect.unit(),
          () => Effect.never(),
          () => Effect.unit()
        ),
        Effect.fork
      )
      const result = yield* Fiber.interrupt(fiber)
      assert.isTrue(Exit.isInterrupted(result))
    }))

  it.effect("acquireUseRelease release called on interrupt", () =>
    Effect.gen(function*() {
      const deferred1 = yield* Deferred.make<never, void>()
      const deferred2 = yield* Deferred.make<never, void>()
      const fiber = yield* pipe(
        Effect.acquireUseRelease(
          Effect.unit(),
          () =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(Effect.never())
            ),
          () =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(Effect.unit())
            )
        ),
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Fiber.interrupt(fiber)
      const result = yield* pipe(
        Deferred.await(deferred2),
        Effect.timeoutTo(42, () => 0, Duration.seconds(1))
      )
      assert.strictEqual(result, 0)
    }))

  it.effect("acquireUseRelease acquire returns immediately on interrupt", () =>
    Effect.gen(function*() {
      const deferred1 = yield* Deferred.make<never, void>()
      const deferred2 = yield* Deferred.make<never, number>()
      const deferred3 = yield* Deferred.make<never, void>()
      const fiber = yield* pipe(
        Effect.acquireUseRelease(
          pipe(
            deferred1,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(Deferred.await(deferred2))
          ),
          () => Effect.unit(),
          () => Deferred.await(deferred3)
        ),
        Effect.disconnect,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      const result = yield* Fiber.interrupt(fiber)
      yield* pipe(deferred3, Deferred.succeed<void>(void 0))
      assert.isTrue(Exit.isInterrupted(result))
    }))

  it.effect("acquireUseRelease disconnect use is interruptible", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(
        Effect.acquireUseRelease(
          Effect.unit(),
          () => Effect.never(),
          () => Effect.unit()
        ),
        Effect.disconnect,
        Effect.fork
      )
      const result = yield* Fiber.interrupt(fiber)
      assert.isTrue(Exit.isInterrupted(result))
    }))

  it.effect("acquireUseRelease disconnect release called on interrupt in separate fiber", () =>
    Effect.gen(function*() {
      const deferred1 = yield* Deferred.make<never, void>()
      const deferred2 = yield* Deferred.make<never, void>()
      const fiber = yield* pipe(
        Effect.acquireUseRelease(
          Effect.unit(),
          () =>
            pipe(
              deferred1,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(Effect.never())
            ),
          () =>
            pipe(
              deferred2,
              Deferred.succeed<void>(void 0),
              Effect.zipRight(Effect.unit())
            )
        ),
        Effect.disconnect,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Fiber.interrupt(fiber)
      const result = yield* pipe(
        Deferred.await(deferred2),
        Effect.timeoutTo(false, () => true, Duration.seconds(10))
      )
      assert.isTrue(result)
    }))

  it.effect("catchAll + ensuring + interrupt", () =>
    Effect.gen(function*() {
      const latch = yield* Deferred.make<never, void>()
      const deferred = yield* Deferred.make<never, boolean>()
      const fiber = yield* pipe(
        latch,
        Deferred.succeed<void>(void 0),
        Effect.zipRight(Effect.never()),
        Effect.catchAll(Effect.fail),
        Effect.ensuring(pipe(deferred, Deferred.succeed(true))),
        Effect.fork
      )
      yield* Deferred.await(latch)
      yield* Fiber.interrupt(fiber)
      const result = yield* Deferred.await(deferred)
      assert.isTrue(result)
    }))

  it.effect("finalizer can detect interruption", () =>
    Effect.gen(function*() {
      const deferred1 = yield* Deferred.make<never, boolean>()
      const deferred2 = yield* Deferred.make<never, void>()
      const fiber = yield* pipe(
        deferred2,
        Deferred.succeed<void>(void 0),
        Effect.zipRight(Effect.never()),
        Effect.ensuring(
          pipe(
            Effect.descriptor(),
            Effect.flatMap((descriptor) =>
              pipe(
                deferred1,
                Deferred.succeed(HashSet.size(descriptor.interruptors) > 0)
              )
            )
          )
        ),
        Effect.fork
      )
      yield* Deferred.await(deferred2)
      yield* Fiber.interrupt(fiber)
      const result = yield* Deferred.await(deferred1)
      assert.isTrue(result)
    }))

  it.effect("interrupted cause persists after catching", () =>
    Effect.gen(function*() {
      const process = (list: List.List<Exit.Exit<never, any>>): List.List<Exit.Exit<never, any>> => {
        return pipe(list, List.map(Exit.mapErrorCause((cause) => cause)))
      }
      const latch1 = yield* Deferred.make<never, void>()
      const latch2 = yield* Deferred.make<never, void>()
      const exits = yield* Ref.make(List.empty<Exit.Exit<never, any>>())
      const fiber = yield* pipe(
        Effect.uninterruptibleMask((restore) =>
          pipe(
            restore(
              pipe(
                Effect.uninterruptibleMask((restore) =>
                  pipe(
                    restore(
                      pipe(
                        latch1,
                        Deferred.succeed<void>(void 0),
                        Effect.zipRight(Deferred.await(latch2))
                      )
                    ),
                    Effect.onExit((exit) => pipe(exits, Ref.update(List.prepend(exit))))
                  )
                ),
                Effect.asUnit
              )
            ),
            Effect.exit,
            Effect.flatMap((exit) => pipe(exits, Ref.update(List.prepend(exit))))
          )
        ),
        Effect.fork
      )
      yield* pipe(
        Deferred.await(latch1),
        Effect.zipRight(Fiber.interrupt(fiber))
      )
      const result = yield* pipe(Ref.get(exits), Effect.map(process))
      assert.strictEqual(Array.from(result).length, 2)
      assert.isTrue(
        pipe(
          result,
          List.reduce(true, (acc, curr) => acc && Exit.isFailure(curr) && Cause.isInterruptedOnly(curr.cause))
        )
      )
    }))

  it.effect("interruption of raced", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<number>(0)
      const latch1 = yield* Deferred.make<never, void>()
      const latch2 = yield* Deferred.make<never, void>()
      const make = (deferred: Deferred.Deferred<never, void>) => {
        return pipe(
          deferred,
          Deferred.succeed<void>(void 0),
          Effect.zipRight(Effect.never()),
          Effect.onInterrupt(() => pipe(ref, Ref.update((n) => n + 1)))
        )
      }
      const raced = yield* pipe(make(latch1), Effect.race(make(latch2)), Effect.fork)
      yield* pipe(Deferred.await(latch1), Effect.zipRight(Deferred.await(latch2)))
      yield* Fiber.interrupt(raced)
      const result = yield* Ref.get(ref)
      assert.strictEqual(result, 2)
    }))

  it.effect("recovery of error in finalizer", () =>
    Effect.gen(function*() {
      const recovered = yield* Ref.make(false)
      const fiber = yield* pipe(
        withLatch((release) =>
          pipe(
            release,
            Effect.zipRight(Effect.never()),
            Effect.ensuring(
              pipe(
                Effect.unit(),
                Effect.zipRight(Effect.fail("uh oh")),
                Effect.catchAll(() => pipe(recovered, Ref.set(true)))
              )
            ),
            Effect.fork
          )
        )
      )
      yield* Fiber.interrupt(fiber)
      const result = yield* Ref.get(recovered)
      assert.isTrue(result)
    }))

  it.effect("recovery of interruptible", () =>
    Effect.gen(function*() {
      const recovered = yield* Ref.make(false)
      const fiber = yield* withLatch((release) =>
        pipe(
          release,
          Effect.zipRight(pipe(Effect.never(), Effect.interruptible)),
          Effect.foldCauseEffect(
            (cause) => pipe(recovered, Ref.set(Cause.isInterrupted(cause))),
            () => pipe(recovered, Ref.set(false))
          ),
          Effect.uninterruptible,
          Effect.fork
        )
      )
      yield* Fiber.interrupt(fiber)
      const result = yield* Ref.get(recovered)
      assert.isTrue(result)
    }))

  it.effect("sandbox of interruptible", () =>
    Effect.gen(function*() {
      const recovered = yield* Ref.make<Option.Option<Either.Either<boolean, never>>>(Option.none)
      const fiber = yield* withLatch((release) =>
        pipe(
          release,
          Effect.zipRight(pipe(Effect.never(), Effect.interruptible)),
          Effect.sandbox,
          Effect.either,
          Effect.flatMap((either) =>
            pipe(
              recovered,
              Ref.set(Option.some(pipe(either, Either.mapLeft(Cause.isInterrupted))))
            )
          ),
          Effect.uninterruptible,
          Effect.fork
        )
      )
      yield* Fiber.interrupt(fiber)
      const result = yield* Ref.get(recovered)
      assert.deepStrictEqual(result, Option.some(Either.left(true)))
    }))

  it.effect("run of interruptible", () =>
    Effect.gen(function*() {
      const recovered = yield* Ref.make<Option.Option<boolean>>(Option.none)
      const fiber = yield* withLatch((release) =>
        pipe(
          release,
          Effect.zipRight(pipe(Effect.never(), Effect.interruptible)),
          Effect.exit,
          Effect.flatMap((exit) => pipe(recovered, Ref.set(Option.some(Exit.isInterrupted(exit))))),
          Effect.uninterruptible,
          Effect.fork
        )
      )
      yield* Fiber.interrupt(fiber)
      const result = yield* Ref.get(recovered)
      assert.deepStrictEqual(result, Option.some(true))
    }))

  it.effect("alternating interruptibility", () =>
    Effect.gen(function*() {
      const counter = yield* Ref.make(0)
      const fiber = yield* withLatch((release) =>
        pipe(
          release,
          Effect.zipRight(pipe(Effect.never(), Effect.interruptible, Effect.exit)),
          Effect.zipRight(pipe(counter, Ref.update((n) => n + 1))),
          Effect.uninterruptible,
          Effect.interruptible,
          Effect.exit,
          Effect.zipRight(pipe(counter, Ref.update((n) => n + 1))),
          Effect.uninterruptible,
          Effect.fork
        )
      )
      yield* Fiber.interrupt(fiber)
      const result = yield* Ref.get(counter)
      assert.strictEqual(result, 2)
    }))

  it.effect("interruption after defect", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      const fiber = yield* withLatch((release) =>
        pipe(
          Effect.attempt(() => {
            throw new Error()
          }),
          Effect.exit,
          Effect.zipRight(release),
          Effect.zipRight(Effect.never()),
          Effect.ensuring(pipe(ref, Ref.set(true))),
          Effect.fork
        )
      )
      yield* Fiber.interrupt(fiber)
      const result = yield* Ref.get(ref)
      assert.isTrue(result)
    }))

  it.effect("interruption after defect 2", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      const fiber = yield* withLatch((release) =>
        pipe(
          Effect.attempt(() => {
            throw new Error()
          }),
          Effect.exit,
          Effect.zipRight(release),
          Effect.zipRight(pipe(Effect.unit(), Effect.forever)),
          Effect.ensuring(pipe(ref, Ref.set(true))),
          Effect.fork
        )
      )
      yield* Fiber.interrupt(fiber)
      const result = yield* Ref.get(ref)
      assert.isTrue(result)
    }))

  it.effect("disconnect returns immediately on interrupt", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<never, void>()
      const fiber = yield* pipe(
        deferred,
        Deferred.succeed<void>(void 0),
        Effect.zipRight(Effect.never()),
        Effect.ensuring(Effect.never()),
        Effect.disconnect,
        Effect.fork
      )
      yield* Deferred.await(deferred)
      const result = yield* Fiber.interrupt(fiber)
      assert.isTrue(Exit.isInterrupted(result))
    }))

  it.effect("disconnected effect that is then interrupted eventually performs interruption", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      const deferred1 = yield* Deferred.make<never, void>()
      const deferred2 = yield* Deferred.make<never, void>()
      const fiber = yield* pipe(
        deferred1,
        Deferred.succeed<void>(void 0),
        Effect.zipRight(Effect.never()),
        Effect.ensuring(
          pipe(
            ref,
            Ref.set(true),
            Effect.zipRight(Effect.sleep(Duration.millis(10))),
            Effect.zipRight(pipe(deferred2, Deferred.succeed<void>(void 0)))
          )
        ),
        Effect.disconnect,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Fiber.interrupt(fiber)
      yield* Deferred.await(deferred2)
      const result = yield* Ref.get(ref)
      assert.isTrue(result)
    }))

  it.effect("cause reflects interruption", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        withLatch((release) =>
          pipe(
            release,
            Effect.zipRight(Effect.fail("foo")),
            Effect.fork
          )
        ),
        Effect.flatMap(Fiber.interrupt)
      )
      assert.deepStrictEqual(result, Exit.fail("foo"))
    }))

  it.effect("acquireRelease use inherits interrupt status", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      const fiber = yield* withLatchAwait((release2, await2) =>
        pipe(
          withLatch((release1) =>
            pipe(
              Effect.acquireUseRelease(
                release1,
                () =>
                  pipe(
                    await2,
                    Effect.zipRight(Effect.sleep(Duration.millis(10))),
                    Effect.zipRight(pipe(ref, Ref.set(true)))
                  ),
                () => Effect.unit()
              ),
              Effect.uninterruptible,
              Effect.fork
            )
          ),
          Effect.zipLeft(release2)
        )
      )
      yield* Fiber.interrupt(fiber)
      const result = yield* Ref.get(ref)
      assert.isTrue(result)
    }))

  it.effect("acquireRelease use inherits interrupt status 2", () =>
    Effect.gen(function*() {
      const latch1 = yield* Deferred.make<never, void>()
      const latch2 = yield* Deferred.make<never, void>()
      const ref = yield* Ref.make(false)
      const fiber = yield* pipe(
        Effect.acquireUseRelease(
          pipe(latch1, Deferred.succeed<void>(void 0)),
          () =>
            pipe(
              Deferred.await(latch2),
              Effect.zipRight(Effect.sleep(Duration.millis(10))),
              Effect.zipRight(pipe(ref, Ref.set(true))),
              Effect.asUnit
            ),
          () => Effect.unit()
        ),
        Effect.uninterruptible,
        Effect.fork
      )
      yield* Deferred.await(latch1)
      yield* pipe(latch2, Deferred.succeed<void>(void 0))
      yield* Fiber.interrupt(fiber)
      const result = yield* Ref.get(ref)
      assert.isTrue(result)
    }))

  it.effect("async can be uninterruptible", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      const fiber = yield* withLatch((release) =>
        pipe(
          release,
          Effect.zipRight(Effect.sleep(Duration.millis(10))),
          Effect.zipRight(pipe(ref, Ref.set(true), Effect.asUnit)),
          Effect.uninterruptible,
          Effect.fork
        )
      )
      yield* Fiber.interrupt(fiber)
      const result = yield* Ref.get(ref)
      assert.isTrue(result)
    }))

  it.effect("closing scope is uninterruptible", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      const deferred = yield* Deferred.make<never, void>()
      const child = pipe(
        deferred,
        Deferred.succeed<void>(void 0),
        Effect.zipRight(Effect.sleep(Duration.millis(10))),
        Effect.zipRight(pipe(ref, Ref.set(true)))
      )
      const parent = pipe(
        child,
        Effect.uninterruptible,
        Effect.fork,
        Effect.zipRight(Deferred.await(deferred))
      )
      const fiber = yield* Effect.fork(parent)
      yield* Deferred.await(deferred)
      yield* Fiber.interrupt(fiber)
      const result = yield* Ref.get(ref)
      assert.isTrue(result)
    }))

  it.effect("asyncInterrupt cancelation", () =>
    Effect.gen(function*() {
      const ref = MutableRef.make(0)
      const effect = Effect.asyncInterrupt(() => {
        pipe(ref, MutableRef.set(MutableRef.get(ref) + 1))
        return Either.left(Effect.sync(() => {
          pipe(ref, MutableRef.set(MutableRef.get(ref) - 1))
        }))
      })
      yield* pipe(Effect.unit(), Effect.race(effect))
      const result = MutableRef.get(ref)
      assert.strictEqual(result, 0)
    }))
})
