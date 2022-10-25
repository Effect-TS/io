/**
 * @since 1.0.0
 */
import type { RuntimeFlag } from "@effect/io/Fiber/Runtime/Flags"

/**
 * @since 1.0.0
 * @category model
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
 * @since 1.0.0
 * @category mutations
 */
export const enable = (flag: RuntimeFlag): RuntimeFlagsPatch => {
  return make(flag, flag)
}

/**
 * @since 1.0.0
 * @category mutations
 */
export const disable = (flag: RuntimeFlag): RuntimeFlagsPatch => {
  return make(flag, 0)
}
