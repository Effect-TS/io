import * as Option from "@effect/data/Option"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import { describe, expect } from "bun:test"

describe("Deferred", () => {
  it.effect("complete a deferred using succeed", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, number>())
      const success = yield* $(Deferred.succeed(deferred, 32))
      const result = yield* $(Deferred.await(deferred))
      expect(success).toBeTrue()
      expect(result).toStrictEqual(32)
    }))
  it.effect("complete a deferred using complete", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, number>())
      const ref = yield* $(Ref.make(13))
      yield* $(Deferred.complete(deferred, Ref.updateAndGet(ref, (n) => n + 1)))
      const result1 = yield* $(Deferred.await(deferred))
      const result2 = yield* $(Deferred.await(deferred))
      expect(result1).toStrictEqual(14)
      expect(result2).toStrictEqual(14)
    }))
  it.effect("complete a deferred using completeWith", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, number>())
      const ref = yield* $(Ref.make(13))
      yield* $(Deferred.completeWith(deferred, Ref.updateAndGet(ref, (n) => n + 1)))
      const result1 = yield* $(Deferred.await(deferred))
      const result2 = yield* $(Deferred.await(deferred))
      expect(result1).toStrictEqual(14)
      expect(result2).toStrictEqual(15)
    }))
  it.effect("complete a deferred twice", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      yield* $(Deferred.succeed(deferred, 1))
      const success = yield* $(Deferred.complete(deferred, Effect.succeed(9)))
      const result = yield* $(Deferred.await(deferred))
      expect(success).toBeFalse()
      expect(result).toStrictEqual(1)
    }))
  it.effect("fail a deferred using fail", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      const success = yield* $(Deferred.fail(deferred, "error with fail"))
      const result = yield* $(deferred, Deferred.await, Effect.exit)
      expect(success).toBeTrue()
      expect(Exit.isFailure(result)).toBeTrue()
    }))
  it.effect("fail a deferred using complete", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      const ref = yield* $(Ref.make(["first error", "second error"]))
      const success = yield* $(
        Deferred.complete(deferred, Effect.flip(Ref.modify(ref, (as) => [as[0]!, as.slice(1)])))
      )
      const result1 = yield* $(deferred, Deferred.await, Effect.exit)
      const result2 = yield* $(deferred, Deferred.await, Effect.exit)
      expect(success).toBeTrue()
      expect(Exit.isFailure(result1)).toBeTrue()
      expect(Exit.isFailure(result2)).toBeTrue()
    }))
  it.effect("fail a deferred using completeWith", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      const ref = yield* $(Ref.make(["first error", "second error"]))
      const success = yield* $(
        Deferred.completeWith(
          deferred,
          Effect.flip(
            Ref.modify(ref, (as) => [as[0]!, as.slice(1)])
          )
        )
      )
      const result1 = yield* $(deferred, Deferred.await, Effect.exit)
      const result2 = yield* $(deferred, Deferred.await, Effect.exit)
      expect(success).toBeTrue()
      expect(Exit.isFailure(result1)).toBeTrue()
      expect(Exit.isFailure(result2)).toBeTrue()
    }))
  it.effect("is done when a deferred is completed", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      yield* $(Deferred.succeed(deferred, 0))
      const result = yield* $(Deferred.isDone(deferred))
      expect(result).toBeTrue()
    }))
  it.effect("is done when a deferred is failed", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      yield* $(Deferred.fail(deferred, "failure"))
      const result = yield* $(Deferred.isDone(deferred))
      expect(result).toBeTrue()
    }))
  it.effect("should interrupt a deferred", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      const result = yield* $(Deferred.interrupt(deferred))
      expect(result).toBeTrue()
    }))
  it.effect("poll a deferred that is not completed yet", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      const result = yield* $(Deferred.poll(deferred))
      expect(Option.isNone(result)).toBeTrue()
    }))
  it.effect("poll a deferred that is completed", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      yield* $(Deferred.succeed(deferred, 12))
      const result = yield* $(
        Deferred.poll(deferred).pipe(
          Effect.flatMap(Option.match({
            onNone: () => Effect.fail("fail"),
            onSome: Effect.succeed
          })),
          Effect.flatten,
          Effect.exit
        )
      )
      expect(result).toStrictEqual(Exit.succeed(12))
    }))
  it.effect("poll a deferred that is failed", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      yield* $(Deferred.fail(deferred, "failure"))
      const result = yield* $(
        Deferred.poll(deferred).pipe(
          Effect.flatMap(Option.match({
            onNone: () => Effect.fail("fail"),
            onSome: Effect.succeed
          })),
          Effect.flatten,
          Effect.exit
        )
      )
      expect(Exit.isFailure(result)).toBeTrue()
    }))
  it.effect("poll a deferred that is interrupted", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      yield* $(Deferred.interrupt(deferred))
      const result = yield* $(
        Deferred.poll(deferred).pipe(
          Effect.flatMap(Option.match({
            onNone: () => Effect.fail("fail"),
            onSome: Effect.succeed
          })),
          Effect.flatten,
          Effect.exit
        )
      )
      expect(Exit.isInterrupted(result)).toBeTrue()
    }))
})
