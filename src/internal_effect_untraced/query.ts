import * as Debug from "@effect/data/Debug"
import type * as Cache from "@effect/io/Cache"
import type { Deferred } from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import * as BlockedRequests from "@effect/io/internal_effect_untraced/blockedRequests"
import * as core from "@effect/io/internal_effect_untraced/core"
import { currentRequestBatchingEnabled } from "@effect/io/internal_effect_untraced/fiberRuntime"
import type * as Request from "@effect/io/Request"
import type * as RequestResolver from "@effect/io/RequestResolver"

type RequestCache = Cache.Cache<unknown, never, Deferred<any, any>>

/** @internal */
export const fromRequest = Debug.methodWithTrace((trace) =>
  <R, A extends Request.Request<any, any>, A2 extends A>(
    request: A,
    dataSource: RequestResolver.RequestResolver<R, A2>,
    cacheOrGet?: RequestCache | Effect.Effect<any, any, RequestCache>
  ): Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>> => {
    if (cacheOrGet) {
      return core.flatMap(
        core.isEffect(cacheOrGet) ? cacheOrGet : core.succeed(cacheOrGet),
        (cache) =>
          core.flatMap(cache.getEither(request), (orNew) => {
            switch (orNew._tag) {
              case "Left": {
                return core.blocked(
                  BlockedRequests.empty,
                  core.deferredAwait(orNew.left)
                )
              }
              case "Right": {
                return core.blocked(
                  BlockedRequests.single(dataSource, BlockedRequests.makeEntry(request, orNew.right)),
                  core.deferredAwait(orNew.right)
                )
              }
            }
          })
      )
    }

    return core.flatMap(
      core.deferredMake<Request.Request.Error<A>, Request.Request.Success<A>>(),
      (ref) =>
        core.blocked(
          BlockedRequests.single(dataSource, BlockedRequests.makeEntry(request, ref)),
          core.deferredAwait(ref)
        )
    ).traced(trace)
  }
)

/** @internal */
export const withRequestBatching: {
  (strategy: "on" | "off"): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    strategy: "on" | "off"
  ): Effect.Effect<R, E, A>
} = Debug.dualWithTrace<
  (
    strategy: "on" | "off"
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    strategy: "on" | "off"
  ) => Effect.Effect<R, E, A>
>(
  2,
  (trace) =>
    (self, strategy) =>
      core.fiberRefGetWith(currentRequestBatchingEnabled, (enabled) => {
        switch (strategy) {
          case "off":
            return enabled ? core.fiberRefLocally(self, currentRequestBatchingEnabled, false) : self
          case "on":
            return enabled ? self : core.fiberRefLocally(self, currentRequestBatchingEnabled, true)
        }
      }).traced(trace)
)
