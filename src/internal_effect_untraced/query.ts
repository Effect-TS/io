import * as Debug from "@effect/data/Debug"
import * as Either from "@effect/data/Either"
import type * as Effect from "@effect/io/Effect"
import * as BlockedRequests from "@effect/io/internal_effect_untraced/blockedRequests"
import * as cache from "@effect/io/internal_effect_untraced/cache"
import * as core from "@effect/io/internal_effect_untraced/core"
import {
  currentRequestBatchingEnabled,
  currentRequestCache,
  currentRequestCacheEnabled
} from "@effect/io/internal_effect_untraced/fiberRuntime"
import type * as Request from "@effect/io/Request"
import * as RequestCache from "@effect/io/RequestCache"
import type * as RequestResolver from "@effect/io/RequestResolver"

/** @internal */
export const fromRequest = Debug.methodWithTrace((trace) =>
  <R, A extends Request.Request<any, any>, A2 extends A>(
    request: A,
    dataSource: RequestResolver.RequestResolver<R, A2>
  ): Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>> =>
    core.flatMap(
      core.zip(core.fiberRefGet(currentRequestCache), core.fiberRefGet(currentRequestCacheEnabled)),
      ([currentCache, currentCacheEnabled]) =>
        currentCacheEnabled
          ? core.flatMap(
            cache.lookup(currentCache, request),
            Either.match(
              (res) =>
                core.blocked(
                  BlockedRequests.single(dataSource, BlockedRequests.makeEntry(request, res)),
                  core.deferredAwait(res)
                ),
              (ref) =>
                core.blocked(
                  BlockedRequests.empty,
                  core.deferredAwait(ref)
                )
            )
          )
          : core.flatMap(
            core.deferredMake<Request.Request.Error<A>, Request.Request.Success<A>>(),
            (ref) =>
              core.blocked(
                BlockedRequests.single(dataSource, BlockedRequests.makeEntry(request, ref)),
                core.deferredAwait(ref)
              )
          )
    ).traced(trace)
)

/** @internal */
export const withRequestCache: {
  (
    strategy: "on" | "off" | "new" | RequestCache.RequestCache
  ): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    strategy: "on" | "off" | "new" | RequestCache.RequestCache
  ): Effect.Effect<R, E, A>
} = Debug.dualWithTrace<
  (
    strategy: "on" | "off" | "new" | RequestCache.RequestCache
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    strategy: "on" | "off" | "new" | RequestCache.RequestCache
  ) => Effect.Effect<R, E, A>
>(
  2,
  (trace) =>
    (self, strategy) =>
      core.fiberRefGetWith(currentRequestCacheEnabled, (enabled) => {
        switch (strategy) {
          case "off":
            return enabled ? core.fiberRefLocally(self, currentRequestCacheEnabled, false) : self
          case "on":
            return enabled ? self : core.fiberRefLocally(self, currentRequestCacheEnabled, true)
          case "new":
            return enabled ?
              core.fiberRefLocally(
                self,
                currentRequestCache,
                RequestCache.unsafeMake()
              ) :
              withRequestCache("on")(
                core.fiberRefLocally(
                  self,
                  currentRequestCache,
                  RequestCache.unsafeMake()
                )
              )
          default:
            return enabled ?
              core.fiberRefLocally(
                self,
                currentRequestCache,
                strategy
              ) :
              withRequestCache("on")(
                core.fiberRefLocally(
                  self,
                  currentRequestCache,
                  strategy
                )
              )
        }
      }).traced(trace)
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
