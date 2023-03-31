import * as Chunk from "@effect/data/Chunk"
import * as Either from "@effect/data/Either"
import { constFalse, constTrue, identity, pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import * as Ref from "@effect/io/Ref"
import { causesArb } from "@effect/io/test/utils/cause"
import * as it from "@effect/io/test/utils/extend"
import * as fc from "fast-check"
import { assert, describe } from "vitest"

const ExampleError = new Error("Oh noes!")

export const InterruptError1 = new Error("Oh noes 1!")
export const InterruptError2 = new Error("Oh noes 2!")
export const InterruptError3 = new Error("Oh noes 3!")

const ExampleErrorFail = Effect.fail(ExampleError)

const ExampleErrorDie = Effect.dieSync(() => {
  throw ExampleError
})

const deepErrorEffect = (n: number): Effect.Effect<never, unknown, void> => {
  if (n === 0) {
    return Effect.try(() => {
      throw ExampleError
    })
  }
  return pipe(Effect.unit(), Effect.zipRight(deepErrorEffect(n - 1)))
}

const deepErrorFail = (n: number): Effect.Effect<never, unknown, void> => {
  if (n === 0) {
    return Effect.fail(ExampleError)
  }
  return pipe(Effect.unit(), Effect.zipRight(deepErrorFail(n - 1)))
}

const exactlyOnce = <R, A, A1>(
  value: A,
  f: (_: Effect.Effect<never, never, A>) => Effect.Effect<R, string, A1>
): Effect.Effect<R, string, A1> => {
  return Effect.gen(function*($) {
    const ref = yield* $(Ref.make(0))
    const res = yield* $(f(pipe(Ref.update(ref, (n) => n + 1), Effect.zipRight(Effect.succeed(value)))))
    const count = yield* $(Ref.get(ref))
    yield* $(count !== 1 ? Effect.fail("Accessed more than once") : Effect.unit())
    return res
  })
}

describe.concurrent("Effect", () => {
  it.effect("absolve", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed(Either.right("test")), Effect.absolve)
      assert.strictEqual(result, "test")
    }))
  it.effect("absolveWith right", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(Effect.succeed(Either.right("test")), Effect.absolveWith(() => Either.right("absolveRight")))
      )
      assert.strictEqual(result, "absolveRight")
    }))
  it.effect("absolveWith left", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(Effect.succeed("test"), Effect.absolveWith(() => Either.left("absolveLeft" as const)), Effect.exit)
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail("absolveLeft"))
    }))
  it.effect("absorbWith - on fail", () =>
    Effect.gen(function*($) {
      const result = yield* $(ExampleErrorFail, Effect.absorbWith(Option.some), Effect.exit)
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Option.some(ExampleError)))
    }))
  it.effect("absorbWith - on die", () =>
    Effect.gen(function*($) {
      const result = yield* $(ExampleErrorDie, Effect.absorbWith(() => "never"), Effect.exit)
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(ExampleError))
    }))
  it.effect("absorbWith - on success", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed(1), Effect.absorbWith(() => ExampleError))
      assert.strictEqual(result, 1)
    }))
  it.effect("attempt - error in sync effect", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.try(() => {
          throw ExampleError
        }),
        Effect.match(Option.some, () => Option.none())
      )
      assert.deepStrictEqual(result, Option.some(ExampleError))
    }))
  it.effect("attempt - fail", () =>
    Effect.gen(function*($) {
      const io1 = Effect.either(ExampleErrorFail)
      const io2 = Effect.suspend(() => Effect.either(Effect.suspend(() => ExampleErrorFail)))
      const [first, second] = yield* $(io1, Effect.zip(io2))
      assert.deepStrictEqual(first, Either.left(ExampleError))
      assert.deepStrictEqual(second, Either.left(ExampleError))
    }))
  it.effect("attempt - deep attempt sync effect error", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.either(deepErrorEffect(100)))
      assert.deepStrictEqual(result, Either.left(ExampleError))
    }))
  it.effect("attempt - deep attempt fail error", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.either(deepErrorFail(100)))
      assert.deepStrictEqual(result, Either.left(ExampleError))
    }))
  it.effect("attempt - sandbox -> terminate", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.sync(() => {
          throw ExampleError
        }),
        Effect.sandbox,
        Effect.either
      )
      assert.deepStrictEqual(pipe(result, Either.mapLeft(Cause.unannotate)), Either.left(Cause.die(ExampleError)))
    }))
  it.effect("catch - sandbox terminate", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.sync(() => {
          throw ExampleError
        }),
        Effect.sandbox,
        Effect.merge
      )
      assert.deepStrictEqual(Cause.unannotate(result), Cause.die(ExampleError))
    }))
  it.effect("catch failing finalizers with fail", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.fail(ExampleError),
        Effect.ensuring(Effect.sync(() => {
          throw InterruptError1
        })),
        Effect.ensuring(Effect.sync(() => {
          throw InterruptError2
        })),
        Effect.ensuring(Effect.sync(() => {
          throw InterruptError3
        })),
        Effect.exit
      )
      const expected = Cause.sequential(
        Cause.sequential(
          Cause.sequential(Cause.fail(ExampleError), Cause.die(InterruptError1)),
          Cause.die(InterruptError2)
        ),
        Cause.die(InterruptError3)
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.failCause(expected))
    }))
  it.effect("catch failing finalizers with terminate", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.die(ExampleError),
        Effect.ensuring(Effect.sync(() => {
          throw InterruptError1
        })),
        Effect.ensuring(Effect.sync(() => {
          throw InterruptError2
        })),
        Effect.ensuring(Effect.sync(() => {
          throw InterruptError3
        })),
        Effect.exit
      )
      const expected = Cause.sequential(
        Cause.sequential(
          Cause.sequential(Cause.die(ExampleError), Cause.die(InterruptError1)),
          Cause.die(InterruptError2)
        ),
        Cause.die(InterruptError3)
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.failCause(expected))
    }))
  it.effect("catchAllCause", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(Effect.succeed(42), Effect.zipRight(Effect.fail("uh oh")), Effect.catchAllCause(Effect.succeed))
      )
      assert.deepStrictEqual(Cause.unannotate(result), Cause.fail("uh oh"))
    }))
  it.effect("catchAllDefect - recovers from all defects", () =>
    Effect.gen(function*($) {
      const message = "division by zero"
      const result = yield* $(
        Effect.die(Cause.IllegalArgumentException(message)),
        Effect.catchAllDefect((e) => Effect.succeed((e as Error).message))
      )
      assert.strictEqual(result, message)
    }))
  it.effect("catchAllDefect - leaves errors", () =>
    Effect.gen(function*($) {
      const error = Cause.IllegalArgumentException("division by zero")
      const result = yield* $(
        pipe(Effect.fail(error), Effect.catchAllDefect((e) => Effect.succeed((e as Error).message)), Effect.exit)
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(error))
    }))
  it.effect("catchAllDefect - leaves values", () =>
    Effect.gen(function*($) {
      const error = Cause.IllegalArgumentException("division by zero")
      const result = yield* $(
        pipe(Effect.succeed(error), Effect.catchAllDefect((e) => Effect.succeed((e as Error).message)))
      )
      assert.deepStrictEqual(result, error)
    }))
  it.effect("catchSomeDefect - recovers from some defects", () =>
    Effect.gen(function*($) {
      const message = "division by zero"
      const result = yield* $(
        Effect.die(Cause.IllegalArgumentException(message)),
        Effect.catchSomeDefect((e) =>
          Cause.isIllegalArgumentException(e)
            ? Option.some(Effect.succeed(e.message))
            : Option.none()
        )
      )
      assert.strictEqual(result, message)
    }))
  it.effect("catchSomeDefect - leaves the rest", () =>
    Effect.gen(function*($) {
      const error = Cause.IllegalArgumentException("division by zero")
      const result = yield* $(
        Effect.die(error),
        Effect.catchSomeDefect((e) =>
          Cause.isRuntimeException(e) ?
            Option.some(Effect.succeed(e.message)) :
            Option.none()
        ),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.die(error))
    }))
  it.effect("catchSomeDefect - leaves errors", () =>
    Effect.gen(function*($) {
      const error = Cause.IllegalArgumentException("division by zero")
      const result = yield* $(
        Effect.fail(error),
        Effect.catchSomeDefect((e) =>
          Cause.isIllegalArgumentException(e)
            ? Option.some(Effect.succeed(e.message))
            : Option.none()
        ),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(error))
    }))
  it.effect("catchSomeDefect - leaves values", () =>
    Effect.gen(function*($) {
      const error = Cause.IllegalArgumentException("division by zero")
      const result = yield* $(
        Effect.succeed(error),
        Effect.catchSomeDefect((e) =>
          Cause.isIllegalArgumentException(e)
            ? Option.some(Effect.succeed(e.message))
            : Option.none()
        )
      )
      assert.deepStrictEqual(result, error)
    }))
  it.effect("catchTags - recovers from one of several tagged errors", () =>
    Effect.gen(function*($) {
      interface ErrorA {
        readonly _tag: "ErrorA"
      }
      interface ErrorB {
        readonly _tag: "ErrorB"
      }
      const effect: Effect.Effect<never, ErrorA | ErrorB, never> = Effect.fail({ _tag: "ErrorA" })
      const result = yield* $(Effect.catchTags(effect, {
        ErrorA: (e) => Effect.succeed(e)
      }))
      assert.deepStrictEqual(result, { _tag: "ErrorA" })
    }))
  it.effect("catchTags - does not recover from one of several tagged errors", () =>
    Effect.gen(function*($) {
      interface ErrorA {
        readonly _tag: "ErrorA"
      }
      interface ErrorB {
        readonly _tag: "ErrorB"
      }
      const effect: Effect.Effect<never, ErrorA | ErrorB, never> = Effect.fail({ _tag: "ErrorB" })
      const result = yield* $(Effect.exit(
        Effect.catchTags(effect, {
          ErrorA: (e) => Effect.succeed(e)
        })
      ))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail<ErrorB>({ _tag: "ErrorB" }))
    }))
  it.effect("catchTags - recovers from all tagged errors", () =>
    Effect.gen(function*($) {
      interface ErrorA {
        readonly _tag: "ErrorA"
      }
      interface ErrorB {
        readonly _tag: "ErrorB"
      }
      const effect: Effect.Effect<never, ErrorA | ErrorB, never> = Effect.fail({ _tag: "ErrorB" })
      const result = yield* $(Effect.catchTags(effect, {
        ErrorA: (e) => Effect.succeed(e),
        ErrorB: (e) => Effect.succeed(e)
      }))
      assert.deepStrictEqual(result, { _tag: "ErrorB" })
    }))
  it.effect("continueOrFail - returns failure ignoring value", () =>
    Effect.gen(function*($) {
      const goodCase = yield* $(exactlyOnce(0, (effect) =>
        pipe(
          effect,
          Effect.continueOrFail(() => "value was not 0", (v) =>
            v === 0 ?
              Option.some(v) :
              Option.none()),
          Effect.sandbox,
          Effect.either
        )))
      const badCase = yield* $(
        exactlyOnce(1, (effect) =>
          pipe(
            effect,
            Effect.continueOrFail(() => "value was not 0", (v) => v === 0 ? Option.some(v) : Option.none())
          )),
        Effect.sandbox,
        Effect.either,
        Effect.map(Either.mapLeft(Cause.failureOrCause))
      )
      assert.deepStrictEqual(goodCase, Either.right(0))
      assert.deepStrictEqual(badCase, Either.left(Either.left("value was not 0")))
    }))
  it.effect("continueOrFailEffect - returns failure ignoring value", () =>
    Effect.gen(function*($) {
      const goodCase = yield* $(
        exactlyOnce(0, (effect) =>
          pipe(
            effect,
            Effect.continueOrFailEffect(
              () => "value was not 0",
              (v) => v === 0 ? Option.some(Effect.succeed(v)) : Option.none()
            )
          )),
        Effect.sandbox,
        Effect.either
      )
      const partialBadCase = yield* $(
        exactlyOnce(0, (effect) =>
          pipe(
            effect,
            Effect.continueOrFailEffect(() => "predicate failed!", (n) =>
              n === 0 ?
                Option.some(Effect.fail("partial failed!")) :
                Option.none())
          )),
        Effect.sandbox,
        Effect.either,
        Effect.map(Either.mapLeft(Cause.failureOrCause))
      )
      const badCase = yield* $(
        exactlyOnce(1, (effect) =>
          pipe(
            effect,
            Effect.continueOrFailEffect(() => "value was not 0", (v) =>
              v === 0 ?
                Option.some(Effect.succeed(v)) :
                Option.none())
          )),
        Effect.sandbox,
        Effect.either,
        Effect.map(Either.mapLeft(Cause.failureOrCause))
      )
      assert.deepStrictEqual(goodCase, Either.right(0))
      assert.deepStrictEqual(partialBadCase, Either.left(Either.left("partial failed!")))
      assert.deepStrictEqual(badCase, Either.left(Either.left("value was not 0")))
    }))
  it.effect("fold - sandbox -> terminate", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.sync(() => {
          throw ExampleError
        }),
        Effect.sandbox,
        Effect.match(Option.some, () => Option.none() as Option.Option<Cause.Cause<never>>)
      )
      assert.deepStrictEqual(pipe(result, Option.map(Cause.unannotate)), Option.some(Cause.die(ExampleError)))
    }))
  it.effect("ignore - return success as unit", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.ignore(Effect.succeed(11)))
      assert.isUndefined(result)
    }))
  it.effect("ignore - return failure as unit", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.ignore(Effect.fail(123)))
      assert.isUndefined(result)
    }))
  it.effect("ignore - not catch throwable", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.ignore(Effect.die(ExampleError))))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.die(ExampleError))
    }))
  it.effect("orElse - does not recover from defects", () =>
    Effect.gen(function*($) {
      const error = new Error("died")
      const fiberId = FiberId.make(0, 123)
      const bothCause = Cause.parallel(Cause.interrupt(fiberId), Cause.die(error))
      const thenCause = Cause.sequential(Cause.interrupt(fiberId), Cause.die(error))
      const plain = yield* $(Effect.die(error), Effect.orElse(Effect.unit), Effect.exit)
      const both = yield* $(Effect.failCause(bothCause), Effect.orElse(Effect.unit), Effect.exit)
      const then = yield* $(Effect.failCause(thenCause), Effect.orElse(Effect.unit), Effect.exit)
      const fail = yield* $(Effect.fail(error), Effect.orElse(Effect.unit), Effect.exit)
      assert.deepStrictEqual(Exit.unannotate(plain), Exit.die(error))
      assert.deepStrictEqual(Exit.unannotate(both), Exit.die(error))
      assert.deepStrictEqual(Exit.unannotate(then), Exit.die(error))
      assert.deepStrictEqual(Exit.unannotate(fail), Exit.succeed(void 0))
    }))
  it.effect("orElse - left failed and right died with kept cause", () =>
    Effect.gen(function*($) {
      const z1 = Effect.fail(Cause.RuntimeException("1"))
      const z2 = Effect.die(Cause.RuntimeException("2"))
      const result = yield* $(
        z1,
        Effect.orElse(() => z2),
        Effect.catchAllCause((cause) => {
          if (Cause.isDie(cause)) {
            const defects = Cause.defects(cause)
            if (Chunk.isNonEmpty(defects)) {
              const head = Chunk.headNonEmpty(defects)
              return Effect.succeed((head as Cause.RuntimeException).message === "2")
            }
          }
          return Effect.succeed(false)
        })
      )
      assert.isTrue(result)
    }))
  it.effect("orElse - left failed and right failed with kept cause", () =>
    Effect.gen(function*($) {
      const z1 = Effect.fail(Cause.RuntimeException("1"))
      const z2 = Effect.fail(Cause.RuntimeException("2"))
      const result = yield* $(
        z1,
        Effect.orElse(() => z2),
        Effect.catchAllCause((cause) => {
          if (Cause.isFailure(cause)) {
            const failures = Cause.failures(cause)
            if (Chunk.isNonEmpty(failures)) {
              const head = Chunk.headNonEmpty(failures)
              return Effect.succeed(head.message === "2")
            }
          }
          return Effect.succeed(false)
        })
      )
      assert.isTrue(result)
    }))
  it.it("orElse - is associative", async () => {
    const smallInts = fc.integer({ min: 0, max: 100 })
    const causes = causesArb(1, smallInts, fc.string())
    const successes = smallInts.map(Effect.succeed)
    const exits = fc.oneof(
      causes.map(Either.left) as fc.Arbitrary<Either.Either<Cause.Cause<number>, number>>,
      successes.map(Either.right) as fc.Arbitrary<Either.Either<Cause.Cause<number>, number>>
    ).map(Either.match(Exit.failCause, Exit.succeed))
    await fc.assert(fc.asyncProperty(exits, exits, exits, async (exit1, exit2, exit3) => {
      const effect1 = Effect.done(exit1)
      const effect2 = Effect.done(exit2)
      const effect3 = Effect.done(exit3)
      const leftEffect = pipe(effect1, Effect.orElse(() => effect2), Effect.orElse(() => effect3))
      const rightEffect = pipe(effect1, Effect.orElse(() => pipe(effect2, Effect.orElse(() => effect3))))
      const program = Effect.gen(function*($) {
        const left = yield* $(Effect.exit(leftEffect))
        const right = yield* $(Effect.exit(rightEffect))
        return { left, right }
      })
      const { left, right } = await Effect.runPromise(program)
      assert.deepStrictEqual(Exit.unannotate(left), Exit.unannotate(right))
    }))
  })
  it.effect("orElseFail - executes this effect and returns its value if it succeeds", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed(true), Effect.orElseFail(constFalse))
      assert.isTrue(result)
    }))
  it.effect("orElseFail - otherwise fails with the specified error", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.fail(false), Effect.orElseFail(constTrue), Effect.flip)
      assert.isTrue(result)
    }))
  it.effect("orElseOptional - produces the value of this effect if it succeeds", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed("succeed"), Effect.orElseOptional(() => Effect.succeed("orElse")))
      assert.strictEqual(result, "succeed")
    }))
  it.effect("orElseOptional - produces the value of this effect if it fails with some error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(Effect.fail(Option.some("fail")), Effect.orElseOptional(() => Effect.succeed("orElse")), Effect.exit)
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Option.some("fail")))
    }))
  it.effect("orElseOptional - produces the value of the specified effect if it fails with none", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.fail(Option.none()), Effect.orElseOptional(() => Effect.succeed("orElse")))
      assert.strictEqual(result, "orElse")
    }))
  it.effect("orElseSucceed - executes this effect and returns its value if it succeeds", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed(true), Effect.orElseSucceed(constFalse))
      assert.isTrue(result)
    }))
  it.effect("orElseSucceed - otherwise succeeds with the specified value", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.fail(false), Effect.orElseSucceed(constTrue))
      assert.isTrue(result)
    }))
  it.effect("parallelErrors - one failure", () =>
    Effect.gen(function*($) {
      const fiber1 = yield* $(Effect.fork(Effect.fail("error1")))
      const fiber2 = yield* $(Effect.fork(Effect.succeed("success1")))
      const result = yield* $(fiber1, Fiber.zip(fiber2), Fiber.join, Effect.parallelErrors, Effect.flip)
      assert.deepStrictEqual(Array.from(result), ["error1"])
    }))
  it.effect("parallelErrors - all failures", () =>
    Effect.gen(function*($) {
      const fiber1 = yield* $(Effect.fork(Effect.fail("error1")))
      const fiber2 = yield* $(Effect.fork(Effect.fail("error2")))
      const result = yield* $(fiber1, Fiber.zip(fiber2), Fiber.join, Effect.parallelErrors, Effect.flip)
      assert.deepStrictEqual(Array.from(result), ["error1", "error2"])
    }))
  it.effect("promise - exception does not kill fiber", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.promise(() => {
          throw ExampleError
        }),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.die(ExampleError))
    }))
  it.effect("reject - returns failure ignoring value", () =>
    Effect.gen(function*($) {
      const goodCase = yield* $(
        pipe(
          exactlyOnce(0, Effect.reject((n) => (n !== 0 ? Option.some("partial failed!") : Option.none()))),
          Effect.sandbox,
          Effect.either
        )
      )
      const badCase = yield* $(
        pipe(
          exactlyOnce(1, Effect.reject((n) => (n !== 0 ? Option.some("partial failed!") : Option.none()))),
          Effect.sandbox,
          Effect.either,
          Effect.map(Either.mapLeft(Cause.failureOrCause))
        )
      )
      assert.deepStrictEqual(goodCase, Either.right(0))
      assert.deepStrictEqual(badCase, Either.left(Either.left("partial failed!")))
    }))
  it.effect("rejectEffect - returns failure ignoring value", () =>
    Effect.gen(function*($) {
      const goodCase = yield* $(
        exactlyOnce(
          0,
          Effect.rejectEffect((n) => n !== 0 ? Option.some(Effect.succeed("partial failed!")) : Option.none())
        ),
        Effect.sandbox,
        Effect.either
      )
      const partialBadCase = yield* $(
        exactlyOnce(
          0,
          Effect.rejectEffect((n) => n !== 0 ? Option.some(Effect.fail("partial failed!")) : Option.none())
        ),
        Effect.sandbox,
        Effect.either,
        Effect.map(Either.mapLeft(Cause.failureOrCause))
      )
      const badCase = yield* $(
        exactlyOnce(
          1,
          Effect.rejectEffect((n) => n !== 0 ? Option.some(Effect.fail("partial failed!")) : Option.none())
        ),
        Effect.sandbox,
        Effect.either,
        Effect.map(Either.mapLeft(Cause.failureOrCause))
      )
      assert.deepStrictEqual(goodCase, Either.right(0))
      assert.deepStrictEqual(partialBadCase, Either.right(0))
      assert.deepStrictEqual(badCase, Either.left(Either.left("partial failed!")))
    }))
  it.effect("tryCatch = handles exceptions", () =>
    Effect.gen(function*($) {
      const message = "hello"
      const result = yield* $(
        Effect.tryCatch(() => {
          throw message
        }, identity),
        Effect.exit
      )

      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(message))
    }))
  it.effect("uncaught - fail", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(ExampleErrorFail))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(ExampleError))
    }))
  it.effect("uncaught - sync effect error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.sync(() => {
          throw ExampleError
        }),
        Effect.exit
      )

      assert.deepStrictEqual(Exit.unannotate(result), Exit.die(ExampleError))
    }))
  it.effect("uncaught - deep sync effect error", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(deepErrorEffect(100)))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(ExampleError))
    }))
  it.effect("refineTagOrDie - leaves the tagged error as failure", () =>
    Effect.gen(function*($) {
      interface ErrorA {
        readonly _tag: "ErrorA"
      }
      interface ErrorB {
        readonly _tag: "ErrorB"
      }
      const effect: Effect.Effect<never, ErrorA | ErrorB, never> = Effect.fail({ _tag: "ErrorA" })
      const result = yield* $(
        Effect.refineTagOrDie(effect, "ErrorA"),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail({ _tag: "ErrorA" }))
    }))
  it.effect("refineTagOrDie - converts the rest to defects", () =>
    Effect.gen(function*($) {
      interface ErrorA {
        readonly _tag: "ErrorA"
      }
      interface ErrorB {
        readonly _tag: "ErrorB"
      }
      const effect: Effect.Effect<never, ErrorA | ErrorB, never> = Effect.fail({ _tag: "ErrorA" })
      const result = yield* $(
        Effect.refineTagOrDie(effect, "ErrorB"),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.die({ _tag: "ErrorA" }))
    }))
  it.effect("refineTagOrDieWith - narrows callback argument type", () =>
    Effect.gen(function*($) {
      interface ErrorA {
        readonly _tag: "ErrorA"
        readonly a: "a"
      }
      interface ErrorB {
        readonly _tag: "ErrorB"
      }
      const effect: Effect.Effect<never, ErrorA | ErrorB, never> = Effect.fail({ _tag: "ErrorA", a: "a" })
      const result = yield* $(
        Effect.refineTagOrDieWith(effect, "ErrorB", (e) => e.a),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.die("a"))
    }))
  it.effect("unrefine - converts some fiber failures into errors", () =>
    Effect.gen(function*($) {
      const message = "division by zero"
      const defect = Effect.die(Cause.IllegalArgumentException(message))
      const result = yield* $(
        defect,
        Effect.unrefine((e) =>
          Cause.isIllegalArgumentException(e) ?
            Option.some(e.message) :
            Option.none()
        ),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(message))
    }))
  it.effect("unrefine - leaves the rest", () =>
    Effect.gen(function*($) {
      const error = Cause.IllegalArgumentException("division by zero")
      const defect = Effect.die(error)
      const result = yield* $(
        defect,
        Effect.unrefine((e) =>
          Cause.isRuntimeException(e) ?
            Option.some(e.message) :
            Option.none()
        ),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.die(error))
    }))
  it.effect("unrefineWith - converts some fiber failures into errors", () =>
    Effect.gen(function*($) {
      const message = "division by zero"
      const defect = Effect.die(Cause.IllegalArgumentException(message))
      const result = yield* $(
        defect,
        Effect.unrefineWith(
          (e) => Cause.isIllegalArgumentException(e) ? Option.some(e.message) : Option.none(),
          () => Option.none()
        ),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(message))
    }))
  it.effect("unrefineWith - leaves the rest", () =>
    Effect.gen(function*($) {
      const error = Cause.IllegalArgumentException("division by zero")
      const defect = Effect.die(error)
      const result = yield* $(
        defect,
        Effect.unrefineWith(
          (e) => Cause.isRuntimeException(e) ? Option.some(e.message) : Option.none(),
          () => Option.none()
        ),
        Effect.exit
      )

      assert.deepStrictEqual(Exit.unannotate(result), Exit.die(error))
    }))
  it.effect("unrefineWith - uses the specified function to convert the `E` into an `E1`", () =>
    Effect.gen(function*($) {
      const failure = Effect.fail("fail")
      const result = yield* $(
        pipe(
          failure,
          Effect.unrefineWith(
            (e) => Cause.isIllegalArgumentException(e) ? Option.some(e.message) : Option.none(),
            () => Option.none()
          ),
          Effect.exit
        )
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Option.none()))
    }))
  it.effect("unwraps exception", () =>
    Effect.gen(function*($) {
      const failure = Effect.fail(Cause.fail(new Error("fail")))
      const success = Effect.succeed(100)
      const message = yield* $(
        failure,
        Effect.unsandbox,
        Effect.matchEffect((e) => Effect.succeed(e.message), () => Effect.succeed("unexpected"))
      )
      const result = yield* $(Effect.unsandbox(success))
      assert.strictEqual(message, "fail")
      assert.strictEqual(result, 100)
    }))
  it.effect("no information is lost during composition", () =>
    Effect.gen(function*($) {
      const cause = <R, E>(effect: Effect.Effect<R, E, never>): Effect.Effect<R, never, Cause.Cause<E>> => {
        return pipe(effect, Effect.matchCauseEffect(Effect.succeed, Effect.fail))
      }
      const expectedCause = Cause.fail("oh no")
      const result = yield* $(cause(pipe(Effect.failCause(expectedCause), Effect.sandbox, Effect.unsandbox)))
      assert.deepStrictEqual(Cause.unannotate(result), expectedCause)
    }))
})
