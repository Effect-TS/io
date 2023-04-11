/**
 * @since 1.0.0
 */
import type * as Either from "@effect/data/Either"
import type * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal_effect_untraced/cache"
import type * as Request from "@effect/io/Request"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RequestCacheTypeId: unique symbol = internal.CacheTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type RequestCacheTypeId = typeof RequestCacheTypeId

/**
 * A `Cache` maintains an internal state with a mapping from requests to `Ref`s
 * that will contain the result of those requests when they are executed. This
 * is used internally by the library to provide deduplication and caching of
 * requests.
 *
 * @since 1.0.0
 * @category models
 */
export interface RequestCache extends RequestCache.Proto {
  /**
   * Looks up a request in the cache, failing with the unit value if the request
   * is not in the cache, succeeding with `Ref(None)` if the request is in the
   * cache but has not been executed yet, or `Ref(Some(value))` if the request
   * has been executed.
   */
  get<E, A>(request: Request.Request<E, A>): Effect.Effect<never, void, Deferred.Deferred<E, A>>

  /**
   * Looks up a request in the cache. If the request is not in the cache returns
   * a `Left` with a `Ref` that can be set with a `Some` to complete the
   * request. If the request is in the cache returns a `Right` with a `Ref` that
   * either contains `Some` with a result if the request has been executed or
   * `None` if the request has not been executed yet.
   */
  lookup<E, A>(
    request: Request.Request<E, A>
  ): Effect.Effect<
    never,
    never,
    Either.Either<
      Deferred.Deferred<E, A>,
      Deferred.Deferred<E, A>
    >
  >

  /**
   * Inserts a request and a `Ref` that will contain the result of the request
   * when it is executed into the cache.
   */
  set<E, A>(
    request: Request.Request<E, A>,
    result: Deferred.Deferred<E, A>
  ): Effect.Effect<never, never, void>

  /**
   * Removes a request from the cache.
   */
  remove<E, A>(request: Request.Request<E, A>): Effect.Effect<never, never, void>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace RequestCache {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [RequestCacheTypeId]: RequestCacheTypeId
  }
}

/**
 * Constructs an empty cache.
 *
 * @since 1.0.0
 * @category constructors
 */
export const empty: () => Effect.Effect<never, never, RequestCache> = internal.empty

/**
 * Looks up a request in the cache, failing with the unit value if the request
 * is not in the cache, succeeding with `Ref(None)` if the request is in the
 * cache but has not been executed yet, or `Ref(Some(value))` if the request
 * has been executed.
 *
 * @since 1.0.0
 * @category elements
 */
export const get: {
  <E, A>(
    request: Request.Request<E, A>
  ): (self: RequestCache) => Effect.Effect<never, void, Deferred.Deferred<E, A>>
  <E, A>(
    self: RequestCache,
    request: Request.Request<E, A>
  ): Effect.Effect<never, void, Deferred.Deferred<E, A>>
} = internal.get

/**
 * Looks up a request in the cache. If the request is not in the cache returns
 * a `Left` with a `Ref` that can be set with a `Some` to complete the
 * request. If the request is in the cache returns a `Right` with a `Ref` that
 * either contains `Some` with a result if the request has been executed or
 * `None` if the request has not been executed yet.
 *
 * @since 1.0.0
 * @category elements
 */
export const lookup: {
  <E, A>(
    request: Request.Request<E, A>
  ): (
    self: RequestCache
  ) => Effect.Effect<
    never,
    never,
    Either.Either<Deferred.Deferred<E, A>, Deferred.Deferred<E, A>>
  >
  <E, A>(
    self: RequestCache,
    request: Request.Request<E, A>
  ): Effect.Effect<
    never,
    never,
    Either.Either<Deferred.Deferred<E, A>, Deferred.Deferred<E, A>>
  >
} = internal.lookup

/**
 * Inserts a request and a `Ref` that will contain the result of the request
 * when it is executed into the cache.
 *
 * @since 1.0.0
 * @category mutations
 */
export const set: {
  <E, A>(
    request: Request.Request<E, A>,
    result: Deferred.Deferred<E, A>
  ): (self: RequestCache) => Effect.Effect<never, never, void>
  <E, A>(
    self: RequestCache,
    request: Request.Request<E, A>,
    result: Deferred.Deferred<E, A>
  ): Effect.Effect<never, never, void>
} = internal.set

/**
 * Removes a request from the cache.
 *
 * @since 1.0.0
 * @category mutations
 */
export const remove: {
  <E, A>(request: Request.Request<E, A>): (self: RequestCache) => Effect.Effect<never, never, void>
  <E, A>(self: RequestCache, request: Request.Request<E, A>): Effect.Effect<never, never, void>
} = internal.remove

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMake: () => RequestCache = internal.unsafeMake
