import * as Exit from "@effect/io/Exit"
import * as TExit from "@effect/io/STM/TExit"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
const STMStateSymbolKey = "@effect/io/STM/State"

/** @internal */
export const STMStateTypeId = Symbol.for(STMStateSymbolKey)

/** @internal */
export type STMStateTypeId = typeof STMStateTypeId

/** @internal */
export type STMState<E, A> = Done<E, A> | Interrupted | Running

/** @internal */
export const OP_DONE = 0 as const

/** @internal */
export type OP_DONE = typeof OP_DONE

/** @internal */
export const OP_INTERRUPTED = 1 as const

/** @internal */
export type OP_INTERRUPTED = typeof OP_INTERRUPTED

/** @internal */
export const OP_RUNNING = 2 as const

/** @internal */
export type OP_RUNNING = typeof OP_RUNNING

/** @internal */
export interface Done<E, A> extends Equal.Equal {
  readonly [STMStateTypeId]: STMStateTypeId
  readonly op: OP_DONE
  readonly exit: Exit.Exit<E, A>
}

/** @internal */
export interface Interrupted extends Equal.Equal {
  readonly [STMStateTypeId]: STMStateTypeId
  readonly op: OP_INTERRUPTED
}

/** @internal */
export interface Running extends Equal.Equal {
  readonly [STMStateTypeId]: STMStateTypeId
  readonly op: OP_RUNNING
}

/** @internal */
export const isSTMState = (u: unknown): u is STMState<unknown, unknown> => {
  return typeof u === "object" && u != null && STMStateTypeId in u
}

/** @internal */
export const isRunning = <E, A>(self: STMState<E, A>): self is Running => {
  return self.op === OP_RUNNING
}

/** @internal */
export const done = <E, A>(exit: Exit.Exit<E, A>): STMState<E, A> => {
  return {
    [STMStateTypeId]: STMStateTypeId,
    op: OP_DONE,
    exit,
    [Equal.symbolHash](): number {
      return pipe(
        Equal.hash(STMStateSymbolKey),
        Equal.hashCombine(Equal.hash(OP_DONE)),
        Equal.hashCombine(Equal.hash(exit))
      )
    },
    [Equal.symbolEqual](that: unknown): boolean {
      return isSTMState(that) && that.op === OP_DONE && Equal.equals(exit, that.exit)
    }
  }
}

/** @internal */
const interruptedHash = Equal.hashRandom({ OP_INTERRUPTED })

/** @internal */
export const interrupted: STMState<never, never> = {
  [STMStateTypeId]: STMStateTypeId,
  op: OP_INTERRUPTED,
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(STMStateSymbolKey),
      Equal.hashCombine(Equal.hash(OP_INTERRUPTED)),
      Equal.hashCombine(Equal.hash(interruptedHash))
    )
  },
  [Equal.symbolEqual](that: unknown): boolean {
    return isSTMState(that) && that.op === OP_INTERRUPTED
  }
}

/** @internal */
const runningHash = Equal.hashRandom({ OP_RUNNING })

/** @internal */
export const running: STMState<never, never> = {
  [STMStateTypeId]: STMStateTypeId,
  op: OP_RUNNING,
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(STMStateSymbolKey),
      Equal.hashCombine(Equal.hash(OP_RUNNING)),
      Equal.hashCombine(Equal.hash(runningHash))
    )
  },
  [Equal.symbolEqual](that: unknown): boolean {
    return isSTMState(that) && that.op === OP_RUNNING
  }
}

/** @internal */
export const fromTExit = <E, A>(tExit: TExit.TExit<E, A>): STMState<E, A> => {
  switch (tExit.op) {
    case TExit.OP_FAIL: {
      return done(Exit.fail(tExit.error))
    }
    case TExit.OP_DIE: {
      return done(Exit.die(tExit.defect))
    }
    case TExit.OP_INTERRUPT: {
      return done(Exit.interrupt(tExit.fiberId))
    }
    case TExit.OP_SUCCEED: {
      return done(Exit.succeed(tExit.value))
    }
    case TExit.OP_RETRY: {
      throw new Error("BUG: STM.STMState.fromTExit - please report an issue at https://github.com/Effect-TS/io/issues")
    }
  }
}
