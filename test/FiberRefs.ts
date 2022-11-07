import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as FiberRef from "@effect/io/FiberRef"
import type * as FiberRefs from "@effect/io/FiberRefs"
import * as Queue from "@effect/io/Queue"
import * as it from "@effect/io/test/extend"
import { pipe } from "@fp-ts/data/Function"

describe.concurrent("FiberRefs", () => {
  it.scoped("propagate FiberRef values across fiber boundaries", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(false)
      const queue = yield* Queue.unbounded<FiberRefs.FiberRefs>()
      const producer = yield* pipe(
        fiberRef,
        FiberRef.set(true),
        Effect.zipRight(
          pipe(
            Effect.getFiberRefs(),
            Effect.flatMap((a) => pipe(queue, Queue.offer(a)))
          )
        ),
        Effect.fork
      )
      const consumer = yield* pipe(
        Queue.take(queue),
        Effect.flatMap((fiberRefs) =>
          pipe(
            Effect.setFiberRefs(fiberRefs),
            Effect.zipRight(FiberRef.get(fiberRef))
          )
        ),
        Effect.fork
      )
      yield* Fiber.join(producer)
      const result = yield* Fiber.join(consumer)
      assert.isTrue(result)
    }))
})
