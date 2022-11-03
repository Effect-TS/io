/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as defaultServices from "@effect/io/internal/defaultServices"
import * as internal from "@effect/io/internal/random"
import type * as Chunk from "@fp-ts/data/Chunk"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RandomTypeId: unique symbol = internal.RandomTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type RandomTypeId = typeof RandomTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Random {
  readonly [RandomTypeId]: RandomTypeId
  /**
   * Returns the next numeric value from the pseudo-random number generator.
   * @macro traced
   */
  next(): Effect.Effect<never, never, number>
  /**
   * Returns the next boolean value from the pseudo-random number generator.
   * @macro traced
   */
  nextBoolean(): Effect.Effect<never, never, boolean>
  /**
   * Returns the next integer value from the pseudo-random number generator.
   * @macro traced
   */
  nextInt(): Effect.Effect<never, never, number>
  /**
   * Returns the next numeric value in the specified range from the
   * pseudo-random number generator.
   * @macro traced
   */
  nextRange(min: number, max: number): Effect.Effect<never, never, number>
  /**
   * Returns the next integer value in the specified range from the
   * pseudo-random number generator.
   * @macro traced
   */
  nextIntBetween(min: number, max: number): Effect.Effect<never, never, number>
  /**
   * Uses the pseudo-random number generator to shuffle the specified iterable.
   * @macro traced
   */
  shuffle<A>(elements: Iterable<A>): Effect.Effect<never, never, Chunk.Chunk<A>>
}

/**
 * Returns the next numeric value from the pseudo-random number generator.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const next = defaultServices.next

/**
 * Returns the next integer value from the pseudo-random number generator.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const nextInt = defaultServices.nextInt

/**
 * Returns the next boolean value from the pseudo-random number generator.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const nextBoolean = defaultServices.nextBoolean

/**
 * Returns the next numeric value in the specified range from the
 * pseudo-random number generator.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const nextRange = defaultServices.nextRange

/**
 * Returns the next integer value in the specified range from the
 * pseudo-random number generator.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const nextIntBetween = defaultServices.nextIntBetween

/**
 * Uses the pseudo-random number generator to shuffle the specified iterable.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const shuffle = defaultServices.shuffle

/**
 * Retreives the `Random` service from the environment and uses it to run the
 * specified workflow.
 *
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const randomWith = defaultServices.randomWith
