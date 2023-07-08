import { identity, pipe } from "@effect/data/Function"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as _schedule from "@effect/io/internal/schedule"
import * as scopedRef from "@effect/io/internal/scopedRef"
import type * as Resource from "@effect/io/Resource"
import type * as Schedule from "@effect/io/Schedule"
import type * as Scope from "@effect/io/Scope"

/** @internal */
const ResourceSymbolKey = "@effect/io/Resource"

/** @internal */
export const ResourceTypeId: Resource.ResourceTypeId = Symbol.for(
  ResourceSymbolKey
) as Resource.ResourceTypeId

/** @internal */
const cachedVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export const auto = <R, E, A, R2, Out>(
  acquire: Effect.Effect<R, E, A>,
  policy: Schedule.Schedule<R2, unknown, Out>
): Effect.Effect<R | R2 | Scope.Scope, never, Resource.Resource<E, A>> =>
  core.tap(manual(acquire), (manual) =>
    fiberRuntime.acquireRelease(
      pipe(
        refresh(manual),
        _schedule.schedule_Effect(policy),
        core.interruptible,
        fiberRuntime.forkDaemon
      ),
      core.interruptFiber
    ))

/** @internal */
export const manual = <R, E, A>(
  acquire: Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, never, Resource.Resource<E, A>> =>
  core.flatMap(core.context<R>(), (env) =>
    pipe(
      scopedRef.fromAcquire(core.exit(acquire)),
      core.map((ref) => ({
        [ResourceTypeId]: cachedVariance,
        scopedRef: ref,
        acquire: () => core.provideContext(acquire, env)
      }))
    ))

/** @internal */
export const get = <E, A>(self: Resource.Resource<E, A>): Effect.Effect<never, E, A> =>
  core.flatMap(scopedRef.get(self.scopedRef), identity)

/** @internal */
export const refresh = <E, A>(self: Resource.Resource<E, A>): Effect.Effect<never, E, void> =>
  scopedRef.set(
    self.scopedRef,
    core.map(self.acquire(), core.exitSucceed)
  )
