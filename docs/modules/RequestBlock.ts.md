---
title: RequestBlock.ts
nav_order: 46
parent: Modules
---

## RequestBlock overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [flatten](#flatten)
  - [makeEntry](#makeentry)
  - [mapRequestResolvers](#maprequestresolvers)
  - [parallel](#parallel)
  - [parallelCollectionEmpty](#parallelcollectionempty)
  - [parallelCollectionMake](#parallelcollectionmake)
  - [reduce](#reduce)
  - [sequential](#sequential)
  - [sequentialCollectionMake](#sequentialcollectionmake)
  - [single](#single)
- [conversions](#conversions)
  - [parallelCollectionToChunk](#parallelcollectiontochunk)
  - [parallelCollectionToSequentialCollection](#parallelcollectiontosequentialcollection)
  - [sequentialCollectionToChunk](#sequentialcollectiontochunk)
- [guards](#guards)
  - [isEntry](#isentry)
- [models](#models)
  - [Empty (interface)](#empty-interface)
  - [Entry (interface)](#entry-interface)
  - [Par (interface)](#par-interface)
  - [ParallelCollection (interface)](#parallelcollection-interface)
  - [RequestBlock (type alias)](#requestblock-type-alias)
  - [Seq (interface)](#seq-interface)
  - [SequentialCollection (interface)](#sequentialcollection-interface)
  - [Single (interface)](#single-interface)
- [symbols](#symbols)
  - [EntryTypeId](#entrytypeid)
  - [EntryTypeId (type alias)](#entrytypeid-type-alias)
  - [RequestBlockParallelTypeId](#requestblockparalleltypeid)
  - [RequestBlockParallelTypeId (type alias)](#requestblockparalleltypeid-type-alias)
  - [SequentialCollectionTypeId](#sequentialcollectiontypeid)
  - [SequentialCollectionTypeId (type alias)](#sequentialcollectiontypeid-type-alias)
- [utils](#utils)
  - [contramapContext](#contramapcontext)
  - [interrupt](#interrupt)
  - [locally](#locally)
  - [parallelCollectionCombine](#parallelcollectioncombine)
  - [parallelCollectionIsEmpty](#parallelcollectionisempty)
  - [parallelCollectionKeys](#parallelcollectionkeys)
  - [patchRuntimeFlags](#patchruntimeflags)
  - [sequentialCollectionCombine](#sequentialcollectioncombine)
  - [sequentialCollectionIsEmpty](#sequentialcollectionisempty)
  - [sequentialCollectionKeys](#sequentialcollectionkeys)

---

# constructors

## empty

**Signature**

```ts
export declare const empty: RequestBlock<never>
```

Added in v1.0.0

## flatten

**Signature**

```ts
export declare const flatten: <R>(self: RequestBlock<R>) => List.List<SequentialCollection<R>>
```

Added in v1.0.0

## makeEntry

**Signature**

```ts
export declare const makeEntry: <A extends Request.Request<any, any>>(
  request: A,
  result: Deferred.Deferred<Request.Request.Error<A>, Request.Request.Success<A>>
) => Entry<A>
```

Added in v1.0.0

## mapRequestResolvers

**Signature**

```ts
export declare const mapRequestResolvers: <R, A, R2>(
  self: RequestBlock<R>,
  f: (dataSource: RequestResolver.RequestResolver<R, A>) => RequestResolver.RequestResolver<R2, A>
) => RequestBlock<R | R2>
```

Added in v1.0.0

## parallel

**Signature**

```ts
export declare const parallel: <R, R2>(self: RequestBlock<R>, that: RequestBlock<R2>) => RequestBlock<R | R2>
```

Added in v1.0.0

## parallelCollectionEmpty

The empty collection of requests.

**Signature**

```ts
export declare const parallelCollectionEmpty: <R>() => ParallelCollection<R>
```

Added in v1.0.0

## parallelCollectionMake

Constructs a new collection of requests containing a mapping from the
specified data source to the specified request.

**Signature**

```ts
export declare const parallelCollectionMake: <R, A>(
  dataSource: RequestResolver.RequestResolver<R, A>,
  blockedRequest: Entry<A>
) => ParallelCollection<R>
```

Added in v1.0.0

## reduce

**Signature**

```ts
export declare const reduce: <R, Z>(self: RequestBlock<R>, reducer: RequestBlock.Reducer<R, Z>) => Z
```

Added in v1.0.0

## sequential

**Signature**

```ts
export declare const sequential: <R, R2>(self: RequestBlock<R>, that: RequestBlock<R2>) => RequestBlock<R | R2>
```

Added in v1.0.0

## sequentialCollectionMake

Constructs a new mapping from data sources to batches of requests from those
data sources that must be executed sequentially.

**Signature**

```ts
export declare const sequentialCollectionMake: <R, A>(
  map: HashMap.HashMap<RequestResolver.RequestResolver<R, A>, Chunk.Chunk<Chunk.Chunk<Entry<A>>>>
) => SequentialCollection<R>
```

Added in v1.0.0

## single

**Signature**

```ts
export declare const single: <R, A>(
  dataSource: RequestResolver.RequestResolver<R, A>,
  blockedRequest: Entry<A>
) => RequestBlock<R>
```

Added in v1.0.0

# conversions

## parallelCollectionToChunk

Converts this collection of requests that can be executed in parallel to an
`Iterable` containing mappings from data sources to requests from those
data sources.

**Signature**

```ts
export declare const parallelCollectionToChunk: <R>(
  self: ParallelCollection<R>
) => Chunk.Chunk<readonly [RequestResolver.RequestResolver<R, unknown>, Chunk.Chunk<Entry<unknown>>]>
```

Added in v1.0.0

## parallelCollectionToSequentialCollection

Converts this collection of requests that can be executed in parallel to a
batch of requests in a collection of requests that must be executed
sequentially.

**Signature**

```ts
export declare const parallelCollectionToSequentialCollection: <R>(
  self: ParallelCollection<R>
) => SequentialCollection<R>
```

Added in v1.0.0

## sequentialCollectionToChunk

Converts this collection of batches requests that must be executed
sequentially to an `Iterable` containing mappings from data sources to
batches of requests from those data sources.

**Signature**

```ts
export declare const sequentialCollectionToChunk: <R>(
  self: SequentialCollection<R>
) => Chunk.Chunk<readonly [RequestResolver.RequestResolver<R, unknown>, Chunk.Chunk<Chunk.Chunk<Entry<unknown>>>]>
```

Added in v1.0.0

# guards

## isEntry

**Signature**

```ts
export declare const isEntry: (u: unknown) => u is Entry<unknown>
```

Added in v1.0.0

# models

## Empty (interface)

**Signature**

```ts
export interface Empty {
  readonly _tag: 'Empty'
}
```

Added in v1.0.0

## Entry (interface)

A `Entry<A>` keeps track of a request of type `A` along with a
`Ref` containing the result of the request, existentially hiding the result
type. This is used internally by the library to support data sources that
return different result types for different requests while guaranteeing that
results will be of the type requested.

**Signature**

```ts
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
```

Added in v1.0.0

## Par (interface)

**Signature**

```ts
export interface Par<R> {
  readonly _tag: 'Par'
  readonly left: RequestBlock<R>
  readonly right: RequestBlock<R>
}
```

Added in v1.0.0

## ParallelCollection (interface)

A `Parallel<R>` maintains a mapping from data sources to requests from those
data sources that can be executed in parallel.

**Signature**

```ts
export interface ParallelCollection<R> extends ParallelCollection.Variance<R> {
  readonly map: HashMap.HashMap<RequestResolver.RequestResolver<unknown, unknown>, Chunk.Chunk<Entry<unknown>>>
}
```

Added in v1.0.0

## RequestBlock (type alias)

`RequestBlock` captures a collection of blocked requests as a data
structure. By doing this the library is able to preserve information about
which requests must be performed sequentially and which can be performed in
parallel, allowing for maximum possible batching and pipelining while
preserving ordering guarantees.

**Signature**

```ts
export type RequestBlock<R> = Empty | Par<R> | Seq<R> | Single<R>
```

Added in v1.0.0

## Seq (interface)

**Signature**

```ts
export interface Seq<R> {
  readonly _tag: 'Seq'
  readonly left: RequestBlock<R>
  readonly right: RequestBlock<R>
}
```

Added in v1.0.0

## SequentialCollection (interface)

A `Sequential<R>` maintains a mapping from data sources to batches of
requests from those data sources that must be executed sequentially.

**Signature**

```ts
export interface SequentialCollection<R> extends SequentialCollection.Variance<R> {
  readonly map: HashMap.HashMap<
    RequestResolver.RequestResolver<unknown, unknown>,
    Chunk.Chunk<Chunk.Chunk<Entry<unknown>>>
  >
}
```

Added in v1.0.0

## Single (interface)

**Signature**

```ts
export interface Single<R> {
  readonly _tag: 'Single'
  readonly dataSource: RequestResolver.RequestResolver<R, unknown>
  readonly blockedRequest: Entry<unknown>
}
```

Added in v1.0.0

# symbols

## EntryTypeId

**Signature**

```ts
export declare const EntryTypeId: typeof EntryTypeId
```

Added in v1.0.0

## EntryTypeId (type alias)

**Signature**

```ts
export type EntryTypeId = typeof EntryTypeId
```

Added in v1.0.0

## RequestBlockParallelTypeId

**Signature**

```ts
export declare const RequestBlockParallelTypeId: typeof RequestBlockParallelTypeId
```

Added in v1.0.0

## RequestBlockParallelTypeId (type alias)

**Signature**

```ts
export type RequestBlockParallelTypeId = typeof RequestBlockParallelTypeId
```

Added in v1.0.0

## SequentialCollectionTypeId

**Signature**

```ts
export declare const SequentialCollectionTypeId: typeof SequentialCollectionTypeId
```

Added in v1.0.0

## SequentialCollectionTypeId (type alias)

**Signature**

```ts
export type SequentialCollectionTypeId = typeof SequentialCollectionTypeId
```

Added in v1.0.0

# utils

## contramapContext

Provides each data source with part of its required environment.

**Signature**

```ts
export declare const contramapContext: <R0, R>(
  self: RequestBlock<R>,
  f: (context: Context.Context<R0>) => Context.Context<R>
) => RequestBlock<R0>
```

Added in v1.0.0

## interrupt

Interrupts every request before execution.

**Signature**

```ts
export declare const interrupt: <R>(self: RequestBlock<R>) => RequestBlock<R>
```

Added in v1.0.0

## locally

Provides each data source with a fiber ref value.

**Signature**

```ts
export declare const locally: <R, A>(self: RequestBlock<R>, ref: FiberRef<A>, value: A) => RequestBlock<R>
```

Added in v1.0.0

## parallelCollectionCombine

Combines this collection of requests that can be executed in parallel with
that collection of requests that can be executed in parallel to return a
new collection of requests that can be executed in parallel.

**Signature**

```ts
export declare const parallelCollectionCombine: <R, R2>(
  self: ParallelCollection<R>,
  that: ParallelCollection<R2>
) => ParallelCollection<R | R2>
```

Added in v1.0.0

## parallelCollectionIsEmpty

Returns `true` if this collection of requests is empty, `false` otherwise.

**Signature**

```ts
export declare const parallelCollectionIsEmpty: <R>(self: ParallelCollection<R>) => boolean
```

Added in v1.0.0

## parallelCollectionKeys

Returns a collection of the data sources that the requests in this
collection are from.

**Signature**

```ts
export declare const parallelCollectionKeys: <R>(
  self: ParallelCollection<R>
) => Chunk.Chunk<RequestResolver.RequestResolver<R, unknown>>
```

Added in v1.0.0

## patchRuntimeFlags

Provides each data source with a patch for runtime flags.

**Signature**

```ts
export declare const patchRuntimeFlags: <R>(self: RequestBlock<R>, patch: RuntimeFlagsPatch) => RequestBlock<R>
```

Added in v1.0.0

## sequentialCollectionCombine

Combines this collection of batches of requests that must be executed
sequentially with that collection of batches of requests that must be
executed sequentially to return a new collection of batches of requests
that must be executed sequentially.

**Signature**

```ts
export declare const sequentialCollectionCombine: <R, R2>(
  self: SequentialCollection<R>,
  that: SequentialCollection<R2>
) => SequentialCollection<R | R2>
```

Added in v1.0.0

## sequentialCollectionIsEmpty

Returns whether this collection of batches of requests is empty.

**Signature**

```ts
export declare const sequentialCollectionIsEmpty: <R>(self: SequentialCollection<R>) => boolean
```

Added in v1.0.0

## sequentialCollectionKeys

Returns a collection of the data sources that the batches of requests in
this collection are from.

**Signature**

```ts
export declare const sequentialCollectionKeys: <R>(
  self: SequentialCollection<R>
) => Chunk.Chunk<RequestResolver.RequestResolver<R, unknown>>
```

Added in v1.0.0
