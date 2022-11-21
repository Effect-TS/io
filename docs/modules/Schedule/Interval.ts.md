---
title: Schedule/Interval.ts
nav_order: 42
parent: Modules
---

## Interval overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [after](#after)
  - [before](#before)
  - [empty](#empty)
  - [make](#make)
- [getters](#getters)
  - [size](#size)
- [models](#models)
  - [Interval (interface)](#interval-interface)
- [mutations](#mutations)
  - [union](#union)
- [ordering](#ordering)
  - [intersect](#intersect)
  - [isEmpty](#isempty)
  - [isNonEmpty](#isnonempty)
  - [lessThan](#lessthan)
  - [max](#max)
  - [min](#min)
- [symbols](#symbols)
  - [IntervalTypeId](#intervaltypeid)
  - [IntervalTypeId (type alias)](#intervaltypeid-type-alias)

---

# constructors

## after

Construct an `Interval` that includes all time equal to and after the
specified start time.

**Signature**

```ts
export declare const after: any
```

Added in v1.0.0

## before

Construct an `Interval` that includes all time equal to and before the
specified end time.

**Signature**

```ts
export declare const before: any
```

Added in v1.0.0

## empty

An `Interval` of zero-width.

**Signature**

```ts
export declare const empty: any
```

Added in v1.0.0

## make

Constructs a new interval from the two specified endpoints. If the start
endpoint greater than the end endpoint, then a zero size interval will be
returned.

**Signature**

```ts
export declare const make: any
```

Added in v1.0.0

# getters

## size

Calculates the size of the `Interval` as the `Duration` from the start of the
interval to the end of the interval.

**Signature**

```ts
export declare const size: any
```

Added in v1.0.0

# models

## Interval (interface)

An `Interval` represents an interval of time. Intervals can encompass all
time, or no time at all.

**Signature**

```ts
export interface Interval {
  readonly [IntervalTypeId]: IntervalTypeId
  readonly startMillis: number
  readonly endMillis: number
}
```

Added in v1.0.0

# mutations

## union

Computes a new `Interval` which is the union of this `Interval` and that
`Interval` as a `Some`, otherwise returns `None` if the two intervals cannot
form a union.

**Signature**

```ts
export declare const union: any
```

Added in v1.0.0

# ordering

## intersect

Computes a new `Interval` which is the intersection of this `Interval` and
that `Interval`.

**Signature**

```ts
export declare const intersect: any
```

Added in v1.0.0

## isEmpty

Returns `true` if the specified `Interval` is empty, `false` otherwise.

**Signature**

```ts
export declare const isEmpty: any
```

Added in v1.0.0

## isNonEmpty

Returns `true` if the specified `Interval` is non-empty, `false` otherwise.

**Signature**

```ts
export declare const isNonEmpty: any
```

Added in v1.0.0

## lessThan

Returns `true` if this `Interval` is less than `that` interval, `false`
otherwise.

**Signature**

```ts
export declare const lessThan: any
```

Added in v1.0.0

## max

Returns the maximum of two `Interval`s.

**Signature**

```ts
export declare const max: any
```

Added in v1.0.0

## min

Returns the minimum of two `Interval`s.

**Signature**

```ts
export declare const min: any
```

Added in v1.0.0

# symbols

## IntervalTypeId

**Signature**

```ts
export declare const IntervalTypeId: typeof IntervalTypeId
```

Added in v1.0.0

## IntervalTypeId (type alias)

**Signature**

```ts
export type IntervalTypeId = typeof IntervalTypeId
```

Added in v1.0.0
