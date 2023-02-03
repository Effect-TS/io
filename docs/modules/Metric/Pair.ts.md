---
title: Metric/Pair.ts
nav_order: 34
parent: Modules
---

## Pair overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [model](#model)
  - [MetricPair (interface)](#metricpair-interface)
- [symbols](#symbols)
  - [MetricPairTypeId](#metricpairtypeid)
  - [MetricPairTypeId (type alias)](#metricpairtypeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeMake](#unsafemake)

---

# constructors

## make

**Signature**

```ts
export declare const make: <Type extends MetricKeyType.MetricKeyType<any, any>>(
  metricKey: MetricKey.MetricKey<Type>,
  metricState: MetricState.MetricState<MetricKeyType.MetricKeyType.OutType<Type>>
) => MetricPair.Untyped
```

Added in v1.0.0

# model

## MetricPair (interface)

**Signature**

```ts
export interface MetricPair<Type extends MetricKeyType.MetricKeyType<any, any>> extends MetricPair.Variance<Type> {
  readonly metricKey: MetricKey.MetricKey<Type>
  readonly metricState: MetricState.MetricState<MetricKeyType.MetricKeyType.OutType<Type>>
}
```

Added in v1.0.0

# symbols

## MetricPairTypeId

**Signature**

```ts
export declare const MetricPairTypeId: typeof MetricPairTypeId
```

Added in v1.0.0

## MetricPairTypeId (type alias)

**Signature**

```ts
export type MetricPairTypeId = typeof MetricPairTypeId
```

Added in v1.0.0

# unsafe

## unsafeMake

**Signature**

```ts
export declare const unsafeMake: <Type extends MetricKeyType.MetricKeyType<any, any>>(
  metricKey: MetricKey.MetricKey<Type>,
  metricState: MetricState.MetricState.Untyped
) => MetricPair.Untyped
```

Added in v1.0.0
