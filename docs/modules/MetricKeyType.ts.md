---
title: MetricKeyType.ts
nav_order: 32
parent: Modules
---

## MetricKeyType overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [counter](#counter)
  - [frequency](#frequency)
  - [gauge](#gauge)
  - [histogram](#histogram)
  - [summary](#summary)
- [modelz](#modelz)
  - [MetricKeyType (interface)](#metrickeytype-interface)
- [refinements](#refinements)
  - [isCounterKey](#iscounterkey)
  - [isFrequencyKey](#isfrequencykey)
  - [isGaugeKey](#isgaugekey)
  - [isHistogramKey](#ishistogramkey)
  - [isMetricKeyType](#ismetrickeytype)
  - [isSummaryKey](#issummarykey)
- [symbols](#symbols)
  - [CounterKeyTypeTypeId](#counterkeytypetypeid)
  - [CounterKeyTypeTypeId (type alias)](#counterkeytypetypeid-type-alias)
  - [FrequencyKeyTypeTypeId](#frequencykeytypetypeid)
  - [FrequencyKeyTypeTypeId (type alias)](#frequencykeytypetypeid-type-alias)
  - [GaugeKeyTypeTypeId](#gaugekeytypetypeid)
  - [GaugeKeyTypeTypeId (type alias)](#gaugekeytypetypeid-type-alias)
  - [HistogramKeyTypeTypeId](#histogramkeytypetypeid)
  - [HistogramKeyTypeTypeId (type alias)](#histogramkeytypetypeid-type-alias)
  - [MetricKeyTypeTypeId](#metrickeytypetypeid)
  - [MetricKeyTypeTypeId (type alias)](#metrickeytypetypeid-type-alias)
  - [SummaryKeyTypeTypeId](#summarykeytypetypeid)
  - [SummaryKeyTypeTypeId (type alias)](#summarykeytypetypeid-type-alias)

---

# constructors

## counter

**Signature**

```ts
export declare const counter: MetricKeyType.Counter
```

Added in v1.0.0

## frequency

**Signature**

```ts
export declare const frequency: MetricKeyType.Frequency
```

Added in v1.0.0

## gauge

**Signature**

```ts
export declare const gauge: MetricKeyType.Gauge
```

Added in v1.0.0

## histogram

**Signature**

```ts
export declare const histogram: (boundaries: MetricBoundaries.MetricBoundaries) => MetricKeyType.Histogram
```

Added in v1.0.0

## summary

**Signature**

```ts
export declare const summary: (options: {
  readonly maxAge: Duration.DurationInput
  readonly maxSize: number
  readonly error: number
  readonly quantiles: Chunk.Chunk<number>
}) => MetricKeyType.Summary
```

Added in v1.0.0

# modelz

## MetricKeyType (interface)

**Signature**

```ts
export interface MetricKeyType<In, Out> extends MetricKeyType.Variance<In, Out>, Equal.Equal, Pipeable {}
```

Added in v1.0.0

# refinements

## isCounterKey

**Signature**

```ts
export declare const isCounterKey: (u: unknown) => u is MetricKeyType.Counter
```

Added in v1.0.0

## isFrequencyKey

**Signature**

```ts
export declare const isFrequencyKey: (u: unknown) => u is MetricKeyType.Frequency
```

Added in v1.0.0

## isGaugeKey

**Signature**

```ts
export declare const isGaugeKey: (u: unknown) => u is MetricKeyType.Gauge
```

Added in v1.0.0

## isHistogramKey

**Signature**

```ts
export declare const isHistogramKey: (u: unknown) => u is MetricKeyType.Histogram
```

Added in v1.0.0

## isMetricKeyType

**Signature**

```ts
export declare const isMetricKeyType: (u: unknown) => u is MetricKeyType<unknown, unknown>
```

Added in v1.0.0

## isSummaryKey

**Signature**

```ts
export declare const isSummaryKey: (u: unknown) => u is MetricKeyType.Summary
```

Added in v1.0.0

# symbols

## CounterKeyTypeTypeId

**Signature**

```ts
export declare const CounterKeyTypeTypeId: typeof CounterKeyTypeTypeId
```

Added in v1.0.0

## CounterKeyTypeTypeId (type alias)

**Signature**

```ts
export type CounterKeyTypeTypeId = typeof CounterKeyTypeTypeId
```

Added in v1.0.0

## FrequencyKeyTypeTypeId

**Signature**

```ts
export declare const FrequencyKeyTypeTypeId: typeof FrequencyKeyTypeTypeId
```

Added in v1.0.0

## FrequencyKeyTypeTypeId (type alias)

**Signature**

```ts
export type FrequencyKeyTypeTypeId = typeof FrequencyKeyTypeTypeId
```

Added in v1.0.0

## GaugeKeyTypeTypeId

**Signature**

```ts
export declare const GaugeKeyTypeTypeId: typeof GaugeKeyTypeTypeId
```

Added in v1.0.0

## GaugeKeyTypeTypeId (type alias)

**Signature**

```ts
export type GaugeKeyTypeTypeId = typeof GaugeKeyTypeTypeId
```

Added in v1.0.0

## HistogramKeyTypeTypeId

**Signature**

```ts
export declare const HistogramKeyTypeTypeId: typeof HistogramKeyTypeTypeId
```

Added in v1.0.0

## HistogramKeyTypeTypeId (type alias)

**Signature**

```ts
export type HistogramKeyTypeTypeId = typeof HistogramKeyTypeTypeId
```

Added in v1.0.0

## MetricKeyTypeTypeId

**Signature**

```ts
export declare const MetricKeyTypeTypeId: typeof MetricKeyTypeTypeId
```

Added in v1.0.0

## MetricKeyTypeTypeId (type alias)

**Signature**

```ts
export type MetricKeyTypeTypeId = typeof MetricKeyTypeTypeId
```

Added in v1.0.0

## SummaryKeyTypeTypeId

**Signature**

```ts
export declare const SummaryKeyTypeTypeId: typeof SummaryKeyTypeTypeId
```

Added in v1.0.0

## SummaryKeyTypeTypeId (type alias)

**Signature**

```ts
export type SummaryKeyTypeTypeId = typeof SummaryKeyTypeTypeId
```

Added in v1.0.0
