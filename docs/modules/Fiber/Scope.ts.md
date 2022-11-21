---
title: Fiber/Scope.ts
nav_order: 14
parent: Modules
---

## Scope overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [globalScope](#globalscope)
  - [unsafeMake](#unsafemake)
- [models](#models)
  - [FiberScope (interface)](#fiberscope-interface)
- [symbols](#symbols)
  - [FiberScopeTypeId](#fiberscopetypeid)
  - [FiberScopeTypeId (type alias)](#fiberscopetypeid-type-alias)

---

# constructors

## globalScope

The global fiber scope. Anything forked onto the global scope is not
supervised, and will only terminate on its own accord (never from
interruption of a parent fiber, because there is no parent fiber).

**Signature**

```ts
export declare const globalScope: FiberScope
```

Added in v1.0.0

## unsafeMake

Unsafely creates a new `FiberScope` from a `Fiber`.

**Signature**

```ts
export declare const unsafeMake: (fiber: FiberRuntime<any, any>) => FiberScope
```

Added in v1.0.0

# models

## FiberScope (interface)

A `FiberScope` represents the scope of a fiber lifetime. The scope of a
fiber can be retrieved using `Effect.descriptor`, and when forking fibers,
you can specify a custom scope to fork them on by using the `forkIn`.

**Signature**

```ts
export interface FiberScope {
  readonly [FiberScopeTypeId]: FiberScopeTypeId
```

Added in v1.0.0

# symbols

## FiberScopeTypeId

**Signature**

```ts
export declare const FiberScopeTypeId: typeof FiberScopeTypeId
```

Added in v1.0.0

## FiberScopeTypeId (type alias)

**Signature**

```ts
export type FiberScopeTypeId = typeof FiberScopeTypeId
```

Added in v1.0.0
