---
title: RequestResolver.ts
nav_order: 48
parent: Modules
---

## RequestResolver overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [around](#around)
  - [batchN](#batchn)
  - [contramap](#contramap)
  - [contramapEffect](#contramapeffect)
  - [eitherWith](#eitherwith)
  - [interrupt](#interrupt)
  - [locally](#locally)
  - [patchRuntimeFlags](#patchruntimeflags)
  - [race](#race)
- [constructors](#constructors)
  - [fromFunction](#fromfunction)
  - [fromFunctionBatched](#fromfunctionbatched)
  - [fromFunctionBatchedEffect](#fromfunctionbatchedeffect)
  - [fromFunctionBatchedOption](#fromfunctionbatchedoption)
  - [fromFunctionBatchedOptionEffect](#fromfunctionbatchedoptioneffect)
  - [fromFunctionBatchedWith](#fromfunctionbatchedwith)
  - [fromFunctionBatchedWithEffect](#fromfunctionbatchedwitheffect)
  - [fromFunctionEffect](#fromfunctioneffect)
  - [fromFunctionOption](#fromfunctionoption)
  - [fromFunctionOptionEffect](#fromfunctionoptioneffect)
  - [make](#make)
  - [makeBatched](#makebatched)
  - [never](#never)
- [context](#context)
  - [contramapContext](#contramapcontext)
  - [provideContext](#providecontext)
- [models](#models)
  - [RequestResolver (interface)](#requestresolver-interface)
- [refinements](#refinements)
  - [isRequestResolver](#isrequestresolver)
- [symbols](#symbols)
  - [RequestResolverTypeId](#requestresolvertypeid)
  - [RequestResolverTypeId (type alias)](#requestresolvertypeid-type-alias)

---

# combinators

## around

A data source aspect that executes requests between two effects, `before`
and `after`, where the result of `before` can be used by `after`.

**Signature**

```ts
export declare const around: {
  <R2, A2, R3, _>(before: Effect.Effect<R2, never, A2>, after: (a: A2) => Effect.Effect<R3, never, _>): <R, A>(
    self: RequestResolver<R, A>
  ) => RequestResolver<R2 | R3 | R, A>
  <R, A, R2, A2, R3, _>(
    self: RequestResolver<R, A>,
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ): RequestResolver<R | R2 | R3, A>
}
```

Added in v1.0.0

## batchN

Returns a data source that executes at most `n` requests in parallel.

**Signature**

```ts
export declare const batchN: {
  (n: number): <R, A>(self: RequestResolver<R, A>) => RequestResolver<R, A>
  <R, A>(self: RequestResolver<R, A>, n: number): RequestResolver<R, A>
}
```

Added in v1.0.0

## contramap

Returns a new data source that executes requests of type `B` using the
specified function to transform `B` requests into requests that this data
source can execute.

**Signature**

```ts
export declare const contramap: {
  <A extends Request.Request<any, any>, B extends Request.Request<any, any>>(f: (_: B) => A): <R>(
    self: RequestResolver<R, A>
  ) => RequestResolver<R, B>
  <R, A extends Request.Request<any, any>, B extends Request.Request<any, any>>(
    self: RequestResolver<R, A>,
    f: (_: B) => A
  ): RequestResolver<R, B>
}
```

Added in v1.0.0

## contramapEffect

Returns a new data source that executes requests of type `B` using the
specified effectual function to transform `B` requests into requests that
this data source can execute.

**Signature**

```ts
export declare const contramapEffect: {
  <A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>>(
    f: (_: B) => Effect.Effect<R2, never, A>
  ): <R>(self: RequestResolver<R, A>) => RequestResolver<R2 | R, B>
  <R, A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>>(
    self: RequestResolver<R, A>,
    f: (_: B) => Effect.Effect<R2, never, A>
  ): RequestResolver<R | R2, B>
}
```

Added in v1.0.0

## eitherWith

Returns a new data source that executes requests of type `C` using the
specified function to transform `C` requests into requests that either this
data source or that data source can execute.

**Signature**

```ts
export declare const eitherWith: {
  <A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>, C extends Request.Request<any, any>>(
    that: RequestResolver<R2, B>,
    f: (_: C) => Either.Either<A, B>
  ): <R>(self: RequestResolver<R, A>) => RequestResolver<R2 | R, C>
  <
    R,
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    self: RequestResolver<R, A>,
    that: RequestResolver<R2, B>,
    f: (_: C) => Either.Either<A, B>
  ): RequestResolver<R | R2, C>
}
```

Added in v1.0.0

## interrupt

Returns a new data source that interrupts requests before execution

**Signature**

```ts
export declare const interrupt: <R, B extends Request.Request<any, any>>(
  self: RequestResolver<R, B>
) => RequestResolver<R, B>
```

Added in v1.0.0

## locally

Returns a new data source with a localized FiberRef

**Signature**

```ts
export declare const locally: {
  <A>(self: FiberRef<A>, value: A): <R, B extends Request.Request<any, any>>(
    use: RequestResolver<R, B>
  ) => RequestResolver<R, B>
  <R, B extends Request.Request<any, any>, A>(use: RequestResolver<R, B>, self: FiberRef<A>, value: A): RequestResolver<
    R,
    B
  >
}
```

Added in v1.0.0

## patchRuntimeFlags

Returns a new data source with patched runtime flags

**Signature**

```ts
export declare const patchRuntimeFlags: {
  (patch: RuntimeFlagsPatch): <R, B extends Request.Request<any, any>>(
    self: RequestResolver<R, B>
  ) => RequestResolver<R, B>
  <R, B extends Request.Request<any, any>>(self: RequestResolver<R, B>, patch: RuntimeFlagsPatch): RequestResolver<R, B>
}
```

Added in v1.0.0

## race

Returns a new data source that executes requests by sending them to this
data source and that data source, returning the results from the first data
source to complete and safely interrupting the loser.

**Signature**

```ts
export declare const race: {
  <R2, A2 extends Request.Request<any, any>>(that: RequestResolver<R2, A2>): <R, A extends Request.Request<any, any>>(
    self: RequestResolver<R, A>
  ) => RequestResolver<R2 | R, A2 | A>
  <R, A extends Request.Request<any, any>, R2, A2 extends Request.Request<any, any>>(
    self: RequestResolver<R, A>,
    that: RequestResolver<R2, A2>
  ): RequestResolver<R | R2, A | A2>
}
```

Added in v1.0.0

# constructors

## fromFunction

Constructs a data source from a pure function.

**Signature**

```ts
export declare const fromFunction: <A extends Request.Request<never, any>>(
  f: (request: A) => Request.Request.Success<A>
) => RequestResolver<never, A>
```

Added in v1.0.0

## fromFunctionBatched

Constructs a data source from a pure function that takes a list of requests
and returns a list of results of the same size. Each item in the result
list must correspond to the item at the same index in the request list.

**Signature**

```ts
export declare const fromFunctionBatched: <A extends Request.Request<never, any>>(
  f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Request.Request.Success<A>>
) => RequestResolver<never, A>
```

Added in v1.0.0

## fromFunctionBatchedEffect

Constructs a data source from an effectual function that takes a list of
requests and returns a list of results of the same size. Each item in the
result list must correspond to the item at the same index in the request
list.

**Signature**

```ts
export declare const fromFunctionBatchedEffect: <R, A extends Request.Request<any, any>>(
  f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Request.Request.Success<A>>>
) => RequestResolver<R, A>
```

Added in v1.0.0

## fromFunctionBatchedOption

Constructs a data source from a pure function that takes a list of requests
and returns a list of optional results of the same size. Each item in the
result list must correspond to the item at the same index in the request
list.

**Signature**

```ts
export declare const fromFunctionBatchedOption: <A extends Request.Request<never, any>>(
  f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Option.Option<Request.Request.Success<A>>>
) => RequestResolver<never, A>
```

Added in v1.0.0

## fromFunctionBatchedOptionEffect

Constructs a data source from an effectual function that takes a list of
requests and returns a list of optional results of the same size. Each item
in the result list must correspond to the item at the same index in the
request list.

**Signature**

```ts
export declare const fromFunctionBatchedOptionEffect: <R, A extends Request.Request<any, any>>(
  f: (
    chunk: Chunk.Chunk<A>
  ) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Option.Option<Request.Request.Success<A>>>>
) => RequestResolver<R, A>
```

Added in v1.0.0

## fromFunctionBatchedWith

Constructs a data source from a function that takes a list of requests and
returns a list of results of the same size. Uses the specified function to
associate each result with the corresponding effect, allowing the function
to return the list of results in a different order than the list of
requests.

**Signature**

```ts
export declare const fromFunctionBatchedWith: <A extends Request.Request<any, any>>(
  f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Request.Request.Success<A>>,
  g: (value: Request.Request.Success<A>) => Request.Request<never, Request.Request.Success<A>>
) => RequestResolver<never, A>
```

Added in v1.0.0

## fromFunctionBatchedWithEffect

Constructs a data source from an effectual function that takes a list of
requests and returns a list of results of the same size. Uses the specified
function to associate each result with the corresponding effect, allowing
the function to return the list of results in a different order than the
list of requests.

**Signature**

```ts
export declare const fromFunctionBatchedWithEffect: <R, A extends Request.Request<any, any>>(
  f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Request.Request.Success<A>>>,
  g: (b: Request.Request.Success<A>) => Request.Request<Request.Request.Error<A>, Request.Request.Success<A>>
) => RequestResolver<R, A>
```

Added in v1.0.0

## fromFunctionEffect

Constructs a data source from an effectual function.

**Signature**

```ts
export declare const fromFunctionEffect: <R, A extends Request.Request<any, any>>(
  f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
) => RequestResolver<R, A>
```

Added in v1.0.0

## fromFunctionOption

Constructs a data source from a pure function that may not provide results
for all requests received.

**Signature**

```ts
export declare const fromFunctionOption: <A extends Request.Request<never, any>>(
  f: (a: A) => Option.Option<Request.Request.Success<A>>
) => RequestResolver<never, A>
```

Added in v1.0.0

## fromFunctionOptionEffect

Constructs a data source from an effectual function that may not provide
results for all requests received.

**Signature**

```ts
export declare const fromFunctionOptionEffect: <R, A extends Request.Request<any, any>>(
  f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Option.Option<Request.Request.Success<A>>>
) => RequestResolver<R, A>
```

Added in v1.0.0

## make

Constructs a data source with the specified identifier and method to run
requests.

**Signature**

```ts
export declare const make: <R, A>(
  runAll: (requests: Chunk.Chunk<Chunk.Chunk<A>>) => Effect.Effect<R, never, void>
) => RequestResolver<Exclude<R, RequestCompletionMap.RequestCompletionMap>, A>
```

Added in v1.0.0

## makeBatched

Constructs a data source from a function taking a collection of requests
and returning a `RequestCompletionMap`.

**Signature**

```ts
export declare const makeBatched: <R, A extends Request.Request<any, any>>(
  run: (requests: Chunk.Chunk<A>) => Effect.Effect<R, never, void>
) => RequestResolver<Exclude<R, RequestCompletionMap.RequestCompletionMap>, A>
```

Added in v1.0.0

## never

A data source that never executes requests.

**Signature**

```ts
export declare const never: (_: void) => RequestResolver<never, never>
```

Added in v1.0.0

# context

## contramapContext

Provides this data source with part of its required context.

**Signature**

```ts
export declare const contramapContext: {
  <R0, R>(f: (context: Context.Context<R0>) => Context.Context<R>): <A extends Request.Request<any, any>>(
    self: RequestResolver<R, A>
  ) => RequestResolver<R0, A>
  <R, A extends Request.Request<any, any>, R0>(
    self: RequestResolver<R, A>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ): RequestResolver<R0, A>
}
```

Added in v1.0.0

## provideContext

Provides this data source with its required context.

**Signature**

```ts
export declare const provideContext: {
  <R>(context: Context.Context<R>): <A extends Request.Request<any, any>>(
    self: RequestResolver<R, A>
  ) => RequestResolver<never, A>
  <R, A extends Request.Request<any, any>>(self: RequestResolver<R, A>, context: Context.Context<R>): RequestResolver<
    never,
    A
  >
}
```

Added in v1.0.0

# models

## RequestResolver (interface)

A `RequestResolver<R, A>` requires an environment `R` and is capable of executing
requests of type `A`.

Data sources must implement the method `runAll` which takes a collection of
requests and returns an effect with a `RequestCompletionMap` containing a
mapping from requests to results. The type of the collection of requests is
a `Chunk<Chunk<A>>`. The outer `Chunk` represents batches of requests that
must be performed sequentially. The inner `Chunk` represents a batch of
requests that can be performed in parallel. This allows data sources to
introspect on all the requests being executed and optimize the query.

Data sources will typically be parameterized on a subtype of `Request<A>`,
though that is not strictly necessarily as long as the data source can map
the request type to a `Request<A>`. Data sources can then pattern match on
the collection of requests to determine the information requested, execute
the query, and place the results into the `RequestCompletionMap` using
`RequestCompletionMap.empty` and `RequestCompletionMap.insert`. Data
sources must provide results for all requests received. Failure to do so
will cause a query to die with a `QueryFailure` when run.

**Signature**

```ts
export interface RequestResolver<R, A> extends Equal.Equal {
  /**
   * Execute a collection of requests. The outer `Chunk` represents batches
   * of requests that must be performed sequentially. The inner `Chunk`
   * represents a batch of requests that can be performed in parallel.
   */
  runAll(requests: Chunk.Chunk<Chunk.Chunk<A>>): Effect.Effect<R, never, RequestCompletionMap.RequestCompletionMap>

  /**
   * Identify the data source using the specific identifier
   */
  identified(...identifiers: Array<unknown>): RequestResolver<R, A>
}
```

Added in v1.0.0

# refinements

## isRequestResolver

Returns `true` if the specified value is a `RequestResolver`, `false` otherwise.

**Signature**

```ts
export declare const isRequestResolver: (u: unknown) => u is RequestResolver<unknown, unknown>
```

Added in v1.0.0

# symbols

## RequestResolverTypeId

**Signature**

```ts
export declare const RequestResolverTypeId: typeof RequestResolverTypeId
```

Added in v1.0.0

## RequestResolverTypeId (type alias)

**Signature**

```ts
export type RequestResolverTypeId = typeof RequestResolverTypeId
```

Added in v1.0.0
