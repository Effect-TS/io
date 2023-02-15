import * as Chunk from "@effect/data/Chunk"
import { pipe } from "@effect/data/Function"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as Hub from "@effect/io/Hub"
import * as Queue from "@effect/io/Queue"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Hub", () => {
  it.effect("sequential publishers and subscribers with one publisher and one subscriber", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(0, 9)
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.bounded<number>(10))
      const subscriber = yield* $(
        pipe(
          Hub.subscribe(hub),
          Effect.flatMap((subscription) =>
            pipe(
              Deferred.succeed(deferred1, void 0),
              Effect.zipRight(Deferred.await(deferred2)),
              Effect.zipRight(pipe(values, Effect.forEach(() => Queue.take(subscription))))
            )
          ),
          Effect.scoped(),
          Effect.fork
        )
      )
      yield* $(Deferred.await(deferred1))
      yield* $(pipe(values, Effect.forEach((n) => Hub.publish(hub, n))))
      yield* $(Deferred.succeed(deferred2, void 0))
      const result = yield* $(Fiber.join(subscriber))
      assert.deepStrictEqual(result, values)
    }))
  it.effect("sequential publishers and subscribers with one publisher and two subscribers", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(0, 9)
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const deferred3 = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.bounded<number>(10))
      const subscriber1 = yield* $(
        pipe(
          Hub.subscribe(hub),
          Effect.flatMap((subscription) =>
            pipe(
              Deferred.succeed(deferred1, void 0),
              Effect.zipRight(Deferred.await(deferred3)),
              Effect.zipRight(pipe(values, Effect.forEach(() => Queue.take(subscription))))
            )
          ),
          Effect.scoped(),
          Effect.fork
        )
      )
      const subscriber2 = yield* $(
        pipe(
          Hub.subscribe(hub),
          Effect.flatMap((subscription) =>
            pipe(
              Deferred.succeed(deferred2, void 0),
              Effect.zipRight(Deferred.await(deferred3)),
              Effect.zipRight(pipe(values, Effect.forEach(() => Queue.take(subscription))))
            )
          ),
          Effect.scoped(),
          Effect.fork
        )
      )
      yield* $(Deferred.await(deferred1))
      yield* $(Deferred.await(deferred2))
      yield* $(pipe(values, Effect.forEach((n) => Hub.publish(hub, n))))
      yield* $(Deferred.succeed(deferred3, undefined))
      const result1 = yield* $(Fiber.join(subscriber1))
      const result2 = yield* $(Fiber.join(subscriber2))
      assert.deepStrictEqual(result1, values)
      assert.deepStrictEqual(result2, values)
    }))
  it.effect("backpressured concurrent publishers and subscribers - one to one", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(0, 64)
      const deferred = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.bounded<number>(64))
      const subscriber = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      yield* $(Deferred.await(deferred))
      yield* $(pipe(
        values,
        Effect.forEach((n) => Hub.publish(hub, n)),
        Effect.fork
      ))
      const result = yield* $(Fiber.join(subscriber))
      assert.deepStrictEqual(result, values)
    }))
  it.effect("backpressured concurrent publishers and subscribers - one to many", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(0, 64)
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.bounded<number>(64))
      const subscriber1 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      const subscriber2 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      yield* $(Deferred.await(deferred1))
      yield* $(Deferred.await(deferred2))
      yield* $(pipe(
        values,
        Effect.forEach((n) => Hub.publish(hub, n)),
        Effect.fork
      ))
      const result1 = yield* $(Fiber.join(subscriber1))
      const result2 = yield* $(Fiber.join(subscriber2))
      assert.deepStrictEqual(result1, values)
      assert.deepStrictEqual(result2, values)
    }))
  it.effect("backpressured concurrent publishers and subscribers - many to many", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(1, 64)
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.bounded<number>(64 * 2))
      const subscriber1 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(
              values,
              Chunk.concat(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      const subscriber2 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(
              values,
              Chunk.concat(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      yield* $(Deferred.await(deferred1))
      yield* $(Deferred.await(deferred2))
      const fiber = yield* $(pipe(
        values,
        Effect.forEach((n) => Hub.publish(hub, n)),
        Effect.fork
      ))
      yield* $(pipe(values, Chunk.map((n) => -n), Effect.forEach((n) => Hub.publish(hub, n)), Effect.fork))
      const result1 = yield* $(Fiber.join(subscriber1))
      const result2 = yield* $(Fiber.join(subscriber2))
      yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(pipe(result1, Chunk.filter((n) => n > 0)), values)
      assert.deepStrictEqual(pipe(result1, Chunk.filter((n) => n < 0)), pipe(values, Chunk.map((n) => -n)))
      assert.deepStrictEqual(pipe(result2, Chunk.filter((n) => n > 0)), values)
      assert.deepStrictEqual(pipe(result2, Chunk.filter((n) => n < 0)), pipe(values, Chunk.map((n) => -n)))
    }))
  it.effect("dropping concurrent publishers and subscribers - one to one", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(0, 64)
      const deferred = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.dropping<number>(64))
      const subscriber = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      yield* $(Deferred.await(deferred))
      yield* $(pipe(
        values,
        Effect.forEach((n) => Hub.publish(hub, n)),
        Effect.fork
      ))
      const result = yield* $(Fiber.join(subscriber))
      assert.deepStrictEqual(result, values)
    }))
  it.effect("dropping concurrent publishers and subscribers - one to many", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(0, 64)
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.dropping<number>(64))
      const subscriber1 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      const subscriber2 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      yield* $(Deferred.await(deferred1))
      yield* $(Deferred.await(deferred2))
      yield* $(pipe(
        values,
        Effect.forEach((n) => Hub.publish(hub, n)),
        Effect.fork
      ))
      const result1 = yield* $(Fiber.join(subscriber1))
      const result2 = yield* $(Fiber.join(subscriber2))
      assert.deepStrictEqual(result1, values)
      assert.deepStrictEqual(result2, values)
    }))
  it.effect("dropping concurrent publishers and subscribers - many to many", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(1, 64)
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.dropping<number>(64 * 2))
      const subscriber1 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(
              values,
              Chunk.concat(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      const subscriber2 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(
              values,
              Chunk.concat(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      yield* $(Deferred.await(deferred1))
      yield* $(Deferred.await(deferred2))
      const fiber = yield* $(pipe(
        values,
        Effect.forEach((n) => Hub.publish(hub, n)),
        Effect.fork
      ))
      yield* $(pipe(values, Chunk.map((n) => -n), Effect.forEach((n) => Hub.publish(hub, n)), Effect.fork))
      const result1 = yield* $(Fiber.join(subscriber1))
      const result2 = yield* $(Fiber.join(subscriber2))
      yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(pipe(result1, Chunk.filter((n) => n > 0)), values)
      assert.deepStrictEqual(pipe(result1, Chunk.filter((n) => n < 0)), pipe(values, Chunk.map((n) => -n)))
      assert.deepStrictEqual(pipe(result2, Chunk.filter((n) => n > 0)), values)
      assert.deepStrictEqual(pipe(result2, Chunk.filter((n) => n < 0)), pipe(values, Chunk.map((n) => -n)))
    }))
  it.effect("sliding concurrent publishers and subscribers - one to one", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(0, 64)
      const deferred = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.sliding<number>(64))
      const subscriber = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      yield* $(Deferred.await(deferred))
      yield* $(pipe(
        values,
        Effect.forEach((n) => Hub.publish(hub, n)),
        Effect.fork
      ))
      const result = yield* $(Fiber.join(subscriber))
      assert.deepStrictEqual(result, values)
    }))
  it.effect("sliding concurrent publishers and subscribers - one to many", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(0, 64)
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.sliding<number>(64))
      const subscriber1 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      const subscriber2 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      yield* $(Deferred.await(deferred1))
      yield* $(Deferred.await(deferred2))
      yield* $(pipe(
        values,
        Effect.forEach((n) => Hub.publish(hub, n)),
        Effect.fork
      ))
      const result1 = yield* $(Fiber.join(subscriber1))
      const result2 = yield* $(Fiber.join(subscriber2))
      assert.deepStrictEqual(result1, values)
      assert.deepStrictEqual(result2, values)
    }))
  it.effect("sliding concurrent publishers and subscribers - many to many", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(1, 64)
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.sliding<number>(64 * 2))
      const subscriber1 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(
              values,
              Chunk.concat(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      const subscriber2 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(
              values,
              Chunk.concat(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      yield* $(Deferred.await(deferred1))
      yield* $(Deferred.await(deferred2))
      const fiber = yield* $(pipe(
        values,
        Effect.forEach((n) => Hub.publish(hub, n)),
        Effect.fork
      ))
      yield* $(pipe(values, Chunk.map((n) => -n), Effect.forEach((n) => Hub.publish(hub, n)), Effect.fork))
      const result1 = yield* $(Fiber.join(subscriber1))
      const result2 = yield* $(Fiber.join(subscriber2))
      yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(pipe(result1, Chunk.filter((n) => n > 0)), values)
      assert.deepStrictEqual(pipe(result1, Chunk.filter((n) => n < 0)), pipe(values, Chunk.map((n) => -n)))
      assert.deepStrictEqual(pipe(result2, Chunk.filter((n) => n > 0)), values)
      assert.deepStrictEqual(pipe(result2, Chunk.filter((n) => n < 0)), pipe(values, Chunk.map((n) => -n)))
    }))
  it.effect("unbounded concurrent publishers and subscribers - one to one", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(0, 64)
      const deferred = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.unbounded<number>())
      const subscriber = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      yield* $(Deferred.await(deferred))
      yield* $(pipe(
        values,
        Effect.forEach((n) => Hub.publish(hub, n)),
        Effect.fork
      ))
      const result = yield* $(Fiber.join(subscriber))
      assert.deepStrictEqual(result, values)
    }))
  it.effect("unbounded concurrent publishers and subscribers - one to many", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(0, 64)
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.unbounded<number>())
      const subscriber1 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      const subscriber2 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(values, Effect.forEach((_) => Queue.take(subscription))))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      yield* $(Deferred.await(deferred1))
      yield* $(Deferred.await(deferred2))
      yield* $(pipe(
        values,
        Effect.forEach((n) => Hub.publish(hub, n)),
        Effect.fork
      ))
      const result1 = yield* $(Fiber.join(subscriber1))
      const result2 = yield* $(Fiber.join(subscriber2))
      assert.deepStrictEqual(result1, values)
      assert.deepStrictEqual(result2, values)
    }))
  it.effect("unbounded concurrent publishers and subscribers - many to many", () =>
    Effect.gen(function*($) {
      const values = Chunk.range(1, 64)
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const hub = yield* $(Hub.unbounded<number>())
      const subscriber1 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred1, void 0),
            Effect.zipRight(pipe(
              values,
              Chunk.concat(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      const subscriber2 = yield* $(pipe(
        Hub.subscribe(hub),
        Effect.flatMap((subscription) =>
          pipe(
            Deferred.succeed(deferred2, void 0),
            Effect.zipRight(pipe(
              values,
              Chunk.concat(values),
              Effect.forEach((_) => Queue.take(subscription))
            ))
          )
        ),
        Effect.scoped(),
        Effect.fork
      ))
      yield* $(Deferred.await(deferred1))
      yield* $(Deferred.await(deferred2))
      const fiber = yield* $(pipe(
        values,
        Effect.forEach((n) => Hub.publish(hub, n)),
        Effect.fork
      ))
      yield* $(pipe(values, Chunk.map((n) => -n), Effect.forEach((n) => Hub.publish(hub, n)), Effect.fork))
      const result1 = yield* $(Fiber.join(subscriber1))
      const result2 = yield* $(Fiber.join(subscriber2))
      yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(pipe(result1, Chunk.filter((n) => n > 0)), values)
      assert.deepStrictEqual(pipe(result1, Chunk.filter((n) => n < 0)), pipe(values, Chunk.map((n) => -n)))
      assert.deepStrictEqual(pipe(result2, Chunk.filter((n) => n > 0)), values)
      assert.deepStrictEqual(pipe(result2, Chunk.filter((n) => n < 0)), pipe(values, Chunk.map((n) => -n)))
    }))
})
