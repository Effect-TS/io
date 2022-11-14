import type * as Cached from "@effect/io/Cached"
import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import * as core from "@effect/io/internal/core"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as _schedule from "@effect/io/internal/schedule"
import * as scopedRef from "@effect/io/internal/scopedRef"
import type * as Schedule from "@effect/io/Schedule"
import type * as Scope from "@effect/io/Scope"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
const CachedSymbolKey = "@effect/io/Cached"

/** @internal */
export const CachedTypeId: Cached.CachedTypeId = Symbol.for(
  CachedSymbolKey
) as Cached.CachedTypeId

/** @internal */
const cachedVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export function auto<R, E, A, R2, In, Out>(
  acquire: Effect.Effect<R, E, A>,
  policy: Schedule.Schedule<R2, In, Out>
): Effect.Effect<R | R2 | Scope.Scope, never, Cached.Cached<E, A>> {
  const trace = getCallTrace()
  return pipe(
    manual(acquire),
    core.tap((manual) =>
      fiberRuntime.acquireRelease(
        pipe(refresh(manual), _schedule.schedule_Effect(policy), core.interruptible, fiberRuntime.forkDaemon),
        core.interruptFiber
      )
    )
  ).traced(trace)
}

/** @internal */
export const manual = <R, E, A>(
  acquire: Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, never, Cached.Cached<E, A>> => {
  const trace = getCallTrace()
  return pipe(
    core.environment<R>(),
    core.flatMap((env) =>
      pipe(
        scopedRef.fromAcquire(core.exit(acquire)),
        core.map((ref) => ({
          [CachedTypeId]: cachedVariance,
          scopedRef: ref,
          acquire: () => {
            const trace = getCallTrace()
            return pipe(acquire, core.provideEnvironment(env)).traced(trace)
          }
        }))
      )
    )
  ).traced(trace)
}

/** @internal */
export const get = <E, A>(self: Cached.Cached<E, A>): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  return pipe(
    scopedRef.get(self.scopedRef),
    core.flatMap(core.done)
  ).traced(trace)
}

export const refresh = <E, A>(self: Cached.Cached<E, A>): Effect.Effect<never, E, void> => {
  const trace = getCallTrace()
  return pipe(
    self.scopedRef,
    scopedRef.set<never, E, Exit.Exit<E, A>>(pipe(self.acquire(), core.map(core.exitSucceed)))
  ).traced(trace)
}
