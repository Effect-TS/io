import type { Concurrency } from "@effect/io/Concurrency"
import type { Effect } from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"

/** @internal */
export const match: <R, E, A>(
  options: {
    readonly concurrency?: Concurrency
  } | undefined,
  sequential: () => Effect<R, E, A>,
  unbounded: () => Effect<R, E, A>,
  bounded: (limit: number) => Effect<R, E, A>
) => Effect<R, E, A> = <R, E, A>(
  options: {
    readonly concurrency?: Concurrency
  } | undefined,
  sequential: () => Effect<R, E, A>,
  unbounded: () => Effect<R, E, A>,
  bounded: (limit: number) => Effect<R, E, A>
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
          concurrency === "unbounded" ?
            unbounded() :
            concurrency > 1 ?
            bounded(concurrency) :
            sequential()
      )
      break
    }
    default: {
      effect = options!.concurrency > 1 ?
        bounded(options!.concurrency) :
        sequential()
      break
    }
  }
  return effect
}

/** @internal */
export const matchSimple: <R, E, A>(
  options: {
    readonly concurrency?: Concurrency
  } | undefined,
  sequential: () => Effect<R, E, A>,
  concurrent: () => Effect<R, E, A>
) => Effect<R, E, A> = <R, E, A>(
  options: {
    readonly concurrency?: Concurrency
  } | undefined,
  sequential: () => Effect<R, E, A>,
  concurrent: () => Effect<R, E, A>
) => {
  let effect: Effect<R, E, A>
  switch (options?.concurrency) {
    case undefined: {
      effect = sequential()
      break
    }
    case "unbounded": {
      effect = concurrent()
      break
    }
    case "inherit": {
      effect = core.fiberRefGetWith(
        core.currentConcurrency,
        (concurrency) =>
          concurrency === "unbounded" ?
            concurrent() :
            concurrency > 1 ?
            concurrent() :
            sequential()
      )
      break
    }
    default: {
      effect = options!.concurrency > 1 ? concurrent() : sequential()
      break
    }
  }

  return effect
}
