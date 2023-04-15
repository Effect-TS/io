/**
 * @since 1.0.0
 */
import type * as Context from "@effect/data/Context"
import type * as HashMap from "@effect/data/HashMap"
import type * as HashSet from "@effect/data/HashSet"
import type * as MutableRef from "@effect/data/MutableRef"
import type * as Option from "@effect/data/Option"
import type * as Exit from "@effect/io/Exit"
import * as internal from "@effect/io/internal_effect_untraced/completedRequestMap"
import type * as Request from "@effect/io/Request"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RequestCompletionMapTypeId: unique symbol = internal.RequestCompletionMapTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type RequestCompletionMapTypeId = typeof RequestCompletionMapTypeId

/**
 * A `RequestCompletionMap` is a universally quantified mapping from requests of
 * type `Request<E, A>` to results of type `Either<E, A>` for all types `E` and
 * `A`. The guarantee is that for any request of type `Request<E, A>`, if there
 * is a corresponding value in the map, that value is of type `Either<E, A>`.
 * This is used by the library to support data sources that return different
 * result types for different requests while guaranteeing that results will be
 * of the type requested.
 *
 * @since 1.0.0
 * @category models
 */
export interface RequestCompletionMap extends RequestCompletionMap.Proto {
  /** @internal */
  readonly map: MutableRef.MutableRef<
    HashMap.HashMap<
      Request.Request<unknown, unknown>,
      Exit.Exit<unknown, unknown>
    >
  >
}

/**
 * The context tag for a `RequestCompletionMap`.
 *
 * @since 1.0.0
 * @category context
 */
export const RequestCompletionMap: Context.Tag<RequestCompletionMap, RequestCompletionMap> =
  internal.RequestCompletionMap

/**
 * @since 1.0.0
 */
export declare namespace RequestCompletionMap {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [RequestCompletionMapTypeId]: RequestCompletionMapTypeId
  }
}

/**
 * An empty completed requests map.
 *
 * @since 1.0.0
 * @category constructors
 */
export const empty: () => RequestCompletionMap = internal.empty

/**
 * Constructs a new completed requests map with the specified request and
 * result.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: <E, A>(request: Request.Request<E, A>, result: Exit.Exit<E, A>) => RequestCompletionMap =
  internal.make

/**
 * Combines two completed request maps into a single completed request map.
 *
 * @since 1.0.0
 * @category combinators
 */
export const combine: {
  (that: RequestCompletionMap): (self: RequestCompletionMap) => RequestCompletionMap
  (self: RequestCompletionMap, that: RequestCompletionMap): RequestCompletionMap
} = internal.combine

/**
 * Retrieves the result of the specified request if it exists.
 *
 * @since 1.0.0
 * @category elements
 */
export const get: {
  <A extends Request.Request<any, any>>(
    request: A
  ): (self: RequestCompletionMap) => Option.Option<Request.Request.Result<A>>
  <A extends Request.Request<any, any>>(
    self: RequestCompletionMap,
    request: A
  ): Option.Option<Request.Request.Result<A>>
} = internal.get

/**
 * Retrieves the result of the specified request if it exists or throws if it doesn't.
 *
 * @since 1.0.0
 * @category elements
 */
export const getOrThrow: {
  <A extends Request.Request<any, any>>(request: A): (self: RequestCompletionMap) => Request.Request.Result<A>
  <A extends Request.Request<any, any>>(self: RequestCompletionMap, request: A): Request.Request.Result<A>
} = internal.getOrThrow

/**
 * Returns whether a result exists for the specified request.
 *
 * @since 1.0.0
 * @category elements
 */
export const has: {
  <A extends Request.Request<any, any>>(request: A): (self: RequestCompletionMap) => boolean
  <A extends Request.Request<any, any>>(self: RequestCompletionMap, request: A): boolean
} = internal.has

/**
 * Collects all requests in a set.
 *
 * @since 1.0.0
 * @category elements
 */
export const requests: (self: RequestCompletionMap) => HashSet.HashSet<Request.Request<unknown, unknown>> =
  internal.requests

/**
 * Appends the specified result to the completed requests map.
 *
 * @since 1.0.0
 * @category combinators
 */
export const set: {
  <A extends Request.Request<any, any>>(
    request: A,
    result: Request.Request.Result<A>
  ): (self: RequestCompletionMap) => void
  <A extends Request.Request<any, any>>(self: RequestCompletionMap, request: A, result: Request.Request.Result<A>): void
} = internal.set

/**
 * Appends the specified optional result to the completed request map.
 *
 * @since 1.0.0
 * @category combinators
 */
export const setOption: {
  <A extends Request.Request<any, any>>(
    request: A,
    result: Request.Request.OptionalResult<A>
  ): (self: RequestCompletionMap) => void
  <A extends Request.Request<any, any>>(
    self: RequestCompletionMap,
    request: A,
    result: Request.Request.OptionalResult<A>
  ): void
} = internal.setOption
