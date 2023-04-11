---
title: RequestCache.ts
nav_order: 46
parent: Modules
---

## RequestCache overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [unsafeMake](#unsafemake)
- [elements](#elements)
  - [get](#get)
  - [lookup](#lookup)
- [models](#models)
  - [RequestCache (interface)](#requestcache-interface)
- [mutations](#mutations)
  - [remove](#remove)
  - [set](#set)
- [symbols](#symbols)
  - [RequestCacheTypeId](#requestcachetypeid)
  - [RequestCacheTypeId (type alias)](#requestcachetypeid-type-alias)

---

# constructors

## empty

Constructs an empty cache.

**Signature**

```ts
export declare const empty: () => Effect.Effect<never, never, RequestCache>
```

Added in v1.0.0

## unsafeMake

**Signature**

```ts
export declare const unsafeMake: () => RequestCache
```

Added in v1.0.0

# elements

## get

Looks up a request in the cache, failing with the unit value if the request
is not in the cache, succeeding with `Ref(None)` if the request is in the
cache but has not been executed yet, or `Ref(Some(value))` if the request
has been executed.

**Signature**

```ts
export declare const get: {
  <E, A>(request: Request.Request<E, A>): (self: RequestCache) => Effect.Effect<never, void, Deferred.Deferred<E, A>>
  <E, A>(self: RequestCache, request: Request.Request<E, A>): Effect.Effect<never, void, Deferred.Deferred<E, A>>
}
```

Added in v1.0.0

## lookup

Looks up a request in the cache. If the request is not in the cache returns
a `Left` with a `Ref` that can be set with a `Some` to complete the
request. If the request is in the cache returns a `Right` with a `Ref` that
either contains `Some` with a result if the request has been executed or
`None` if the request has not been executed yet.

**Signature**

```ts
export declare const lookup: {
  <E, A>(request: Request.Request<E, A>): (
    self: RequestCache
  ) => Effect.Effect<never, never, Either.Either<Deferred.Deferred<E, A>, Deferred.Deferred<E, A>>>
  <E, A>(self: RequestCache, request: Request.Request<E, A>): Effect.Effect<
    never,
    never,
    Either.Either<Deferred.Deferred<E, A>, Deferred.Deferred<E, A>>
  >
}
```

Added in v1.0.0

# models

## RequestCache (interface)

A `Cache` maintains an internal state with a mapping from requests to `Ref`s
that will contain the result of those requests when they are executed. This
is used internally by the library to provide deduplication and caching of
requests.

**Signature**

```ts
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
  ): Effect.Effect<never, never, Either.Either<Deferred.Deferred<E, A>, Deferred.Deferred<E, A>>>

  /**
   * Inserts a request and a `Ref` that will contain the result of the request
   * when it is executed into the cache.
   */
  set<E, A>(request: Request.Request<E, A>, result: Deferred.Deferred<E, A>): Effect.Effect<never, never, void>

  /**
   * Removes a request from the cache.
   */
  remove<E, A>(request: Request.Request<E, A>): Effect.Effect<never, never, void>
}
```

Added in v1.0.0

# mutations

## remove

Removes a request from the cache.

**Signature**

```ts
export declare const remove: {
  <E, A>(request: Request.Request<E, A>): (self: RequestCache) => Effect.Effect<never, never, void>
  <E, A>(self: RequestCache, request: Request.Request<E, A>): Effect.Effect<never, never, void>
}
```

Added in v1.0.0

## set

Inserts a request and a `Ref` that will contain the result of the request
when it is executed into the cache.

**Signature**

```ts
export declare const set: {
  <E, A>(request: Request.Request<E, A>, result: Deferred.Deferred<E, A>): (
    self: RequestCache
  ) => Effect.Effect<never, never, void>
  <E, A>(self: RequestCache, request: Request.Request<E, A>, result: Deferred.Deferred<E, A>): Effect.Effect<
    never,
    never,
    void
  >
}
```

Added in v1.0.0

# symbols

## RequestCacheTypeId

**Signature**

```ts
export declare const RequestCacheTypeId: typeof RequestCacheTypeId
```

Added in v1.0.0

## RequestCacheTypeId (type alias)

**Signature**

```ts
export type RequestCacheTypeId = typeof RequestCacheTypeId
```

Added in v1.0.0
