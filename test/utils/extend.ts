import * as Effect from "@effect/io/Effect"
import type * as Scope from "@effect/io/Scope"
import { pipe } from "@fp-ts/data/Function"
import type { TestAPI } from "vitest"
import * as V from "vitest"

export type API = TestAPI<{}>

export const it: API = V.it

export const effect = <E, A>(name: string, self: () => Effect.Effect<never, E, A>, timeout = 5_000) => {
  return it(
    name,
    () => pipe(Effect.suspendSucceed(self), Effect.unsafeRunPromise),
    timeout
  )
}

export const scoped = <E, A>(name: string, self: () => Effect.Effect<Scope.Scope, E, A>, timeout = 5_000) => {
  return it(
    name,
    () => pipe(Effect.suspendSucceed(self), Effect.scoped, Effect.unsafeRunPromise),
    timeout
  )
}
