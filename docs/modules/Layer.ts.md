---
title: Layer.ts
nav_order: 19
parent: Modules
---

## Layer overview

A `Layer<RIn, E, ROut>` describes how to build one or more services in your
application. Services can be injected into effects via
`Effect.provideService`. Effects can require services via `Effect.service`.

Layer can be thought of as recipes for producing bundles of services, given
their dependencies (other services).

Construction of services can be effectful and utilize resources that must be
acquired and safely released when the services are done being utilized.

By default layers are shared, meaning that if the same layer is used twice
the layer will only be allocated a single time.

Because of their excellent composition properties, layers are the idiomatic
way in Effect-TS to create services that depend on other services.

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [die](#die)
  - [dieSync](#diesync)
  - [environment](#environment)
  - [fail](#fail)
  - [failCause](#failcause)
  - [failCauseSync](#failcausesync)
  - [failSync](#failsync)
  - [fromEffect](#fromeffect)
  - [fromEffectEnvironment](#fromeffectenvironment)
  - [fromFunction](#fromfunction)
  - [scope](#scope)
  - [scoped](#scoped)
  - [scopedDiscard](#scopeddiscard)
  - [scopedEnvironment](#scopedenvironment)
  - [service](#service)
  - [succeed](#succeed)
  - [succeedEnvironment](#succeedenvironment)
  - [suspend](#suspend)
  - [sync](#sync)
  - [syncEnvironment](#syncenvironment)
- [conversions](#conversions)
  - [launch](#launch)
  - [toRuntime](#toruntime)
- [destructors](#destructors)
  - [build](#build)
  - [buildWithScope](#buildwithscope)
- [error handling](#error-handling)
  - [catchAll](#catchall)
  - [orDie](#ordie)
  - [orElse](#orelse)
- [folding](#folding)
  - [foldCauseLayer](#foldcauselayer)
  - [foldLayer](#foldlayer)
- [getters](#getters)
  - [isFresh](#isfresh)
  - [isLayer](#islayer)
- [mapping](#mapping)
  - [map](#map)
  - [mapError](#maperror)
- [models](#models)
  - [Layer (interface)](#layer-interface)
- [mutations](#mutations)
  - [extendScope](#extendscope)
  - [fresh](#fresh)
  - [memoize](#memoize)
  - [merge](#merge)
  - [passthrough](#passthrough)
  - [project](#project)
  - [provideTo](#provideto)
  - [provideToAndMerge](#providetoandmerge)
- [retrying](#retrying)
  - [retry](#retry)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
  - [flatten](#flatten)
  - [tap](#tap)
  - [tapError](#taperror)
- [symbols](#symbols)
  - [LayerTypeId](#layertypeid)
  - [LayerTypeId (type alias)](#layertypeid-type-alias)
- [zipping](#zipping)
  - [zipWithPar](#zipwithpar)

---

# constructors

## die

Constructs a layer that dies with the specified defect.

**Signature**

```ts
export declare const die: (defect: unknown) => Layer<never, never, unknown>
```

Added in v1.0.0

## dieSync

Constructs a layer that dies with the specified defect.

**Signature**

```ts
export declare const dieSync: (evaluate: () => unknown) => Layer<never, never, unknown>
```

Added in v1.0.0

## environment

Constructs a `Layer` that passes along the specified environment as an
output.

**Signature**

```ts
export declare const environment: <R>() => Layer<R, never, R>
```

Added in v1.0.0

## fail

Constructs a layer that fails with the specified error.

**Signature**

```ts
export declare const fail: <E>(error: E) => Layer<never, E, unknown>
```

Added in v1.0.0

## failCause

Constructs a layer that fails with the specified cause.

**Signature**

```ts
export declare const failCause: <E>(cause: Cause.Cause<E>) => Layer<never, E, unknown>
```

Added in v1.0.0

## failCauseSync

Constructs a layer that fails with the specified cause.

**Signature**

```ts
export declare const failCauseSync: <E>(evaluate: () => Cause.Cause<E>) => Layer<never, E, unknown>
```

Added in v1.0.0

## failSync

Constructs a layer that fails with the specified error.

**Signature**

```ts
export declare const failSync: <E>(evaluate: () => E) => Layer<never, E, unknown>
```

Added in v1.0.0

## fromEffect

Constructs a layer from the specified effect.

**Signature**

```ts
export declare const fromEffect: <T>(tag: Context.Tag<T>) => <R, E>(effect: Effect.Effect<R, E, T>) => Layer<R, E, T>
```

Added in v1.0.0

## fromEffectEnvironment

Constructs a layer from the specified effect, which must return one or more
services.

**Signature**

```ts
export declare const fromEffectEnvironment: <R, E, A>(effect: Effect.Effect<R, E, Context.Context<A>>) => Layer<R, E, A>
```

Added in v1.0.0

## fromFunction

Constructs a layer from the environment using the specified function.

**Signature**

```ts
export declare const fromFunction: <A, B>(
  tagA: Context.Tag<A>,
  tagB: Context.Tag<B>
) => (f: (a: A) => B) => Layer<A, never, B>
```

Added in v1.0.0

## scope

A layer that constructs a scope and closes it when the workflow the layer
is provided to completes execution, whether by success, failure, or
interruption. This can be used to close a scope when providing a layer to a
workflow.

**Signature**

```ts
export declare const scope: () => Layer<never, never, Scope.CloseableScope>
```

Added in v1.0.0

## scoped

Constructs a layer from the specified scoped effect.

**Signature**

```ts
export declare const scoped: <T>(
  tag: Context.Tag<T>
) => <R, E, T1 extends T>(effect: Effect.Effect<R, E, T1>) => Layer<Exclude<R, Scope.Scope>, E, T>
```

Added in v1.0.0

## scopedDiscard

Constructs a layer from the specified scoped effect.

**Signature**

```ts
export declare const scopedDiscard: <R, E, T>(
  effect: Effect.Effect<R, E, T>
) => Layer<Exclude<R, Scope.Scope>, E, never>
```

Added in v1.0.0

## scopedEnvironment

Constructs a layer from the specified scoped effect, which must return one
or more services.

**Signature**

```ts
export declare const scopedEnvironment: <R, E, A>(
  effect: Effect.Effect<R, E, Context.Context<A>>
) => Layer<Exclude<R, Scope.Scope>, E, A>
```

Added in v1.0.0

## service

Constructs a layer that accesses and returns the specified service from the
environment.

**Signature**

```ts
export declare const service: <T>(tag: Context.Tag<T>) => Layer<T, never, T>
```

Added in v1.0.0

## succeed

Constructs a layer from the specified value.

**Signature**

```ts
export declare const succeed: <T>(tag: Context.Tag<T>) => (resource: T) => Layer<never, never, T>
```

Added in v1.0.0

## succeedEnvironment

Constructs a layer from the specified value, which must return one or more
services.

**Signature**

```ts
export declare const succeedEnvironment: <A>(environment: Context.Context<A>) => Layer<never, never, A>
```

Added in v1.0.0

## suspend

Lazily constructs a layer. This is useful to avoid infinite recursion when
creating layers that refer to themselves.

**Signature**

```ts
export declare const suspend: <RIn, E, ROut>(evaluate: () => Layer<RIn, E, ROut>) => Layer<RIn, E, ROut>
```

Added in v1.0.0

## sync

Lazily constructs a layer from the specified value.

**Signature**

```ts
export declare const sync: <T>(tag: Context.Tag<T>) => (evaluate: () => T) => Layer<never, never, T>
```

Added in v1.0.0

## syncEnvironment

Lazily constructs a layer from the specified value, which must return one or more
services.

**Signature**

```ts
export declare const syncEnvironment: <A>(evaluate: () => Context.Context<A>) => Layer<never, never, A>
```

Added in v1.0.0

# conversions

## launch

Builds this layer and uses it until it is interrupted. This is useful when
your entire application is a layer, such as an HTTP server.

**Signature**

```ts
export declare const launch: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect.Effect<RIn, E, never>
```

Added in v1.0.0

## toRuntime

Converts a layer that requires no services into a scoped runtime, which can
be used to execute effects.

**Signature**

```ts
export declare const toRuntime: <RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
) => Effect.Effect<Scope.Scope | RIn, E, Runtime.Runtime<ROut>>
```

Added in v1.0.0

# destructors

## build

Builds a layer into a scoped value.

**Signature**

```ts
export declare const build: <RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
) => Effect.Effect<Scope.Scope | RIn, E, Context.Context<ROut>>
```

Added in v1.0.0

## buildWithScope

Builds a layer into an `Effect` value. Any resources associated with this
layer will be released when the specified scope is closed unless their scope
has been extended. This allows building layers where the lifetime of some of
the services output by the layer exceed the lifetime of the effect the
layer is provided to.

**Signature**

```ts
export declare const buildWithScope: (
  scope: Scope.Scope
) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect.Effect<RIn, E, Context.Context<ROut>>
```

Added in v1.0.0

# error handling

## catchAll

Recovers from all errors.

**Signature**

```ts
export declare const catchAll: <E, R2, E2, A2>(
  onError: (error: E) => Layer<R2, E2, A2>
) => <R, A>(self: Layer<R, E, A>) => Layer<R2 | R, E2, A & A2>
```

Added in v1.0.0

## orDie

Translates effect failure into death of the fiber, making all failures
unchecked and not a part of the type of the layer.

**Signature**

```ts
export declare const orDie: <R, E, A>(self: Layer<R, E, A>) => Layer<R, never, A>
```

Added in v1.0.0

## orElse

Executes this layer and returns its output, if it succeeds, but otherwise
executes the specified layer.

**Signature**

```ts
export declare const orElse: <R1, E1, A1>(
  that: () => Layer<R1, E1, A1>
) => <R, E, A>(self: Layer<R, E, A>) => Layer<R1 | R, E1 | E, A & A1>
```

Added in v1.0.0

# folding

## foldCauseLayer

Feeds the error or output services of this layer into the input of either
the specified `failure` or `success` layers, resulting in a new layer with
the inputs of this layer, and the error or outputs of the specified layer.

**Signature**

```ts
export declare const foldCauseLayer: <E, A, R2, E2, A2, R3, E3, A3>(
  onFailure: (cause: Cause.Cause<E>) => Layer<R2, E2, A2>,
  onSuccess: (context: Context.Context<A>) => Layer<R3, E3, A3>
) => <R>(self: Layer<R, E, A>) => Layer<R2 | R3 | R, E2 | E3, A2 | A3>
```

Added in v1.0.0

## foldLayer

Feeds the error or output services of this layer into the input of either
the specified `failure` or `success` layers, resulting in a new layer with
the inputs of this layer, and the error or outputs of the specified layer.

**Signature**

```ts
export declare const foldLayer: <E, R2, E2, A2, A, R3, E3, A3>(
  onFailure: (error: E) => Layer<R2, E2, A2>,
  onSuccess: (context: Context.Context<A>) => Layer<R3, E3, A3>
) => <R>(self: Layer<R, E, A>) => Layer<R2 | R3 | R, E2 | E3, A2 & A3>
```

Added in v1.0.0

# getters

## isFresh

Returns `true` if the specified `Layer` is a fresh version that will not be
shared, `false` otherwise.

**Signature**

```ts
export declare const isFresh: <R, E, A>(self: Layer<R, E, A>) => boolean
```

Added in v1.0.0

## isLayer

Returns `true` if the specified value is a `Layer`, `false` otherwise.

**Signature**

```ts
export declare const isLayer: (u: unknown) => u is Layer<unknown, unknown, unknown>
```

Added in v1.0.0

# mapping

## map

Returns a new layer whose output is mapped by the specified function.

**Signature**

```ts
export declare const map: <A, B>(
  f: (context: Context.Context<A>) => Context.Context<B>
) => <R, E>(self: Layer<R, E, A>) => Layer<R, E, B>
```

Added in v1.0.0

## mapError

Returns a layer with its error channel mapped using the specified function.

**Signature**

```ts
export declare const mapError: <E, E1>(f: (error: E) => E1) => <R, A>(self: Layer<R, E, A>) => Layer<R, E1, A>
```

Added in v1.0.0

# models

## Layer (interface)

**Signature**

```ts
export interface Layer<RIn, E, ROut> extends Layer.Variance<RIn, E, ROut> {}
```

Added in v1.0.0

# mutations

## extendScope

Extends the scope of this layer, returning a new layer that when provided
to an effect will not immediately release its associated resources when
that effect completes execution but instead when the scope the resulting
effect depends on is closed.

**Signature**

```ts
export declare const extendScope: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<Scope.Scope | RIn, E, ROut>
```

Added in v1.0.0

## fresh

Creates a fresh version of this layer that will not be shared.

**Signature**

```ts
export declare const fresh: <R, E, A>(self: Layer<R, E, A>) => Layer<R, E, A>
```

Added in v1.0.0

## memoize

Returns a scoped effect that, if evaluated, will return the lazily computed
result of this layer.

**Signature**

```ts
export declare const memoize: <RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
) => Effect.Effect<Scope.Scope, never, Layer<RIn, E, ROut>>
```

Added in v1.0.0

## merge

Combines this layer with the specified layer, producing a new layer that
has the inputs and outputs of both.

**Signature**

```ts
export declare const merge: <RIn2, E2, ROut2>(
  that: Layer<RIn2, E2, ROut2>
) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E2 | E, ROut2 | ROut>
```

Added in v1.0.0

## passthrough

Returns a new layer that produces the outputs of this layer but also
passes through the inputs.

**Signature**

```ts
export declare const passthrough: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn, E, RIn | ROut>
```

Added in v1.0.0

## project

Projects out part of one of the services output by this layer using the
specified function.

**Signature**

```ts
export declare const project: <A, B>(
  tagA: Context.Tag<A>,
  tagB: Context.Tag<B>
) => (f: (a: A) => B) => <RIn, E, ROut>(self: Layer<RIn, E, A | ROut>) => Layer<RIn, E, B>
```

Added in v1.0.0

## provideTo

Feeds the output services of this builder into the input of the specified
builder, resulting in a new builder with the inputs of this builder as
well as any leftover inputs, and the outputs of the specified builder.

**Signature**

```ts
export declare const provideTo: <RIn2, E2, ROut2>(
  that: Layer<RIn2, E2, ROut2>
) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut2>
```

Added in v1.0.0

## provideToAndMerge

Feeds the output services of this layer into the input of the specified
layer, resulting in a new layer with the inputs of this layer, and the
outputs of both layers.

**Signature**

```ts
export declare const provideToAndMerge: <RIn2, E2, ROut2>(
  that: Layer<RIn2, E2, ROut2>
) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut2 | ROut>
```

Added in v1.0.0

# retrying

## retry

Retries constructing this layer according to the specified schedule.

**Signature**

```ts
export declare const retry: <RIn1, E, X>(
  schedule: Schedule.Schedule<RIn1, E, X>
) => <RIn, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn1 | RIn, E, ROut>
```

Added in v1.0.0

# sequencing

## flatMap

Constructs a layer dynamically based on the output of this layer.

**Signature**

```ts
export declare const flatMap: <A, R2, E2, A2>(
  f: (context: Context.Context<A>) => Layer<R2, E2, A2>
) => <R, E>(self: Layer<R, E, A>) => Layer<R2 | R, E2 | E, A2>
```

Added in v1.0.0

## flatten

Flattens layers nested in the environment of an effect.

**Signature**

```ts
export declare const flatten: <R2, E2, A>(
  tag: Context.Tag<Layer<R2, E2, A>>
) => <R, E>(self: Layer<R, E, Layer<R2, E2, A>>) => Layer<R2 | R, E2 | E, A>
```

Added in v1.0.0

## tap

Performs the specified effect if this layer succeeds.

**Signature**

```ts
export declare const tap: <ROut, RIn2, E2, X>(
  f: (context: Context.Context<ROut>) => Effect.Effect<RIn2, E2, X>
) => <RIn, E>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E2 | E, ROut>
```

Added in v1.0.0

## tapError

Performs the specified effect if this layer fails.

**Signature**

```ts
export declare const tapError: <E, RIn2, E2, X>(
  f: (e: E) => Effect.Effect<RIn2, E2, X>
) => <RIn, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E | E2, ROut>
```

Added in v1.0.0

# symbols

## LayerTypeId

**Signature**

```ts
export declare const LayerTypeId: typeof LayerTypeId
```

Added in v1.0.0

## LayerTypeId (type alias)

**Signature**

```ts
export type LayerTypeId = typeof LayerTypeId
```

Added in v1.0.0

# zipping

## zipWithPar

Combines this layer the specified layer, producing a new layer that has the
inputs of both, and the outputs of both combined using the specified
function.

**Signature**

```ts
export declare const zipWithPar: <R1, E1, A1, A, A2>(
  that: Layer<R1, E1, A1>,
  f: (a: Context.Context<A>, b: Context.Context<A1>) => Context.Context<A2>
) => <R, E>(self: Layer<R, E, A>) => Layer<R1 | R, E1 | E, A2>
```

Added in v1.0.0
