---
title: Cached.ts
nav_order: 1
parent: Modules
---

## Cached overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [auto](#auto)
  - [manual](#manual)
- [getters](#getters)
  - [get](#get)
- [models](#models)
  - [Cached (interface)](#cached-interface)
- [symbols](#symbols)
  - [CachedTypeId](#cachedtypeid)
  - [CachedTypeId (type alias)](#cachedtypeid-type-alias)
- [utils](#utils)
  - [refresh](#refresh)

---

# constructors

## auto

Creates a new `Cached` value that is automatically refreshed according to
the specified policy. Note that error retrying is not performed
automatically, so if you want to retry on errors, you should first apply
retry policies to the acquisition effect before passing it to this
constructor.

**Signature**

```ts
export declare const auto: <R, E, A, R2, Out>(
  acquire: Effect.Effect<R, E, A>,
  policy: Schedule.Schedule<R2, unknown, Out>
) => Effect.Effect<Scope.Scope | R | R2, never, Cached<E, A>>
```

Added in v1.0.0

## manual

Creates a new `Cached` value that must be manually refreshed by calling
the refresh method. Note that error retrying is not performed
automatically, so if you want to retry on errors, you should first apply
retry policies to the acquisition effect before passing it to this
constructor.

**Signature**

```ts
export declare const manual: <R, E, A>(
  acquire: Effect.Effect<R, E, A>
) => Effect.Effect<Scope.Scope | R, never, Cached<E, A>>
```

Added in v1.0.0

# getters

## get

Retrieves the current value stored in the cache.

**Signature**

```ts
export declare const get: <E, A>(self: Cached<E, A>) => Effect.Effect<never, E, A>
```

Added in v1.0.0

# models

## Cached (interface)

A `Cached` is a possibly resourceful value that is loaded into memory, and
which can be refreshed either manually or automatically.

**Signature**

```ts
export interface Cached<E, A> extends Cached.Variance<E, A> {
  /** @internal */
  readonly scopedRef: ScopedRef.ScopedRef<Exit.Exit<E, A>>
  /** @internal */
  acquire(): Effect.Effect<Scope.Scope, E, A>
}
```

Added in v1.0.0

# symbols

## CachedTypeId

**Signature**

```ts
export declare const CachedTypeId: typeof CachedTypeId
```

Added in v1.0.0

## CachedTypeId (type alias)

**Signature**

```ts
export type CachedTypeId = typeof CachedTypeId
```

Added in v1.0.0

# utils

## refresh

Refreshes the cache. This method will not return until either the refresh
is successful, or the refresh operation fails.

**Signature**

```ts
export declare const refresh: <E, A>(self: Cached<E, A>) => Effect.Effect<never, E, void>
```

Added in v1.0.0
