---
title: Fiber/Runtime/Flags/Patch.ts
nav_order: 13
parent: Modules
---

## Patch overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [disable](#disable)
  - [empty](#empty)
  - [enable](#enable)
  - [make](#make)
- [destructors](#destructors)
  - [disabledSet](#disabledset)
  - [enabledSet](#enabledset)
  - [render](#render)
- [elements](#elements)
  - [includes](#includes)
  - [isActive](#isactive)
  - [isDisabled](#isdisabled)
  - [isEnabled](#isenabled)
- [getters](#getters)
  - [isEmpty](#isempty)
- [models](#models)
  - [RuntimeFlagsPatch (type alias)](#runtimeflagspatch-type-alias)
- [mutations](#mutations)
  - [andThen](#andthen)
  - [both](#both)
  - [either](#either)
  - [exclude](#exclude)
  - [inverse](#inverse)

---

# constructors

## disable

Creates a `RuntimeFlagsPatch` describing disabling the provided `RuntimeFlag`.

**Signature**

```ts
export declare const disable: any
```

Added in v1.0.0

## empty

The empty `RuntimeFlagsPatch`.

**Signature**

```ts
export declare const empty: any
```

Added in v1.0.0

## enable

Creates a `RuntimeFlagsPatch` describing enabling the provided `RuntimeFlag`.

**Signature**

```ts
export declare const enable: any
```

Added in v1.0.0

## make

**Signature**

```ts
export declare const make: any
```

Added in v1.0.0

# destructors

## disabledSet

Returns a `ReadonlySet<number>` containing the `RuntimeFlags` described as
disabled by the specified `RuntimeFlagsPatch`.

**Signature**

```ts
export declare const disabledSet: any
```

Added in v1.0.0

## enabledSet

Returns a `ReadonlySet<number>` containing the `RuntimeFlags` described as
enabled by the specified `RuntimeFlagsPatch`.

**Signature**

```ts
export declare const enabledSet: any
```

Added in v1.0.0

## render

Renders the provided `RuntimeFlagsPatch` to a string.

**Signature**

```ts
export declare const render: any
```

Added in v1.0.0

# elements

## includes

Returns `true` if the `RuntimeFlagsPatch` includes the specified
`RuntimeFlag`, `false` otherwise.

**Signature**

```ts
export declare const includes: any
```

Added in v1.0.0

## isActive

Returns `true` if the `RuntimeFlagsPatch` describes the specified
`RuntimeFlag` as active.

**Signature**

```ts
export declare const isActive: any
```

Added in v1.0.0

## isDisabled

Returns `true` if the `RuntimeFlagsPatch` describes the specified
`RuntimeFlag` as disabled.

**Signature**

```ts
export declare const isDisabled: any
```

Added in v1.0.0

## isEnabled

Returns `true` if the `RuntimeFlagsPatch` describes the specified
`RuntimeFlag` as enabled.

**Signature**

```ts
export declare const isEnabled: any
```

Added in v1.0.0

# getters

## isEmpty

Returns `true` if the specified `RuntimeFlagsPatch` is empty.

**Signature**

```ts
export declare const isEmpty: any
```

Added in v1.0.0

# models

## RuntimeFlagsPatch (type alias)

**Signature**

```ts
export type RuntimeFlagsPatch = number & {
  readonly RuntimeFlagsPatch: unique symbol
}
```

Added in v1.0.0

# mutations

## andThen

Creates a `RuntimeFlagsPatch` describing the application of the `self` patch,
followed by `that` patch.

**Signature**

```ts
export declare const andThen: any
```

Added in v1.0.0

## both

Creates a `RuntimeFlagsPatch` describing application of both the `self` patch
and `that` patch.

**Signature**

```ts
export declare const both: any
```

Added in v1.0.0

## either

Creates a `RuntimeFlagsPatch` describing application of either the `self`
patch or `that` patch.

**Signature**

```ts
export declare const either: any
```

Added in v1.0.0

## exclude

Creates a `RuntimeFlagsPatch` which describes exclusion of the specified
`RuntimeFlag` from the set of `RuntimeFlags`.

**Signature**

```ts
export declare const exclude: any
```

Added in v1.0.0

## inverse

Creates a `RuntimeFlagsPatch` which describes the inverse of the patch
specified by the provided `RuntimeFlagsPatch`.

**Signature**

```ts
export declare const inverse: any
```

Added in v1.0.0
