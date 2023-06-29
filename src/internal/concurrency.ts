import type { Effect } from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"

/** @internal */
export type Concurrency = number | "unbounded"

/** @internal */
export const matchWithBatched = <R, E, A>(
  options: {
    readonly concurrency?: Concurrency
    readonly batched?: boolean
  } | undefined,
  sequential: () => Effect<R, E, A>,
  unbounded: () => Effect<R, E, A>,
  withLimit: (limit: number) => Effect<R, E, A>,
  batched: () => Effect<R, E, A>
) => {
  let effect: Effect<R, E, A>
  switch (options?.concurrency) {
    case undefined: {
      effect = sequential()
      break
    }
    case "unbounded": {
      effect = unbounded()
      break
    }
    case 1: {
      effect = options.batched ? batched() : sequential()
      break
    }
    default: {
      effect = options!.concurrency > 1 ?
        withLimit(options!.concurrency) :
        sequential()
      break
    }
  }
  return options?.batched !== undefined ?
    core.fiberRefLocally(effect, core.currentRequestBatchingEnabled, options.batched) :
    effect
}

/** @internal */
export const matchWithBatchedSimple = <R, E, A>(
  options: {
    readonly concurrency?: Concurrency
    readonly batched?: boolean
  } | undefined,
  sequential: () => Effect<R, E, A>,
  parallel: () => Effect<R, E, A>
) => {
  switch (options?.concurrency) {
    case undefined:
      return sequential()
    case "unbounded":
      return parallel()
    case 1:
      return options.batched ? parallel() : sequential()
    default:
      return options!.concurrency > 1 ? parallel() : sequential()
  }
}
