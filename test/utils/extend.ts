import * as Duration from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import { fiberFailure } from "@effect/io/internal_effect_untraced/runtime"
import * as TestEnvironment from "@effect/io/internal_effect_untraced/testing/testEnvironment"
import type * as TestServices from "@effect/io/internal_effect_untraced/testing/testServices"
import * as Schedule from "@effect/io/Schedule"
import type * as Scope from "@effect/io/Scope"
import type { TestAPI } from "vitest"
import * as V from "vitest"

export type API = TestAPI<{}>

export const it: API = V.it

export const runTest = <E, A>(self: Effect.Effect<never, E, A>): Promise<A> =>
  Effect.runPromiseExit(Effect.withReportUnhandled(self, false)).then((exit) => {
    if (exit._tag === "Failure") {
      return Promise.reject(fiberFailure(exit.cause))
    }
    return Promise.resolve(exit.value)
  })

export const effect = (() => {
  const f = <E, A>(
    name: string,
    self: () => Effect.Effect<TestServices.TestServices, E, A>,
    timeout = 5_000
  ) => {
    return it(
      name,
      () =>
        pipe(
          Effect.suspend(self),
          Effect.provideLayer(TestEnvironment.testContext()),
          runTest
        ),
      timeout
    )
  }
  return Object.assign(f, {
    skip: <E, A>(
      name: string,
      self: () => Effect.Effect<TestServices.TestServices, E, A>,
      timeout = 5_000
    ) => {
      return it.skip(
        name,
        () =>
          pipe(
            Effect.suspend(self),
            Effect.provideLayer(TestEnvironment.testContext()),
            runTest
          ),
        timeout
      )
    },
    only: <E, A>(
      name: string,
      self: () => Effect.Effect<TestServices.TestServices, E, A>,
      timeout = 5_000
    ) => {
      return it.only(
        name,
        () =>
          pipe(
            Effect.suspend(self),
            Effect.provideLayer(TestEnvironment.testContext()),
            runTest
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
        Effect.suspend(self),
        runTest
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
  self: () => Effect.Effect<Scope.Scope | TestServices.TestServices, E, A>,
  timeout = 5_000
) => {
  return it(
    name,
    () =>
      pipe(
        Effect.suspend(self),
        Effect.scoped,
        Effect.provideLayer(TestEnvironment.testContext()),
        runTest
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
        Effect.suspend(self),
        Effect.scoped,
        runTest
      ),
    timeout
  )
}
