---
title: Reloadable.ts
nav_order: 37
parent: Modules
---

## Reloadable overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [auto](#auto)
  - [autoFromConfig](#autofromconfig)
  - [manual](#manual)
  - [reload](#reload)
  - [reloadFork](#reloadfork)
- [environment](#environment)
  - [reloadableTag](#reloadabletag)
- [getters](#getters)
  - [get](#get)
- [models](#models)
  - [Reloadable (interface)](#reloadable-interface)
- [symbols](#symbols)
  - [ReloadableTypeId](#reloadabletypeid)
  - [ReloadableTypeId (type alias)](#reloadabletypeid-type-alias)

---

# constructors

## auto

Makes a new reloadable service from a layer that describes the construction
of a static service. The service is automatically reloaded according to the
provided schedule.

**Signature**

```ts
export declare const auto: <Out>(
  tag: Context.Tag<Out>
) => <In, E, R, Out2>(
  layer: Layer.Layer<In, E, Out>,
  policy: Schedule.Schedule<R, In, Out2>
) => Layer.Layer<In | R, E, Reloadable<Out>>
```

Added in v1.0.0

## autoFromConfig

Makes a new reloadable service from a layer that describes the construction
of a static service. The service is automatically reloaded according to a
schedule, which is extracted from the input to the layer.

**Signature**

```ts
export declare const autoFromConfig: <Out>(
  tag: Context.Tag<Out>
) => <In, E, R, Out2>(
  layer: Layer.Layer<In, E, Out>,
  scheduleFromConfig: (context: Context.Context<In>) => Schedule.Schedule<R, In, Out2>
) => Layer.Layer<In | R, E, Reloadable<Out>>
```

Added in v1.0.0

## manual

Makes a new reloadable service from a layer that describes the construction
of a static service.

**Signature**

```ts
export declare const manual: <Out>(
  tag: Context.Tag<Out>
) => <In, E>(layer: Layer.Layer<In, E, Out>) => Layer.Layer<In, E, Reloadable<Out>>
```

Added in v1.0.0

## reload

Reloads the specified service.

**Signature**

```ts
export declare const reload: <A>(tag: Context.Tag<A>) => Effect.Effect<Reloadable<A>, unknown, void>
```

Added in v1.0.0

## reloadFork

Forks the reload of the service in the background, ignoring any errors.

**Signature**

```ts
export declare const reloadFork: <A>(tag: Context.Tag<A>) => Effect.Effect<Reloadable<A>, unknown, void>
```

Added in v1.0.0

# environment

## reloadableTag

**Signature**

```ts
export declare const reloadableTag: <A>(tag: Context.Tag<A>) => Context.Tag<Reloadable<A>>
```

Added in v1.0.0

# getters

## get

Retrieves the current version of the reloadable service.

**Signature**

```ts
export declare const get: <A>(tag: Context.Tag<A>) => Effect.Effect<Reloadable<A>, never, A>
```

Added in v1.0.0

# models

## Reloadable (interface)

A `Reloadable` is an implementation of some service that can be dynamically
reloaded, or swapped out for another implementation on-the-fly.

**Signature**

```ts
export interface Reloadable<A> extends Reloadable.Variance<A> {
  /**
   * @internal
   */
  readonly scopedRef: ScopedRef.ScopedRef<A>
  /**
   * @macro traced
   * @internal
   */
  reload(): Effect.Effect<never, unknown, void>
}
```

Added in v1.0.0

# symbols

## ReloadableTypeId

**Signature**

```ts
export declare const ReloadableTypeId: typeof ReloadableTypeId
```

Added in v1.0.0

## ReloadableTypeId (type alias)

**Signature**

```ts
export type ReloadableTypeId = typeof ReloadableTypeId
```

Added in v1.0.0
