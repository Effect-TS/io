/**
 * @since 1.0.0
 */
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRuntime from "@effect/io/Fiber/Runtime"
import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as internal from "@effect/io/internal/fiberScope"

/**
 * @since 1.0.0
 * @category symbols
 */
export const FiberScopeTypeId: unique symbol = internal.FiberScopeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type FiberScopeTypeId = typeof FiberScopeTypeId

/**
 * A `FiberScope` represents the scope of a fiber lifetime. The scope of a
 * fiber can be retrieved using `Effect.descriptor`, and when forking fibers,
 * you can specify a custom scope to fork them on by using the `forkIn`.
 *
 * @since 1.0.0
 * @category models
 */
export interface FiberScope {
  readonly [FiberScopeTypeId]: FiberScopeTypeId
  get fiberId(): FiberId.FiberId
  add(runtimeFlags: RuntimeFlags.RuntimeFlags, child: FiberRuntime.Runtime<any, any>): void
}

/**
 * Unsafely creats a new `FiberScopeScope` from a `Fiber`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMake = internal.unsafeMake

/**
 * The global scope. Anything forked onto the global scope is not supervised,
 * and will only terminate on its own accord (never from interruption of a
 * parent fiber, because there is no parent fiber).
 *
 * @since 1.0.0
 * @category constructors
 */
export const globalScope = internal.globalScope
