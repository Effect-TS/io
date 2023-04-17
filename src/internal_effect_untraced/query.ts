import * as Debug from "@effect/data/Debug"
import * as Option from "@effect/data/Option"
import type * as Cache from "@effect/io/Cache"
import type { Deferred } from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import * as BlockedRequests from "@effect/io/internal_effect_untraced/blockedRequests"
import { isInterruptedOnly } from "@effect/io/internal_effect_untraced/cause"
import * as core from "@effect/io/internal_effect_untraced/core"
import { ensuring } from "@effect/io/internal_effect_untraced/effect/circular"
import { currentRequestBatchingEnabled } from "@effect/io/internal_effect_untraced/fiberRuntime"
import { Listeners } from "@effect/io/internal_effect_untraced/request"
import type * as Request from "@effect/io/Request"
import type * as RequestResolver from "@effect/io/RequestResolver"

type RequestCache = Cache.Cache<unknown, never, {
  listeners: Request.Listeners
  handle: Deferred<any, any>
}>

/** @internal */
export const fromRequest = Debug.methodWithTrace((trace) =>
  <R, A extends Request.Request<any, any>, A2 extends A>(
    request: A,
    dataSource: RequestResolver.RequestResolver<R, A2>,
    cacheOrGet?:
      | RequestCache
      | Effect.Effect<any, any, RequestCache>
      | Effect.Effect<any, any, Option.Option<RequestCache>>
  ): Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>> => {
    return core.fiberIdWith((id) => {
      if (cacheOrGet) {
        return core.flatMap(
          (core.isEffect(cacheOrGet) ? cacheOrGet : core.succeed(cacheOrGet)) as Effect.Effect<
            any,
            any,
            Option.Option<RequestCache> | RequestCache
          >,
          (cacheOrOption) => {
            const optionalCache = Option.isOption(cacheOrOption) ? cacheOrOption : Option.some(cacheOrOption)
            if (Option.isNone(optionalCache)) {
              const listeners = new Listeners()
              listeners.increment()
              return core.flatMap(
                core.deferredMake<Request.Request.Error<A>, Request.Request.Success<A>>(),
                (ref) =>
                  core.blocked(
                    BlockedRequests.single(dataSource, BlockedRequests.makeEntry(request, ref, listeners, id)),
                    ensuring(core.deferredAwait(ref), core.sync(() => listeners.decrement()))
                  )
              )
            }
            return core.flatMap(optionalCache.value.getEither(request), (orNew) => {
              switch (orNew._tag) {
                case "Left": {
                  orNew.left.listeners.increment()
                  return core.flatMap(core.deferredPoll(orNew.left.handle), (o) => {
                    if (o._tag === "None") {
                      return core.blocked(
                        BlockedRequests.empty,
                        ensuring(
                          core.deferredAwait(orNew.left.handle),
                          core.sync(() => orNew.left.listeners.decrement())
                        )
                      )
                    } else {
                      return core.flatMap(core.exit(core.deferredAwait(orNew.left.handle)), (exit) => {
                        if (exit._tag === "Failure" && isInterruptedOnly(exit.cause)) {
                          orNew.left.listeners.decrement()
                          return core.flatMap(
                            optionalCache.value.invalidateWhen(request, (entry) => entry.handle === orNew.left.handle),
                            () => fromRequest(request, dataSource, cacheOrGet)
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
                      dataSource,
                      BlockedRequests.makeEntry(request, orNew.right.handle, orNew.right.listeners, id)
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
            })
          }
        )
      }
      const listeners = new Listeners()
      listeners.increment()
      return core.flatMap(
        core.deferredMake<Request.Request.Error<A>, Request.Request.Success<A>>(),
        (ref) =>
          core.blocked(
            BlockedRequests.single(dataSource, BlockedRequests.makeEntry(request, ref, listeners, id)),
            ensuring(
              core.deferredAwait(ref),
              core.sync(() => listeners.decrement())
            )
          )
      )
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
