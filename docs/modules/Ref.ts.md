---
title: Ref.ts
nav_order: 36
parent: Modules
---

## Ref overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [getters](#getters)
  - [get](#get)
- [models](#models)
  - [Ref (interface)](#ref-interface)
- [mutations](#mutations)
  - [getAndSet](#getandset)
  - [getAndUpdate](#getandupdate)
  - [getAndUpdateSome](#getandupdatesome)
  - [modify](#modify)
  - [modifySome](#modifysome)
  - [set](#set)
  - [setAndGet](#setandget)
  - [update](#update)
  - [updateAndGet](#updateandget)
  - [updateSome](#updatesome)
  - [updateSomeAndGet](#updatesomeandget)
- [symbols](#symbols)
  - [RefTypeId](#reftypeid)
  - [RefTypeId (type alias)](#reftypeid-type-alias)
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

## Ref (interface)

**Signature**

```ts
export interface Ref<A> extends Ref.Variance<A> {
  /**
   * @macro traced
   */
  modify<B>(f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
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

## getAndUpdateSome

**Signature**

```ts
export declare const getAndUpdateSome: any
```

Added in v1.0.0

## modify

**Signature**

```ts
export declare const modify: any
```

Added in v1.0.0

## modifySome

**Signature**

```ts
export declare const modifySome: any
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

## updateAndGet

**Signature**

```ts
export declare const updateAndGet: any
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

# symbols

## RefTypeId

**Signature**

```ts
export declare const RefTypeId: typeof RefTypeId
```

Added in v1.0.0

## RefTypeId (type alias)

**Signature**

```ts
export type RefTypeId = typeof RefTypeId
```

Added in v1.0.0

# unsafe

## unsafeMake

**Signature**

```ts
export declare const unsafeMake: any
```

Added in v1.0.0
