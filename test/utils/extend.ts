import * as Effect from "@effect/io/Effect"
import * as TestEnvironment from "@effect/io/internal/testing/testEnvironment"
import * as Schedule from "@effect/io/Schedule"
import type * as Scope from "@effect/io/Scope"
import * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"
import type { TestAPI } from "vitest"
import * as V from "vitest"

export type API = TestAPI<{}>

export const it: API = V.it

export const effect = (() => {
  const f = <E, A>(
    name: string,
    self: () => Effect.Effect<TestEnvironment.TestEnvironment, E, A>,
    timeout = 5_000
  ) => {
    return it(
      name,
      () =>
        pipe(
          Effect.suspendSucceed(self),
          Effect.provideLayer(TestEnvironment.TestEnvironment),
          Effect.unsafeRunPromise
        ),
      timeout
    )
  }
  return Object.assign(f, {
    skip: <E, A>(
      name: string,
      self: () => Effect.Effect<TestEnvironment.TestEnvironment, E, A>,
      timeout = 5_000
    ) => {
      return it.skip(
        name,
        () =>
          pipe(
            Effect.suspendSucceed(self),
            Effect.provideLayer(TestEnvironment.TestEnvironment),
            Effect.unsafeRunPromise
          ),
        timeout
      )
    },
    only: <E, A>(
      name: string,
      self: () => Effect.Effect<TestEnvironment.TestEnvironment, E, A>,
      timeout = 5_000
    ) => {
      return it.only(
        name,
        () =>
          pipe(
            Effect.suspendSucceed(self),
            Effect.provideLayer(TestEnvironment.TestEnvironment),
            Effect.unsafeRunPromise
          ),
        timeout
      )
    }
  })
})()

export const live = <E, A>(
  name: string,
  self: () => Effect.Effect<never, E, A>,
  timeout = 5_000
) => {
  return it(
    name,
    () =>
      pipe(
        Effect.suspendSucceed(self),
        Effect.unsafeRunPromise
      ),
    timeout
  )
}

export const flakyTest = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  timeout: Duration.Duration = Duration.seconds(30)
) => {
  return pipe(
    Effect.resurrect(self),
    Effect.retry(
      pipe(
        Schedule.recurs(10),
        Schedule.compose(Schedule.elapsed()),
        Schedule.whileOutput(Duration.lessThanOrEqualTo(timeout))
      )
    ),
    Effect.orDie
  )
}

export const scoped = <E, A>(
  name: string,
  self: () => Effect.Effect<Scope.Scope | TestEnvironment.TestEnvironment, E, A>,
  timeout = 5_000
) => {
  return it(
    name,
    () =>
      pipe(
        Effect.suspendSucceed(self),
        Effect.scoped,
        Effect.provideLayer(TestEnvironment.TestEnvironment),
        Effect.unsafeRunPromise
      ),
    timeout
  )
}

export const scopedLive = <E, A>(
  name: string,
  self: () => Effect.Effect<Scope.Scope, E, A>,
  timeout = 5_000
) => {
  return it(
    name,
    () =>
      pipe(
        Effect.suspendSucceed(self),
        Effect.scoped,
        Effect.unsafeRunPromise
      ),
    timeout
  )
}
