import * as Effect from "@effect/io/Effect"
import * as it from "@effect/io/test/utils/extend"
import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"
import { assert, describe } from "vitest"

interface NumberService {
  readonly n: number
}

const NumberService = Context.Tag<NumberService>()

describe.concurrent("Effect", () => {
  it.effect("environment - provide is modular", () =>
    pipe(
      Effect.gen(function*($) {
        const v1 = yield* $(Effect.service(NumberService))
        const v2 = yield* $(
          pipe(
            Effect.service(NumberService),
            Effect.provideEnvironment(pipe(Context.empty(), Context.add(NumberService)({ n: 2 })))
          )
        )
        const v3 = yield* $(Effect.service(NumberService))
        assert.strictEqual(v1.n, 4)
        assert.strictEqual(v2.n, 2)
        assert.strictEqual(v3.n, 4)
      }),
      Effect.provideEnvironment(pipe(Context.empty(), Context.add(NumberService)({ n: 4 })))
    ))
  it.effect("environment - async can use environment", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Effect.async<NumberService, never, number>((cb) =>
          cb(pipe(
            Effect.service(NumberService),
            Effect.map(({ n }) => n)
          ))
        ),
        Effect.provideEnvironment(pipe(Context.empty(), Context.add(NumberService)({ n: 10 })))
      ))
      assert.strictEqual(result, 10)
    }))
  it.effect("serviceWith - effectfully accesses a service in the environment", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Effect.serviceWithEffect(NumberService)(({ n }) => Effect.succeed(n + 3)),
        Effect.provideEnvironment(pipe(Context.empty(), Context.add(NumberService)({ n: 0 })))
      ))
      assert.strictEqual(result, 3)
    }))
  it.effect("updateService - updates a service in the environment", () =>
    pipe(
      Effect.gen(function*($) {
        const a = yield* $(
          pipe(Effect.service(NumberService), Effect.updateService(NumberService)(({ n }) => ({ n: n + 1 })))
        )
        const b = yield* $(Effect.service(NumberService))
        assert.strictEqual(a.n, 1)
        assert.strictEqual(b.n, 0)
      }),
      Effect.provideEnvironment(pipe(Context.empty(), Context.add(NumberService)({ n: 0 })))
    ))
})
