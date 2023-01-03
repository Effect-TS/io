import type { FiberId } from "@effect/io/Fiber/Id"
import type { RuntimeFlags } from "@effect/io/Fiber/Runtime/Flags"
import type * as FiberStatus from "@effect/io/Fiber/Status"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

const FiberStatusSymbolKey = "@effect/io/Fiber/Status"

/** @internal */
export const FiberStatusTypeId: FiberStatus.FiberStatusTypeId = Symbol.for(
  FiberStatusSymbolKey
) as FiberStatus.FiberStatusTypeId

/** @internal */
export const OP_DONE = "Done" as const

/** @internal */
export type OP_DONE = typeof OP_DONE

/** @internal */
export const OP_RUNNING = "Running" as const

/** @internal */
export type OP_RUNNING = typeof OP_RUNNING

/** @internal */
export const OP_SUSPENDED = "Suspended" as const

/** @internal */
export type OP_SUSPENDED = typeof OP_SUSPENDED

/** @internal */
class Done implements FiberStatus.Done {
  readonly [FiberStatusTypeId]: FiberStatus.FiberStatusTypeId = FiberStatusTypeId
  readonly _tag = OP_DONE;
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(FiberStatusSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isFiberStatus(that) && that._tag === OP_DONE
  }
}

/** @internal */
class Running implements FiberStatus.Running {
  readonly [FiberStatusTypeId]: FiberStatus.FiberStatusTypeId = FiberStatusTypeId
  readonly _tag = OP_RUNNING
  constructor(readonly runtimeFlags: RuntimeFlags) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(FiberStatusSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag)),
      Equal.hashCombine(Equal.hash(this.runtimeFlags))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === OP_RUNNING &&
      this.runtimeFlags === that.runtimeFlags
    )
  }
}

/** @internal */
class Suspended implements FiberStatus.Suspended {
  readonly [FiberStatusTypeId]: FiberStatus.FiberStatusTypeId = FiberStatusTypeId
  readonly _tag = OP_SUSPENDED
  constructor(
    readonly runtimeFlags: RuntimeFlags,
    readonly blockingOn: FiberId
  ) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(FiberStatusSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag)),
      Equal.hashCombine(Equal.hash(this.runtimeFlags)),
      Equal.hashCombine(Equal.hash(this.blockingOn))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return (
      isFiberStatus(that) &&
      that._tag === OP_SUSPENDED &&
      this.runtimeFlags === that.runtimeFlags &&
      Equal.equals(this.blockingOn, that.blockingOn)
    )
  }
}

/** @internal */
export const done: FiberStatus.FiberStatus = new Done()

/** @internal */
export const running = (runtimeFlags: RuntimeFlags): FiberStatus.FiberStatus => {
  return new Running(runtimeFlags)
}

/** @internal */
export const suspended = (
  runtimeFlags: RuntimeFlags,
  blockingOn: FiberId
): FiberStatus.FiberStatus => {
  return new Suspended(runtimeFlags, blockingOn)
}

/** @internal */
export const isFiberStatus = (u: unknown): u is FiberStatus.FiberStatus => {
  return typeof u === "object" && u != null && FiberStatusTypeId in u
}

/** @internal */
export const isDone = (self: FiberStatus.FiberStatus): self is FiberStatus.Done => {
  return self._tag === OP_DONE
}

/** @internal */
export const isRunning = (self: FiberStatus.FiberStatus): self is FiberStatus.Running => {
  return self._tag === OP_RUNNING
}

/** @internal */
export const isSuspended = (self: FiberStatus.FiberStatus): self is FiberStatus.Suspended => {
  return self._tag === OP_SUSPENDED
}
