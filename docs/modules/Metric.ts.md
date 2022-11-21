---
title: Metric.ts
nav_order: 24
parent: Modules
---

## Metric overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [aspects](#aspects)
  - [increment](#increment)
  - [incrementBy](#incrementby)
  - [set](#set)
  - [trackAll](#trackall)
  - [trackDefect](#trackdefect)
  - [trackDefectWith](#trackdefectwith)
  - [trackDuration](#trackduration)
  - [trackDurationWith](#trackdurationwith)
  - [trackError](#trackerror)
  - [trackErrorWith](#trackerrorwith)
  - [trackSuccess](#tracksuccess)
  - [trackSuccessWith](#tracksuccesswith)
- [constructors](#constructors)
  - [counter](#counter)
  - [frequency](#frequency)
  - [fromConst](#fromconst)
  - [fromMetricKey](#frommetrickey)
  - [gauge](#gauge)
  - [histogram](#histogram)
  - [make](#make)
  - [succeed](#succeed)
  - [summary](#summary)
  - [summaryTimestamp](#summarytimestamp)
  - [sync](#sync)
  - [timer](#timer)
- [getters](#getters)
  - [value](#value)
- [globals](#globals)
  - [globalMetricRegistry](#globalmetricregistry)
- [mapping](#mapping)
  - [contramap](#contramap)
  - [map](#map)
  - [mapType](#maptype)
- [models](#models)
  - [Metric (interface)](#metric-interface)
  - [MetricApply (interface)](#metricapply-interface)
- [mutations](#mutations)
  - [tagged](#tagged)
  - [taggedWith](#taggedwith)
  - [taggedWithLabelSet](#taggedwithlabelset)
  - [taggedWithLabels](#taggedwithlabels)
  - [update](#update)
  - [withNow](#withnow)
- [symbols](#symbols)
  - [MetricTypeId](#metrictypeid)
  - [MetricTypeId (type alias)](#metrictypeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeSnapshot](#unsafesnapshot)
- [zipping](#zipping)
  - [zip](#zip)

---

# aspects

## increment

**Signature**

```ts
export declare const increment: any
```

Added in v1.0.0

## incrementBy

**Signature**

```ts
export declare const incrementBy: any
```

Added in v1.0.0

## set

**Signature**

```ts
export declare const set: any
```

Added in v1.0.0

## trackAll

Returns an aspect that will update this metric with the specified constant
value every time the aspect is applied to an effect, regardless of whether
that effect fails or succeeds.

**Signature**

```ts
export declare const trackAll: any
```

Added in v1.0.0

## trackDefect

Returns an aspect that will update this metric with the defects of the
effects that it is applied to.

**Signature**

```ts
export declare const trackDefect: any
```

Added in v1.0.0

## trackDefectWith

Returns an aspect that will update this metric with the result of applying
the specified function to the defect throwables of the effects that the
aspect is applied to.

**Signature**

```ts
export declare const trackDefectWith: any
```

Added in v1.0.0

## trackDuration

Returns an aspect that will update this metric with the duration that the
effect takes to execute. To call this method, the input type of the metric
must be `Duration`.

**Signature**

```ts
export declare const trackDuration: any
```

Added in v1.0.0

## trackDurationWith

Returns an aspect that will update this metric with the duration that the
effect takes to execute. To call this method, you must supply a function
that can convert the `Duration` to the input type of this metric.

**Signature**

```ts
export declare const trackDurationWith: any
```

Added in v1.0.0

## trackError

Returns an aspect that will update this metric with the failure value of
the effects that it is applied to.

**Signature**

```ts
export declare const trackError: any
```

Added in v1.0.0

## trackErrorWith

Returns an aspect that will update this metric with the result of applying
the specified function to the error value of the effects that the aspect is
applied to.

**Signature**

```ts
export declare const trackErrorWith: any
```

Added in v1.0.0

## trackSuccess

Returns an aspect that will update this metric with the success value of
the effects that it is applied to.

**Signature**

```ts
export declare const trackSuccess: any
```

Added in v1.0.0

## trackSuccessWith

Returns an aspect that will update this metric with the result of applying
the specified function to the success value of the effects that the aspect is
applied to.

**Signature**

```ts
export declare const trackSuccessWith: any
```

Added in v1.0.0

# constructors

## counter

A counter, which can be incremented by numbers.

**Signature**

```ts
export declare const counter: any
```

Added in v1.0.0

## frequency

A string histogram metric, which keeps track of the counts of different
strings.

**Signature**

```ts
export declare const frequency: any
```

Added in v1.0.0

## fromConst

Returns a new metric that is powered by this one, but which accepts updates
of any type, and translates them to updates with the specified constant
update value.

**Signature**

```ts
export declare const fromConst: any
```

Added in v1.0.0

## fromMetricKey

**Signature**

```ts
export declare const fromMetricKey: any
```

Added in v1.0.0

## gauge

A gauge, which can be set to a value.

**Signature**

```ts
export declare const gauge: any
```

Added in v1.0.0

## histogram

A numeric histogram metric, which keeps track of the count of numbers that
fall in bins with the specified boundaries.

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

## succeed

Creates a metric that ignores input and produces constant output.

**Signature**

```ts
export declare const succeed: any
```

Added in v1.0.0

## summary

**Signature**

```ts
export declare const summary: any
```

Added in v1.0.0

## summaryTimestamp

**Signature**

```ts
export declare const summaryTimestamp: any
```

Added in v1.0.0

## sync

Creates a metric that ignores input and produces constant output.

**Signature**

```ts
export declare const sync: any
```

Added in v1.0.0

## timer

Creates a timer metric, based on a histogram, which keeps track of
durations in milliseconds. The unit of time will automatically be added to
the metric as a tag (i.e. `"time_unit: milliseconds"`).

**Signature**

```ts
export declare const timer: any
```

Added in v1.0.0

# getters

## value

Retrieves a snapshot of the value of the metric at this moment in time.

**Signature**

```ts
export declare const value: any
```

Added in v1.0.0

# globals

## globalMetricRegistry

**Signature**

```ts
export declare const globalMetricRegistry: any
```

Added in v1.0.0

# mapping

## contramap

Returns a new metric that is powered by this one, but which accepts updates
of the specified new type, which must be transformable to the input type of
this metric.

**Signature**

```ts
export declare const contramap: any
```

Added in v1.0.0

## map

Returns a new metric that is powered by this one, but which outputs a new
state type, determined by transforming the state type of this metric by the
specified function.

**Signature**

```ts
export declare const map: any
```

Added in v1.0.0

## mapType

**Signature**

```ts
export declare const mapType: any
```

Added in v1.0.0

# models

## Metric (interface)

A `Metric<Type, In, Out>` represents a concurrent metric which accepts
updates of type `In` and are aggregated to a stateful value of type `Out`.

For example, a counter metric would have type `Metric<number, number>`,
representing the fact that the metric can be updated with numbers (the amount
to increment or decrement the counter by), and the state of the counter is a
number.

There are five primitive metric types supported by Effect:

- Counters
- Frequencies
- Gauges
- Histograms
- Summaries

**Signature**

```ts
export interface Metric<Type, In, Out> extends Metric.Variance<Type, In, Out> {
  /**
   * The type of the underlying primitive metric. For example, this could be
   * `MetricKeyType.Counter` or `MetricKeyType.Gauge`.
   */
  readonly keyType: Type
  readonly unsafeUpdate: (input: In, extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => void
  readonly unsafeValue: (extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => Out
  /**
   * @macro traced
   */
  <R, E, A extends In>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
}
```

Added in v1.0.0

## MetricApply (interface)

**Signature**

```ts
export interface MetricApply {
  <Type, In, Out>(
    keyType: Type,
    unsafeUpdate: (input: In, extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => void,
    unsafeValue: (extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => Out
  ): Metric<Type, In, Out>
}
```

Added in v1.0.0

# mutations

## tagged

Returns a new metric, which is identical in every way to this one, except
the specified tags have been added to the tags of this metric.

**Signature**

```ts
export declare const tagged: any
```

Added in v1.0.0

## taggedWith

Returns a new metric, which is identical in every way to this one, except
dynamic tags are added based on the update values. Note that the metric
returned by this method does not return any useful information, due to the
dynamic nature of the added tags.

**Signature**

```ts
export declare const taggedWith: any
```

Added in v1.0.0

## taggedWithLabelSet

Returns a new metric, which is identical in every way to this one, except
the specified tags have been added to the tags of this metric.

**Signature**

```ts
export declare const taggedWithLabelSet: any
```

Added in v1.0.0

## taggedWithLabels

Returns a new metric, which is identical in every way to this one, except
the specified tags have been added to the tags of this metric.

**Signature**

```ts
export declare const taggedWithLabels: any
```

Added in v1.0.0

## update

Updates the metric with the specified update message. For example, if the
metric were a counter, the update would increment the method by the
provided amount.

**Signature**

```ts
export declare const update: any
```

Added in v1.0.0

## withNow

**Signature**

```ts
export declare const withNow: any
```

Added in v1.0.0

# symbols

## MetricTypeId

**Signature**

```ts
export declare const MetricTypeId: typeof MetricTypeId
```

Added in v1.0.0

## MetricTypeId (type alias)

**Signature**

```ts
export type MetricTypeId = typeof MetricTypeId
```

Added in v1.0.0

# unsafe

## unsafeSnapshot

Unsafely captures a snapshot of all metrics recorded by the application.

**Signature**

```ts
export declare const unsafeSnapshot: any
```

Added in v1.0.0

# zipping

## zip

**Signature**

```ts
export declare const zip: any
```

Added in v1.0.0
