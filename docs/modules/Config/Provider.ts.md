---
title: Config/Provider.ts
nav_order: 6
parent: Modules
---

## Provider overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [fromEnv](#fromenv)
  - [fromFlat](#fromflat)
  - [fromMap](#frommap)
  - [make](#make)
  - [makeFlat](#makeflat)
- [context](#context)
  - [Tag](#tag)
- [models](#models)
  - [ConfigProvider (interface)](#configprovider-interface)
- [mutations](#mutations)
  - [contramapPath](#contramappath)
  - [nested](#nested)
  - [orElse](#orelse)
- [symbols](#symbols)
  - [ConfigProviderTypeId](#configprovidertypeid)
  - [ConfigProviderTypeId (type alias)](#configprovidertypeid-type-alias)
  - [FlatConfigProviderTypeId](#flatconfigprovidertypeid)
  - [FlatConfigProviderTypeId (type alias)](#flatconfigprovidertypeid-type-alias)

---

# constructors

## fromEnv

A config provider that loads configuration from context variables,
using the default System service.

**Signature**

```ts
export declare const fromEnv: (config?: ConfigProvider.FromEnvConfig | undefined) => ConfigProvider
```

Added in v1.0.0

## fromFlat

Constructs a new `ConfigProvider` from a key/value (flat) provider, where
nesting is embedded into the string keys.

**Signature**

```ts
export declare const fromFlat: (flat: ConfigProvider.Flat) => ConfigProvider
```

Added in v1.0.0

## fromMap

Constructs a ConfigProvider using a map and the specified delimiter string,
which determines how to split the keys in the map into path segments.

**Signature**

```ts
export declare const fromMap: (
  map: Map<string, string>,
  config?: Partial<ConfigProvider.FromMapConfig> | undefined
) => ConfigProvider
```

Added in v1.0.0

## make

Creates a new config provider.

**Signature**

```ts
export declare const make: (
  load: <A>(config: Config.Config<A>) => Effect.Effect<never, ConfigError.ConfigError, A>,
  flattened: ConfigProvider.Flat
) => ConfigProvider
```

Added in v1.0.0

## makeFlat

Creates a new flat config provider.

**Signature**

```ts
export declare const makeFlat: (
  load: <A>(
    path: Chunk.Chunk<string>,
    config: Config.Config.Primitive<A>
  ) => Effect.Effect<never, ConfigError.ConfigError, Chunk.Chunk<A>>,
  enumerateChildren: (
    path: Chunk.Chunk<string>
  ) => Effect.Effect<never, ConfigError.ConfigError, HashSet.HashSet<string>>
) => ConfigProvider.Flat
```

Added in v1.0.0

# context

## Tag

The service tag for `ConfigProvider`.

**Signature**

```ts
export declare const Tag: Context.Tag<ConfigProvider>
```

Added in v1.0.0

# models

## ConfigProvider (interface)

A ConfigProvider is a service that provides configuration given a description
of the structure of that configuration.

**Signature**

```ts
export interface ConfigProvider extends ConfigProvider.Proto {
  /**
   * Loads the specified configuration, or fails with a config error.
   */
  load<A>(config: Config.Config<A>): Effect.Effect<never, ConfigError.ConfigError, A>
  /**
   * Flattens this config provider into a simplified config provider that knows
   * only how to deal with flat (key/value) properties.
   */
  flattened: ConfigProvider.Flat
}
```

Added in v1.0.0

# mutations

## contramapPath

Returns a new config provider that will automatically tranform all path
configuration names with the specified function. This can be utilized to
adapt the names of configuration properties from one naming convention to
another.

**Signature**

```ts
export declare const contramapPath: ((self: ConfigProvider, f: (path: string) => string) => ConfigProvider) &
  ((f: (path: string) => string) => (self: ConfigProvider) => ConfigProvider)
```

Added in v1.0.0

## nested

Returns a new config provider that will automatically nest all
configuration under the specified property name. This can be utilized to
aggregate separate configuration sources that are all required to load a
single configuration value.

**Signature**

```ts
export declare const nested: {
  (self: ConfigProvider, name: string): ConfigProvider
  (name: string): (self: ConfigProvider) => ConfigProvider
}
```

Added in v1.0.0

## orElse

Returns a new config provider that preferentially loads configuration data
from this one, but which will fall back to the specified alterate provider
if there are any issues loading the configuration from this provider.

**Signature**

```ts
export declare const orElse: {
  (self: ConfigProvider, that: LazyArg<ConfigProvider>): ConfigProvider
  (that: LazyArg<ConfigProvider>): (self: ConfigProvider) => ConfigProvider
}
```

Added in v1.0.0

# symbols

## ConfigProviderTypeId

**Signature**

```ts
export declare const ConfigProviderTypeId: typeof ConfigProviderTypeId
```

Added in v1.0.0

## ConfigProviderTypeId (type alias)

**Signature**

```ts
export type ConfigProviderTypeId = typeof ConfigProviderTypeId
```

Added in v1.0.0

## FlatConfigProviderTypeId

**Signature**

```ts
export declare const FlatConfigProviderTypeId: typeof FlatConfigProviderTypeId
```

Added in v1.0.0

## FlatConfigProviderTypeId (type alias)

**Signature**

```ts
export type FlatConfigProviderTypeId = typeof FlatConfigProviderTypeId
```

Added in v1.0.0
