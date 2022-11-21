---
title: Scope.ts
nav_order: 44
parent: Modules
---

## Scope overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [destructors](#destructors)
  - [close](#close)
  - [use](#use)
- [environment](#environment)
  - [Tag](#tag)
- [forking](#forking)
  - [fork](#fork)
- [models](#models)
  - [CloseableScope (interface)](#closeablescope-interface)
  - [Scope (interface)](#scope-interface)
- [mutations](#mutations)
  - [addFinalizer](#addfinalizer)
  - [addFinalizerExit](#addfinalizerexit)
  - [extend](#extend)
- [symbols](#symbols)
  - [CloseableScopeTypeId](#closeablescopetypeid)
  - [CloseableScopeTypeId (type alias)](#closeablescopetypeid-type-alias)
  - [ScopeTypeId](#scopetypeid)
  - [ScopeTypeId (type alias)](#scopetypeid-type-alias)

---

# constructors

## make

Creates a Scope where Finalizers will run according to the `ExecutionStrategy`.

If an ExecutionStrategy is not provided `sequential` will be used.

**Signature**

```ts
export declare const make: any
```

Added in v1.0.0

# destructors

## close

Closes a scope with the specified exit value, running all finalizers that
have been added to the scope.

**Signature**

```ts
export declare const close: any
```

Added in v1.0.0

## use

Uses the scope by providing it to an `Effect` workflow that needs a scope,
guaranteeing that the scope is closed with the result of that workflow as
soon as the workflow completes execution, whether by success, failure, or
interruption.

**Signature**

```ts
export declare const use: any
```

Added in v1.0.0

# environment

## Tag

**Signature**

```ts
export declare const Tag: Context.Tag<Scope>
```

Added in v1.0.0

# forking

## fork

Forks a new scope that is a child of this scope. The child scope will
automatically be closed when this scope is closed.

**Signature**

```ts
export declare const fork: any
```

Added in v1.0.0

# models

## CloseableScope (interface)

**Signature**

```ts
export interface CloseableScope extends Scope {
  readonly [CloseableScopeTypeId]: CloseableScopeTypeId

  /** @internal */
  readonly close: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<never, never, void>
}
```

Added in v1.0.0

## Scope (interface)

**Signature**

```ts
export interface Scope {
  readonly [ScopeTypeId]: ScopeTypeId

  /** @internal */
  readonly fork: (strategy: ExecutionStrategy) => Effect.Effect<never, never, Scope.Closeable>
  /** @internal */
  readonly addFinalizer: (finalizer: Scope.Finalizer) => Effect.Effect<never, never, void>
}
```

Added in v1.0.0

# mutations

## addFinalizer

Adds a finalizer to this scope. The finalizer is guaranteed to be run when
the scope is closed.

**Signature**

```ts
export declare const addFinalizer: any
```

Added in v1.0.0

## addFinalizerExit

A simplified version of `addFinalizerWith` when the `finalizer` does not
depend on the `Exit` value that the scope is closed with.

**Signature**

```ts
export declare const addFinalizerExit: any
```

Added in v1.0.0

## extend

Extends the scope of an `Effect` workflow that needs a scope into this
scope by providing it to the workflow but not closing the scope when the
workflow completes execution. This allows extending a scoped value into a
larger scope.

**Signature**

```ts
export declare const extend: any
```

Added in v1.0.0

# symbols

## CloseableScopeTypeId

**Signature**

```ts
export declare const CloseableScopeTypeId: typeof CloseableScopeTypeId
```

Added in v1.0.0

## CloseableScopeTypeId (type alias)

**Signature**

```ts
export type CloseableScopeTypeId = typeof CloseableScopeTypeId
```

Added in v1.0.0

## ScopeTypeId

**Signature**

```ts
export declare const ScopeTypeId: typeof ScopeTypeId
```

Added in v1.0.0

## ScopeTypeId (type alias)

**Signature**

```ts
export type ScopeTypeId = typeof ScopeTypeId
```

Added in v1.0.0
