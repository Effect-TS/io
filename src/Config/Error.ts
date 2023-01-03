/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import * as internal from "@effect/io/internal/configError"
import type * as OpCodes from "@effect/io/internal/opCodes/configError"
import type * as Chunk from "@fp-ts/data/Chunk"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ConfigErrorTypeId: unique symbol = internal.ConfigErrorTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ConfigErrorTypeId = typeof ConfigErrorTypeId

/**
 * The possible ways that loading configuration data may fail.
 *
 * @since 1.0.0
 * @category models
 */
export type ConfigError =
  | And
  | Or
  | InvalidData
  | MissingData
  | SourceUnavailable
  | Unsupported

export declare namespace ConfigError {
  export interface Proto {
    readonly [ConfigErrorTypeId]: ConfigErrorTypeId
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface And extends ConfigError.Proto {
  readonly _tag: OpCodes.OP_AND
  readonly left: ConfigError
  readonly right: ConfigError
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Or extends ConfigError.Proto {
  readonly _tag: OpCodes.OP_OR
  readonly left: ConfigError
  readonly right: ConfigError
}

/**
 * @since 1.0.0
 * @category models
 */
export interface InvalidData extends ConfigError.Proto {
  readonly _tag: OpCodes.OP_INVALID_DATA
  readonly path: Chunk.Chunk<string>
  readonly message: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MissingData extends ConfigError.Proto {
  readonly _tag: OpCodes.OP_MISSING_DATA
  readonly path: Chunk.Chunk<string>
  readonly message: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface SourceUnavailable extends ConfigError.Proto {
  readonly _tag: OpCodes.OP_SOURCE_UNAVAILABLE
  readonly path: Chunk.Chunk<string>
  readonly message: string
  readonly cause: Cause.Cause<unknown>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Unsupported extends ConfigError.Proto {
  readonly _tag: OpCodes.OP_UNSUPPORTED
  readonly path: Chunk.Chunk<string>
  readonly message: string
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const And: (self: ConfigError, that: ConfigError) => ConfigError = internal.And

/**
 * @since 1.0.0
 * @category constructors
 */
export const Or: (self: ConfigError, that: ConfigError) => ConfigError = internal.Or

/**
 * @since 1.0.0
 * @category constructors
 */
export const MissingData: (path: Chunk.Chunk<string>, message: string) => ConfigError = internal.MissingData

/**
 * @since 1.0.0
 * @category constructors
 */
export const InvalidData: (path: Chunk.Chunk<string>, message: string) => ConfigError = internal.InvalidData

/**
 * @since 1.0.0
 * @category constructors
 */
export const SourceUnavailable: (
  path: Chunk.Chunk<string>,
  message: string,
  cause: Cause.Cause<unknown>
) => ConfigError = internal.SourceUnavailable

/**
 * @since 1.0.0
 * @category constructors
 */
export const Unsupported: (path: Chunk.Chunk<string>, message: string) => ConfigError = internal.Unsupported

/**
 * Returns `true` if the specified value is a `ConfigError`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isConfigError: (u: unknown) => u is ConfigError = internal.isConfigError

/**
 * Returns `true` if the specified `ConfigError` is an `And`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isAnd: (self: ConfigError) => self is And = internal.isAnd

/**
 * Returns `true` if the specified `ConfigError` is an `Or`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isOr: (self: ConfigError) => self is Or = internal.isOr

/**
 * Returns `true` if the specified `ConfigError` is an `InvalidData`, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isInvalidData: (self: ConfigError) => self is InvalidData = internal.isInvalidData

/**
 * Returns `true` if the specified `ConfigError` is an `MissingData`, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isMissingData: (self: ConfigError) => self is MissingData = internal.isMissingData

/**
 * Returns `true` if the specified `ConfigError` is a `SourceUnavailable`,
 * `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isSourceUnavailable: (self: ConfigError) => self is SourceUnavailable = internal.isSourceUnavailable

/**
 * Returns `true` if the specified `ConfigError` is an `Unsupported`, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isUnsupported: (self: ConfigError) => self is Unsupported = internal.isUnsupported

/**
 * @since 1.0.0
 * @category mutations
 */
export const prefixed: (prefix: Chunk.Chunk<string>) => (self: ConfigError) => ConfigError = internal.prefixed
