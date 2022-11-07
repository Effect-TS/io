import * as Clock from "@effect/io/Clock"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as FiberRef from "@effect/io/FiberRef"
import * as it from "@effect/io/test/extend"
import * as Duration from "@fp-ts/data/Duration"
import { constant, identity, pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

const initial = "initial"
const update = "update"
const update1 = "update1"
const update2 = "update2"
const increment = (n: number): number => n + 1
const loseTimeAndCpu: Effect.Effect<never, never, void> = pipe(
  Effect.yieldNow(),
  Effect.zipLeft(Clock.sleep(Duration.millis(1))),
  Effect.repeatN(100)
)

describe.concurrent("FiberRef", () => {
  it.scoped("get returns the current value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, initial)
    }))

  it.scoped("get returns the correct value for a child", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const fiber = yield* Effect.fork(FiberRef.get(fiberRef))
      const result = yield* Fiber.join(fiber)
      assert.strictEqual(result, initial)
    }))

  it.scoped("getAndUpdate - changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* pipe(fiberRef, FiberRef.getAndUpdate(() => update))
      const value2 = yield* FiberRef.get(fiberRef)
      assert.strictEqual(value1, initial)
      assert.strictEqual(value2, update)
    }))

  it.scoped("getAndUpdateSome - changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* pipe(fiberRef, FiberRef.getAndUpdateSome(() => Option.some(update)))
      const value2 = yield* FiberRef.get(fiberRef)
      assert.strictEqual(value1, initial)
      assert.strictEqual(value2, update)
    }))

  it.scoped("getAndUpdateSome - not changing value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* pipe(fiberRef, FiberRef.getAndUpdateSome<string>(() => Option.none))
      const value2 = yield* FiberRef.get(fiberRef)
      assert.strictEqual(value1, initial)
      assert.strictEqual(value2, initial)
    }))

  it.scoped("set updates the current value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      yield* pipe(fiberRef, FiberRef.set(update))
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, update)
    }))

  it.scoped("set by a child doesn't update parent's value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const deferred = yield* Deferred.make<never, void>()
      yield* pipe(
        fiberRef,
        FiberRef.set(update),
        Effect.zipRight(pipe(deferred, Deferred.succeed<void>(void 0))),
        Effect.fork
      )
      yield* Deferred.await(deferred)
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, initial)
    }))

  it.scoped("modify - changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* pipe(fiberRef, FiberRef.modify((): [number, string] => [1, update]))
      const value2 = yield* FiberRef.get(fiberRef)
      assert.strictEqual(value1, 1)
      assert.strictEqual(value2, update)
    }))

  it.scoped("modifySome - not changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* pipe(fiberRef, FiberRef.modifySome(2, () => Option.none))
      const value2 = yield* FiberRef.get(fiberRef)
      assert.strictEqual(value1, 2)
      assert.strictEqual(value2, initial)
    }))

  it.scoped("updateAndGet - changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* pipe(fiberRef, FiberRef.updateAndGet(() => update))
      const value2 = yield* FiberRef.get(fiberRef)
      assert.strictEqual(value1, update)
      assert.strictEqual(value2, update)
    }))

  it.scoped("updateSomeAndGet - changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* pipe(fiberRef, FiberRef.updateSomeAndGet(() => Option.some(update)))
      const value2 = yield* FiberRef.get(fiberRef)
      assert.strictEqual(value1, update)
      assert.strictEqual(value2, update)
    }))

  it.scoped("updateSomeAndGet - not changing the value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const value1 = yield* pipe(fiberRef, FiberRef.updateSomeAndGet<string>(() => Option.none))
      const value2 = yield* FiberRef.get(fiberRef)
      assert.strictEqual(value1, initial)
      assert.strictEqual(value2, initial)
    }))

  it.scoped("restores the original value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      yield* pipe(fiberRef, FiberRef.set(update))
      yield* FiberRef.delete(fiberRef)
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, initial)
    }))

  it.scoped("locally - restores original value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const local = yield* pipe(FiberRef.locally(update)(fiberRef))(FiberRef.get(fiberRef))
      const value = yield* FiberRef.get(fiberRef)
      assert.strictEqual(local, update)
      assert.strictEqual(value, initial)
    }))

  it.scoped("locally - restores parent's value", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const child = yield* pipe(FiberRef.locally(update)(fiberRef))(pipe(FiberRef.get(fiberRef), Effect.fork))
      const local = yield* Fiber.join(child)
      const value = yield* FiberRef.get(fiberRef)
      assert.strictEqual(local, update)
      assert.strictEqual(value, initial)
    }))

  it.scoped("locally - restores undefined value", () =>
    Effect.gen(function*() {
      const child = yield* Effect.fork(FiberRef.make(initial))
      // Don't use join as it inherits values from child
      const fiberRef = yield* pipe(Fiber.await(child), Effect.flatMap((exit) => Effect.done(exit)))
      const localValue = yield* pipe(fiberRef, FiberRef.locally(update))(FiberRef.get(fiberRef))
      const value = yield* FiberRef.get(fiberRef)
      assert.strictEqual(localValue, update)
      assert.strictEqual(value, initial)
    }))

  it.scoped("initial value is inherited on join", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const child = yield* pipe(fiberRef, FiberRef.set(update), Effect.fork)
      yield* Fiber.join(child)
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, update)
    }))

  it.scoped("initial value is always available", () =>
    Effect.gen(function*() {
      const child = yield* Effect.fork(FiberRef.make(initial))
      const fiberRef = yield* pipe(Fiber.await(child), Effect.flatMap((exit) => Effect.done(exit)))
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, initial)
    }))

  it.scoped("fork function is applied on fork - 1", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(0, increment)
      const child = yield* Effect.fork(Effect.unit())
      yield* Fiber.join(child)
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, 1)
    }))

  it.scoped("fork function is applied on fork - 2", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(0, increment)
      const child = yield* pipe(Effect.unit(), Effect.fork, Effect.flatMap(Fiber.join), Effect.fork)
      yield* Fiber.join(child)
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, 2)
    }))

  it.scoped("join function is applied on join - 1", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(0, identity, Math.max)
      const child = yield* pipe(fiberRef, FiberRef.update(increment), Effect.fork)
      yield* Fiber.join(child)
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, 1)
    }))

  it.scoped("join function is applied on join - 2", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(0, identity, Math.max)
      const child = yield* pipe(fiberRef, FiberRef.update(increment), Effect.fork)
      yield* pipe(fiberRef, FiberRef.update((n) => n + 2))
      yield* Fiber.join(child)
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, 2)
    }))

  it.scoped("the value of the loser is inherited in zipPar", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const latch = yield* Deferred.make<never, void>()
      const winner = pipe(fiberRef, FiberRef.set(update1), Effect.zipRight(pipe(latch, Deferred.succeed<void>(void 0))))
      const loser = pipe(
        Deferred.await(latch),
        Effect.zipRight(Clock.sleep(Duration.millis(1))),
        Effect.zipRight(pipe(fiberRef, FiberRef.set(update2)))
      )
      yield* pipe(winner, Effect.zipPar(loser))
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, update2)
    }))

  it.scoped("nothing gets inherited with a failure in zipPar", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const success = pipe(fiberRef, FiberRef.set(update))
      const failure1 = pipe(fiberRef, FiberRef.set(update), Effect.zipRight(Effect.fail(":-(")))
      const failure2 = pipe(fiberRef, FiberRef.set(update), Effect.zipRight(Effect.fail(":-O")))
      yield* pipe(
        success,
        Effect.zipPar(pipe(failure1, Effect.zipPar(failure2))),
        Effect.orElse(Effect.unit)
      )
      const result = yield* FiberRef.get(fiberRef)
      assert.isTrue(result.includes(initial))
    }))

  it.scoped("the value of all fibers in inherited when running many effects with collectAllPar", () =>
    Effect.gen(function*() {
      const n = 10_000
      const fiberRef = yield* FiberRef.make(0, constant(0), (a, b) => a + b)
      yield* Effect.collectAllPar(Array.from({ length: n }, () => pipe(fiberRef, FiberRef.update((n) => n + 1))))
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, n)
    }))

  it.scoped("its value is inherited after simple race", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      yield* pipe(fiberRef, FiberRef.set(update1), Effect.race(pipe(fiberRef, FiberRef.set(update2))))
      const result = yield* FiberRef.get(fiberRef)
      assert.isTrue(new RegExp(`${update1}|${update2}`).test(result))
    }))

  it.scoped("its value is inherited after a race with a bad winner", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const latch = yield* Deferred.make<never, void>()
      const badWinner = pipe(
        fiberRef,
        FiberRef.set(update1),
        Effect.zipRight(pipe(
          Effect.fail("ups"),
          Effect.ensuring(pipe(latch, Deferred.succeed<void>(void 0)))
        ))
      )
      const goodLoser = pipe(
        fiberRef,
        FiberRef.set(update2),
        Effect.zipRight(Deferred.await(latch)),
        Effect.zipRight(Effect.sleep(Duration.seconds(1)))
      )
      yield* pipe(badWinner, Effect.race(goodLoser))
      const result = yield* FiberRef.get(fiberRef)
      assert.equal(result, update2)
    }))

  it.scoped("its value is not inherited after a race of losers", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const loser1 = pipe(fiberRef, FiberRef.set(update1), Effect.zipRight(Effect.fail("ups1")))
      const loser2 = pipe(fiberRef, FiberRef.set(update2), Effect.zipRight(Effect.fail("ups2")))
      yield* pipe(loser1, Effect.race(loser2), Effect.ignore)
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, initial)
    }))

  it.scoped("its value is inherited in a trivial race", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      yield* pipe(fiberRef, FiberRef.set(update), Effect.raceAll<never, never, void>([]))
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, update)
    }))

  it.scoped("the value of the winner is inherited when racing two effects with raceAll", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const latch = yield* Deferred.make<never, void>()
      const winner1 = pipe(
        fiberRef,
        FiberRef.set(update1),
        Effect.zipRight(pipe(latch, Deferred.succeed<void>(void 0)))
      )
      const loser1 = pipe(
        Deferred.await(latch),
        Effect.zipRight(pipe(fiberRef, FiberRef.set(update2))),
        Effect.zipRight(loseTimeAndCpu)
      )
      yield* pipe(loser1, Effect.raceAll([winner1]))
      const value1 = yield* pipe(FiberRef.get(fiberRef), Effect.zipLeft(pipe(fiberRef, FiberRef.set(initial))))
      const winner2 = pipe(fiberRef, FiberRef.set(update1))
      const loser2 = pipe(fiberRef, FiberRef.set(update2), Effect.zipRight(Effect.fail(":-O")))
      yield* pipe(loser2, Effect.raceAll([winner2]))
      const value2 = yield* pipe(FiberRef.get(fiberRef), Effect.zipLeft(pipe(fiberRef, FiberRef.set(initial))))
      assert.strictEqual(value1, update1)
      assert.strictEqual(value2, update1)
    }))

  it.scoped("the value of the winner is inherited when racing many effects with raceAll", () =>
    Effect.gen(function*() {
      const n = 63
      const fiberRef = yield* FiberRef.make(initial)
      const latch = yield* Deferred.make<never, void>()
      const winner1 = pipe(
        fiberRef,
        FiberRef.set(update1),
        Effect.zipRight(pipe(latch, Deferred.succeed<void>(void 0)))
      )
      const losers1 = pipe(
        Deferred.await(latch),
        Effect.zipRight(pipe(fiberRef, FiberRef.set(update2))),
        Effect.zipRight(loseTimeAndCpu),
        Effect.replicate(n)
      )
      yield* pipe(winner1, Effect.raceAll(losers1))
      const value1 = yield* pipe(
        FiberRef.get(fiberRef),
        Effect.zipLeft(pipe(fiberRef, FiberRef.set(initial)))
      )
      const winner2 = pipe(fiberRef, FiberRef.set(update1))
      const losers2 = pipe(
        fiberRef,
        FiberRef.set(update1),
        Effect.zipRight(Effect.fail(":-O")),
        Effect.replicate(n)
      )
      yield* pipe(winner2, Effect.raceAll(losers2))
      const value2 = yield* pipe(
        FiberRef.get(fiberRef),
        Effect.zipLeft(pipe(fiberRef, FiberRef.set(initial)))
      )
      assert.strictEqual(value1, update1)
      assert.strictEqual(value2, update1)
    }))

  it.scoped("nothing gets inherited when racing failures with raceAll", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(initial)
      const loser = pipe(
        fiberRef,
        FiberRef.set(update),
        Effect.zipRight(Effect.fail("darn"))
      )
      yield* pipe(
        loser,
        Effect.raceAll(Array.from({ length: 63 }, () => loser)),
        Effect.orElse(Effect.unit)
      )
      const result = yield* FiberRef.get(fiberRef)
      assert.strictEqual(result, initial)
    }))
})
