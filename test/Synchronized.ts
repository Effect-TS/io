import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as Synchronized from "@effect/io/Ref/Synchronized"
import * as it from "@effect/io/test/utils/extend"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import { assert, describe } from "vitest"

const current = "value"
const update = "new value"
const failure = "failure"

type State = Active | Changed | Closed

interface Active {
  readonly _tag: "Active"
}

interface Changed {
  readonly _tag: "Changed"
}

interface Closed {
  readonly _tag: "Closed"
}

export const Active: State = { _tag: "Active" }
export const Changed: State = { _tag: "Changed" }
export const Closed: State = { _tag: "Closed" }

const isActive = (self: State): boolean => self._tag === "Active"
const isChanged = (self: State): boolean => self._tag === "Changed"
const isClosed = (self: State): boolean => self._tag === "Closed"

describe.concurrent("SynchronizedRef", () => {
  it.effect("get", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(Synchronized.make(current), Effect.flatMap(Synchronized.get)))
      assert.strictEqual(result, current)
    }))
  it.effect("getAndUpdateEffect - happy path", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Synchronized.make(current))
      const result1 = yield* $(pipe(ref, Synchronized.getAndUpdateEffect(() => Effect.succeed(update))))
      const result2 = yield* $(Synchronized.get(ref))
      assert.strictEqual(result1, current)
      assert.strictEqual(result2, update)
    }))
  it.effect("getAndUpdateEffect - with failure", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Synchronized.make(current))
      const result = yield* $(pipe(ref, Synchronized.getAndUpdateEffect((_) => Effect.fail(failure)), Effect.exit))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(failure))
    }))
  it.effect("getAndUpdateSomeEffect - happy path", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Synchronized.make<State>(Active))
      const result1 = yield* $(pipe(
        ref,
        Synchronized.getAndUpdateSomeEffect((state) =>
          isClosed(state) ?
            Option.some(Effect.succeed(Changed)) :
            Option.none
        )
      ))
      const result2 = yield* $(Synchronized.get(ref))
      assert.deepStrictEqual(result1, Active)
      assert.deepStrictEqual(result2, Active)
    }))
  it.effect("getAndUpdateSomeEffect - twice", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Synchronized.make<State>(Active))
      const result1 = yield* $(pipe(
        ref,
        Synchronized.getAndUpdateSomeEffect((state) =>
          isActive(state) ?
            Option.some(Effect.succeed(Changed)) :
            Option.none
        )
      ))
      const result2 = yield* $(pipe(
        ref,
        Synchronized.getAndUpdateSomeEffect((state) =>
          isClosed(state)
            ? Option.some(Effect.succeed(Active))
            : isChanged(state)
            ? Option.some(Effect.succeed(Closed))
            : Option.none
        )
      ))
      const result3 = yield* $(Synchronized.get(ref))
      assert.deepStrictEqual(result1, Active)
      assert.deepStrictEqual(result2, Changed)
      assert.deepStrictEqual(result3, Closed)
    }))
  it.effect("getAndUpdateSomeEffect - with failure", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Synchronized.make<State>(Active))
      const result = yield* $(pipe(
        ref,
        Synchronized.getAndUpdateSomeEffect((state) =>
          isActive(state) ?
            Option.some(Effect.fail(failure)) :
            Option.none
        ),
        Effect.exit
      ))
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(failure))
    }))
  it.effect("getAndUpdateSomeEffect - interrupt parent fiber and update", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, Synchronized.Synchronized<State>>())
      const latch = yield* $(Deferred.make<never, void>())
      const makeAndWait = pipe(
        deferred,
        Deferred.complete(Synchronized.make<State>(Active)),
        Effect.zipRight(Deferred.await(latch))
      )
      const fiber = yield* $(Effect.fork(makeAndWait))
      const ref = yield* $(Deferred.await(deferred))
      yield* $(Fiber.interrupt(fiber))
      const result = yield* $(pipe(ref, Synchronized.updateAndGetEffect((_) => Effect.succeed(Closed))))
      assert.deepStrictEqual(result, Closed)
    }))
})
