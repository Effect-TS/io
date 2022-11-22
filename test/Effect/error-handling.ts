import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Ref from "@effect/io/Ref"
import * as it from "@effect/io/test/utils/extend"
import * as Either from "@fp-ts/data/Either"
import { identity, pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import { assert, describe } from "vitest"

const ExampleError = new Error("Oh noes!")

const ExampleErrorFail = Effect.fail(ExampleError)
const ExampleErrorDie = Effect.dieSync(() => {
  throw ExampleError
})

const exactlyOnce = <R, A, A1>(
  value: A,
  f: (_: Effect.Effect<never, never, A>) => Effect.Effect<R, string, A1>
): Effect.Effect<R, string, A1> => {
  return Effect.gen(function*() {
    const ref = yield* Ref.make(0)
    const res = yield* f(pipe(ref, Ref.update((n) => n + 1), Effect.zipRight(Effect.succeed(value))))
    const count = yield* Ref.get(ref)
    yield* count !== 1 ? Effect.fail("Accessed more than once") : Effect.unit()
    return res
  })
}

describe.concurrent("Effect", () => {
  it.effect("absolve", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.succeed(Either.right("test")),
        Effect.absolve
      )
      assert.strictEqual(result, "test")
    }))

  it.effect("absorbWith - on fail", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        ExampleErrorFail,
        Effect.absorbWith(Option.some),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(Option.some(ExampleError)))
    }))

  it.effect("absorbWith - on die", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        ExampleErrorDie,
        Effect.absorbWith(() => "never"),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(ExampleError))
    }))

  it.effect("absorbWith - on success", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.succeed(1),
        Effect.absorbWith(() => ExampleError)
      )
      assert.strictEqual(result, 1)
    }))

  it.effect("catchAllDefect - recovers from all defects", () =>
    Effect.gen(function*() {
      const message = "division by zero"
      const result = yield* pipe(
        Effect.die(Cause.IllegalArgumentException(message)),
        Effect.catchAllDefect((e) => Effect.succeed((e as Error).message))
      )
      assert.strictEqual(result, message)
    }))

  it.effect("catchAllDefect - leaves errors", () =>
    Effect.gen(function*() {
      const error = Cause.IllegalArgumentException("division by zero")
      const result = yield* pipe(
        Effect.fail(error),
        Effect.catchAllDefect((e) => Effect.succeed((e as Error).message)),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(error))
    }))

  it.effect("catchAllDefect - leaves values", () =>
    Effect.gen(function*() {
      const error = Cause.IllegalArgumentException("division by zero")
      const result = yield* pipe(
        Effect.succeed(error),
        Effect.catchAllDefect((e) => Effect.succeed((e as Error).message))
      )
      assert.deepStrictEqual(result, error)
    }))

  it.effect("catchSomeDefect - recovers from some defects", () =>
    Effect.gen(function*() {
      const message = "division by zero"
      const result = yield* pipe(
        Effect.die(Cause.IllegalArgumentException(message)),
        Effect.catchSomeDefect((e) =>
          Cause.isIllegalArgumentException(e)
            ? Option.some(Effect.succeed(e.message))
            : Option.none
        )
      )
      assert.strictEqual(result, message)
    }))

  it.effect("catchSomeDefect - leaves the rest", () =>
    Effect.gen(function*() {
      const error = Cause.IllegalArgumentException("division by zero")
      const result = yield* pipe(
        Effect.die(error),
        Effect.catchSomeDefect((e) =>
          Cause.isRuntimeException(e) ?
            Option.some(Effect.succeed(e.message)) :
            Option.none
        ),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.die(error))
    }))

  it.effect("catchSomeDefect - leaves errors", () =>
    Effect.gen(function*() {
      const error = Cause.IllegalArgumentException("division by zero")
      const result = yield* pipe(
        Effect.fail(error),
        Effect.catchSomeDefect((e) =>
          Cause.isIllegalArgumentException(e)
            ? Option.some(Effect.succeed(e.message))
            : Option.none
        ),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(error))
    }))

  it.effect("catchSomeDefect - leaves values", () =>
    Effect.gen(function*() {
      const error = Cause.IllegalArgumentException("division by zero")
      const result = yield* pipe(
        Effect.succeed(error),
        Effect.catchSomeDefect((e) =>
          Cause.isIllegalArgumentException(e)
            ? Option.some(Effect.succeed(e.message))
            : Option.none
        )
      )
      assert.deepStrictEqual(result, error)
    }))

  it.effect("continueOrFail - returns failure ignoring value", () =>
    Effect.gen(function*() {
      const goodCase = yield* exactlyOnce(0, (effect) =>
        pipe(
          effect,
          Effect.continueOrFail("value was not 0", (v) =>
            v === 0 ?
              Option.some(v) :
              Option.none),
          Effect.sandbox,
          Effect.either
        ))
      const badCase = yield* pipe(
        exactlyOnce(1, (effect) =>
          pipe(
            effect,
            Effect.continueOrFail("value was not 0", (v) => v === 0 ? Option.some(v) : Option.none)
          )),
        Effect.sandbox,
        Effect.either,
        Effect.map(Either.mapLeft(Cause.failureOrCause))
      )
      assert.deepStrictEqual(goodCase, Either.right(0))
      assert.deepStrictEqual(badCase, Either.left(Either.left("value was not 0")))
    }))

  it.effect("continueOrFailEffect - returns failure ignoring value", () =>
    Effect.gen(function*() {
      const goodCase = yield* pipe(
        exactlyOnce(0, (effect) =>
          pipe(
            effect,
            Effect.continueOrFailEffect(
              "value was not 0",
              (v) => v === 0 ? Option.some(Effect.succeed(v)) : Option.none
            )
          )),
        Effect.sandbox,
        Effect.either
      )
      const partialBadCase = yield* pipe(
        exactlyOnce(0, (effect) =>
          pipe(
            effect,
            Effect.continueOrFailEffect("predicate failed!", (n) =>
              n === 0 ?
                Option.some(Effect.fail("partial failed!")) :
                Option.none)
          )),
        Effect.sandbox,
        Effect.either,
        Effect.map(Either.mapLeft(Cause.failureOrCause))
      )
      const badCase = yield* pipe(
        exactlyOnce(1, (effect) =>
          pipe(
            effect,
            Effect.continueOrFailEffect("value was not 0", (v) =>
              v === 0 ?
                Option.some(Effect.succeed(v)) :
                Option.none)
          )),
        Effect.sandbox,
        Effect.either,
        Effect.map(Either.mapLeft(Cause.failureOrCause))
      )
      assert.deepStrictEqual(goodCase, Either.right(0))
      assert.deepStrictEqual(partialBadCase, Either.left(Either.left("partial failed!")))
      assert.deepStrictEqual(badCase, Either.left(Either.left("value was not 0")))
    }))

  it.effect("tryCatch = handles exceptions", () =>
    Effect.gen(function*() {
      const message = "hello"
      const result = yield* pipe(
        Effect.tryCatch(
          () => {
            throw message
          },
          identity
        ),
        Effect.exit
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(message))
    }))
})
