/**
 * @since 1.0.0
 */
import type * as Chunk from "@effect/data/Chunk"
import type * as Context from "@effect/data/Context"
import type * as HashMap from "@effect/data/HashMap"
import type * as List from "@effect/data/List"
import type * as Deferred from "@effect/io/Deferred"
import type { RuntimeFlagsPatch } from "@effect/io/Fiber/Runtime/Flags/Patch"
import type { FiberRef } from "@effect/io/FiberRef"
import * as _RequestBlock from "@effect/io/internal_effect_untraced/blockedRequests"
import * as core from "@effect/io/internal_effect_untraced/core"
import * as _dataSource from "@effect/io/internal_effect_untraced/dataSource"
import * as fiberRuntime from "@effect/io/internal_effect_untraced/fiberRuntime"
import type * as Request from "@effect/io/Request"
import type * as RequestResolver from "@effect/io/RequestResolver"

/**
 * `RequestBlock` captures a collection of blocked requests as a data
 * structure. By doing this the library is able to preserve information about
 * which requests must be performed sequentially and which can be performed in
 * parallel, allowing for maximum possible batching and pipelining while
 * preserving ordering guarantees.
 *
 * @since 1.0.0
 * @category models
 */
export type RequestBlock<R> = Empty | Par<R> | Seq<R> | Single<R>

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace RequestBlock {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Reducer<R, Z> {
    readonly emptyCase: () => Z
    readonly parCase: (left: Z, right: Z) => Z
    readonly singleCase: (
      dataSource: RequestResolver.RequestResolver<R, unknown>,
      blockedRequest: Entry<unknown>
    ) => Z
    readonly seqCase: (left: Z, right: Z) => Z
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Empty {
  readonly _tag: "Empty"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Par<R> {
  readonly _tag: "Par"
  readonly left: RequestBlock<R>
  readonly right: RequestBlock<R>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Seq<R> {
  readonly _tag: "Seq"
  readonly left: RequestBlock<R>
  readonly right: RequestBlock<R>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Single<R> {
  readonly _tag: "Single"
  readonly dataSource: RequestResolver.RequestResolver<R, unknown>
  readonly blockedRequest: Entry<unknown>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const single: <R, A>(
  dataSource: RequestResolver.RequestResolver<R, A>,
  blockedRequest: Entry<A>
) => RequestBlock<R> = _RequestBlock.single

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: RequestBlock<never> = _RequestBlock.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const flatten: <R>(
  self: RequestBlock<R>
) => List.List<SequentialCollection<R>> = _RequestBlock.flatten

/**
 * @since 1.0.0
 * @category constructors
 */
export const mapRequestResolvers: <R, A, R2>(
  self: RequestBlock<R>,
  f: (dataSource: RequestResolver.RequestResolver<R, A>) => RequestResolver.RequestResolver<R2, A>
) => RequestBlock<R | R2> = _RequestBlock.mapRequestResolvers

/**
 * @since 1.0.0
 * @category constructors
 */
export const parallel: <R, R2>(self: RequestBlock<R>, that: RequestBlock<R2>) => RequestBlock<R | R2> =
  _RequestBlock.par

/**
 * @since 1.0.0
 * @category constructors
 */
export const reduce: <R, Z>(self: RequestBlock<R>, reducer: RequestBlock.Reducer<R, Z>) => Z = _RequestBlock.reduce

/**
 * @since 1.0.0
 * @category constructors
 */
export const sequential: <R, R2>(self: RequestBlock<R>, that: RequestBlock<R2>) => RequestBlock<R | R2> =
  _RequestBlock.seq

/**
 * Provides each data source with part of its required environment.
 *
 * @since 1.0.0
 * @category utils
 */
export const contramapContext = <R0, R>(
  self: RequestBlock<R>,
  f: (context: Context.Context<R0>) => Context.Context<R>
): RequestBlock<R0> => reduce(self, ContramapContextReducer(f))

const ContramapContextReducer = <R0, R>(
  f: (context: Context.Context<R0>) => Context.Context<R>
): RequestBlock.Reducer<R, RequestBlock<R0>> => ({
  emptyCase: () => empty,
  parCase: (left, right) => parallel(left, right),
  seqCase: (left, right) => sequential(left, right),
  singleCase: (dataSource, blockedRequest) =>
    single(
      _dataSource.contramapContext(dataSource, f),
      blockedRequest
    )
})

/**
 * Provides each data source with a fiber ref value.
 *
 * @since 1.0.0
 * @category utils
 */
export const locally: <R, A>(self: RequestBlock<R>, ref: FiberRef<A>, value: A) => RequestBlock<R> =
  core.requestBlockLocally

/**
 * Provides each data source with a patch for runtime flags.
 *
 * @since 1.0.0
 * @category utils
 */
export const patchRuntimeFlags: <R>(
  self: RequestBlock<R>,
  patch: RuntimeFlagsPatch
) => RequestBlock<R> = core.requestBlockPatchRuntimeFlags

/**
 * Interrupts every request before execution.
 *
 * @since 1.0.0
 * @category utils
 */
export const interrupt: <R>(
  self: RequestBlock<R>
) => RequestBlock<R> = fiberRuntime.requestBlockInterrupt

/**
 * @since 1.0.0
 * @category symbols
 */
export const EntryTypeId = Symbol.for("@effect/io/RequestBlock.Entry")

/**
 * @since 1.0.0
 * @category symbols
 */
export type EntryTypeId = typeof EntryTypeId

/**
 * A `Entry<A>` keeps track of a request of type `A` along with a
 * `Ref` containing the result of the request, existentially hiding the result
 * type. This is used internally by the library to support data sources that
 * return different result types for different requests while guaranteeing that
 * results will be of the type requested.
 *
 * @since 1.0.0
 * @category models
 */
export interface Entry<R> extends Entry.Variance<R> {
  readonly request: Request.Request<
    [R] extends [Request.Request<infer _E, infer _A>] ? _E : never,
    [R] extends [Request.Request<infer _E, infer _A>] ? _A : never
  >
  readonly result: Deferred.Deferred<
    [R] extends [Request.Request<infer _E, infer _A>] ? _E : never,
    [R] extends [Request.Request<infer _E, infer _A>] ? _A : never
  >
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Entry {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<R> {
    readonly [EntryTypeId]: {
      readonly _R: (_: never) => R
    }
  }
}

class EntryImpl<A extends Request.Request<any, any>> implements Entry<A> {
  readonly [EntryTypeId] = blockedRequestVariance
  constructor(
    readonly request: A,
    readonly result: Deferred.Deferred<Request.Request.Error<A>, Request.Request.Success<A>>
  ) {}
}

const blockedRequestVariance = {
  _R: (_: never) => _
}

/**
 * @since 1.0.0
 * @category guards
 */
export const isEntry = (u: unknown): u is Entry<unknown> => {
  return typeof u === "object" && u != null && EntryTypeId in u
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeEntry = <A extends Request.Request<any, any>>(
  request: A,
  result: Deferred.Deferred<Request.Request.Error<A>, Request.Request.Success<A>>
): Entry<A> => new EntryImpl(request, result)

/**
 * @since 1.0.0
 * @category symbols
 */
export const RequestBlockParallelTypeId: unique symbol = _RequestBlock.RequestBlockParallelTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type RequestBlockParallelTypeId = typeof RequestBlockParallelTypeId

/**
 * A `Parallel<R>` maintains a mapping from data sources to requests from those
 * data sources that can be executed in parallel.
 *
 * @since 1.0.0
 * @category models
 */
export interface ParallelCollection<R> extends ParallelCollection.Variance<R> {
  readonly map: HashMap.HashMap<
    RequestResolver.RequestResolver<unknown, unknown>,
    Chunk.Chunk<Entry<unknown>>
  >
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace ParallelCollection {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<R> {
    readonly [RequestBlockParallelTypeId]: {
      readonly _R: (_: never) => R
    }
  }
}

/**
 * The empty collection of requests.
 *
 * @since 1.0.0
 * @category constructors
 */
export const parallelCollectionEmpty: <R>() => ParallelCollection<R> = _RequestBlock.parallelCollectionEmpty

/**
 * Constructs a new collection of requests containing a mapping from the
 * specified data source to the specified request.
 *
 * @since 1.0.0
 * @category constructors
 */
export const parallelCollectionMake: <R, A>(
  dataSource: RequestResolver.RequestResolver<R, A>,
  blockedRequest: Entry<A>
) => ParallelCollection<R> = _RequestBlock.parallelCollectionMake

/**
 * Combines this collection of requests that can be executed in parallel with
 * that collection of requests that can be executed in parallel to return a
 * new collection of requests that can be executed in parallel.
 *
 * @since 1.0.0
 * @category utils
 */
export const parallelCollectionCombine: <R, R2>(
  self: ParallelCollection<R>,
  that: ParallelCollection<R2>
) => ParallelCollection<R | R2> = _RequestBlock.parallelCollectionCombine

/**
 * Returns `true` if this collection of requests is empty, `false` otherwise.
 *
 * @since 1.0.0
 * @category utils
 */
export const parallelCollectionIsEmpty: <R>(self: ParallelCollection<R>) => boolean =
  _RequestBlock.parallelCollectionIsEmpty

/**
 * Returns a collection of the data sources that the requests in this
 * collection are from.
 *
 * @since 1.0.0
 * @category utils
 */
export const parallelCollectionKeys: <R>(
  self: ParallelCollection<R>
) => Chunk.Chunk<RequestResolver.RequestResolver<R, unknown>> = _RequestBlock.parallelCollectionKeys

/**
 * Converts this collection of requests that can be executed in parallel to a
 * batch of requests in a collection of requests that must be executed
 * sequentially.
 *
 * @since 1.0.0
 * @category conversions
 */
export const parallelCollectionToSequentialCollection: <R>(self: ParallelCollection<R>) => SequentialCollection<R> =
  _RequestBlock.parallelCollectionToSequentialCollection

/**
 * Converts this collection of requests that can be executed in parallel to an
 * `Iterable` containing mappings from data sources to requests from those
 * data sources.
 *
 * @since 1.0.0
 * @category conversions
 */
export const parallelCollectionToChunk: <R>(
  self: ParallelCollection<R>
) => Chunk.Chunk<readonly [RequestResolver.RequestResolver<R, unknown>, Chunk.Chunk<Entry<unknown>>]> =
  _RequestBlock.parallelCollectionToChunk

/**
 * @since 1.0.0
 * @category symbols
 */
export const SequentialCollectionTypeId: unique symbol = _RequestBlock.SequentialCollectionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type SequentialCollectionTypeId = typeof SequentialCollectionTypeId

/**
 * A `Sequential<R>` maintains a mapping from data sources to batches of
 * requests from those data sources that must be executed sequentially.
 *
 * @since 1.0.0
 * @category models
 */
export interface SequentialCollection<R> extends SequentialCollection.Variance<R> {
  readonly map: HashMap.HashMap<
    RequestResolver.RequestResolver<unknown, unknown>,
    Chunk.Chunk<Chunk.Chunk<Entry<unknown>>>
  >
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace SequentialCollection {
  /** @internal */
  export interface Variance<R> {
    readonly [SequentialCollectionTypeId]: {
      readonly _R: (_: never) => R
    }
  }
}

/**
 * Constructs a new mapping from data sources to batches of requests from those
 * data sources that must be executed sequentially.
 *
 * @since 1.0.0
 * @category constructors
 */
export const sequentialCollectionMake: <R, A>(
  map: HashMap.HashMap<RequestResolver.RequestResolver<R, A>, Chunk.Chunk<Chunk.Chunk<Entry<A>>>>
) => SequentialCollection<R> = _RequestBlock.sequentialCollectionMake

/**
 * Combines this collection of batches of requests that must be executed
 * sequentially with that collection of batches of requests that must be
 * executed sequentially to return a new collection of batches of requests
 * that must be executed sequentially.
 *
 * @since 1.0.0
 * @category utils
 */
export const sequentialCollectionCombine: <R, R2>(
  self: SequentialCollection<R>,
  that: SequentialCollection<R2>
) => SequentialCollection<R | R2> = _RequestBlock.sequentialCollectionCombine

/**
 * Returns whether this collection of batches of requests is empty.
 *
 * @since 1.0.0
 * @category utils
 */
export const sequentialCollectionIsEmpty: <R>(self: SequentialCollection<R>) => boolean =
  _RequestBlock.sequentialCollectionIsEmpty

/**
 * Returns a collection of the data sources that the batches of requests in
 * this collection are from.
 *
 * @since 1.0.0
 * @category utils
 */
export const sequentialCollectionKeys: <R>(
  self: SequentialCollection<R>
) => Chunk.Chunk<RequestResolver.RequestResolver<R, unknown>> = _RequestBlock.sequentialCollectionKeys

/**
 * Converts this collection of batches requests that must be executed
 * sequentially to an `Iterable` containing mappings from data sources to
 * batches of requests from those data sources.
 *
 * @since 1.0.0
 * @category conversions
 */
export const sequentialCollectionToChunk: <R>(
  self: SequentialCollection<R>
) => Chunk.Chunk<readonly [RequestResolver.RequestResolver<R, unknown>, Chunk.Chunk<Chunk.Chunk<Entry<unknown>>>]> =
  _RequestBlock.sequentialCollectionToChunk
