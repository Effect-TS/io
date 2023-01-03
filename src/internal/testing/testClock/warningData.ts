import type * as Fiber from "@effect/io/Fiber"

/**
 * `WarningData` describes the state of the warning message that is displayed
 * if a test is using time by is not advancing the `TestClock`. The possible
 * states are `Start` if a test has not used time, `Pending` if a test has
 * used time but has not adjusted the `TestClock`, and `Done` if a test has
 * adjusted the `TestClock` or the warning message has already been displayed.
 */
export type WarningData = Start | Pending | Done

export const OP_WARNING_DATA_START = "Start" as const

export type OP_WARNING_DATA_START = typeof OP_WARNING_DATA_START

export const OP_WARNING_DATA_PENDING = "Pending" as const

export type OP_WARNING_DATA_PENDING = typeof OP_WARNING_DATA_PENDING

export const OP_WARNING_DATA_DONE = "Done" as const

export type OP_WARNING_DATA_DONE = typeof OP_WARNING_DATA_DONE

/** @internal */
export interface Start {
  readonly _tag: OP_WARNING_DATA_START
}

/** @internal */
export interface Pending {
  readonly _tag: OP_WARNING_DATA_PENDING
  readonly fiber: Fiber.Fiber<Error, void>
}

/** @internal */
export interface Done {
  readonly _tag: OP_WARNING_DATA_DONE
}

/**
 * State indicating that a test has not used time.
 */
export const start: WarningData = {
  _tag: OP_WARNING_DATA_START
}

/**
 * State indicating that a test has used time but has not adjusted the
 * `TestClock` with a reference to the fiber that will display the warning
 * message.
 */
export const pending = (fiber: Fiber.Fiber<Error, void>): WarningData => {
  return {
    _tag: OP_WARNING_DATA_PENDING,
    fiber
  }
}

/**
 * State indicating that a test has used time or the warning message has
 * already been displayed.
 */
export const done: WarningData = {
  _tag: OP_WARNING_DATA_DONE
}

export const isStart = (self: WarningData): self is Start => {
  return self._tag === OP_WARNING_DATA_START
}

export const isPending = (self: WarningData): self is Pending => {
  return self._tag === OP_WARNING_DATA_PENDING
}

export const isDone = (self: WarningData): self is Done => {
  return self._tag === OP_WARNING_DATA_DONE
}
