import "./Debug.init"

import * as Effect from "@effect/io/Effect"
import type { Yield } from "@effect/io/internal/runtime"

describe("Debug", () => {
  it("should include call trace", () => {
    const op = Effect.yieldNow()
    const yieldOp = (op as Yield)
    assert.isTrue(yieldOp.trace && yieldOp.trace.endsWith(__dirname + "/Debug.ts:8:23"))
  })
})
