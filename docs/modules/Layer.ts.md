---
title: Layer.ts
nav_order: 20
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
export declare const die: any
```

Added in v1.0.0

## dieSync

Constructs a layer that dies with the specified defect.

**Signature**

```ts
export declare const dieSync: any
```

Added in v1.0.0

## environment

Constructs a `Layer` that passes along the specified environment as an
output.

**Signature**

```ts
export declare const environment: any
```

Added in v1.0.0

## fail

Constructs a layer that fails with the specified error.

**Signature**

```ts
export declare const fail: any
```

Added in v1.0.0

## failCause

Constructs a layer that fails with the specified cause.

**Signature**

```ts
export declare const failCause: any
```

Added in v1.0.0

## failCauseSync

Constructs a layer that fails with the specified cause.

**Signature**

```ts
export declare const failCauseSync: any
```

Added in v1.0.0

## failSync

Constructs a layer that fails with the specified error.

**Signature**

```ts
export declare const failSync: any
```

Added in v1.0.0

## fromEffect

Constructs a layer from the specified effect.

**Signature**

```ts
export declare const fromEffect: any
```

Added in v1.0.0

## fromEffectEnvironment

Constructs a layer from the specified effect, which must return one or more
services.

**Signature**

```ts
export declare const fromEffectEnvironment: any
```

Added in v1.0.0

## fromFunction

Constructs a layer from the environment using the specified function.

**Signature**

```ts
export declare const fromFunction: any
```

Added in v1.0.0

## scope

A layer that constructs a scope and closes it when the workflow the layer
is provided to completes execution, whether by success, failure, or
interruption. This can be used to close a scope when providing a layer to a
workflow.

**Signature**

```ts
export declare const scope: any
```

Added in v1.0.0

## scoped

Constructs a layer from the specified scoped effect.

**Signature**

```ts
export declare const scoped: any
```

Added in v1.0.0

## scopedDiscard

Constructs a layer from the specified scoped effect.

**Signature**

```ts
export declare const scopedDiscard: any
```

Added in v1.0.0

## scopedEnvironment

Constructs a layer from the specified scoped effect, which must return one
or more services.

**Signature**

```ts
export declare const scopedEnvironment: any
```

Added in v1.0.0

## service

Constructs a layer that accesses and returns the specified service from the
environment.

**Signature**

```ts
export declare const service: any
```

Added in v1.0.0

## succeed

Constructs a layer from the specified value.

**Signature**

```ts
export declare const succeed: any
```

Added in v1.0.0

## succeedEnvironment

Constructs a layer from the specified value, which must return one or more
services.

**Signature**

```ts
export declare const succeedEnvironment: any
```

Added in v1.0.0

## suspend

Lazily constructs a layer. This is useful to avoid infinite recursion when
creating layers that refer to themselves.

**Signature**

```ts
export declare const suspend: any
```

Added in v1.0.0

## sync

Lazily constructs a layer from the specified value.

**Signature**

```ts
export declare const sync: any
```

Added in v1.0.0

## syncEnvironment

Lazily constructs a layer from the specified value, which must return one or more
services.

**Signature**

```ts
export declare const syncEnvironment: any
```

Added in v1.0.0

# conversions

## launch

Builds this layer and uses it until it is interrupted. This is useful when
your entire application is a layer, such as an HTTP server.

**Signature**

```ts
export declare const launch: any
```

Added in v1.0.0

## toRuntime

Converts a layer that requires no services into a scoped runtime, which can
be used to execute effects.

**Signature**

```ts
export declare const toRuntime: any
```

Added in v1.0.0

# destructors

## build

Builds a layer into a scoped value.

**Signature**

```ts
export declare const build: any
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
export declare const buildWithScope: any
```

Added in v1.0.0

# error handling

## catchAll

Recovers from all errors.

**Signature**

```ts
export declare const catchAll: any
```

Added in v1.0.0

## orDie

Translates effect failure into death of the fiber, making all failures
unchecked and not a part of the type of the layer.

**Signature**

```ts
export declare const orDie: any
```

Added in v1.0.0

## orElse

Executes this layer and returns its output, if it succeeds, but otherwise
executes the specified layer.

**Signature**

```ts
export declare const orElse: any
```

Added in v1.0.0

# folding

## foldCauseLayer

Feeds the error or output services of this layer into the input of either
the specified `failure` or `success` layers, resulting in a new layer with
the inputs of this layer, and the error or outputs of the specified layer.

**Signature**

```ts
export declare const foldCauseLayer: any
```

Added in v1.0.0

## foldLayer

Feeds the error or output services of this layer into the input of either
the specified `failure` or `success` layers, resulting in a new layer with
the inputs of this layer, and the error or outputs of the specified layer.

**Signature**

```ts
export declare const foldLayer: any
```

Added in v1.0.0

# getters

## isFresh

Returns `true` if the specified `Layer` is a fresh version that will not be
shared, `false` otherwise.

**Signature**

```ts
export declare const isFresh: any
```

Added in v1.0.0

## isLayer

Returns `true` if the specified value is a `Layer`, `false` otherwise.

**Signature**

```ts
export declare const isLayer: any
```

Added in v1.0.0

# mapping

## map

Returns a new layer whose output is mapped by the specified function.

**Signature**

```ts
export declare const map: any
```

Added in v1.0.0

## mapError

Returns a layer with its error channel mapped using the specified function.

**Signature**

```ts
export declare const mapError: any
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
export declare const extendScope: any
```

Added in v1.0.0

## fresh

Creates a fresh version of this layer that will not be shared.

**Signature**

```ts
export declare const fresh: any
```

Added in v1.0.0

## memoize

Returns a scoped effect that, if evaluated, will return the lazily computed
result of this layer.

**Signature**

```ts
export declare const memoize: any
```

Added in v1.0.0

## merge

Combines this layer with the specified layer, producing a new layer that
has the inputs and outputs of both.

**Signature**

```ts
export declare const merge: any
```

Added in v1.0.0

## passthrough

Returns a new layer that produces the outputs of this layer but also
passes through the inputs.

**Signature**

```ts
export declare const passthrough: any
```

Added in v1.0.0

## project

Projects out part of one of the services output by this layer using the
specified function.

**Signature**

```ts
export declare const project: any
```

Added in v1.0.0

## provideTo

Feeds the output services of this builder into the input of the specified
builder, resulting in a new builder with the inputs of this builder as
well as any leftover inputs, and the outputs of the specified builder.

**Signature**

```ts
export declare const provideTo: any
```

Added in v1.0.0

## provideToAndMerge

Feeds the output services of this layer into the input of the specified
layer, resulting in a new layer with the inputs of this layer, and the
outputs of both layers.

**Signature**

```ts
export declare const provideToAndMerge: any
```

Added in v1.0.0

# retrying

## retry

Retries constructing this layer according to the specified schedule.

**Signature**

```ts
export declare const retry: any
```

Added in v1.0.0

# sequencing

## flatMap

Constructs a layer dynamically based on the output of this layer.

**Signature**

```ts
export declare const flatMap: any
```

Added in v1.0.0

## flatten

Flattens layers nested in the environment of an effect.

**Signature**

```ts
export declare const flatten: any
```

Added in v1.0.0

## tap

Performs the specified effect if this layer succeeds.

**Signature**

```ts
export declare const tap: any
```

Added in v1.0.0

## tapError

Performs the specified effect if this layer fails.

**Signature**

```ts
export declare const tapError: any
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
export declare const zipWithPar: any
```

Added in v1.0.0
