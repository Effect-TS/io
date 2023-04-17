---
title: Request.ts
nav_order: 44
parent: Modules
---

## Request overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [makeEntry](#makeentry)
  - [of](#of)
  - [tagged](#tagged)
- [guards](#guards)
  - [isEntry](#isentry)
- [models](#models)
  - [Cache (interface)](#cache-interface)
  - [Entry (interface)](#entry-interface)
  - [Listeners (interface)](#listeners-interface)
  - [Request (interface)](#request-interface)
  - [makeCache](#makecache)
- [refinements](#refinements)
  - [isRequest](#isrequest)
- [request completion](#request-completion)
  - [complete](#complete)
  - [completeEffect](#completeeffect)
  - [fail](#fail)
  - [succeed](#succeed)
- [symbols](#symbols)
  - [EntryTypeId](#entrytypeid)
  - [EntryTypeId (type alias)](#entrytypeid-type-alias)
  - [RequestTypeId](#requesttypeid)
  - [RequestTypeId (type alias)](#requesttypeid-type-alias)

---

# constructors

## makeEntry

**Signature**

```ts
export declare const makeEntry: <A extends Request<any, any>>(
  request: A,
  result: Deferred<Request.Error<A>, Request.Success<A>>,
  listeners: Listeners,
  ownerId: FiberId
) => Entry<A>
```

Added in v1.0.0

## of

Constructs a new `Request`.

**Signature**

```ts
export declare const of: <R extends Request<any, any>>() => Request.Constructor<R, never>
```

Added in v1.0.0

## tagged

Constructs a new `Request`.

**Signature**

```ts
export declare const tagged: <R extends Request<any, any> & { _tag: string }>(
  tag: R['_tag']
) => Request.Constructor<R, '_tag'>
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

## Cache (interface)

**Signature**

```ts
export interface Cache<R = unknown>
  extends _Cache.ConsumerCache<
    R,
    never,
    {
      listeners: Listeners
      handle: Deferred<unknown, unknown>
    }
  > {}
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
  readonly request: R
  readonly result: Deferred<
    [R] extends [Request<infer _E, infer _A>] ? _E : never,
    [R] extends [Request<infer _E, infer _A>] ? _A : never
  >
  readonly listeners: Listeners
  readonly ownerId: FiberId
}
```

Added in v1.0.0

## Listeners (interface)

**Signature**

```ts
export interface Listeners {
  count: number
  observers: Set<(count: number) => void>
  addObserver(f: (count: number) => void): void
  removeObserver(f: (count: number) => void): void
  increment(): void
  decrement(): void
}
```

Added in v1.0.0

## Request (interface)

A `Request<E, A>` is a request from a data source for a value of type `A`
that may fail with an `E`.

**Signature**

```ts
export interface Request<E, A> extends Request.Variance<E, A>, Data.Case {}
```

Added in v1.0.0

## makeCache

**Signature**

```ts
export declare const makeCache: <R = unknown>(
  capacity: number,
  timeToLive: Duration
) => Effect.Effect<never, never, Cache<R>>
```

Added in v1.0.0

# refinements

## isRequest

Returns `true` if the specified value is a `Request`, `false` otherwise.

**Signature**

```ts
export declare const isRequest: (u: unknown) => u is Request<unknown, unknown>
```

Added in v1.0.0

# request completion

## complete

Complete a `Request` with the specified result.

**Signature**

```ts
export declare const complete: {
  <A extends Request<any, any>>(result: Request.Result<A>): (
    self: A
  ) => Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>
  <A extends Request<any, any>>(self: A, result: Request.Result<A>): Effect.Effect<
    RequestCompletionMap.RequestCompletionMap,
    never,
    void
  >
}
```

Added in v1.0.0

## completeEffect

Complete a `Request` with the specified effectful computation, failing the
request with the error from the effect workflow if it fails, and completing
the request with the value of the effect workflow if it succeeds.

**Signature**

```ts
export declare const completeEffect: {
  <A extends Request<any, any>, R>(effect: Effect.Effect<R, Request.Error<A>, Request.Success<A>>): (
    self: A
  ) => Effect.Effect<RequestCompletionMap.RequestCompletionMap | R, never, void>
  <A extends Request<any, any>, R>(
    self: A,
    effect: Effect.Effect<R, Request.Error<A>, Request.Success<A>>
  ): Effect.Effect<RequestCompletionMap.RequestCompletionMap | R, never, void>
}
```

Added in v1.0.0

## fail

Complete a `Request` with the specified error.

**Signature**

```ts
export declare const fail: {
  <A extends Request<any, any>>(error: Request.Error<A>): (
    self: A
  ) => Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>
  <A extends Request<any, any>>(self: A, error: Request.Error<A>): Effect.Effect<
    RequestCompletionMap.RequestCompletionMap,
    never,
    void
  >
}
```

Added in v1.0.0

## succeed

Complete a `Request` with the specified value.

**Signature**

```ts
export declare const succeed: {
  <A extends Request<any, any>>(value: Request.Success<A>): (
    self: A
  ) => Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>
  <A extends Request<any, any>>(self: A, value: Request.Success<A>): Effect.Effect<
    RequestCompletionMap.RequestCompletionMap,
    never,
    void
  >
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

## RequestTypeId

**Signature**

```ts
export declare const RequestTypeId: typeof RequestTypeId
```

Added in v1.0.0

## RequestTypeId (type alias)

**Signature**

```ts
export type RequestTypeId = typeof RequestTypeId
```

Added in v1.0.0
