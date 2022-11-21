---
title: Tracer.ts
nav_order: 47
parent: Modules
---

## Tracer overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [models](#models)
  - [Span (interface)](#span-interface)
- [refinements](#refinements)
  - [isSpan](#isspan)
- [symbols](#symbols)
  - [SpanTypeId](#spantypeid)
  - [SpanTypeId (type alias)](#spantypeid-type-alias)

---

# models

## Span (interface)

**Signature**

```ts
export interface Span {
  readonly [SpanTypeId]: SpanTypeId
  readonly parent: Option<Span>
  readonly name: string
  readonly trace?: string
}
```

Added in v1.0.0

# refinements

## isSpan

Returns `true` if the specified value is a `Span`, `false` otherwise.

**Signature**

```ts
export declare const isSpan: (u: unknown) => u is Span
```

Added in v1.0.0

# symbols

## SpanTypeId

**Signature**

```ts
export declare const SpanTypeId: typeof SpanTypeId
```

Added in v1.0.0

## SpanTypeId (type alias)

**Signature**

```ts
export type SpanTypeId = typeof SpanTypeId
```

Added in v1.0.0
