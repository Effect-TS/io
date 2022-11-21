---
title: Ref/Synchronized.ts
nav_order: 37
parent: Modules
---

## Synchronized overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [getters](#getters)
  - [get](#get)
- [models](#models)
  - [Synchronized (interface)](#synchronized-interface)
- [mutations](#mutations)
  - [getAndSet](#getandset)
  - [getAndUpdate](#getandupdate)
  - [getAndUpdateEffect](#getandupdateeffect)
  - [getAndUpdateSome](#getandupdatesome)
  - [getAndUpdateSomeEffect](#getandupdatesomeeffect)
  - [modify](#modify)
  - [modifyEffect](#modifyeffect)
  - [modifySome](#modifysome)
  - [modifySomeEffect](#modifysomeeffect)
  - [set](#set)
  - [setAndGet](#setandget)
  - [update](#update)
  - [updateAndGetEffect](#updateandgeteffect)
  - [updateEffect](#updateeffect)
  - [updateSome](#updatesome)
  - [updateSomeAndGet](#updatesomeandget)
  - [updateSomeAndGetEffect](#updatesomeandgeteffect)
  - [updateSomeEffect](#updatesomeeffect)
- [symbols](#symbols)
  - [SynchronizedTypeId](#synchronizedtypeid)
  - [SynchronizedTypeId (type alias)](#synchronizedtypeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeMake](#unsafemake)

---

# constructors

## make

**Signature**

```ts
export declare const make: <A>(value: A) => Effect.Effect<never, never, Synchronized<A>>
```

Added in v1.0.0

# getters

## get

**Signature**

```ts
export declare const get: <A>(self: Synchronized<A>) => Effect.Effect<never, never, A>
```

Added in v1.0.0

# models

## Synchronized (interface)

**Signature**

```ts
export interface Synchronized<A> extends Synchronized.Variance<A>, Ref.Ref<A> {
  /**
   * @macro traced
   */
  modifyEffect<R, E, B>(f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): Effect.Effect<R, E, B>
}
```

Added in v1.0.0

# mutations

## getAndSet

**Signature**

```ts
export declare const getAndSet: <A>(value: A) => (self: Synchronized<A>) => Effect.Effect<never, never, A>
```

Added in v1.0.0

## getAndUpdate

**Signature**

```ts
export declare const getAndUpdate: <A>(f: (a: A) => A) => (self: Synchronized<A>) => Effect.Effect<never, never, A>
```

Added in v1.0.0

## getAndUpdateEffect

**Signature**

```ts
export declare const getAndUpdateEffect: <A, R, E>(
  f: (a: A) => Effect.Effect<R, E, A>
) => (self: Synchronized<A>) => Effect.Effect<R, E, A>
```

Added in v1.0.0

## getAndUpdateSome

**Signature**

```ts
export declare const getAndUpdateSome: <A>(
  f: (a: A) => Option<A>
) => (self: Synchronized<A>) => Effect.Effect<never, never, A>
```

Added in v1.0.0

## getAndUpdateSomeEffect

**Signature**

```ts
export declare const getAndUpdateSomeEffect: <A, R, E>(
  pf: (a: A) => Option<Effect.Effect<R, E, A>>
) => (self: Synchronized<A>) => Effect.Effect<R, E, A>
```

Added in v1.0.0

## modify

**Signature**

```ts
export declare const modify: <A, B>(
  f: (a: A) => readonly [B, A]
) => (self: Synchronized<A>) => Effect.Effect<never, never, B>
```

Added in v1.0.0

## modifyEffect

**Signature**

```ts
export declare const modifyEffect: <A, R, E, B>(
  f: (a: A) => Effect.Effect<R, E, readonly [B, A]>
) => (self: Synchronized<A>) => Effect.Effect<R, E, B>
```

Added in v1.0.0

## modifySome

**Signature**

```ts
export declare const modifySome: <A, B>(
  fallback: B,
  f: (a: A) => Option<readonly [B, A]>
) => (self: Synchronized<A>) => Effect.Effect<never, never, B>
```

Added in v1.0.0

## modifySomeEffect

**Signature**

```ts
export declare const modifySomeEffect: <B, A, R, E>(
  fallback: B,
  pf: (a: A) => Option<Effect.Effect<R, E, readonly [B, A]>>
) => (self: Synchronized<A>) => Effect.Effect<R, E, B>
```

Added in v1.0.0

## set

**Signature**

```ts
export declare const set: <A>(value: A) => (self: Synchronized<A>) => Effect.Effect<never, never, void>
```

Added in v1.0.0

## setAndGet

**Signature**

```ts
export declare const setAndGet: <A>(value: A) => (self: Synchronized<A>) => Effect.Effect<never, never, A>
```

Added in v1.0.0

## update

**Signature**

```ts
export declare const update: <A>(f: (a: A) => A) => (self: Synchronized<A>) => Effect.Effect<never, never, void>
```

Added in v1.0.0

## updateAndGetEffect

**Signature**

```ts
export declare const updateAndGetEffect: <A, R, E>(
  f: (a: A) => Effect.Effect<R, E, A>
) => (self: Synchronized<A>) => Effect.Effect<R, E, A>
```

Added in v1.0.0

## updateEffect

**Signature**

```ts
export declare const updateEffect: <A, R, E>(
  f: (a: A) => Effect.Effect<R, E, A>
) => (self: Synchronized<A>) => Effect.Effect<R, E, void>
```

Added in v1.0.0

## updateSome

**Signature**

```ts
export declare const updateSome: <A>(
  f: (a: A) => Option<A>
) => (self: Synchronized<A>) => Effect.Effect<never, never, void>
```

Added in v1.0.0

## updateSomeAndGet

**Signature**

```ts
export declare const updateSomeAndGet: <A>(
  f: (a: A) => Option<A>
) => (self: Synchronized<A>) => Effect.Effect<never, never, A>
```

Added in v1.0.0

## updateSomeAndGetEffect

**Signature**

```ts
export declare const updateSomeAndGetEffect: <A, R, E>(
  pf: (a: A) => Option<Effect.Effect<R, E, A>>
) => (self: Synchronized<A>) => Effect.Effect<R, E, A>
```

Added in v1.0.0

## updateSomeEffect

**Signature**

```ts
export declare const updateSomeEffect: <A, R, E>(
  pf: (a: A) => Option<Effect.Effect<R, E, A>>
) => (self: Synchronized<A>) => Effect.Effect<R, E, void>
```

Added in v1.0.0

# symbols

## SynchronizedTypeId

**Signature**

```ts
export declare const SynchronizedTypeId: typeof SynchronizedTypeId
```

Added in v1.0.0

## SynchronizedTypeId (type alias)

**Signature**

```ts
export type SynchronizedTypeId = typeof SynchronizedTypeId
```

Added in v1.0.0

# unsafe

## unsafeMake

**Signature**

```ts
export declare const unsafeMake: <A>(value: A) => Synchronized<A>
```

Added in v1.0.0
