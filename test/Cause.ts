import * as Cause from "@effect/io/Cause"
import { equals } from "@fp-ts/data/Equal"

describe("Cause", () => {
  it("should be compared by value", () => {
    assert.isTrue(equals(Cause.fail(0), Cause.fail(0)))
    assert.isTrue(equals(Cause.die(0), Cause.die(0)))
    assert.isFalse(equals(Cause.fail(0), Cause.fail(1)))
    assert.isFalse(equals(Cause.die(0), Cause.die(1)))
  })
})
