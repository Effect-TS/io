import type * as Fiber from "@effect/io/Fiber"

export type SuspendedWarningData = Start | Pending | Done

export const OP_SUSPENDED_WARNING_DATA_START = "Start" as const

export type OP_SUSPENDED_WARNING_DATA_START = typeof OP_SUSPENDED_WARNING_DATA_START

export const OP_SUSPENDED_WARNING_DATA_PENDING = "Pending" as const

export type OP_SUSPENDED_WARNING_DATA_PENDING = typeof OP_SUSPENDED_WARNING_DATA_PENDING

export const OP_SUSPENDED_WARNING_DATA_DONE = "Done" as const

export type OP_SUSPENDED_WARNING_DATA_DONE = typeof OP_SUSPENDED_WARNING_DATA_DONE

export interface Start {
  readonly _tag: OP_SUSPENDED_WARNING_DATA_START
}

/** @internal */
export interface Pending {
  readonly _tag: OP_SUSPENDED_WARNING_DATA_PENDING
  readonly fiber: Fiber.Fiber<Error, void>
}

/** @internal */
export interface Done {
  readonly _tag: OP_SUSPENDED_WARNING_DATA_DONE
}

/**
 * State indicating that a test has not adjusted the clock.
 */
export const start: SuspendedWarningData = {
  _tag: OP_SUSPENDED_WARNING_DATA_START
}

/**
 * State indicating that a test has adjusted the clock but a fiber is still
 * running with a reference to the fiber that will display the warning
 * message.
 */
export const pending = (fiber: Fiber.Fiber<Error, void>): SuspendedWarningData => {
  return {
    _tag: OP_SUSPENDED_WARNING_DATA_PENDING,
    fiber
  }
}

/**
 * State indicating that the warning message has already been displayed.
 */
export const done: SuspendedWarningData = {
  _tag: OP_SUSPENDED_WARNING_DATA_DONE
}

export const isStart = (self: SuspendedWarningData): self is Start => {
  return self._tag === OP_SUSPENDED_WARNING_DATA_START
}

export const isPending = (self: SuspendedWarningData): self is Pending => {
  return self._tag === OP_SUSPENDED_WARNING_DATA_PENDING
}

export const isDone = (self: SuspendedWarningData): self is Done => {
  return self._tag === OP_SUSPENDED_WARNING_DATA_DONE
}
