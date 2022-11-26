---
title: Metric/Key.ts
nav_order: 30
parent: Modules
---

## Key overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [counter](#counter)
  - [frequency](#frequency)
  - [gauge](#gauge)
  - [histogram](#histogram)
  - [summary](#summary)
  - [tagged](#tagged)
  - [taggedWithLabelSet](#taggedwithlabelset)
  - [taggedWithLabels](#taggedwithlabels)
- [models](#models)
  - [MetricKey (interface)](#metrickey-interface)
- [refinements](#refinements)
  - [isMetricKey](#ismetrickey)
- [symbols](#symbols)
  - [MetricKeyTypeId](#metrickeytypeid)
  - [MetricKeyTypeId (type alias)](#metrickeytypeid-type-alias)

---

# constructors

## counter

Creates a metric key for a counter, with the specified name.

**Signature**

```ts
export declare const counter: (name: string) => MetricKey.Counter
```

Added in v1.0.0

## frequency

Creates a metric key for a categorical frequency table, with the specified
name.

**Signature**

```ts
export declare const frequency: (name: string) => MetricKey.Frequency
```

Added in v1.0.0

## gauge

Creates a metric key for a gauge, with the specified name.

**Signature**

```ts
export declare const gauge: (name: string) => MetricKey.Gauge
```

Added in v1.0.0

## histogram

Creates a metric key for a histogram, with the specified name and boundaries.

**Signature**

```ts
export declare const histogram: (name: string, boundaries: MetricBoundaries.MetricBoundaries) => MetricKey.Histogram
```

Added in v1.0.0

## summary

Creates a metric key for a summary, with the specified name, maxAge,
maxSize, error, and quantiles.

**Signature**

```ts
export declare const summary: (
  name: string,
  maxAge: Duration.Duration,
  maxSize: number,
  error: number,
  quantiles: Chunk.Chunk<number>
) => MetricKey.Summary
```

Added in v1.0.0

## tagged

Returns a new `MetricKey` with the specified tag appended.

**Signature**

```ts
export declare const tagged: (
  key: string,
  value: string
) => <Type extends MetricKeyType.MetricKeyType<any, any>>(self: MetricKey<Type>) => MetricKey<Type>
```

Added in v1.0.0

## taggedWithLabelSet

Returns a new `MetricKey` with the specified tags appended.

**Signature**

```ts
export declare const taggedWithLabelSet: (
  extraTags: HashSet.HashSet<MetricLabel.MetricLabel>
) => <Type extends MetricKeyType.MetricKeyType<any, any>>(self: MetricKey<Type>) => MetricKey<Type>
```

Added in v1.0.0

## taggedWithLabels

Returns a new `MetricKey` with the specified tags appended.

**Signature**

```ts
export declare const taggedWithLabels: (
  extraTags: Iterable<MetricLabel.MetricLabel>
) => <Type extends MetricKeyType.MetricKeyType<any, any>>(self: MetricKey<Type>) => MetricKey<Type>
```

Added in v1.0.0

# models

## MetricKey (interface)

A `MetricKey` is a unique key associated with each metric. The key is based
on a combination of the metric type, the name and tags associated with the
metric, and any other information to describe a metric, such as the
boundaries of a histogram. In this way, it is impossible to ever create
different metrics with conflicting keys.

**Signature**

```ts
export interface MetricKey<Type extends MetricKeyType.MetricKeyType<any, any>>
  extends MetricKey.Variance<Type>,
    Equal.Equal {
  readonly name: string
  readonly keyType: Type
  readonly tags: HashSet.HashSet<MetricLabel.MetricLabel>
}
```

Added in v1.0.0

# refinements

## isMetricKey

**Signature**

```ts
export declare const isMetricKey: (u: unknown) => u is MetricKey<MetricKeyType.MetricKeyType<unknown, unknown>>
```

Added in v1.0.0

# symbols

## MetricKeyTypeId

**Signature**

```ts
export declare const MetricKeyTypeId: typeof MetricKeyTypeId
```

Added in v1.0.0

## MetricKeyTypeId (type alias)

**Signature**

```ts
export type MetricKeyTypeId = typeof MetricKeyTypeId
```

Added in v1.0.0
