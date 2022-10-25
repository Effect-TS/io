/**
 * @since 1.0.0
 */
import type { TODO } from "@effect/io/internal/todo"

/**
 * @since 1.0.0
 */
export interface Fiber<E, A> extends TODO<[E, A]> {}

/**
 * @since 1.0.0
 */
export interface Id extends TODO {}

/**
 * @since 1.0.0
 */
export type Runtime<E, A> = TODO<[E, A]>

/**
 * @since 1.0.0
 */
export namespace Runtime {
  /**
   * @since 1.0.0
   */
  export type Flags = TODO

  /**
   * @since 1.0.0
   */
  export namespace Flags {
    /**
     * @since 1.0.0
     */
    export type Patch = TODO
  }
}

/**
 * @since 1.0.0
 */
export namespace Status {
  /**
   * @since 1.0.0
   */
  export type Running = TODO
}
