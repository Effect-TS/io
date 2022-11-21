---
title: Fiber/Id.ts
nav_order: 11
parent: Modules
---

## Id overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [combine](#combine)
  - [combineAll](#combineall)
  - [composite](#composite)
  - [make](#make)
  - [none](#none)
  - [runtime](#runtime)
  - [unsafeMake](#unsafemake)
- [destructors](#destructors)
  - [ids](#ids)
  - [threadName](#threadname)
  - [toOption](#tooption)
  - [toSet](#toset)
- [models](#models)
  - [Composite (interface)](#composite-interface)
  - [FiberId (type alias)](#fiberid-type-alias)
  - [None (interface)](#none-interface)
  - [Runtime (interface)](#runtime-interface)
- [mutations](#mutations)
  - [getOrElse](#getorelse)
- [refinements](#refinements)
  - [isFiberId](#isfiberid)
  - [isNone](#isnone)
- [symbols](#symbols)
  - [FiberIdTypeId](#fiberidtypeid)
  - [FiberIdTypeId (type alias)](#fiberidtypeid-type-alias)

---

# constructors

## combine

Combine two `FiberId`s.

**Signature**

```ts
export declare const combine: any
```

Added in v1.0.0

## combineAll

Combines a set of `FiberId`s into a single `FiberId`.

**Signature**

```ts
export declare const combineAll: any
```

Added in v1.0.0

## composite

**Signature**

```ts
export declare const composite: any
```

Added in v1.0.0

## make

Creates a new `FiberId`.

**Signature**

```ts
export declare const make: any
```

Added in v1.0.0

## none

**Signature**

```ts
export declare const none: any
```

Added in v1.0.0

## runtime

**Signature**

```ts
export declare const runtime: any
```

Added in v1.0.0

## unsafeMake

Unsafely creates a new `FiberId`.

**Signature**

```ts
export declare const unsafeMake: any
```

Added in v1.0.0

# destructors

## ids

Get the set of identifiers for this `FiberId`.

**Signature**

```ts
export declare const ids: any
```

Added in v1.0.0

## threadName

Creates a string representing the name of the current thread of execution
represented by the specified `FiberId`.

**Signature**

```ts
export declare const threadName: any
```

Added in v1.0.0

## toOption

Convert a `FiberId` into an `Option<FiberId>`.

**Signature**

```ts
export declare const toOption: any
```

Added in v1.0.0

## toSet

Convert a `FiberId` into a `HashSet<FiberId>`.

**Signature**

```ts
export declare const toSet: any
```

Added in v1.0.0

# models

## Composite (interface)

**Signature**

```ts
export interface Composite extends Equal {
  readonly [FiberIdTypeId]: FiberIdTypeId
  readonly _tag: 'Composite'
  readonly left: FiberId
  readonly right: FiberId
}
```

Added in v1.0.0

## FiberId (type alias)

**Signature**

```ts
export type FiberId = None | Runtime | Composite
```

Added in v1.0.0

## None (interface)

**Signature**

```ts
export interface None extends Equal {
  readonly [FiberIdTypeId]: FiberIdTypeId
  readonly _tag: 'None'
}
```

Added in v1.0.0

## Runtime (interface)

**Signature**

```ts
export interface Runtime extends Equal {
  readonly [FiberIdTypeId]: FiberIdTypeId
  readonly _tag: 'Runtime'
  readonly id: number
  readonly startTimeMillis: number
}
```

Added in v1.0.0

# mutations

## getOrElse

Returns this `FiberId` if it is not `None`, otherwise returns that `FiberId`.

**Signature**

```ts
export declare const getOrElse: any
```

Added in v1.0.0

# refinements

## isFiberId

Returns `true` if the specified unknown value is a `FiberId`, `false`
otherwise.

**Signature**

```ts
export declare const isFiberId: any
```

Added in v1.0.0

## isNone

Determines if the `FiberId` is a `None`.

**Signature**

```ts
export declare const isNone: any
```

Added in v1.0.0

# symbols

## FiberIdTypeId

**Signature**

```ts
export declare const FiberIdTypeId: typeof FiberIdTypeId
```

Added in v1.0.0

## FiberIdTypeId (type alias)

**Signature**

```ts
export type FiberIdTypeId = typeof FiberIdTypeId
```

Added in v1.0.0
