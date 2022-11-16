import type * as Fiber from "@effect/io/Fiber"

export type SuspendedWarningData = Start | Pending | Done

export const OP_SUSPENDED_WARNING_DATA_START = 0 as const

export type OP_SUSPENDED_WARNING_DATA_START = typeof OP_SUSPENDED_WARNING_DATA_START

export const OP_SUSPENDED_WARNING_DATA_PENDING = 1 as const

export type OP_SUSPENDED_WARNING_DATA_PENDING = typeof OP_SUSPENDED_WARNING_DATA_PENDING

export const OP_SUSPENDED_WARNING_DATA_DONE = 2 as const

export type OP_SUSPENDED_WARNING_DATA_DONE = typeof OP_SUSPENDED_WARNING_DATA_DONE

export interface Start {
  readonly op: OP_SUSPENDED_WARNING_DATA_START
}

/** @internal */
export interface Pending {
  readonly op: OP_SUSPENDED_WARNING_DATA_PENDING
  readonly fiber: Fiber.Fiber<Error, void>
}

/** @internal */
export interface Done {
  readonly op: OP_SUSPENDED_WARNING_DATA_DONE
}

/**
 * State indicating that a test has not adjusted the clock.
 */
export const start: SuspendedWarningData = {
  op: OP_SUSPENDED_WARNING_DATA_START
}

/**
 * State indicating that a test has adjusted the clock but a fiber is still
 * running with a reference to the fiber that will display the warning
 * message.
 */
export const pending = (fiber: Fiber.Fiber<Error, void>): SuspendedWarningData => {
  return {
    op: OP_SUSPENDED_WARNING_DATA_PENDING,
    fiber
  }
}

/**
 * State indicating that the warning message has already been displayed.
 */
export const done: SuspendedWarningData = {
  op: OP_SUSPENDED_WARNING_DATA_DONE
}

export const isStart = (self: SuspendedWarningData): self is Start => {
  return self.op === OP_SUSPENDED_WARNING_DATA_START
}

export const isPending = (self: SuspendedWarningData): self is Pending => {
  return self.op === OP_SUSPENDED_WARNING_DATA_PENDING
}

export const isDone = (self: SuspendedWarningData): self is Done => {
  return self.op === OP_SUSPENDED_WARNING_DATA_DONE
}
