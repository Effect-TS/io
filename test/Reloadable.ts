import * as Context from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Reloadable from "@effect/io/Reloadable"
import * as Counter from "@effect/io/test/utils/counter"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

const DummyServiceTypeId = Symbol.for("@effect/io/test/Reloadable/DummyService")
type DummyServiceTypeId = typeof DummyServiceTypeId

interface DummyService {
  readonly [DummyServiceTypeId]: DummyServiceTypeId
}

const DummyService: DummyService = {
  [DummyServiceTypeId]: DummyServiceTypeId
}

const Tag = Context.Tag<DummyService>()

describe.concurrent("Reloadable", () => {
  it.effect("initialization", () =>
    Effect.gen(function*($) {
      const counter = yield* $(Counter.make())
      const layer = Reloadable.manual(Tag, Layer.scoped(Tag, pipe(counter.acquire(), Effect.as(DummyService))))
      yield* $(pipe(Reloadable.get(Tag), Effect.provideLayer(layer)))
      const acquired = yield* $(counter.acquired())
      assert.strictEqual(acquired, 1)
    }))
  it.effect("reload", () =>
    Effect.gen(function*($) {
      const counter = yield* $(Counter.make())
      const layer = Reloadable.manual(Tag, Layer.scoped(Tag, pipe(counter.acquire(), Effect.as(DummyService))))
      yield* $(pipe(Reloadable.reload(Tag), Effect.provideLayer(layer)))
      const acquired = yield* $(counter.acquired())
      assert.strictEqual(acquired, 2)
    }))
})
