import type * as ExecutionStrategy from "@effect/io/ExecutionStrategy"

/** @internal */
export const OP_SEQUENTIAL = 0 as const

/** @internal */
export type OP_SEQUENTIAL = typeof OP_SEQUENTIAL

/** @internal */
export const OP_PARALLEL = 1 as const

/** @internal */
export type OP_PARALLEL = typeof OP_PARALLEL

/** @internal */
export const OP_PARALLEL_N = 2 as const

/** @internal */
export type OP_PARALLEL_N = typeof OP_PARALLEL_N

/** @internal */
export const sequential: ExecutionStrategy.ExecutionStrategy = { op: OP_SEQUENTIAL }

/** @internal */
export const parallel: ExecutionStrategy.ExecutionStrategy = { op: OP_PARALLEL }

/** @internal */
export const parallelN = (parallelism: number): ExecutionStrategy.ExecutionStrategy => {
  return { op: OP_PARALLEL_N, parallelism }
}

/** @internal */
export const isSequential = (self: ExecutionStrategy.ExecutionStrategy): self is ExecutionStrategy.Sequential => {
  return self.op === OP_SEQUENTIAL
}

/** @internal */
export const isParallel = (self: ExecutionStrategy.ExecutionStrategy): self is ExecutionStrategy.Parallel => {
  return self.op === OP_PARALLEL
}

/** @internal */
export const isParallelN = (self: ExecutionStrategy.ExecutionStrategy): self is ExecutionStrategy.ParallelN => {
  return self.op === OP_PARALLEL_N
}

/** @internal */
export const match = <A>(
  onSequential: () => A,
  onParallel: () => A,
  onParallelN: (n: number) => A
) => {
  return (self: ExecutionStrategy.ExecutionStrategy): A => {
    switch (self.op) {
      case OP_SEQUENTIAL: {
        return onSequential()
      }
      case OP_PARALLEL: {
        return onParallel()
      }
      case OP_PARALLEL_N: {
        return onParallelN(self.parallelism)
      }
    }
  }
}
