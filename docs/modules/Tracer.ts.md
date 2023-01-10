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
export declare const make: <S>(args: Pick<Tracer<S>, 'ref' | 'create' | 'add' | 'status' | 'end'>) => Tracer<S>
```

Added in v1.0.0

# fiberRefs

## currentTracer

**Signature**

```ts
export declare const currentTracer: FiberRef<Option.Option<Tracer<any>>>
```

Added in v1.0.0

# models

## Tracer (interface)

The Tracer service is used to provide tracing facilities to Effect.

This service is meant to be implemented by exporters such as opentelemetry.

**Signature**

```ts
export interface Tracer<S> {
  readonly [TracerTypeId]: TracerTypeId
  readonly ref: FiberRef<Option.Option<S>>
  readonly create: (
    name: string,
    attributes: Record<string, string>,
    parent: Option.Option<S>,
    trace: string | undefined
  ) => S
  readonly add: (span: S, key: string, value: string) => void
  readonly status: (span: S, exit: Exit<any, any>) => void
  readonly end: (span: S) => void
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
