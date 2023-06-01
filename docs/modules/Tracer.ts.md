---
title: Tracer.ts
nav_order: 58
parent: Modules
---

## Tracer overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [ExternalSpan (interface)](#externalspan-interface)
  - [ParentSpan (type alias)](#parentspan-type-alias)
  - [Span](#span)
  - [Span (interface)](#span-interface)
  - [SpanStatus (type alias)](#spanstatus-type-alias)
  - [Tracer](#tracer)
  - [Tracer (interface)](#tracer-interface)
  - [TracerTypeId](#tracertypeid)
  - [TracerTypeId (type alias)](#tracertypeid-type-alias)
  - [make](#make)
  - [useSpan](#usespan)
  - [withSpan](#withspan)

---

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

## Span

**Signature**

```ts
export declare const Span: Context.Tag<Span, Span>
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

## useSpan

**Signature**

```ts
export declare const useSpan: {
  <R, E, A>(name: string, evaluate: (span: Span) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
  <R, E, A>(
    name: string,
    options: { attributes?: Record<string, string>; parent?: ParentSpan; root?: boolean },
    evaluate: (span: Span) => Effect.Effect<R, E, A>
  ): Effect.Effect<R, E, A>
}
```

Added in v1.0.0

## withSpan

**Signature**

```ts
export declare const withSpan: {
  (name: string, options?: { attributes?: Record<string, string>; parent?: ParentSpan; root?: boolean }): <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<Exclude<R, Span>, E, A>
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    name: string,
    options?: { attributes?: Record<string, string>; parent?: ParentSpan; root?: boolean }
  ): Effect.Effect<Exclude<R, Span>, E, A>
}
```

Added in v1.0.0
