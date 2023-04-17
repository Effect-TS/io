/**
 * @since 1.0.0
 */

import type * as Context from "@effect/data/Context"
import type * as Either from "@effect/data/Either"
import type * as Equal from "@effect/data/Equal"
import type * as Effect from "@effect/io/Effect"
import type { FiberRef } from "@effect/io/FiberRef"
import * as core from "@effect/io/internal_effect_untraced/core"
import * as internal from "@effect/io/internal_effect_untraced/dataSource"
import type * as Request from "@effect/io/Request"
import type * as RequestCompletionMap from "@effect/io/RequestCompletionMap"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RequestResolverTypeId: unique symbol = core.RequestResolverTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type RequestResolverTypeId = typeof RequestResolverTypeId

/**
 * A `RequestResolver<R, A>` requires an environment `R` and is capable of executing
 * requests of type `A`.
 *
 * Data sources must implement the method `runAll` which takes a collection of
 * requests and returns an effect with a `RequestCompletionMap` containing a
 * mapping from requests to results. The type of the collection of requests is
 * a `Chunk<Chunk<A>>`. The outer `Chunk` represents batches of requests that
 * must be performed sequentially. The inner `Chunk` represents a batch of
 * requests that can be performed in parallel. This allows data sources to
 * introspect on all the requests being executed and optimize the query.
 *
 * Data sources will typically be parameterized on a subtype of `Request<A>`,
 * though that is not strictly necessarily as long as the data source can map
 * the request type to a `Request<A>`. Data sources can then pattern match on
 * the collection of requests to determine the information requested, execute
 * the query, and place the results into the `RequestCompletionMap` using
 * `RequestCompletionMap.empty` and `RequestCompletionMap.insert`. Data
 * sources must provide results for all requests received. Failure to do so
 * will cause a query to die with a `QueryFailure` when run.
 *
 * @since 1.0.0
 * @category models
 */
export interface RequestResolver<R, A> extends Equal.Equal {
  /**
   * Execute a collection of requests. The outer `Chunk` represents batches
   * of requests that must be performed sequentially. The inner `Chunk`
   * represents a batch of requests that can be performed in parallel.
   */
  runAll(requests: Array<Array<Request.Entry<A>>>): Effect.Effect<R, never, RequestCompletionMap.RequestCompletionMap>

  /**
   * Identify the data source using the specific identifier
   */
  identified(...identifiers: Array<unknown>): RequestResolver<R, A>
}

/**
 * @since 1.0.0
 */
export declare namespace RequestResolver {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<R, A> {
    readonly [RequestResolverTypeId]: {
      readonly _R: (_: never) => R
      readonly _A: (_: never) => A
    }
  }
}

/**
 * Returns `true` if the specified value is a `RequestResolver`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isRequestResolver: (u: unknown) => u is RequestResolver<unknown, unknown> = core.isRequestResolver

/**
 * Constructs a data source with the specified identifier and method to run
 * requests.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: <A extends Request.Request<any, any>>() => <R>(
  runAll: (requests: Array<Array<A>>) => Effect.Effect<R, never, void>
) => RequestResolver<Exclude<R, RequestCompletionMap.RequestCompletionMap>, A> = () => internal.make

/**
 * Constructs a data source with the specified identifier and method to run
 * requests.
 *
 * @since 1.0.0
 * @category constructors
 */
export const makeWithEntry: <A extends Request.Request<any, any>>() => <R>(
  runAll: (requests: Array<Array<Request.Entry<A>>>) => Effect.Effect<R, never, void>
) => RequestResolver<Exclude<R, RequestCompletionMap.RequestCompletionMap>, A> = () => internal.makeWithEntry

/**
 * Constructs a data source from a function taking a collection of requests
 * and returning a `RequestCompletionMap`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const makeBatched: <A extends Request.Request<any, any>>() => <R>(
  run: (requests: Array<A>) => Effect.Effect<R, never, void>
) => RequestResolver<Exclude<R, RequestCompletionMap.RequestCompletionMap>, A> = () => internal.makeBatched

/**
 * A data source aspect that executes requests between two effects, `before`
 * and `after`, where the result of `before` can be used by `after`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const around: {
  <R2, A2, R3, _>(
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ): <R, A>(self: RequestResolver<R, A>) => RequestResolver<R2 | R3 | R, A>
  <R, A, R2, A2, R3, _>(
    self: RequestResolver<R, A>,
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ): RequestResolver<R | R2 | R3, A>
} = internal.around

/**
 * Returns a data source that executes at most `n` requests in parallel.
 *
 * @since 1.0.0
 * @category combinators
 */
