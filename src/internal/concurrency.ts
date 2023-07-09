import type { Concurrency } from "@effect/io/Concurrency"
import type { Effect } from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"

/** @internal */
export const match = <R, E, A>(
  options: {
    readonly concurrency?: Concurrency
    readonly batchRequests?: boolean | "inherit"
  } | undefined,
  sequential: () => Effect<R, E, A>,
  unbounded: () => Effect<R, E, A>,
  withLimit: (limit: number) => Effect<R, E, A>
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
    case "inherit": {
      effect = core.fiberRefGetWith(
        core.currentConcurrency,
        (concurrency) =>
          concurrency._tag === "None" ?
            unbounded() :
            concurrency.value > 1 ?
            withLimit(concurrency.value) :
            sequential()
      )
      break
    }
    default: {
      effect = options!.concurrency > 1 ?
        withLimit(options!.concurrency) :
        sequential()
      break
    }
  }
  return options?.batchRequests !== undefined && options.batchRequests !== "inherit" ?
    core.fiberRefLocally(effect, core.currentRequestBatchingEnabled, options.batchRequests) :
    effect
}

/** @internal */
export const matchSimple = <R, E, A>(
  options: {
    readonly concurrency?: Concurrency
    readonly batchRequests?: boolean | "inherit"
  } | undefined,
  sequential: () => Effect<R, E, A>,
  parallel: () => Effect<R, E, A>
) => {
  let effect: Effect<R, E, A>
  switch (options?.concurrency) {
    case undefined: {
      effect = sequential()
      break
    }
    case "unbounded": {
      effect = parallel()
      break
    }
    case "inherit": {
      effect = core.fiberRefGetWith(
        core.currentConcurrency,
        (concurrency) =>
          concurrency._tag === "None" ?
            parallel() :
            concurrency.value > 1 ?
            parallel() :
            sequential()
      )
      break
    }
    default: {
      effect = options!.concurrency > 1 ? parallel() : sequential()
      break
    }
  }

  return options?.batchRequests !== undefined && options.batchRequests !== "inherit" ?
    core.fiberRefLocally(effect, core.currentRequestBatchingEnabled, options.batchRequests) :
    effect
}
