/**
 * @since 1.0.0
 */
import type * as Config from "@effect/io/Config"
import type * as ConfigError from "@effect/io/Config/Error"
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/configProvider"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Context from "@fp-ts/data/Context"
import type { LazyArg } from "@fp-ts/data/Function"
import type * as HashSet from "@fp-ts/data/HashSet"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ConfigProviderTypeId: unique symbol = internal.ConfigProviderTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ConfigProviderTypeId = typeof ConfigProviderTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const FlatConfigProviderTypeId: unique symbol = internal.FlatConfigProviderTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type FlatConfigProviderTypeId = typeof FlatConfigProviderTypeId

/**
 * A ConfigProvider is a service that provides configuration given a description
 * of the structure of that configuration.
 *
 * @since 1.0.0
 * @category models
 */
export interface ConfigProvider extends ConfigProvider.Proto {
  /**
   * Loads the specified configuration, or fails with a config error.
   *
   * @macro traced
   */
  load<A>(config: Config.Config<A>): Effect.Effect<never, ConfigError.ConfigError, A>
  /**
   * Flattens this config provider into a simplified config provider that knows
   * only how to deal with flat (key/value) properties.
   */
  flatten(): ConfigProvider.Flat
}

/**
 * @since 1.0.0
 */
export declare namespace ConfigProvider {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [ConfigProviderTypeId]: ConfigProviderTypeId
  }

  /**
   * A simplified config provider that knows only how to deal with flat
   * (key/value) properties. Because these providers are common, there is
   * special support for implementing them.
   *
   * @since 1.0.0
   * @category models
   */
  export interface Flat {
    readonly [FlatConfigProviderTypeId]: FlatConfigProviderTypeId
    /**
     * @macro traced
     */
    load<A>(
      path: Chunk.Chunk<string>,
      config: Config.Config.Primitive<A>
    ): Effect.Effect<never, ConfigError.ConfigError, Chunk.Chunk<A>>
    /**
     * @macro traced
     */
    enumerateChildren(path: Chunk.Chunk<string>): Effect.Effect<never, ConfigError.ConfigError, HashSet.HashSet<string>>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface FromMapConfig {
    readonly pathDelim: string
    readonly seqDelim: string
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface FromEnvConfig {
    readonly pathDelim: string
    readonly seqDelim: string
  }
}

/**
 * The service tag for `ConfigProvider`.
 *
 * @since 1.0.0
 * @category environment
 */
export const Tag: Context.Tag<ConfigProvider> = internal.configProviderTag

/**
 * Creates a new config provider.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  load: <A>(config: Config.Config<A>) => Effect.Effect<never, ConfigError.ConfigError, A>,
  flatten: () => ConfigProvider.Flat
) => ConfigProvider = internal.make

/**
 * Creates a new flat config provider.
 *
 * @since 1.0.0
 * @category constructors
 */
export const makeFlat: (
  load: <A>(
    path: Chunk.Chunk<string>,
    config: Config.Config.Primitive<A>
  ) => Effect.Effect<never, ConfigError.ConfigError, Chunk.Chunk<A>>,
  enumerateChildren: (
    path: Chunk.Chunk<string>
  ) => Effect.Effect<never, ConfigError.ConfigError, HashSet.HashSet<string>>
) => ConfigProvider.Flat = internal.makeFlat

/**
 * A config provider that loads configuration from environment variables,
 * using the default System service.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromEnv: (config?: ConfigProvider.FromEnvConfig) => ConfigProvider = internal.fromEnv

/**
 * Constructs a new `ConfigProvider` from a key/value (flat) provider, where
 * nesting is embedded into the string keys.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFlat: (flat: ConfigProvider.Flat) => ConfigProvider = internal.fromFlat

/**
 * Constructs a ConfigProvider using a map and the specified delimiter string,
 * which determines how to split the keys in the map into path segments.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromMap: (map: Map<string, string>, config?: Partial<ConfigProvider.FromMapConfig>) => ConfigProvider =
  internal.fromMap

/**
 * Returns a new config provider that will automatically nest all
 * configuration under the specified property name. This can be utilized to
 * aggregate separate configuration sources that are all required to load a
 * single configuration value.
 *
 * @since 1.0.0
 * @category mutations
 */
export const nested: (name: string) => (self: ConfigProvider) => ConfigProvider = internal.nested

/**
 * Returns a new config provider that preferentially loads configuration data
 * from this one, but which will fall back to the specified alterate provider
 * if there are any issues loading the configuration from this provider.
 *
 * @since 1.0.0
 * @category mutations
 */
export const orElse: (that: LazyArg<ConfigProvider>) => (self: ConfigProvider) => ConfigProvider = internal.orElse
