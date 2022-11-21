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
export declare const make: any
```

Added in v1.0.0

# getters

## get

**Signature**

```ts
export declare const get: any
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
export declare const getAndSet: any
```

Added in v1.0.0

## getAndUpdate

**Signature**

```ts
export declare const getAndUpdate: any
```

Added in v1.0.0

## getAndUpdateEffect

**Signature**

```ts
export declare const getAndUpdateEffect: any
```

Added in v1.0.0

## getAndUpdateSome

**Signature**

```ts
export declare const getAndUpdateSome: any
```

Added in v1.0.0

## getAndUpdateSomeEffect

**Signature**

```ts
export declare const getAndUpdateSomeEffect: any
```

Added in v1.0.0

## modify

**Signature**

```ts
export declare const modify: any
```

Added in v1.0.0

## modifyEffect

**Signature**

```ts
export declare const modifyEffect: any
```

Added in v1.0.0

## modifySome

**Signature**

```ts
export declare const modifySome: any
```

Added in v1.0.0

## modifySomeEffect

**Signature**

```ts
export declare const modifySomeEffect: any
```

Added in v1.0.0

## set

**Signature**

```ts
export declare const set: any
```

Added in v1.0.0

## setAndGet

**Signature**

```ts
export declare const setAndGet: any
```

Added in v1.0.0

## update

**Signature**

```ts
export declare const update: any
```

Added in v1.0.0

## updateAndGetEffect

**Signature**

```ts
export declare const updateAndGetEffect: any
```

Added in v1.0.0

## updateEffect

**Signature**

```ts
export declare const updateEffect: any
```

Added in v1.0.0

## updateSome

**Signature**

```ts
export declare const updateSome: any
```

Added in v1.0.0

## updateSomeAndGet

**Signature**

```ts
export declare const updateSomeAndGet: any
```

Added in v1.0.0

## updateSomeAndGetEffect

**Signature**

```ts
export declare const updateSomeAndGetEffect: any
```

Added in v1.0.0

## updateSomeEffect

**Signature**

```ts
export declare const updateSomeEffect: any
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
export declare const unsafeMake: any
```

Added in v1.0.0
