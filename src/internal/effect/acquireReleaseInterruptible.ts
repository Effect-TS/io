import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import * as core from "@effect/io/internal/core"
import * as ensuring from "@effect/io/internal/effect/ensuring"
import type * as Scope from "@effect/io/Scope"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
export const acquireReleaseInterruptible = <R, E, A, R2, X>(
  acquire: Effect.Effect<R, E, A>,
  release: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
): Effect.Effect<R | R2 | Scope.Scope, E, A> => {
  const trace = getCallTrace()
  return pipe(acquire, ensuring.ensuring(core.addFinalizer(release))).traced(trace)
}
