/**
 * @since 1.0.0
 */

import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import type { TODO } from "@effect/io/internal/todo"
import type * as Context from "@fp-ts/data/Context"

/**
 * @since 1.0.0
 * @category models
 */
export type Scope = TODO

// TODO: implement Scope

/**
 * @since 1.0.0
 * @category environment
 */
export declare const Tag: Context.Tag<Scope>

/**
 * @since 1.0.0
 */
export declare namespace Scope {
  /**
   * @since 1.0.0
   * @category model
   */
  export type Finalizer = (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<never, never, unknown>
}

/**
 * @since 1.0.0
 * @category mutations
 */
export declare const addFinalizerExit: (
  finalizer: Scope.Finalizer
) => (self: Scope) => Effect.Effect<never, never, void>
