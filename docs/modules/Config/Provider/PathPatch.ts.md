---
title: Config/Provider/PathPatch.ts
nav_order: 7
parent: Modules
---

## PathPatch overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [andThen](#andthen)
  - [empty](#empty)
  - [mapName](#mapname)
  - [nested](#nested)
  - [unnested](#unnested)
- [models](#models)
  - [AndThen (interface)](#andthen-interface)
  - [Empty (interface)](#empty-interface)
  - [MapName (interface)](#mapname-interface)
  - [Nested (interface)](#nested-interface)
  - [PathPatch (type alias)](#pathpatch-type-alias)
  - [Unnested (interface)](#unnested-interface)

---

# constructors

## andThen

**Signature**

```ts
export declare const andThen: {
  (self: PathPatch, that: PathPatch): PathPatch
  (that: PathPatch): (self: PathPatch) => PathPatch
}
```

Added in v1.0.0

## empty

**Signature**

```ts
export declare const empty: PathPatch
```

Added in v1.0.0

## mapName

**Signature**

```ts
export declare const mapName: {
  (self: PathPatch, f: (string: string) => string): PathPatch
  (f: (string: string) => string): (self: PathPatch) => PathPatch
}
```

Added in v1.0.0

## nested

**Signature**

```ts
export declare const nested: {
  (self: PathPatch, name: string): PathPatch
  (name: string): (self: PathPatch) => PathPatch
}
```

Added in v1.0.0

## unnested

**Signature**

```ts
export declare const unnested: {
  (self: PathPatch, name: string): PathPatch
  (name: string): (self: PathPatch) => PathPatch
}
```

Added in v1.0.0

# models

## AndThen (interface)

**Signature**

```ts
export interface AndThen {
  readonly _tag: 'AndThen'
  readonly first: PathPatch
  readonly second: PathPatch
}
```

Added in v1.0.0

## Empty (interface)

**Signature**

```ts
export interface Empty {
  readonly _tag: 'Empty'
}
```

Added in v1.0.0

## MapName (interface)

**Signature**

```ts
export interface MapName {
  readonly _tag: 'MapName'
  readonly f: (string: string) => string
}
```

Added in v1.0.0

## Nested (interface)

**Signature**

```ts
export interface Nested {
  readonly _tag: 'Nested'
  readonly name: string
}
```

Added in v1.0.0

## PathPatch (type alias)

Represents a description of how to modify the path to a configuration
value.

**Signature**

```ts
export type PathPatch = Empty | AndThen | MapName | Nested | Unnested
```

Added in v1.0.0

## Unnested (interface)

**Signature**

```ts
export interface Unnested {
  readonly _tag: 'Unnested'
  readonly name: string
}
```

Added in v1.0.0
