---
title: Tracer.ts
nav_order: 51
parent: Modules
---

## Tracer overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [fiberRefs](#fiberrefs)
  - [currentTracer](#currenttracer)
- [models](#models)
  - [Tracer (interface)](#tracer-interface)
- [symbols](#symbols)
  - [TracerTypeId](#tracertypeid)
  - [TracerTypeId (type alias)](#tracertypeid-type-alias)

---

# constructors

## make

**Signature**

```ts
export declare const make: (
  withSpan: (spanName: string, trace?: string | undefined) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
) => Tracer
```

Added in v1.0.0

# fiberRefs

## currentTracer

**Signature**

```ts
export declare const currentTracer: FiberRef<Option.Option<Tracer>>
```

Added in v1.0.0

# models

## Tracer (interface)

The Tracer service is used to provide tracing facilities to Effect.

This service is meant to be implemented by exporters such as opentelemetry.

**Signature**

```ts
export interface Tracer {
  readonly _id: TracerTypeId
  readonly withSpan: (spanName: string, trace?: string) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
}
```

Added in v1.0.0

# symbols

## TracerTypeId

**Signature**

```ts
export declare const TracerTypeId: typeof TracerTypeId
```

Added in v1.0.0

## TracerTypeId (type alias)

**Signature**

```ts
export type TracerTypeId = typeof TracerTypeId
```

Added in v1.0.0