export const batchN: {
  (n: number): <R, A>(self: RequestResolver<R, A>) => RequestResolver<R, A>
  <R, A>(self: RequestResolver<R, A>, n: number): RequestResolver<R, A>
} = internal.batchN

/**
 * Provides this data source with part of its required context.
 *
 * @since 1.0.0
 * @category context
 */
export const contramapContext: {
  <R0, R>(
    f: (context: Context.Context<R0>) => Context.Context<R>
  ): <A extends Request.Request<any, any>>(self: RequestResolver<R, A>) => RequestResolver<R0, A>
  <R, A extends Request.Request<any, any>, R0>(
    self: RequestResolver<R, A>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ): RequestResolver<R0, A>
} = internal.contramapContext

/**
 * Returns a new data source that executes requests of type `C` using the
 * specified function to transform `C` requests into requests that either this
 * data source or that data source can execute.
 *
 * @since 1.0.0
 * @category combinators
 */
export const eitherWith: {
  <A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>, C extends Request.Request<any, any>>(
    that: RequestResolver<R2, B>,
    f: (_: C) => Either.Either<A, B>
  ): <R>(self: RequestResolver<R, A>) => RequestResolver<R2 | R, C>
  <
    R,
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    self: RequestResolver<R, A>,
    that: RequestResolver<R2, B>,
    f: (_: C) => Either.Either<A, B>
  ): RequestResolver<R | R2, C>
} = internal.eitherWith

/**
 * Constructs a data source from a pure function.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunction: <A extends Request.Request<never, any>>() => (
  f: (request: A) => Request.Request.Success<A>
) => RequestResolver<never, A> = () => internal.fromFunction

/**
 * Constructs a data source from a pure function that takes a list of requests
 * and returns a list of results of the same size. Each item in the result
 * list must correspond to the item at the same index in the request list.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunctionBatched: <A extends Request.Request<never, any>>() => (
  f: (chunk: Array<A>) => Array<Request.Request.Success<A>>
) => RequestResolver<never, A> = () => internal.fromFunctionBatched

/**
 * Constructs a data source from an effectual function.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunctionEffect: <A extends Request.Request<any, any>>() => <R>(
  f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
) => RequestResolver<R, A> = () => internal.fromFunctionEffect

/**
 * A data source that never executes requests.
 *
 * @since 1.0.0
 * @category constructors
 */
export const never: (_: void) => RequestResolver<never, never> = internal.never

/**
 * Provides this data source with its required context.
 *
 * @since 1.0.0
 * @category context
 */
export const provideContext: {
  <R>(
    context: Context.Context<R>
  ): <A extends Request.Request<any, any>>(self: RequestResolver<R, A>) => RequestResolver<never, A>
  <R, A extends Request.Request<any, any>>(
    self: RequestResolver<R, A>,
    context: Context.Context<R>
  ): RequestResolver<never, A>
} = internal.provideContext

/**
 * Returns a new data source that executes requests by sending them to this
 * data source and that data source, returning the results from the first data
 * source to complete and safely interrupting the loser.
 *
 * @since 1.0.0
 * @category combinators
 */
export const race: {
  <R2, A2 extends Request.Request<any, any>>(
    that: RequestResolver<R2, A2>
  ): <R, A extends Request.Request<any, any>>(
    self: RequestResolver<R, A>
  ) => RequestResolver<R2 | R, A2 | A>
  <R, A extends Request.Request<any, any>, R2, A2 extends Request.Request<any, any>>(
    self: RequestResolver<R, A>,
    that: RequestResolver<R2, A2>
  ): RequestResolver<R | R2, A | A2>
} = internal.race

/**
 * Returns a new data source with a localized FiberRef
 *
 * @since 1.0.0
 * @category combinators
 */
export const locally: {
  <A>(
    self: FiberRef<A>,
    value: A
  ): <R, B extends Request.Request<any, any>>(use: RequestResolver<R, B>) => RequestResolver<R, B>
  <R, B extends Request.Request<any, any>, A>(
    use: RequestResolver<R, B>,
    self: FiberRef<A>,
    value: A
  ): RequestResolver<R, B>
} = core.resolverLocally
