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
export declare const counter: (_key: MetricKey.Counter) => MetricHook.Counter
```

Added in v1.0.0

## frequency

**Signature**

```ts
export declare const frequency: (_key: MetricKey.Frequency) => MetricHook.Frequency
```

Added in v1.0.0

## gauge

**Signature**

```ts
export declare const gauge: (_key: MetricKey.Gauge, startAt: number) => MetricHook.Gauge
```

Added in v1.0.0

## histogram

**Signature**

```ts
export declare const histogram: (key: MetricKey.Histogram) => MetricHook.Histogram
```

Added in v1.0.0

## make

**Signature**

```ts
export declare const make: <In, Out>(get: () => Out, update: (input: In) => void) => MetricHook<In, Out>
```

Added in v1.0.0

## summary

**Signature**

```ts
export declare const summary: (key: MetricKey.Summary) => MetricHook.Summary
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
export declare const onUpdate: <In, Out>(f: (input: In) => void) => (self: MetricHook<In, Out>) => MetricHook<In, Out>
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
