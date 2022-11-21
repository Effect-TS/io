---
title: Deferred.ts
nav_order: 6
parent: Modules
---

## Deferred overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
  - [makeAs](#makeas)
- [getters](#getters)
  - [await](#await)
  - [isDone](#isdone)
  - [poll](#poll)
- [models](#models)
  - [Deferred (interface)](#deferred-interface)
- [mutations](#mutations)
  - [complete](#complete)
  - [completeWith](#completewith)
  - [die](#die)
  - [dieSync](#diesync)
  - [done](#done)
  - [fail](#fail)
  - [failCause](#failcause)
  - [failCauseSync](#failcausesync)
  - [failSync](#failsync)
  - [interrupt](#interrupt)
  - [interruptAs](#interruptas)
  - [succeed](#succeed)
  - [sync](#sync)
- [symbols](#symbols)
  - [DeferredTypeId](#deferredtypeid)
  - [DeferredTypeId (type alias)](#deferredtypeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeDone](#unsafedone)
  - [unsafeMake](#unsafemake)

---

# constructors

## make

Creates a new `Deferred`.

**Signature**

```ts
export declare const make: any
```

Added in v1.0.0

## makeAs

Creates a new `Deferred` from the specified `FiberId`.

**Signature**

```ts
export declare const makeAs: any
```

Added in v1.0.0

# getters

## await

Retrieves the value of the `Deferred`, suspending the fiber running the
workflow until the result is available.

**Signature**

```ts
export declare const await: any
```

Added in v1.0.0

## isDone

Returns `true` if this `Deferred` has already been completed with a value or
an error, `false` otherwise.

**Signature**

```ts
export declare const isDone: any
```

Added in v1.0.0

## poll

Returns a `Some<Effect<R, E, A>>` from the `Deferred` if this `Deferred` has
already been completed, `None` otherwise.

**Signature**

```ts
export declare const poll: any
```

Added in v1.0.0

# models

## Deferred (interface)

A `Deferred` represents an asynchronous variable that can be set exactly
once, with the ability for an arbitrary number of fibers to suspend (by
calling `Deferred.await`) and automatically resume when the variable is set.

`Deferred` can be used for building primitive actions whose completions
require the coordinated action of multiple fibers, and for building
higher-level concurrent or asynchronous structures.

**Signature**

```ts
export interface Deferred<E, A> extends Deferred.Variance<E, A> {
  /** @internal */
  readonly state: MutableRef.MutableRef<internal.State<E, A>>
  /** @internal */
  readonly blockingOn: FiberId.FiberId
}
```

Added in v1.0.0

# mutations

## complete

Completes the deferred with the result of the specified effect. If the
deferred has already been completed, the method will produce false.

Note that `Deferred.completeWith` will be much faster, so consider using
that if you do not need to memoize the result of the specified effect.

**Signature**

```ts
export declare const complete: any
```

Added in v1.0.0

## completeWith

Completes the deferred with the result of the specified effect. If the
deferred has already been completed, the method will produce false.

**Signature**

```ts
export declare const completeWith: any
```

Added in v1.0.0

## die

Kills the `Deferred` with the specified defect, which will be propagated to
all fibers waiting on the value of the `Deferred`.

**Signature**

```ts
export declare const die: any
```

Added in v1.0.0

## dieSync

Kills the `Deferred` with the specified defect, which will be propagated to
all fibers waiting on the value of the `Deferred`.

**Signature**

```ts
export declare const dieSync: any
```

Added in v1.0.0

## done

Exits the `Deferred` with the specified `Exit` value, which will be
propagated to all fibers waiting on the value of the `Deferred`.

**Signature**

```ts
export declare const done: any
```

Added in v1.0.0

## fail

Fails the `Deferred` with the specified error, which will be propagated to
all fibers waiting on the value of the `Deferred`.

**Signature**

```ts
export declare const fail: any
```

Added in v1.0.0

## failCause

Fails the `Deferred` with the specified `Cause`, which will be propagated to
all fibers waiting on the value of the `Deferred`.

**Signature**

```ts
export declare const failCause: any
```

Added in v1.0.0

## failCauseSync

Fails the `Deferred` with the specified `Cause`, which will be propagated to
all fibers waiting on the value of the `Deferred`.

**Signature**

```ts
export declare const failCauseSync: any
```

Added in v1.0.0

## failSync

Fails the `Deferred` with the specified error, which will be propagated to
all fibers waiting on the value of the `Deferred`.

**Signature**

```ts
export declare const failSync: any
```

Added in v1.0.0

## interrupt

Completes the `Deferred` with interruption. This will interrupt all fibers
waiting on the value of the `Deferred` with the `FiberId` of the fiber
calling this method.

**Signature**

```ts
export declare const interrupt: any
```

Added in v1.0.0

## interruptAs

Completes the `Deferred` with interruption. This will interrupt all fibers
waiting on the value of the `Deferred` with the specified `FiberId`.

**Signature**

```ts
export declare const interruptAs: any
```

Added in v1.0.0

## succeed

Completes the `Deferred` with the specified value.

**Signature**

```ts
export declare const succeed: any
```

Added in v1.0.0

## sync

Completes the `Deferred` with the specified value.

**Signature**

```ts
export declare const sync: any
```

Added in v1.0.0

# symbols

## DeferredTypeId

**Signature**

```ts
export declare const DeferredTypeId: typeof DeferredTypeId
```

Added in v1.0.0

## DeferredTypeId (type alias)

**Signature**

```ts
export type DeferredTypeId = typeof DeferredTypeId
```

Added in v1.0.0

# unsafe

## unsafeDone

Unsafely exits the `Deferred` with the specified `Exit` value, which will be
propagated to all fibers waiting on the value of the `Deferred`.

**Signature**

```ts
export declare const unsafeDone: any
```

Added in v1.0.0

## unsafeMake

Unsafely creates a new `Deferred` from the specified `FiberId`.

**Signature**

```ts
export declare const unsafeMake: any
```

Added in v1.0.0
