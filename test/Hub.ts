import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as Hub from "@effect/io/Hub"
import * as Queue from "@effect/io/Queue"
import * as it from "@effect/io/test/utils/extend"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import { assert, describe } from "vitest"

describe.concurrent("Hub", () => {
  it.effect("backpressured concurrent publishers and subscribers - one to one", () =>
    Effect.gen(function*() {
      const values = Chunk.range(0, 64)
      const deferred = yield* Deferred.make<never, void>()
      const hub = yield* Hub.bounded<number>(64)
      const subscriber = yield* pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            deferred,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred)
      yield* pipe(values, Effect.forEach((n) => pipe(hub, Hub.publish(n))), Effect.fork)
      const result = yield* Fiber.join(subscriber)
      assert.deepStrictEqual(result, values)
    }))

  it.effect("backpressured concurrent publishers and subscribers - one to many", () =>
    Effect.gen(function*() {
      const values = Chunk.range(0, 64)
      const deferred1 = yield* Deferred.make<never, void>()
      const deferred2 = yield* Deferred.make<never, void>()
      const hub = yield* Hub.bounded<number>(64)
      const subscriber1 = yield* pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            deferred1,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      const subscriber2 = yield* pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            deferred2,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Deferred.await(deferred2)
      yield* pipe(values, Effect.forEach((n) => pipe(hub, Hub.publish(n))), Effect.fork)
      const result1 = yield* Fiber.join(subscriber1)
      const result2 = yield* Fiber.join(subscriber2)
      assert.deepStrictEqual(result1, values)
      assert.deepStrictEqual(result2, values)
    }))

  it.effect("backpressured concurrent publishers and subscribers - many to many", () =>
    Effect.gen(function*() {
      const values = Chunk.range(1, 64)
      const deferred1 = yield* Deferred.make<never, void>()
      const deferred2 = yield* Deferred.make<never, void>()
      const hub = yield* Hub.bounded<number>(64 * 2)
      const subscriber1 = yield* pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            deferred1,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(pipe(
              values,
              Chunk.concat(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      const subscriber2 = yield* pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            deferred2,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(pipe(values, Chunk.concat(values), Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped,
        Effect.fork
      )
      yield* Deferred.await(deferred1)
      yield* Deferred.await(deferred2)
      const fiber = yield* pipe(
        values,
        Effect.forEach((n) => pipe(hub, Hub.publish(n))),
        Effect.fork
      )
      yield* pipe(
        values,
        Chunk.map((n) => -n),
        Effect.forEach((n) => pipe(hub, Hub.publish(n))),
        Effect.fork
      )
      const result1 = yield* Fiber.join(subscriber1)
      const result2 = yield* Fiber.join(subscriber2)
      yield* Fiber.join(fiber)

      assert.deepStrictEqual(
        pipe(result1, Chunk.filter((n) => n > 0)),
        values
      )
      assert.deepStrictEqual(
        pipe(result1, Chunk.filter((n) => n < 0)),
        pipe(values, Chunk.map((n) => -n))
      )
      assert.deepStrictEqual(
        pipe(result2, Chunk.filter((n) => n > 0)),
        values
      )
      assert.deepStrictEqual(
        pipe(result2, Chunk.filter((n) => n < 0)),
        pipe(values, Chunk.map((n) => -n))
      )
    }))
})
