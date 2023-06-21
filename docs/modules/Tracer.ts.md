---
title: Tracer.ts
nav_order: 58
parent: Modules
---

## Tracer overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [tracerWith](#tracerwith)
- [utils](#utils)
  - [ExternalSpan (interface)](#externalspan-interface)
  - [ParentSpan (type alias)](#parentspan-type-alias)
  - [Span (interface)](#span-interface)
  - [SpanStatus (type alias)](#spanstatus-type-alias)
  - [Tracer](#tracer)
  - [Tracer (interface)](#tracer-interface)
  - [TracerTypeId](#tracertypeid)
  - [TracerTypeId (type alias)](#tracertypeid-type-alias)
  - [make](#make)

---

# constructors

## tracerWith

**Signature**

```ts
export declare const tracerWith: <R, E, A>(f: (tracer: Tracer) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
```

Added in v1.0.0

# utils

## ExternalSpan (interface)

**Signature**

```ts
export interface ExternalSpan {
  readonly _tag: 'ExternalSpan'
  readonly name: string
  readonly spanId: string
  readonly traceId: string
}
```

Added in v1.0.0

## ParentSpan (type alias)

**Signature**

```ts
export type ParentSpan = Span | ExternalSpan
```

Added in v1.0.0

## Span (interface)

**Signature**

```ts
export interface Span {
  readonly _tag: 'Span'
  readonly name: string
  readonly spanId: string
  readonly traceId: string
  readonly parent: Option.Option<ParentSpan>
  readonly status: SpanStatus
  readonly attributes: ReadonlyMap<string, string>
  readonly end: (endTime: number, exit: Exit.Exit<unknown, unknown>) => void
  readonly attribute: (key: string, value: string) => void
}
```

Added in v1.0.0

## SpanStatus (type alias)

**Signature**

```ts
export type SpanStatus =
  | {
      _tag: 'Started'
      startTime: number
    }
  | {
      _tag: 'Ended'
      startTime: number
      endTime: number
      exit: Exit.Exit<unknown, unknown>
    }
```

Added in v1.0.0

## Tracer

**Signature**

```ts
export declare const Tracer: Context.Tag<Tracer, Tracer>
```

Added in v1.0.0

## Tracer (interface)

**Signature**

```ts
export interface Tracer {
  readonly [TracerTypeId]: TracerTypeId
  readonly span: (name: string, parent: Option.Option<ParentSpan>, startTime: number) => Span
}
```

Added in v1.0.0

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

## make

**Signature**

```ts
export declare const make: (options: Omit<Tracer, TracerTypeId>) => Tracer
```

Added in v1.0.0
