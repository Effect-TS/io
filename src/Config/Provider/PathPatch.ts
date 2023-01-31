/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal_effect_untraced/configProvider/pathPatch"

/**
 * Represents a description of how to modify the path to a configuration
 * value.
 *
 * @since 1.0.0
 * @category models
 */
export type PathPatch = Empty | AndThen | MapName | Nested | Unnested

/**
 * @since 1.0.0
 * @category models
 */
export interface Empty {
  readonly _tag: "Empty"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface AndThen {
  readonly _tag: "AndThen"
  readonly first: PathPatch
  readonly second: PathPatch
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MapName {
  readonly _tag: "MapName"
  readonly f: (string: string) => string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Nested {
  readonly _tag: "Nested"
  readonly name: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Unnested {
  readonly _tag: "Unnested"
  readonly name: string
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: PathPatch = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const andThen: {
  (self: PathPatch, that: PathPatch): PathPatch
  (that: PathPatch): (self: PathPatch) => PathPatch
} = internal.andThen

/**
 * @since 1.0.0
 * @category constructors
 */
export const mapName: {
  (self: PathPatch, f: (string: string) => string): PathPatch
  (f: (string: string) => string): (self: PathPatch) => PathPatch
} = internal.mapName

/**
 * @since 1.0.0
 * @category constructors
 */
export const nested: {
  (self: PathPatch, name: string): PathPatch
  (name: string): (self: PathPatch) => PathPatch
} = internal.nested

/**
 * @since 1.0.0
 * @category constructors
 */
export const unnested: {
  (self: PathPatch, name: string): PathPatch
  (name: string): (self: PathPatch) => PathPatch
} = internal.unnested
