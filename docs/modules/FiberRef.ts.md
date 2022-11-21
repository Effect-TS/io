---
title: FiberRef.ts
nav_order: 16
parent: Modules
---

## FiberRef overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
  - [makeEnvironment](#makeenvironment)
  - [makeRuntimeFlags](#makeruntimeflags)
  - [makeWith](#makewith)
  - [unsafeMake](#unsafemake)
  - [unsafeMakeEnvironment](#unsafemakeenvironment)
  - [unsafeMakeHashSet](#unsafemakehashset)
  - [unsafeMakePatch](#unsafemakepatch)
  - [unsafeMakeSupervisor](#unsafemakesupervisor)
- [fiberRefs](#fiberrefs)
  - [currentEnvironment](#currentenvironment)
  - [currentLogAnnotations](#currentlogannotations)
  - [currentLogLevel](#currentloglevel)
  - [currentLogSpan](#currentlogspan)
  - [currentLoggers](#currentloggers)
  - [currentParallelism](#currentparallelism)
  - [currentRuntimeFlags](#currentruntimeflags)
  - [currentScheduler](#currentscheduler)
  - [currentSupervisor](#currentsupervisor)
  - [forkScopeOverride](#forkscopeoverride)
  - [interruptedCause](#interruptedcause)
- [getters](#getters)
  - [get](#get)
- [model](#model)
  - [FiberRef (interface)](#fiberref-interface)
- [models](#models)
  - [Variance (interface)](#variance-interface)
- [mutations](#mutations)
  - [delete](#delete)
  - [getAndSet](#getandset)
  - [getAndUpdate](#getandupdate)
  - [getAndUpdateSome](#getandupdatesome)
  - [getWith](#getwith)
  - [locally](#locally)
  - [locallyScoped](#locallyscoped)
  - [locallyScopedWith](#locallyscopedwith)
  - [locallyWith](#locallywith)
  - [modify](#modify)
  - [modifySome](#modifysome)
  - [reset](#reset)
  - [set](#set)
  - [update](#update)
  - [updateAndGet](#updateandget)
  - [updateSome](#updatesome)
  - [updateSomeAndGet](#updatesomeandget)
- [symbols](#symbols)
  - [FiberRefTypeId](#fiberreftypeid)
  - [FiberRefTypeId (type alias)](#fiberreftypeid-type-alias)

---

# constructors

## make

**Signature**

```ts
export declare const make: any
```

Added in v1.0.0

## makeEnvironment

**Signature**

```ts
export declare const makeEnvironment: any
```

Added in v1.0.0

## makeRuntimeFlags

**Signature**

```ts
export declare const makeRuntimeFlags: any
```

Added in v1.0.0

## makeWith

**Signature**

```ts
export declare const makeWith: any
```

Added in v1.0.0

## unsafeMake

**Signature**

```ts
export declare const unsafeMake: any
```

Added in v1.0.0

## unsafeMakeEnvironment

**Signature**

```ts
export declare const unsafeMakeEnvironment: any
```

Added in v1.0.0

## unsafeMakeHashSet

**Signature**

```ts
export declare const unsafeMakeHashSet: any
```

Added in v1.0.0

## unsafeMakePatch

**Signature**

```ts
export declare const unsafeMakePatch: any
```

Added in v1.0.0

## unsafeMakeSupervisor

**Signature**

```ts
export declare const unsafeMakeSupervisor: any
```

Added in v1.0.0

# fiberRefs

## currentEnvironment

**Signature**

```ts
export declare const currentEnvironment: any
```

Added in v1.0.0

## currentLogAnnotations

**Signature**

```ts
export declare const currentLogAnnotations: any
```

Added in v1.0.0

## currentLogLevel

**Signature**

```ts
export declare const currentLogLevel: any
```

Added in v1.0.0

## currentLogSpan

**Signature**

```ts
export declare const currentLogSpan: any
```

Added in v1.0.0

## currentLoggers

**Signature**

```ts
export declare const currentLoggers: any
```

Added in v1.0.0

## currentParallelism

**Signature**

```ts
export declare const currentParallelism: any
```

Added in v1.0.0

## currentRuntimeFlags

**Signature**

```ts
export declare const currentRuntimeFlags: any
```

Added in v1.0.0

## currentScheduler

**Signature**

```ts
export declare const currentScheduler: any
```

Added in v1.0.0

## currentSupervisor

**Signature**

```ts
export declare const currentSupervisor: any
```

Added in v1.0.0

## forkScopeOverride

**Signature**

```ts
export declare const forkScopeOverride: any
```

Added in v1.0.0

## interruptedCause

**Signature**

```ts
export declare const interruptedCause: any
```

Added in v1.0.0

# getters

## get

**Signature**

```ts
export declare const get: any
```

Added in v1.0.0

# model

## FiberRef (interface)

**Signature**

```ts
export interface FiberRef<A> extends Variance<A> {
  /** @internal */
  readonly initial: A
  /** @internal */
  readonly diff: (oldValue: A, newValue: A) => unknown
  /** @internal */
  readonly combine: (first: unknown, second: unknown) => unknown
  /** @internal */
  readonly patch: (patch: unknown) => (oldValue: A) => A
  /** @internal */
  readonly fork: unknown
  /** @internal */
  readonly join: (oldValue: A, newValue: A) => A
}
```

Added in v1.0.0

# models

## Variance (interface)

**Signature**

```ts
export interface Variance<A> {
  readonly [FiberRefTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v1.0.0

# mutations

## delete

**Signature**

```ts
export declare const delete: any
```

Added in v1.0.0

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

## getWith

**Signature**

```ts
export declare const getWith: any
```

Added in v1.0.0

## locally

**Signature**

```ts
export declare const locally: any
```

Added in v1.0.0

## locallyScoped

**Signature**

```ts
export declare const locallyScoped: any
```

Added in v1.0.0

## locallyScopedWith

**Signature**

```ts
export declare const locallyScopedWith: any
```

Added in v1.0.0

## locallyWith

**Signature**

```ts
export declare const locallyWith: any
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

## reset

**Signature**

```ts
export declare const reset: any
```

Added in v1.0.0

## set

**Signature**

```ts
export declare const set: any
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

## FiberRefTypeId

**Signature**

```ts
export declare const FiberRefTypeId: typeof FiberRefTypeId
```

Added in v1.0.0

## FiberRefTypeId (type alias)

**Signature**

```ts
export type FiberRefTypeId = typeof FiberRefTypeId
```

Added in v1.0.0
