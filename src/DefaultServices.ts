/**
 * @since 1.0.0
 */
import type * as Clock from "@effect/io/Clock"
import * as internal from "@effect/io/internal/defaultServices"

/**
 * @since 1.0.0
 * @category models
 */
export type DefaultServices = Clock.Clock /* | Random */

/**
 * @since 1.0.0
 * @category constructors
 */
export const liveServices = internal.liveServices

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentServices = internal.currentServices
