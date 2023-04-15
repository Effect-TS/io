---
title: RequestCompletionMap.ts
nav_order: 46
parent: Modules
---

## RequestCompletionMap overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [combine](#combine)
  - [set](#set)
  - [setOption](#setoption)
- [constructors](#constructors)
  - [empty](#empty)
  - [make](#make)
- [context](#context)
  - [RequestCompletionMap](#requestcompletionmap)
- [elements](#elements)
  - [get](#get)
  - [getOrThrow](#getorthrow)
  - [has](#has)
  - [requests](#requests)
- [models](#models)
  - [RequestCompletionMap (interface)](#requestcompletionmap-interface)
- [symbols](#symbols)
  - [RequestCompletionMapTypeId](#requestcompletionmaptypeid)
  - [RequestCompletionMapTypeId (type alias)](#requestcompletionmaptypeid-type-alias)

---

# combinators

## combine

Combines two completed request maps into a single completed request map.

**Signature**

```ts
export declare const combine: {
  (that: RequestCompletionMap): (self: RequestCompletionMap) => RequestCompletionMap
  (self: RequestCompletionMap, that: RequestCompletionMap): RequestCompletionMap
}
```

Added in v1.0.0

## set

Appends the specified result to the completed requests map.

**Signature**

```ts
export declare const set: {
  <A extends Request.Request<any, any>>(request: A, result: Request.Request.Result<A>): (
    self: RequestCompletionMap
  ) => void
  <A extends Request.Request<any, any>>(self: RequestCompletionMap, request: A, result: Request.Request.Result<A>): void
}
```

Added in v1.0.0

## setOption

Appends the specified optional result to the completed request map.

**Signature**

```ts
export declare const setOption: {
  <A extends Request.Request<any, any>>(request: A, result: Request.Request.OptionalResult<A>): (
    self: RequestCompletionMap
  ) => void
  <A extends Request.Request<any, any>>(
    self: RequestCompletionMap,
    request: A,
    result: Request.Request.OptionalResult<A>
  ): void
}
```

Added in v1.0.0

# constructors

## empty

An empty completed requests map.

**Signature**

```ts
export declare const empty: () => RequestCompletionMap
```

Added in v1.0.0

## make

Constructs a new completed requests map with the specified request and
result.

**Signature**

```ts
export declare const make: <E, A>(request: Request.Request<E, A>, result: Exit.Exit<E, A>) => RequestCompletionMap
```

Added in v1.0.0

# context

## RequestCompletionMap

The context tag for a `RequestCompletionMap`.

**Signature**

```ts
export declare const RequestCompletionMap: Context.Tag<RequestCompletionMap, RequestCompletionMap>
```

Added in v1.0.0

# elements

## get

Retrieves the result of the specified request if it exists.

**Signature**

```ts
export declare const get: {
  <A extends Request.Request<any, any>>(request: A): (
    self: RequestCompletionMap
  ) => Option.Option<Request.Request.Result<A>>
  <A extends Request.Request<any, any>>(self: RequestCompletionMap, request: A): Option.Option<
    Request.Request.Result<A>
  >
}
```

Added in v1.0.0

## getOrThrow

Retrieves the result of the specified request if it exists or throws if it doesn't.

**Signature**

```ts
export declare const getOrThrow: {
  <A extends Request.Request<any, any>>(request: A): (self: RequestCompletionMap) => Request.Request.Result<A>
  <A extends Request.Request<any, any>>(self: RequestCompletionMap, request: A): Request.Request.Result<A>
}
```

Added in v1.0.0

## has

Returns whether a result exists for the specified request.

**Signature**

```ts
export declare const has: {
  <A extends Request.Request<any, any>>(request: A): (self: RequestCompletionMap) => boolean
  <A extends Request.Request<any, any>>(self: RequestCompletionMap, request: A): boolean
}
```

Added in v1.0.0

## requests

Collects all requests in a set.

**Signature**

```ts
export declare const requests: (self: RequestCompletionMap) => HashSet.HashSet<Request.Request<unknown, unknown>>
```

Added in v1.0.0

# models

## RequestCompletionMap (interface)

A `RequestCompletionMap` is a universally quantified mapping from requests of
type `Request<E, A>` to results of type `Either<E, A>` for all types `E` and
`A`. The guarantee is that for any request of type `Request<E, A>`, if there
is a corresponding value in the map, that value is of type `Either<E, A>`.
This is used by the library to support data sources that return different
result types for different requests while guaranteeing that results will be
of the type requested.

**Signature**

```ts
export interface RequestCompletionMap extends RequestCompletionMap.Proto {
  /** @internal */
  readonly map: MutableRef.MutableRef<HashMap.HashMap<Request.Request<unknown, unknown>, Exit.Exit<unknown, unknown>>>
}
```

Added in v1.0.0

# symbols

## RequestCompletionMapTypeId

**Signature**

```ts
export declare const RequestCompletionMapTypeId: typeof RequestCompletionMapTypeId
```

Added in v1.0.0

## RequestCompletionMapTypeId (type alias)

**Signature**

```ts
export type RequestCompletionMapTypeId = typeof RequestCompletionMapTypeId
```

Added in v1.0.0
