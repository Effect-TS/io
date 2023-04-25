import * as Debug from "@effect/data/Debug"
import { seconds } from "@effect/data/Duration"
import { globalValue } from "@effect/data/Global"
import type * as Cache from "@effect/io/Cache"
import type { Deferred } from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import * as BlockedRequests from "@effect/io/internal_effect_untraced/blockedRequests"
import { unsafeMakeWith } from "@effect/io/internal_effect_untraced/cache"
import { isInterruptedOnly } from "@effect/io/internal_effect_untraced/cause"
import * as core from "@effect/io/internal_effect_untraced/core"
import { currentRequestBatchingEnabled, ensuring } from "@effect/io/internal_effect_untraced/fiberRuntime"
import { Listeners } from "@effect/io/internal_effect_untraced/request"
import type * as Request from "@effect/io/Request"
import type * as RequestResolver from "@effect/io/RequestResolver"

type RequestCache = Cache.Cache<Request.Request<any, any>, never, {
  listeners: Request.Listeners
  handle: Deferred<any, any>
}>

/** @internal */
export const currentCache = core.fiberRefUnsafeMake<RequestCache>(unsafeMakeWith<Request.Request<any, any>, never, {
  listeners: Request.Listeners
  handle: Deferred<any, any>
}>(
  65536,
  () => core.map(core.deferredMake<any, any>(), (handle) => ({ listeners: new Listeners(), handle })),
  () => seconds(60)
))

/** @internal */
export const currentCacheEnabled = globalValue(
  Symbol.for("@effect/io/FiberRef/currentCacheEnabled"),
  () => core.fiberRefUnsafeMake(false)
)

/** @internal */
export const fromRequest = Debug.methodWithTrace((trace) =>
  <
    A extends Request.Request<any, any>,
    Ds extends
      | RequestResolver.RequestResolver<A, never>
      | Effect.Effect<any, any, RequestResolver.RequestResolver<A, never>>
  >(
    request: A,
    dataSource: Ds
  ): Effect.Effect<
    [Ds] extends [Effect.Effect<any, any, any>] ? Effect.Effect.Context<Ds> : never,
    Request.Request.Error<A>,
    Request.Request.Success<A>
  > => {
    // @ts-expect-error
    return core.flatMap(core.isEffect(dataSource) ? dataSource : core.succeed(dataSource), (ds) =>
      core.fiberIdWith((id) => {
        const proxy = new Proxy(request, {})
        return core.fiberRefGetWith(currentCacheEnabled, (cacheEnabled) => {
          if (cacheEnabled) {
            return core.fiberRefGetWith(currentCache, (cache) =>
              core.flatMap(cache.getEither(proxy), (orNew) => {
                switch (orNew._tag) {
                  case "Left": {
                    orNew.left.listeners.increment()
                    return core.flatMap(core.deferredPoll(orNew.left.handle), (o) => {
                      if (o._tag === "None") {
                        return core.blocked(
                          BlockedRequests.empty,
                          ensuring(
                            core.deferredAwait(orNew.left.handle),
                            core.sync(() =>
                              orNew.left.listeners.decrement()
                            )
                          )
                        )
                      } else {
                        return core.flatMap(core.exit(core.deferredAwait(orNew.left.handle)), (exit) => {
                          if (exit._tag === "Failure" && isInterruptedOnly(exit.cause)) {
                            orNew.left.listeners.decrement()
                            return core.flatMap(
                              cache.invalidateWhen(
                                proxy,
                                (entry) => entry.handle === orNew.left.handle
                              ),
                              () => fromRequest(proxy, dataSource)
                            )
                          }
                          return core.blocked(
                            BlockedRequests.empty,
                            ensuring(
                              core.deferredAwait(orNew.left.handle),
                              core.sync(() => orNew.left.listeners.decrement())
                            )
                          )
                        })
                      }
                    })
                  }
                  case "Right": {
                    orNew.right.listeners.increment()
                    return core.blocked(
                      BlockedRequests.single(
                        ds as any,
                        BlockedRequests.makeEntry(proxy, orNew.right.handle, orNew.right.listeners, id, {
                          completed: false
                        })
                      ),
                      core.uninterruptibleMask((restore) =>
                        core.flatMap(
                          core.exit(restore(core.deferredAwait(orNew.right.handle))),
                          (exit) => {
                            orNew.right.listeners.decrement()
                            return exit
                          }
                        )
                      )
                    )
                  }
                }
              }))
          }
          const listeners = new Listeners()
          listeners.increment()
          return core.flatMap(
            core.deferredMake<Request.Request.Error<A>, Request.Request.Success<A>>(),
            (ref) =>
              core.blocked(
                BlockedRequests.single(
                  ds as any,
                  BlockedRequests.makeEntry(proxy, ref, listeners, id, { completed: false })
                ),
                ensuring(
                  core.deferredAwait(ref),
                  core.sync(() => listeners.decrement())
                )
              )
          )
        })
      })).traced(trace)
  }
)

/** @internal */
export const cacheRequest = Debug.methodWithTrace((trace) =>
  <A extends Request.Request<any, any>>(
    request: A,
    result: Request.Request.Result<A>
  ): Effect.Effect<never, never, void> => {
    return core.fiberRefGetWith(currentCacheEnabled, (cacheEnabled) => {
      if (cacheEnabled) {
        return core.fiberRefGetWith(currentCache, (cache) =>
          core.flatMap(cache.getEither(request), (orNew) => {
            switch (orNew._tag) {
              case "Left": {
                return core.unit()
              }
              case "Right": {
                return core.deferredComplete(orNew.right.handle, result)
              }
            }
          }))
      }
      return core.unit()
    }).traced(trace)
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

/** @internal */
export const withRequestCaching: {
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
      core.fiberRefGetWith(currentCacheEnabled, (enabled) => {
        switch (strategy) {
          case "off":
            return enabled ? core.fiberRefLocally(self, currentCacheEnabled, false) : self
          case "on":
            return enabled ? self : core.fiberRefLocally(self, currentCacheEnabled, true)
        }
      }).traced(trace)
)

/** @internal */
export const withRequestCache: {
  (cache: Request.Cache): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    cache: Request.Cache
  ): Effect.Effect<R, E, A>
} = Debug.dualWithTrace<
  (
    cache: Request.Cache
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    cache: Request.Cache
  ) => Effect.Effect<R, E, A>
>(
  2,
  // @ts-expect-error
  (trace) => (self, cache) => core.fiberRefLocally(self, currentCache, cache).traced(trace)
)
