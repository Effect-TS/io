import "./Debug.init"

import * as Effect from "@effect/io/Effect"
import type { Yield } from "@effect/io/internal/core"
import { assert, describe } from "vitest"

describe.concurrent("Debug", () => {
  it("should include call trace", () => {
    const op = Effect.yieldNow()
    const yieldOp = (op as Yield)
    console.log(yieldOp.trace)
    assert.isTrue(yieldOp.trace && yieldOp.trace.endsWith(__dirname + "/Debug.ts:9:23"))
  })
})
