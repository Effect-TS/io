---
title: Metric/Hook.ts
nav_order: 26
parent: Modules
---

## Hook overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [counter](#counter)
  - [frequency](#frequency)
  - [gauge](#gauge)
  - [histogram](#histogram)
  - [make](#make)
  - [summary](#summary)
- [models](#models)
  - [MetricHook (interface)](#metrichook-interface)
- [mutations](#mutations)
  - [onUpdate](#onupdate)
- [symbols](#symbols)
  - [MetricHookTypeId](#metrichooktypeid)
  - [MetricHookTypeId (type alias)](#metrichooktypeid-type-alias)

---

# constructors

## counter

**Signature**

```ts
export declare const counter: any
```

Added in v1.0.0

## frequency

**Signature**

```ts
export declare const frequency: any
```

Added in v1.0.0

## gauge

**Signature**

```ts
export declare const gauge: any
```

Added in v1.0.0

## histogram

**Signature**

```ts
export declare const histogram: any
```

Added in v1.0.0

## make

**Signature**

```ts
export declare const make: any
```

Added in v1.0.0

## summary

**Signature**

```ts
export declare const summary: any
```

Added in v1.0.0

# models

## MetricHook (interface)

**Signature**

```ts
export interface MetricHook<In, Out> extends MetricHook.Variance<In, Out> {
  readonly get: () => Out
  readonly update: (input: In) => void
}
```

Added in v1.0.0

# mutations

## onUpdate

**Signature**

```ts
export declare const onUpdate: any
```

Added in v1.0.0

# symbols

## MetricHookTypeId

**Signature**

```ts
export declare const MetricHookTypeId: typeof MetricHookTypeId
```

Added in v1.0.0

## MetricHookTypeId (type alias)

**Signature**

```ts
export type MetricHookTypeId = typeof MetricHookTypeId
```

Added in v1.0.0
