import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import * as FiberRef from "@effect/io/FiberRef"
import * as FiberRefs from "@effect/io/FiberRefs"
import * as Queue from "@effect/io/Queue"
import * as it from "@effect/io/test/utils/extend"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import { assert, describe } from "vitest"

describe.concurrent("FiberRefs", () => {
  it.scoped("propagate FiberRef values across fiber boundaries", () =>
    Effect.gen(function*($) {
      const fiberRef = yield* $(FiberRef.make(false))
      const queue = yield* $(Queue.unbounded<FiberRefs.FiberRefs>())
      const producer = yield* $(
        pipe(
          fiberRef,
          FiberRef.set(true),
          Effect.zipRight(pipe(Effect.getFiberRefs(), Effect.flatMap((a) => pipe(queue, Queue.offer(a))))),
          Effect.fork
        )
      )
      const consumer = yield* $(pipe(
        Queue.take(queue),
        Effect.flatMap((fiberRefs) => pipe(Effect.setFiberRefs(fiberRefs), Effect.zipRight(FiberRef.get(fiberRef)))),
        Effect.fork
      ))
      yield* $(Fiber.join(producer))
      const result = yield* $(Fiber.join(consumer))
      assert.isTrue(result)
    }))
  it.it("interruptedCause", () => {
    const parent = FiberId.make(1, Date.now()) as FiberId.Runtime
    const child = FiberId.make(2, Date.now()) as FiberId.Runtime
    const parentFiberRefs = FiberRefs.unsafeMake(new Map())
    const childFiberRefs = pipe(
      parentFiberRefs,
      FiberRefs.updatedAs(child, FiberRef.interruptedCause, Cause.interrupt(parent))
    )
    const newParentFiberRefs = pipe(parentFiberRefs, FiberRefs.joinAs(parent, childFiberRefs))
    assert.deepStrictEqual(pipe(newParentFiberRefs, FiberRefs.get(FiberRef.interruptedCause)), Option.some(Cause.empty))
  })
})
