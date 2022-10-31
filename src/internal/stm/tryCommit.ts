import type * as Exit from "@effect/io/Exit"
import type * as Journal from "@effect/io/internal/stm/journal"

/** @internal */
export type TryCommit<E, A> = Done<E, A> | Suspend

/** @internal */
export interface Done<E, A> {
  readonly op: OP_DONE
  readonly exit: Exit.Exit<E, A>
}

/** @internal */
export interface Suspend {
  readonly op: OP_SUSPEND
  readonly journal: Journal.Journal
}

/** @internal */
export const OP_DONE = 0 as const

/** @internal */
export type OP_DONE = typeof OP_DONE

/** @internal */
export const OP_SUSPEND = 1 as const

/** @internal */
export type OP_SUSPEND = typeof OP_SUSPEND

/** @internal */
export const done = <E, A>(exit: Exit.Exit<E, A>): TryCommit<E, A> => {
  return {
    op: OP_DONE,
    exit
  }
}

/** @internal */
export const suspend = (journal: Journal.Journal): TryCommit<never, never> => {
  return {
    op: OP_SUSPEND,
    journal
  }
}
