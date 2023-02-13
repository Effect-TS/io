---
title: KeyedPool.ts
nav_order: 24
parent: Modules
---

## KeyedPool overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [get](#get)
  - [invalidate](#invalidate)
- [constructors](#constructors)
  - [makeSized](#makesized)
  - [makeSizedWith](#makesizedwith)
  - [makeSizedWithTTL](#makesizedwithttl)
  - [makeSizedWithTTLBy](#makesizedwithttlby)
- [models](#models)
  - [KeyedPool (interface)](#keyedpool-interface)
- [symbols](#symbols)
  - [KeyedPoolTypeId](#keyedpooltypeid)
  - [KeyedPoolTypeId (type alias)](#keyedpooltypeid-type-alias)

---

# combinators

## get

Retrieves an item from the pool belonging to the given key in a scoped
effect. Note that if acquisition fails, then the returned effect will fail
for that same reason. Retrying a failed acquisition attempt will repeat the
acquisition attempt.

**Signature**

```ts
export declare const get: {
  <K>(key: K): <E, A>(self: KeyedPool<K, E, A>) => Effect.Effect<Scope.Scope, E, A>
  <K, E, A>(self: KeyedPool<K, E, A>, key: K): Effect.Effect<Scope.Scope, E, A>
}
```

Added in v1.0.0

## invalidate

Invalidates the specified item. This will cause the pool to eventually
reallocate the item, although this reallocation may occur lazily rather
than eagerly.

**Signature**

```ts
export declare const invalidate: {
  <A>(item: A): <K, E>(self: KeyedPool<K, E, A>) => Effect.Effect<never, never, void>
  <K, E, A>(self: KeyedPool<K, E, A>, item: A): Effect.Effect<never, never, void>
}
```

Added in v1.0.0

# constructors

## makeSized

Makes a new pool of the specified fixed size. The pool is returned in a
`Scope`, which governs the lifetime of the pool. When the pool is shutdown
because the `Scope` is closed, the individual items allocated by the pool
will be released in some unspecified order.

**Signature**

```ts
export declare const makeSized: <K, R, E, A>(
  get: (key: K) => Effect.Effect<R, E, A>,
  size: number
) => Effect.Effect<Scope.Scope | R, never, KeyedPool<K, E, A>>
```

Added in v1.0.0

## makeSizedWith

Makes a new pool of the specified fixed size. The pool is returned in a
`Scope`, which governs the lifetime of the pool. When the pool is shutdown
because the `Scope` is closed, the individual items allocated by the pool
will be released in some unspecified order.

The size of the underlying pools can be configured per key.

**Signature**

```ts
export declare const makeSizedWith: <K, R, E, A>(
  get: (key: K) => Effect.Effect<R, E, A>,
  size: (key: K) => number
) => Effect.Effect<Scope.Scope | R, never, KeyedPool<K, E, A>>
```

Added in v1.0.0

## makeSizedWithTTL

Makes a new pool with the specified minimum and maximum sizes and time to
live before a pool whose excess items are not being used will be shrunk
down to the minimum size. The pool is returned in a `Scope`, which governs
the lifetime of the pool. When the pool is shutdown because the `Scope` is
used, the individual items allocated by the pool will be released in some
unspecified order.

The size of the underlying pools can be configured per key.

**Signature**

```ts
export declare const makeSizedWithTTL: <K, R, E, A>(
  get: (key: K) => Effect.Effect<R, E, A>,
  min: (key: K) => number,
  max: (key: K) => number,
  timeToLive: Duration.Duration
) => Effect.Effect<Scope.Scope | R, never, KeyedPool<K, E, A>>
```

Added in v1.0.0

## makeSizedWithTTLBy

Makes a new pool with the specified minimum and maximum sizes and time to
live before a pool whose excess items are not being used will be shrunk
down to the minimum size. The pool is returned in a `Scope`, which governs
the lifetime of the pool. When the pool is shutdown because the `Scope` is
used, the individual items allocated by the pool will be released in some
unspecified order.

The size of the underlying pools can be configured per key.

**Signature**

```ts
export declare const makeSizedWithTTLBy: <K, R, E, A>(
  get: (key: K) => Effect.Effect<R, E, A>,
  min: (key: K) => number,
  max: (key: K) => number,
  timeToLive: (key: K) => Duration.Duration
) => Effect.Effect<Scope.Scope | R, never, KeyedPool<K, E, A>>
```

Added in v1.0.0

# models

## KeyedPool (interface)

A `KeyedPool<K, E, A>` is a pool of `Pool`s of items of type `A`. Each pool
in the `KeyedPool` is associated with a key of type `K`.

**Signature**

```ts
export interface KeyedPool<K, E, A> extends KeyedPool.Variance<K, E, A> {
  /**
   * Retrieves an item from the pool belonging to the given key in a scoped
   * effect. Note that if acquisition fails, then the returned effect will fail
   * for that same reason. Retrying a failed acquisition attempt will repeat the
   * acquisition attempt.
   */
  get(key: K): Effect.Effect<Scope.Scope, E, A>

  /**
   * Invalidates the specified item. This will cause the pool to eventually
   * reallocate the item, although this reallocation may occur lazily rather
   * than eagerly.
   */
  invalidate(item: A): Effect.Effect<never, never, void>
}
```

Added in v1.0.0

# symbols

## KeyedPoolTypeId

**Signature**

```ts
export declare const KeyedPoolTypeId: typeof KeyedPoolTypeId
```

Added in v1.0.0

## KeyedPoolTypeId (type alias)

**Signature**

```ts
export type KeyedPoolTypeId = typeof KeyedPoolTypeId
```

Added in v1.0.0
