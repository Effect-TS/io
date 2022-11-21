---
title: PollingMetric.ts
nav_order: 33
parent: Modules
---

## PollingMetric overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [collectAll](#collectall)
  - [make](#make)
  - [retry](#retry)
- [models](#models)
  - [PollingMetric (interface)](#pollingmetric-interface)
- [mutations](#mutations)
  - [launch](#launch)
  - [poll](#poll)
  - [pollAndUpdate](#pollandupdate)
  - [zip](#zip)
- [symbols](#symbols)
  - [PollingMetricTypeId](#pollingmetrictypeid)
  - [PollingMetricTypeId (type alias)](#pollingmetrictypeid-type-alias)

---

# constructors

## collectAll

Collects all of the polling metrics into a single polling metric, which
polls for, updates, and produces the outputs of all individual metrics.

**Signature**

```ts
export declare const collectAll: any
```

Added in v1.0.0

## make

Constructs a new polling metric from a metric and poll effect.

**Signature**

```ts
export declare const make: any
```

Added in v1.0.0

## retry

Returns a new polling metric whose poll function will be retried with the
specified retry policy.

**Signature**

```ts
export declare const retry: any
```

Added in v1.0.0

# models

## PollingMetric (interface)

A `PollingMetric` is a combination of a metric and an effect that polls for
updates to the metric.

**Signature**

```ts
export interface PollingMetric<Type, In, R, E, Out> {
  readonly [PollingMetricTypeId]: PollingMetricTypeId
  /**
   * The metric that this `PollingMetric` polls to update.
   */
  readonly metric: Metric.Metric<Type, In, Out>
  /**
   * An effect that polls a value that may be fed to the metric.
   *
   * @macro traced
   */
  poll(): Effect.Effect<R, E, In>
}
```

Added in v1.0.0

# mutations

## launch

Returns an effect that will launch the polling metric in a background
fiber, using the specified schedule.

**Signature**

```ts
export declare const launch: any
```

Added in v1.0.0

## poll

An effect that polls a value that may be fed to the metric.

**Signature**

```ts
export declare const poll: any
```

Added in v1.0.0

## pollAndUpdate

An effect that polls for a value and uses the value to update the metric.

**Signature**

```ts
export declare const pollAndUpdate: any
```

Added in v1.0.0

## zip

Zips this polling metric with the specified polling metric.

**Signature**

```ts
export declare const zip: any
```

Added in v1.0.0

# symbols

## PollingMetricTypeId

**Signature**

```ts
export declare const PollingMetricTypeId: typeof PollingMetricTypeId
```

Added in v1.0.0

## PollingMetricTypeId (type alias)

**Signature**

```ts
export type PollingMetricTypeId = typeof PollingMetricTypeId
```

Added in v1.0.0
