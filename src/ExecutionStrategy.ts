/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal/executionStrategy"

/**
 * Describes a strategy for evaluating multiple effects, potentially in
 * parallel.
 *
 * There are 3 possible execution strategies: `Sequential`, `Parallel`,
 * `ParallelN`.
 *
 * @since 1.0.0
 * @category models
 */
export type ExecutionStrategy = Sequential | Parallel | ParallelN

/**
 * Execute effects sequentially.
 *
 * @since 1.0.0
 * @category models
 */
export interface Sequential {
  readonly op: internal.OP_SEQUENTIAL
}

/**
 * Execute effects in parallel.
 *
 * @since 1.0.0
 * @category models
 */
export interface Parallel {
  readonly op: internal.OP_PARALLEL
}

/**
 * Execute effects in parallel, up to the specified number of concurrent fibers.
 *
 * @since 1.0.0
 * @category models
 */
export interface ParallelN {
  readonly op: internal.OP_PARALLEL_N
  readonly parallelism: number
}

/**
 * Execute effects sequentially.
 *
 * @since 1.0.0
 * @category constructors
 */
export const sequential: ExecutionStrategy = internal.sequential

/**
 * Execute effects in parallel.
 *
 * @since 1.0.0
 * @category constructors
 */
export const parallel: ExecutionStrategy = internal.parallel

/**
 * Execute effects in parallel, up to the specified number of concurrent fibers.
 *
 * @since 1.0.0
 * @category constructors
 */
export const parallelN: (parallelism: number) => ExecutionStrategy = internal.parallelN

/**
 * Returns `true` if the specified `ExecutionStrategy` is an instance of
 * `Sequential`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isSequential: (self: ExecutionStrategy) => self is Sequential = internal.isSequential

/**
 * Returns `true` if the specified `ExecutionStrategy` is an instance of
 * `Sequential`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isParallel: (self: ExecutionStrategy) => self is Parallel = internal.isParallel

/**
 * Returns `true` if the specified `ExecutionStrategy` is an instance of
 * `Sequential`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isParallelN: (self: ExecutionStrategy) => self is ParallelN = internal.isParallelN

/**
 * Folds over the specified `ExecutionStrategy` using the provided case
 * functions.
 *
 * @since 1.0.0
 * @category folding
 */
export const match: <A>(
  onSequential: () => A,
  onParallel: () => A,
  onParallelN: (n: number) => A
) => (self: ExecutionStrategy) => A = internal.match
