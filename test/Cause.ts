import * as Equal from "@effect/data/Equal"
import * as Hash from "@effect/data/Hash"
import * as Option from "@effect/data/Option"
import * as Predicate from "@effect/data/Predicate"
import * as Cause from "@effect/io/Cause"
import { causes, equalCauses, errorCauseFunctions, errors } from "@effect/io/test/utils/cause"
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
      assert.strictEqual(Hash.hash(causeA), Hash.hash(causeB))
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
      const left = cause.pipe(Cause.flatMap(Cause.fail))
      const right = cause
      assert.isTrue(Equal.equals(left, right))
    }))
  })

  it("right identity", () => {
    fc.assert(fc.property(errors, errorCauseFunctions, (error, f) => {
      const left = Cause.fail(error).pipe(Cause.flatMap(f))
      const right = f(error)
      assert.isTrue(Equal.equals(left, right))
    }))
  })

  it("associativity", () => {
    fc.assert(fc.property(causes, errorCauseFunctions, errorCauseFunctions, (cause, f, g) => {
      const left = cause.pipe(Cause.flatMap(f), Cause.flatMap(g))
      const right = cause.pipe(Cause.flatMap((error) => f(error).pipe(Cause.flatMap(g))))
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
      const stripped = cause.pipe(
        Cause.stripSomeDefects((defect) =>
          Predicate.isTagged(defect, "NumberFormatException")
            ? Option.some(defect) :
            Option.none()
        )
      )
      assert.isTrue(Equal.equals(stripped, Option.some(cause2)))
    })

    it("returns `None` if there are no remaining causes", () => {
      const cause = Cause.die({ _tag: "NumberFormatException", msg: "can't parse to int" })
      const stripped = cause.pipe(
        Cause.stripSomeDefects((defect) =>
          Predicate.isTagged(defect, "NumberFormatException")
            ? Option.some(defect) :
            Option.none()
        )
      )
      assert.isTrue(Equal.equals(stripped, Option.none()))
    })
  })

  describe("InterruptedException", () => {
    it("renders as string", () => {
      const ex = Cause.InterruptedException("my message")
      expect(ex.toString()).toEqual("InterruptedException: my message")
    })
  })
})
