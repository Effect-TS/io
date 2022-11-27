---
title: DefaultServices.ts
nav_order: 9
parent: Modules
---

## DefaultServices overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [liveServices](#liveservices)
- [fiberRefs](#fiberrefs)
  - [currentServices](#currentservices)
- [models](#models)
  - [DefaultServices (type alias)](#defaultservices-type-alias)

---

# constructors

## liveServices

**Signature**

```ts
export declare const liveServices: Context.Context<DefaultServices>
```

Added in v1.0.0

# fiberRefs

## currentServices

**Signature**

```ts
export declare const currentServices: FiberRef.FiberRef<Context.Context<DefaultServices>>
```

Added in v1.0.0

# models

## DefaultServices (type alias)

**Signature**

```ts
export type DefaultServices = Clock.Clock | Random.Random | ConfigProvider.ConfigProvider
```

Added in v1.0.0
