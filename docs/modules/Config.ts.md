---
title: Config.ts
nav_order: 4
parent: Modules
---

## Config overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [arrayOf](#arrayof)
  - [bool](#bool)
  - [chunkOf](#chunkof)
  - [date](#date)
  - [defer](#defer)
  - [fail](#fail)
  - [float](#float)
  - [integer](#integer)
  - [primitive](#primitive)
  - [secret](#secret)
  - [setOf](#setof)
  - [string](#string)
  - [struct](#struct)
  - [succeed](#succeed)
  - [sync](#sync)
  - [table](#table)
  - [tuple](#tuple)
- [models](#models)
  - [Config (interface)](#config-interface)
- [mutations](#mutations)
  - [map](#map)
  - [mapAttempt](#mapattempt)
  - [mapOrFail](#maporfail)
  - [nested](#nested)
  - [optional](#optional)
  - [orElse](#orelse)
  - [orElseIf](#orelseif)
  - [repeat](#repeat)
  - [validate](#validate)
  - [withDefault](#withdefault)
  - [withDescription](#withdescription)
  - [zip](#zip)
  - [zipWith](#zipwith)
- [symbols](#symbols)
  - [ConfigTypeId](#configtypeid)
  - [ConfigTypeId (type alias)](#configtypeid-type-alias)

---

# constructors

## arrayOf

Constructs a config for an array of values.

**Signature**

```ts
export declare const arrayOf: <A>(config: Config<A>, name?: string | undefined) => Config<readonly A[]>
```

Added in v1.0.0

## bool

Constructs a config for a boolean value.

**Signature**

```ts
export declare const bool: (name?: string | undefined) => Config<boolean>
```

Added in v1.0.0

## chunkOf

Constructs a config for a sequence of values.

**Signature**

```ts
export declare const chunkOf: <A>(config: Config<A>, name?: string | undefined) => Config<Chunk.Chunk<A>>
```

Added in v1.0.0

## date

Constructs a config for a date value.

**Signature**

```ts
export declare const date: (name?: string | undefined) => Config<Date>
```

Added in v1.0.0

## defer

Lazily constructs a config.

**Signature**

```ts
export declare const defer: <A>(config: LazyArg<Config<A>>) => Config<A>
```

Added in v1.0.0

## fail

Constructs a config that fails with the specified message.

**Signature**

```ts
export declare const fail: (message: string) => Config<never>
```

Added in v1.0.0

## float

Constructs a config for a float value.

**Signature**

```ts
export declare const float: (name?: string | undefined) => Config<number>
```

Added in v1.0.0

## integer

Constructs a config for a integer value.

**Signature**

```ts
export declare const integer: (name?: string | undefined) => Config<number>
```

Added in v1.0.0

## primitive

Constructs a new primitive config.

**Signature**

```ts
export declare const primitive: <A>(
  description: string,
  parse: (text: string) => Either.Either<ConfigError.ConfigError, A>
) => Config<A>
```

Added in v1.0.0

## secret

Constructs a config for a secret value.

**Signature**

```ts
export declare const secret: (name?: string | undefined) => Config<ConfigSecret.ConfigSecret>
```

Added in v1.0.0

## setOf

Constructs a config for a sequence of values.

**Signature**

```ts
export declare const setOf: <A>(config: Config<A>, name?: string | undefined) => Config<HashSet.HashSet<A>>
```

Added in v1.0.0

## string

Constructs a config for a string value.

**Signature**

```ts
export declare const string: (name?: string | undefined) => Config<string>
```

Added in v1.0.0

## struct

Constructs a config from a record of configs.

**Signature**

```ts
export declare const struct: <NER extends Record<string, Config<any>>>(
  r: Record<string, Config<any>> | EnforceNonEmptyRecord<NER>
) => Config<{ [K in keyof NER]: [NER[K]] extends [{ [ConfigTypeId]: { _A: (_: never) => infer A } }] ? A : never }>
```

Added in v1.0.0

## succeed

Constructs a config which contains the specified value.

**Signature**

```ts
export declare const succeed: <A>(value: A) => Config<A>
```

Added in v1.0.0

## sync

Constructs a config which contains the specified lazy value.

**Signature**

```ts
export declare const sync: <A>(value: LazyArg<A>) => Config<A>
```

Added in v1.0.0

## table

Constructs a config for a sequence of values.

**Signature**

```ts
export declare const table: <A>(config: Config<A>, name?: string | undefined) => Config<HashMap.HashMap<string, A>>
```

Added in v1.0.0

## tuple

Constructs a config from a tuple of configs.

**Signature**

```ts
export declare const tuple: <T extends [Config<any>, ...Config<any>[]]>(...tuple: T) => Config<TupleConfig<T>>
```

Added in v1.0.0

# models

## Config (interface)

A `Config` describes the structure of some configuration data.

**Signature**

```ts
export interface Config<A> extends Config.Variance<A> {}
```

Added in v1.0.0

# mutations

## map

Returns a config whose structure is the same as this one, but which produces
a different value, constructed using the specified function.

**Signature**

```ts
export declare const map: {
  <A, B>(self: Config<A>, f: (a: A) => B): Config<B>
  <A, B>(f: (a: A) => B): (self: Config<A>) => Config<B>
}
```

Added in v1.0.0

## mapAttempt

Returns a config whose structure is the same as this one, but which may
produce a different value, constructed using the specified function, which
may throw exceptions that will be translated into validation errors.

**Signature**

```ts
export declare const mapAttempt: {
  <A, B>(self: Config<A>, f: (a: A) => B): Config<B>
  <A, B>(f: (a: A) => B): (self: Config<A>) => Config<B>
}
```

Added in v1.0.0

## mapOrFail

Returns a new config whose structure is the samea as this one, but which
may produce a different value, constructed using the specified fallible
function.

**Signature**

```ts
export declare const mapOrFail: {
  <A, B>(self: Config<A>, f: (a: A) => Either.Either<ConfigError.ConfigError, B>): Config<B>
  <A, B>(f: (a: A) => Either.Either<ConfigError.ConfigError, B>): (self: Config<A>) => Config<B>
}
```

Added in v1.0.0

## nested

Returns a config that has this configuration nested as a property of the
specified name.

**Signature**

```ts
export declare const nested: {
  <A>(self: Config<A>, name: string): Config<A>
  (name: string): <A>(self: Config<A>) => Config<A>
}
```

Added in v1.0.0

## optional

Returns an optional version of this config, which will be `None` if the
data is missing from configuration, and `Some` otherwise.

**Signature**

```ts
export declare const optional: <A>(self: Config<A>) => Config<Option.Option<A>>
```

Added in v1.0.0

## orElse

Returns a config whose structure is preferentially described by this
config, but which falls back to the specified config if there is an issue
reading from this config.

**Signature**

```ts
export declare const orElse: {
  <A, A2>(self: Config<A>, that: LazyArg<Config<A2>>): Config<A | A2>
  <A2>(that: LazyArg<Config<A2>>): <A>(self: Config<A>) => Config<A2 | A>
}
```

Added in v1.0.0

## orElseIf

Returns configuration which reads from this configuration, but which falls
back to the specified configuration if reading from this configuration
fails with an error satisfying the specified predicate.

**Signature**

```ts
export declare const orElseIf: {
  <A, A2>(self: Config<A>, that: LazyArg<Config<A2>>, condition: Predicate<ConfigError.ConfigError>): Config<A>
  <A2>(that: LazyArg<Config<A2>>, condition: Predicate<ConfigError.ConfigError>): <A>(self: Config<A>) => Config<A>
}
```

Added in v1.0.0

## repeat

Returns a config that describes a sequence of values, each of which has the
structure of this config.

**Signature**

```ts
export declare const repeat: <A>(self: Config<A>) => Config<Chunk.Chunk<A>>
```

Added in v1.0.0

## validate

Returns a config that describes the same structure as this one, but which
performs validation during loading.

**Signature**

```ts
export declare const validate: {
  <A, B extends A>(self: Config<A>, message: string, f: Refinement<A, B>): Config<B>
  <A>(self: Config<A>, message: string, f: Predicate<A>): Config<A>
  <A, B extends A>(message: string, f: Refinement<A, B>): (self: Config<A>) => Config<B>
  <A>(message: string, f: Predicate<A>): (self: Config<A>) => Config<A>
}
```

Added in v1.0.0

## withDefault

Returns a config that describes the same structure as this one, but has the
specified default value in case the information cannot be found.

**Signature**

```ts
export declare const withDefault: {
  <A, A2>(self: Config<A>, def: A2): Config<A | A2>
  <A2>(def: A2): <A>(self: Config<A>) => Config<A2 | A>
}
```

Added in v1.0.0

## withDescription

Adds a description to this configuration, which is intended for humans.

**Signature**

```ts
export declare const withDescription: {
  <A>(self: Config<A>, description: string): Config<A>
  (description: string): <A>(self: Config<A>) => Config<A>
}
```

Added in v1.0.0

## zip

Returns a config that is the composition of this config and the specified
config.

**Signature**

```ts
export declare const zip: {
  <A, B>(self: Config<A>, that: Config<B>): Config<readonly [A, B]>
  <B>(that: Config<B>): <A>(self: Config<A>) => Config<readonly [A, B]>
}
```

Added in v1.0.0

## zipWith

Returns a config that is the composes this config and the specified config
using the provided function.

**Signature**

```ts
export declare const zipWith: {
  <A, B, C>(self: Config<A>, that: Config<B>, f: (a: A, b: B) => C): Config<C>
  <B, A, C>(that: Config<B>, f: (a: A, b: B) => C): (self: Config<A>) => Config<C>
}
```

Added in v1.0.0

# symbols

## ConfigTypeId

**Signature**

```ts
export declare const ConfigTypeId: typeof ConfigTypeId
```

Added in v1.0.0

## ConfigTypeId (type alias)

**Signature**

```ts
export type ConfigTypeId = typeof ConfigTypeId
```

Added in v1.0.0
