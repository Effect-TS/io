/**
 * @since 1.0.0
 */
import type { RuntimeFlag } from "@effect/io/Fiber/Runtime/Flags"
import * as internal from "@effect/io/internal/runtimeFlags"

/**
 * @since 1.0.0
 * @category models
 */
export type RuntimeFlagsPatch = number & {
  readonly RuntimeFlagsPatch: unique symbol
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (
  active: number,
  enabled: number
): RuntimeFlagsPatch => {
  return ((active << 0) + ((enabled & active) << 16)) as RuntimeFlagsPatch
}

/**
 * Returns `true` if the specified `RuntimeFlagsPatch` is empty.
 *
 * @since 1.0.0
 * @category getters
 */
export const isEmpty = (self: RuntimeFlagsPatch): boolean => {
  return internal.active(self) === 0
}

/**
 * Returns `true` if the `RuntimeFlagsPatch` describes the specified
 * `RuntimeFlag` as active.
 *
 * @since 1.0.0
 * @category elements
 */
export const isActive = (flag: RuntimeFlag) => {
  return (self: RuntimeFlagsPatch): boolean => (internal.active(self) & flag) !== 0
}

/**
 * Returns `true` if the `RuntimeFlagsPatch` describes the specified
 * `RuntimeFlag` as enabled.
 *
 * @since 1.0.0
 * @category elements
 */
export const isEnabled = (flag: RuntimeFlag) => {
  return (self: RuntimeFlagsPatch): boolean =>
    isActive(flag)(self) &&
    ((internal.enabled(self) & flag) !== 0)
}

/**
 * Returns `true` if the `RuntimeFlagsPatch` describes the specified
 * `RuntimeFlag` as disabled.
 *
 * @since 1.0.0
 * @category elements
 */
export const isDisabled = (flag: RuntimeFlag) => {
  return (self: RuntimeFlagsPatch): boolean =>
    isActive(flag)(self) &&
    ((internal.enabled(self) & flag) === 0)
}

/**
 * Returns `true` if the `RuntimeFlagsPatch` includes the specified
 * `RuntimeFlag`, `false` otherwise.
 *
 * @since 1.0.0
 * @category elements
 */
export const includes = (flag: RuntimeFlag) => {
  return (self: RuntimeFlagsPatch): boolean => (internal.active(self) & flag) !== 0
}

/**
 * Creates a `RuntimeFlagsPatch` describing enabling the provided `RuntimeFlag`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const enable = (flag: RuntimeFlag): RuntimeFlagsPatch => {
  return make(flag, flag)
}

/**
 * Creates a `RuntimeFlagsPatch` describing disabling the provided `RuntimeFlag`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const disable = (flag: RuntimeFlag): RuntimeFlagsPatch => {
  return make(flag, 0)
}

/**
 * Creates a `RuntimeFlagsPatch` describing the application of the `self` patch,
 * followed by `that` patch.
 *
 * @since 1.0.0
 * @category mutations
 */
export const andThen = (that: RuntimeFlagsPatch) => {
  return (self: RuntimeFlagsPatch): RuntimeFlagsPatch => (self | that) as RuntimeFlagsPatch
}

/**
 * Creates a `RuntimeFlagsPatch` describing application of both the `self` patch
 * and `that` patch.
 *
 * @since 1.0.0
 * @category mutations
 */
export const both = (that: RuntimeFlagsPatch) => {
  return (self: RuntimeFlagsPatch): RuntimeFlagsPatch =>
    make(
      internal.active(self) | internal.active(that),
      internal.enabled(self) & internal.enabled(that)
    )
}

/**
 * Creates a `RuntimeFlagsPatch` describing application of either the `self`
 * patch or `that` patch.
 *
 * @since 1.0.0
 * @category mutations
 */
export const either = (that: RuntimeFlagsPatch) => {
  return (self: RuntimeFlagsPatch): RuntimeFlagsPatch =>
    make(
      internal.active(self) | internal.active(that),
      internal.enabled(self) | internal.enabled(that)
    )
}

/**
 * Creates a `RuntimeFlagsPatch` which describes exclusion of the specified
 * `RuntimeFlag` from the set of `RuntimeFlags`.
 *
 * @category mutations
 * @since 1.0.0
 */
export const exclude = (flag: RuntimeFlag) => {
  return (self: RuntimeFlagsPatch): RuntimeFlagsPatch =>
    make(
      internal.active(self) & ~flag,
      internal.enabled(self)
    )
}

/**
 * Creates a `RuntimeFlagsPatch` which describes the inverse of the patch
 * specified by the provided `RuntimeFlagsPatch`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const inverse = (self: RuntimeFlagsPatch): RuntimeFlagsPatch => {
  return make(internal.active(self), ~internal.enabled(self))
}

/**
 * Returns a `ReadonlySet<number>` containing the `RuntimeFlags` described as
 * enabled by the specified `RuntimeFlagsPatch`.
 *
 * @category getters
 * @since 1.0.0
 */
export const enabledSet = internal.enabledSet

/**
 * Returns a `ReadonlySet<number>` containing the `RuntimeFlags` described as
 * disabled by the specified `RuntimeFlagsPatch`.
 *
 * @since 1.0.0
 * @category getters
 */
export const disabledSet = internal.disabledSet

/**
 * Renders the provided `RuntimeFlagsPatch` to a string.
 *
 * @category destructors
 * @since 1.0.0
 */
export const render = internal.renderPatch
