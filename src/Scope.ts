/**
 * @since 1.0.0
 */

import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import * as runtime from "@effect/io/internal/runtime"
import type * as Context from "@fp-ts/data/Context"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ScopeTypeId: unique symbol = 0 as any

/**
 * @since 1.0.0
 * @category symbols
 */
export type ScopeTypeId = typeof ScopeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const CloseableScopeTypeId: unique symbol = 0 as any

/**
 * @since 1.0.0
 * @category symbols
 */
export type CloseableScopeTypeId = typeof CloseableScopeTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Scope {
  readonly [ScopeTypeId]: ScopeTypeId

  /** @internal */
  readonly fork: Effect.Effect<never, never, Scope.Closeable>
  /** @internal */
  readonly addFinalizerExit: (finalizer: Scope.Finalizer) => Effect.Effect<never, never, void>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CloseableScope extends Scope {
  readonly [CloseableScopeTypeId]: CloseableScopeTypeId

  /** @internal */
  readonly close: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<never, never, void>
}

/**
 * @since 1.0.0
 * @category environment
 */
export const Tag: Context.Tag<Scope> = runtime.scopeTag

/**
 * @since 1.0.0
 */
export declare namespace Scope {
  /**
   * @since 1.0.0
   * @category model
   */
  export type Finalizer = (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<never, never, void>
  /**
   * @since 1.0.0
   * @category model
   */
  export type Closeable = CloseableScope
}

/**
 * Adds a finalizer to this scope. The finalizer is guaranteed to be run when
 * the scope is closed.
 *
 * @since 1.0.0
 * @category mutations
 */
export const addFinalizer = runtime.scopeAddFinalizer

/**
 * A simplified version of `addFinalizerWith` when the `finalizer` does not
 * depend on the `Exit` value that the scope is closed with.
 *
 * @since 1.0.0
 * @category mutations
 */
export const addFinalizerExit = runtime.scopeAddFinalizerExit

/**
 * Closes a scope with the specified exit value, running all finalizers that
 * have been added to the scope.
 *
 * @category destructors
 * @since 1.0.0
 */
export const close = runtime.scopeClose

/**
 * Extends the scope of an `Effect` workflow that needs a scope into this
 * scope by providing it to the workflow but not closing the scope when the
 * workflow completes execution. This allows extending a scoped value into a
 * larger scope.
 *
 * @category mutations
 * @since 1.0.0
 */
export const extend = runtime.scopeExtend

/**
 * Forks a new scope that is a child of this scope. The child scope will
 * automatically be closed when this scope is closed.
 *
 * @category forking
 * @since 1.0.0
 */
export const fork = runtime.scopeFork

/**
 * Uses the scope by providing it to an `Effect` workflow that needs a scope,
 * guaranteeing that the scope is closed with the result of that workflow as
 * soon as the workflow completes execution, whether by success, failure, or
 * interruption.
 *
 * @category destructors
 * @since 1.0.0
 */
export const use = runtime.scopeUse

/**
 * Creates a Scope where Finalizers will run according to the `ExecutionStrategy`.
 *
 * If an ExecutionStrategy is not provided `sequential` will be used.
 *
 * @category constructors
 * @since 1.0.0
 */
export const make = runtime.scopeMake
