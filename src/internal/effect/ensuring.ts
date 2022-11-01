import * as Cause from "@effect/io/Cause"
import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
export const ensuring = <R1, X>(finalizer: Effect.Effect<R1, never, X>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E, A> =>
    core.uninterruptibleMask((restore) =>
      pipe(
        restore(self),
        core.foldCauseEffect(
          (cause1) =>
            pipe(
              finalizer,
              core.foldCauseEffect(
                (cause2) => core.failCause(Cause.sequential(cause1, cause2)),
                () => core.failCause(cause1)
              )
            ),
          (a) => pipe(finalizer, core.as(a))
        )
      )
    ).traced(trace)
}
