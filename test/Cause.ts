import * as Cause from "@effect/io/Cause"
import * as FiberId from "@effect/io/Fiber/Id"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as fc from "fast-check"
import { assert, describe } from "vitest"

describe.concurrent("Cause", () => {
  it("should be compared for equality by value", () => {
    assert.isTrue(Equal.equals(Cause.fail(0), Cause.fail(0)))
    assert.isTrue(Equal.equals(Cause.die(0), Cause.die(0)))
    assert.isFalse(Equal.equals(Cause.fail(0), Cause.fail(1)))
    assert.isFalse(Equal.equals(Cause.die(0), Cause.die(1)))
  })

  it("`Cause.equals` is symmetric", () => {
    fc.assert(fc.property(causes, causes, (causeA, causeB) => {
      assert.strictEqual(
        Equal.equals(causeA, causeB),
        Equal.equals(causeB, causeA)
      )
    }))
  })

  it("`Cause.equals` and `Cause.hashCode` satisfy the contract", () => {
    fc.assert(fc.property(equalCauses, ([causeA, causeB]) => {
      assert.strictEqual(Equal.hash(causeA), Equal.hash(causeB))
    }))
  })

  it("`Cause.isDie` and `Cause.keepDefects` are consistent", () => {
    fc.assert(fc.property(causes, (cause) => {
      const result = Cause.keepDefects(cause)
      if (Cause.isDie(cause)) {
        assert.isTrue(Option.isSome(result))
      } else {
        assert.isTrue(Option.isNone(result))
      }
    }))
  })

  it("`Cause.failures is stack safe", () => {
    const n = 10_000
    const cause = Array.from({ length: n - 1 }, () => Cause.fail("fail")).reduce(Cause.parallel, Cause.fail("fail"))
    const result = Cause.failures(cause)
    assert.strictEqual(Array.from(result).length, n)
  })

  it("left identity", () => {
    fc.assert(fc.property(causes, (cause) => {
      const left = pipe(cause, Cause.flatMap(Cause.fail))
      const right = cause
      assert.isTrue(Equal.equals(left, right))
    }))
  })

  it("right identity", () => {
    fc.assert(fc.property(errors, errorCauseFunctions, (error, f) => {
      const left = pipe(Cause.fail(error), Cause.flatMap(f))
      const right = f(error)
      assert.isTrue(Equal.equals(left, right))
    }))
  })

  it("associativity", () => {
    fc.assert(fc.property(causes, errorCauseFunctions, errorCauseFunctions, (cause, f, g) => {
      const left = pipe(cause, Cause.flatMap(f), Cause.flatMap(g))
      const right = pipe(cause, Cause.flatMap((error) => pipe(f(error), Cause.flatMap(g))))
      assert.isTrue(Equal.equals(left, right))
    }))
  })

  describe.concurrent("stripSomeDefects", () => {
    it("returns `Some` with remaining causes", () => {
      const cause1 = Cause.die({
        _tag: "NumberFormatException",
        msg: "can't parse to int"
      })
      const cause2 = Cause.die({
        _tag: "ArithmeticException",
        msg: "division by zero"
      })
      const cause = Cause.parallel(cause1, cause2)
      const stripped = pipe(
        cause,
        Cause.stripSomeDefects((defect) =>
          typeof defect === "object" &&
            defect != null &&
            "_tag" in defect &&
            defect["_tag"] === "NumberFormatException" ?
            Option.some(defect) :
            Option.none
        )
      )
      assert.isTrue(Equal.equals(stripped, Option.some(cause2)))
    })

    it("returns `None` if there are no remaining causes", () => {
      const cause = Cause.die({ _tag: "NumberFormatException", msg: "can't parse to int" })
      const stripped = pipe(
        cause,
        Cause.stripSomeDefects((defect) =>
          typeof defect === "object" &&
            defect != null &&
            "_tag" in defect &&
            defect["_tag"] === "NumberFormatException" ?
            Option.some(defect) :
            Option.none
        )
      )
      assert.isTrue(Equal.equals(stripped, Option.none))
    })
  })
})

const causesArb = <E>(
  n: number,
  error: fc.Arbitrary<E>,
  defect: fc.Arbitrary<unknown>
): fc.Arbitrary<Cause.Cause<E>> => {
  const fiberId: fc.Arbitrary<FiberId.FiberId> = fc.tuple(
    fc.integer(),
    fc.integer()
  ).map(([a, b]) => FiberId.make(a, b))

  const empty = fc.constant(Cause.empty)
  const failure = error.map(Cause.fail)
  const die = defect.map(Cause.die)
  const interrupt = fiberId.map(Cause.interrupt)

  const annotated = (n: number): fc.Arbitrary<Cause.Cause<E>> => {
    return fc.tuple(causesN(n - 1), fc.anything()).map(
      ([cause, annotation]) => Cause.annotated(cause, annotation)
    )
  }

  const sequential = (n: number): fc.Arbitrary<Cause.Cause<E>> => {
    return fc.integer({ min: 1, max: n - 1 }).chain((i) =>
      causesN(i).chain((left) => causesN(n - i).map((right) => Cause.sequential(left, right)))
    )
  }

  const parallel = (n: number): fc.Arbitrary<Cause.Cause<E>> => {
    return fc.integer({ min: 1, max: n - 1 }).chain((i) =>
      causesN(i).chain((left) => causesN(n - i).map((right) => Cause.parallel(left, right)))
    )
  }

  const causesN = (n: number): fc.Arbitrary<Cause.Cause<E>> => {
    if (n === 1) {
      return fc.oneof(empty, failure, die, interrupt)
    }
    if (n === 2) {
      return annotated(n)
    }
    return fc.oneof(annotated(n), sequential(n), parallel(n))
  }

  return causesN(n)
}

const causes: fc.Arbitrary<Cause.Cause<string>> = causesArb(
  1,
  fc.string(),
  fc.string().map((message) => new Error(message))
)

const errors: fc.Arbitrary<string> = fc.string()

const errorCauseFunctions: fc.Arbitrary<(s: string) => Cause.Cause<string>> = fc.func(causes)

const equalCauses: fc.Arbitrary<
  readonly [Cause.Cause<string>, Cause.Cause<string>]
> = fc.tuple(causes, causes, causes)
  .chain(([a, b, c]) => {
    const causeCases: ReadonlyArray<readonly [Cause.Cause<string>, Cause.Cause<string>]> = [
      [a, a],
      [
        Cause.sequential(Cause.sequential(a, b), c),
        Cause.sequential(a, Cause.sequential(b, c))
      ],
      [
        Cause.sequential(a, Cause.parallel(b, c)),
        Cause.parallel(Cause.sequential(a, b), Cause.sequential(a, c))
      ],
      [
        Cause.parallel(Cause.parallel(a, b), c),
        Cause.parallel(a, Cause.parallel(b, c))
      ],
      [
        Cause.parallel(Cause.sequential(a, c), Cause.sequential(b, c)),
        Cause.sequential(Cause.parallel(a, b), c)
      ],
      [
        Cause.parallel(a, b),
        Cause.parallel(b, a)
      ],
      [a, Cause.sequential(a, Cause.empty)],
      [a, Cause.parallel(a, Cause.empty)]
    ]
    return fc.integer({ min: 0, max: causeCases.length - 1 }).map((i) => causeCases[i])
  })
