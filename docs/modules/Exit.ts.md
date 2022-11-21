---
title: Exit.ts
nav_order: 9
parent: Modules
---

## Exit overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [collectAll](#collectall)
  - [collectAllPar](#collectallpar)
  - [die](#die)
  - [fail](#fail)
  - [failCause](#failcause)
  - [interrupt](#interrupt)
  - [succeed](#succeed)
  - [unit](#unit)
- [conversions](#conversions)
  - [fromEither](#fromeither)
  - [fromOption](#fromoption)
- [elements](#elements)
  - [exists](#exists)
- [folding](#folding)
  - [match](#match)
  - [matchEffect](#matcheffect)
- [getters](#getters)
  - [causeOption](#causeoption)
  - [getOrElse](#getorelse)
  - [isInterrupted](#isinterrupted)
- [mapping](#mapping)
  - [as](#as)
  - [asUnit](#asunit)
  - [map](#map)
  - [mapBoth](#mapboth)
  - [mapError](#maperror)
  - [mapErrorCause](#maperrorcause)
- [models](#models)
  - [Exit (type alias)](#exit-type-alias)
  - [Failure (interface)](#failure-interface)
  - [Success (interface)](#success-interface)
- [refinements](#refinements)
  - [isExit](#isexit)
  - [isFailure](#isfailure)
  - [isSuccess](#issuccess)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
  - [flatMapEffect](#flatmapeffect)
  - [flatten](#flatten)
- [traversing](#traversing)
  - [forEachEffect](#foreacheffect)
- [zipping](#zipping)
  - [zip](#zip)
  - [zipLeft](#zipleft)
  - [zipPar](#zippar)
  - [zipParLeft](#zipparleft)
  - [zipParRight](#zipparright)
  - [zipRight](#zipright)
  - [zipWith](#zipwith)

---

# constructors

## collectAll

Collects all of the specified exit values into a `Some<Exit<E, List<A>>>`. If
the provided iterable contains no elements, `None` will be returned.

**Note**: `Exit.collectAll` combines `Cause` values sequentially.

**Signature**

```ts
export declare const collectAll: any
```

Added in v1.0.0

## collectAllPar

Collects all of the specified exit values into a `Some<Exit<E, List<A>>>`. If
the provided iterable contains no elements, `None` will be returned.

**Note**: `Exit.collectAll` combines `Cause` values in parallel.

**Signature**

```ts
export declare const collectAllPar: any
```

Added in v1.0.0

## die

Constructs a new `Exit.Failure` from the specified unrecoverable defect.

**Signature**

```ts
export declare const die: any
```

Added in v1.0.0

## fail

Constructs a new `Exit.Failure` from the specified recoverable error of type
`E`.

**Signature**

```ts
export declare const fail: any
```

Added in v1.0.0

## failCause

Constructs a new `Exit.Failure` from the specified `Cause` of type `E`.

**Signature**

```ts
export declare const failCause: any
```

Added in v1.0.0

## interrupt

Constructs a new `Exit.Failure` from the specified `FiberId` indicating that
the `Fiber` running an `Effect` workflow was terminated due to interruption.

**Signature**

```ts
export declare const interrupt: any
```

Added in v1.0.0

## succeed

Constructs a new `Exit.Success` containing the specified value of type `A`.

**Signature**

```ts
export declare const succeed: any
```

Added in v1.0.0

## unit

Represents an `Exit` which succeeds with `undefined`.

**Signature**

```ts
export declare const unit: any
```

Added in v1.0.0

# conversions

## fromEither

Converts an `Either<E, A>` into an `Exit<E, A>`.

**Signature**

```ts
export declare const fromEither: any
```

Added in v1.0.0

## fromOption

Converts an `Option<A>` into an `Exit<void, A>`.

**Signature**

```ts
export declare const fromOption: any
```

Added in v1.0.0

# elements

## exists

Executes the predicate on the value of the specified exit if it is a
`Success`, otherwise returns `false`.

**Signature**

```ts
export declare const exists: any
```

Added in v1.0.0

# folding

## match

**Signature**

```ts
export declare const match: any
```

Added in v1.0.0

## matchEffect

**Signature**

```ts
export declare const matchEffect: any
```

Added in v1.0.0

# getters

## causeOption

Returns a `Some<Cause<E>>` if the specified exit is a `Failure`, `None`
otherwise.

**Signature**

```ts
export declare const causeOption: any
```

Added in v1.0.0

## getOrElse

Returns the `A` if specified exit is a `Success`, otherwise returns the
alternate `A` value computed from the specified function which receives the
`Cause<E>` of the exit `Failure`.

**Signature**

```ts
export declare const getOrElse: any
```

Added in v1.0.0

## isInterrupted

Returns `true` if the specified exit is a `Failure` **and** the `Cause` of
the failure was due to interruption, `false` otherwise.

**Signature**

```ts
export declare const isInterrupted: any
```

Added in v1.0.0

# mapping

## as

Maps the `Success` value of the specified exit to the provided constant
value.

**Signature**

```ts
export declare const as: any
```

Added in v1.0.0

## asUnit

Maps the `Success` value of the specified exit to a void.

**Signature**

```ts
export declare const asUnit: any
```

Added in v1.0.0

## map

Maps over the `Success` value of the specified exit using the provided
function.

**Signature**

```ts
export declare const map: any
```

Added in v1.0.0

## mapBoth

Maps over the `Success` and `Failure` cases of the specified exit using the
provided functions.

**Signature**

```ts
export declare const mapBoth: any
```

Added in v1.0.0

## mapError

Maps over the error contained in the `Failure` of the specified exit using
the provided function.

**Signature**

```ts
export declare const mapError: any
```

Added in v1.0.0

## mapErrorCause

Maps over the `Cause` contained in the `Failure` of the specified exit using
the provided function.

**Signature**

```ts
export declare const mapErrorCause: any
```

Added in v1.0.0

# models

## Exit (type alias)

An `Exit<E, A>` describes the result of a executing an `Effect` workflow.

There are two possible values for an `Exit<E, A>`:

- `Exit.Success` contain a success value of type `A`
- `Exit.Failure` contains a failure `Cause` of type `E`

**Signature**

```ts
export type Exit<E, A> = Failure<E> | Success<A>
```

Added in v1.0.0

## Failure (interface)

Represents a failed `Effect` workflow containing the `Cause` of the failure
of type `E`.

**Signature**

```ts
export interface Failure<E> extends Effect.Effect<never, E, never> {
  /** @internal */
  readonly op: OpCodes.OP_FAILURE
  readonly cause: Cause.Cause<E>
}
```

Added in v1.0.0

## Success (interface)

Represents a successful `Effect` workflow and containing the returned value
of type `A`.

**Signature**

```ts
export interface Success<A> extends Effect.Effect<never, never, A> {
  /** @internal */
  readonly op: OpCodes.OP_SUCCESS
  readonly value: A
}
```

Added in v1.0.0

# refinements

## isExit

Returns `true` if the specified value is an `Exit`, `false` otherwise.

**Signature**

```ts
export declare const isExit: any
```

Added in v1.0.0

## isFailure

Returns `true` if the specified `Exit` is a `Failure`, `false` otherwise.

**Signature**

```ts
export declare const isFailure: any
```

Added in v1.0.0

## isSuccess

Returns `true` if the specified `Exit` is a `Success`, `false` otherwise.

**Signature**

```ts
export declare const isSuccess: any
```

Added in v1.0.0

# sequencing

## flatMap

**Signature**

```ts
export declare const flatMap: any
```

Added in v1.0.0

## flatMapEffect

**Signature**

```ts
export declare const flatMapEffect: any
```

Added in v1.0.0

## flatten

**Signature**

```ts
export declare const flatten: any
```

Added in v1.0.0

# traversing

## forEachEffect

**Signature**

```ts
export declare const forEachEffect: any
```

Added in v1.0.0

# zipping

## zip

Sequentially zips the this result with the specified result or else returns
the failed `Cause<E | E2>`.

**Signature**

```ts
export declare const zip: any
```

Added in v1.0.0

## zipLeft

Sequentially zips the this result with the specified result discarding the
second element of the tuple or else returns the failed `Cause<E | E2>`.

**Signature**

```ts
export declare const zipLeft: any
```

Added in v1.0.0

## zipPar

Parallelly zips the this result with the specified result or else returns
the failed `Cause<E | E2>`.

**Signature**

```ts
export declare const zipPar: any
```

Added in v1.0.0

## zipParLeft

Parallelly zips the this result with the specified result discarding the
second element of the tuple or else returns the failed `Cause<E | E2>`.

**Signature**

```ts
export declare const zipParLeft: any
```

Added in v1.0.0

## zipParRight

Parallelly zips the this result with the specified result discarding the
first element of the tuple or else returns the failed `Cause<E | E2>`.

**Signature**

```ts
export declare const zipParRight: any
```

Added in v1.0.0

## zipRight

Sequentially zips the this result with the specified result discarding the
first element of the tuple or else returns the failed `Cause<E | E2>`.

**Signature**

```ts
export declare const zipRight: any
```

Added in v1.0.0

## zipWith

Zips this exit together with that exit using the specified combination
functions.

**Signature**

```ts
export declare const zipWith: any
```

Added in v1.0.0
