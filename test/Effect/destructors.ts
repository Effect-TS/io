import * as Either from "@effect/data/Either"
import { identity, pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as FiberId from "@effect/io/Fiber/Id"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

const ExampleError = new Error("Oh noes!")

describe.concurrent("Effect", () => {
  it.effect("done - lifts an exit into an effect", () =>
    Effect.gen(function*($) {
      const fiberId = FiberId.make(0, 123)
      const error = ExampleError
      const completed = yield* $(Effect.done(Exit.succeed(1)))
      const interrupted = yield* $(Effect.done(Exit.interrupt(fiberId)), Effect.exit)
      const terminated = yield* $(Effect.done(Exit.die(error)), Effect.exit)
      const failed = yield* $(Effect.done(Exit.fail(error)), Effect.exit)
      assert.strictEqual(completed, 1)
      assert.deepStrictEqual(Exit.unannotate(interrupted), Exit.interrupt(fiberId))
      assert.deepStrictEqual(Exit.unannotate(terminated), Exit.die(error))
      assert.deepStrictEqual(Exit.unannotate(failed), Exit.fail(error))
    }))
  it.effect("getOrFail - make a task from a defined option", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.getOrFail(Option.some(1)))
      assert.strictEqual(result, 1)
    }))
  it.effect("getOrFail - make a task from an empty option", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.getOrFail(Option.none())))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Cause.NoSuchElementException()))
    }))
  it.effect("getOrFailDiscard - basic option test", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.getOrFailDiscard(Option.some("foo")))
      assert.strictEqual(result, "foo")
    }))
  it.effect("getOrFailDiscard - side effect unit in option test", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          Effect.getOrFailDiscard(Option.none()),
          Effect.catchAll(() => Effect.succeed("controlling unit side-effect"))
        )
      )
      assert.strictEqual(result, "controlling unit side-effect")
    }))
  it.effect("head - on non empty list", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed([1, 2, 3]), Effect.head, Effect.either)
      assert.deepStrictEqual(result, Either.right(1))
    }))
  it.effect("head - on empty list", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed([] as ReadonlyArray<number>), Effect.head, Effect.either)
      assert.deepStrictEqual(result, Either.left(Option.none()))
    }))
  it.effect("head - on failure", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.fail("fail"), Effect.head, Effect.either)
      assert.deepStrictEqual(result, Either.left(Option.some("fail")))
    }))
  it.effect("isFailure - returns true when the effect is a failure", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.isFailure(Effect.fail("fail")))
      assert.isTrue(result)
    }))
  it.effect("isFailure - returns false when the effect is a success", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.isFailure(Effect.succeed("succeed")))
      assert.isFalse(result)
    }))
  it.effect("isSuccess - returns false when the effect is a failure", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.isSuccess(Effect.fail("fail")))
      assert.isFalse(result)
    }))
  it.effect("isSuccess - returns true when the effect is a success", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.isSuccess(Effect.succeed("succeed")))
      assert.isTrue(result)
    }))
  it.effect("left - on Left value", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.left(Effect.succeed(Either.left("left"))))
      assert.strictEqual(result, "left")
    }))
  it.effect("left - on Right value", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.left(Effect.succeed(Either.right("right")))))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Either.right("right")))
    }))
  it.effect("left - on failure", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.left(Effect.fail("fail"))))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Either.left("fail")))
    }))
  it.effect("none - on Some fails with None", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.none(Effect.succeed(Option.some(1)))))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Option.none()))
    }))
  it.effect("none - on None succeeds with undefined", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.none(Effect.succeed(Option.none())))
      assert.isUndefined(result)
    }))
  it.effect("none - fails with Some(ex) when effect fails with ex", () =>
    Effect.gen(function*($) {
      const error = Cause.RuntimeException("failed task")
      const result = yield* $(Effect.exit(Effect.none(Effect.fail(error))))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Option.some(error)))
    }))
  it.effect("noneOrFail - on None succeeds with Unit", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.noneOrFail(Option.none()))
      assert.isUndefined(result)
    }))
  it.effect("noneOrFail - on Some fails", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.noneOrFail(Option.some("some")), Effect.catchAll(Effect.succeed))
      assert.strictEqual(result, "some")
    }))
  it.effect("noneOrFailWith - on None succeeds with Unit", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.noneOrFailWith(Option.none(), identity))
      assert.isUndefined(result)
    }))
  it.effect("noneOrFailWith - on Some fails", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(Effect.noneOrFailWith(Option.some("some"), (s) => s + s), Effect.catchAll(Effect.succeed))
      )
      assert.strictEqual(result, "somesome")
    }))
  it.effect("option - return success in Some", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.option(Effect.succeed(11)))
      assert.deepStrictEqual(result, Option.some(11))
    }))
  it.effect("option - return failure as None", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.option(Effect.fail(123)))
      assert.deepStrictEqual(result, Option.none())
    }))
  it.effect("option - not catch throwable", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.option(Effect.die(ExampleError))))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.die(ExampleError))
    }))
  it.effect("option - catch throwable after sandboxing", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.option(Effect.sandbox(Effect.die(ExampleError))))
      assert.deepStrictEqual(result, Option.none())
    }))
  it.effect("right - on Right value", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.right(Effect.succeed(Either.right("right"))))
      assert.strictEqual(result, "right")
    }))
  it.effect("right - on Left value", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.right(Effect.succeed(Either.left("left")))))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Either.left("left")))
    }))
  it.effect("right - on failure", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.right(Effect.fail("fail"))))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Either.right("fail")))
    }))
  it.effect("some - extracts the value from Some", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.some(Effect.succeed(Option.some(1))))
      assert.strictEqual(result, 1)
    }))
  it.effect("some - fails on None", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.some(Effect.succeed(Option.none()))))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Option.none()))
    }))
  it.effect("some - fails when given an exception", () =>
    Effect.gen(function*($) {
      const error = Cause.RuntimeException("failed")
      const result = yield* $(Effect.exit(Effect.some(Effect.fail(error))))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Option.some(error)))
    }))
  it.effect("someOrElse - extracts the value from Some", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed(Option.some(1)), Effect.someOrElse(() => 42))
      assert.strictEqual(result, 1)
    }))
  it.effect("someOrElse - falls back to the default value if None", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed(Option.none()), Effect.someOrElse(() => 42))
      assert.strictEqual(result, 42)
    }))
  it.effect("someOrElse - does not change failed state", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.fail(ExampleError), Effect.someOrElse(() => 42), Effect.exit)
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(ExampleError))
    }))
  it.effect("someOrElseEffect - extracts the value from Some", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed(Option.some(1)), Effect.someOrElseEffect(() => Effect.succeed(42)))
      assert.strictEqual(result, 1)
    }))
  it.effect("someOrElseEffect - falls back to the default effect if None", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed(Option.none()), Effect.someOrElseEffect(() => Effect.succeed(42)))
      assert.strictEqual(result, 42)
    }))
  it.effect("someOrElseEffect - does not change failed state", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(Effect.fail(ExampleError), Effect.someOrElseEffect(() => Effect.succeed(42)), Effect.exit)
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(ExampleError))
    }))
  it.effect("someOrFail - extracts the optional value", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed(Option.some(42)), Effect.someOrFail(() => ExampleError))
      assert.strictEqual(result, 42)
    }))
  it.effect("someOrFail - fails when given a None", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed(Option.none()), Effect.someOrFail(() => ExampleError), Effect.exit)
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(ExampleError))
    }))
  it.effect("someOrFailException - extracts the optional value", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.someOrFailException(Effect.succeed(Option.some(42))))
      assert.strictEqual(result, 42)
    }))
  it.effect("someOrFailException - fails when given a None", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.someOrFailException(Effect.succeed(Option.none()))))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Cause.NoSuchElementException()))
    }))
  it.effect("unleft - should handle successes with right", () =>
    Effect.gen(function*($) {
      const effect = Effect.succeed(Either.right(42))
      const result = yield* $(effect, Effect.left, Effect.unleft, Effect.exit)
      const expected = yield* $(Effect.exit(effect))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.unannotate(expected))
    }))
  it.effect("unleft - should handle successes with left", () =>
    Effect.gen(function*($) {
      const effect = Effect.succeed(Either.left(42))
      const result = yield* $(effect, Effect.left, Effect.unleft, Effect.exit)
      const expected = yield* $(Effect.exit(effect))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.unannotate(expected))
    }))
  it.effect("unleft - should handle failures", () =>
    Effect.gen(function*($) {
      const effect = Effect.fail(42)
      const result = yield* $(effect, Effect.left, Effect.unleft, Effect.exit)
      const expected = yield* $(Effect.exit(effect))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.unannotate(expected))
    }))
  it.effect("unright - should handle successes with right", () =>
    Effect.gen(function*($) {
      const effect = Effect.succeed(Either.right(42))
      const result = yield* $(effect, Effect.right, Effect.unright, Effect.exit)
      const expected = yield* $(Effect.exit(effect))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.unannotate(expected))
    }))
  it.effect("unright - should handle successes with left", () =>
    Effect.gen(function*($) {
      const effect = Effect.succeed(Either.left(42))
      const result = yield* $(effect, Effect.right, Effect.unright, Effect.exit)
      const expected = yield* $(Effect.exit(effect))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.unannotate(expected))
    }))
  it.effect("unright - should handle failures", () =>
    Effect.gen(function*($) {
      const effect = Effect.fail(42)
      const result = yield* $(effect, Effect.right, Effect.unright, Effect.exit)
      const expected = yield* $(Effect.exit(effect))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.unannotate(expected))
    }))
  it.effect("unsome - fails when given Some error", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.unsome(Effect.fail(Option.some("error")))))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail("error"))
    }))
  it.effect("unsome - succeeds with None given None error", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.unsome(Effect.fail(Option.none())))
      assert.deepStrictEqual(result, Option.none())
    }))
  it.effect("unsome - succeeds with Some given a value", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.unsome(Effect.succeed(1)))
      assert.deepStrictEqual(result, Option.some(1))
    }))
})
