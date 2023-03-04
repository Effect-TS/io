---
title: Tracer.ts
nav_order: 54
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
  - [SpanEvent (type alias)](#spanevent-type-alias)
  - [SpanStatus (type alias)](#spanstatus-type-alias)
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
export declare const Span: Context.Tag<Span>
```

Added in v1.0.0

## Span (interface)

**Signature**

```ts
export interface Span {
  readonly _tag: 'Span'
  readonly name: string
  readonly parent: Option.Option<ParentSpan>
  readonly status: MutableRef.MutableRef<SpanStatus>
  readonly attributes: Map<string, string>
  readonly events: Array<SpanEvent>
}
```

Added in v1.0.0

## SpanEvent (type alias)

**Signature**

```ts
export type SpanEvent =
  | {
      readonly _tag: 'Create'
      readonly time: number
      readonly attributes: Record<string, string>
    }
  | {
      readonly _tag: 'End'
      readonly time: number
      readonly exit: Exit.Exit<unknown, unknown>
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

## withSpan

**Signature**

```ts
export declare const withSpan: {
  (
    name: string,
    options?:
      | {
          attributes?: Record<string, string> | undefined
          parent?: Span | ExternalSpan | undefined
          root?: boolean | undefined
        }
      | undefined
  ): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Span>, E, A>
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    name: string,
    options?:
      | {
          attributes?: Record<string, string> | undefined
          parent?: Span | ExternalSpan | undefined
          root?: boolean | undefined
        }
      | undefined
  ): Effect.Effect<Exclude<R, Span>, E, A>
}
```

Added in v1.0.0
