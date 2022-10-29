/**
 * Describes a strategy for evaluating multiple effects, potentially in parallel.
 *
 * There are 3 possible execution strategies: `Sequential`, `Parallel`, `ParallelN`.
 *
 * @category model
 * @since 1.0.0
 */
export type ExecutionStrategy = Sequential | Parallel | ParallelN

/**
 * Execute effects sequentially.
 *
 * @category model
 * @since 1.0.0
 */
export interface Sequential {
  readonly _tag: "Sequential"
}

/**
 * Execute effects in parallel.
 *
 * @category model
 * @since 1.0.0
 */
export interface Parallel {
  readonly _tag: "Parallel"
}

/**
 * Execute effects in parallel, up to the specified number of concurrent fibers.
 *
 * @category model
 * @since 1.0.0
 */
export interface ParallelN {
  readonly _tag: "ParallelN"
  readonly n: number
}

/**
 * Execute effects sequentially.
 *
 * @category constructors
 * @since 1.0.0
 */
export const sequential: ExecutionStrategy = { _tag: "Sequential" }

/**
 * Execute effects in parallel.
 *
 * @category constructors
 * @since 1.0.0
 */
export const parallel: ExecutionStrategy = { _tag: "Parallel" }

/**
 * Execute effects in parallel, up to the specified number of concurrent fibers.
 *
 * @category constructors
 * @since 1.0.0
 */
export function parallelN(n: number): ExecutionStrategy {
  return {
    _tag: "ParallelN",
    n
  }
}
