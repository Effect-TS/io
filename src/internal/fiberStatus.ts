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
class Done implements Equal.Equal {
  readonly [FiberStatusTypeId]: FiberStatus.FiberStatusTypeId = FiberStatusTypeId
  readonly _tag = "Done";
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(FiberStatusSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isFiberStatus(that) && that._tag === "Done"
  }
}

/** @internal */
class Running implements Equal.Equal {
  readonly [FiberStatusTypeId]: FiberStatus.FiberStatusTypeId = FiberStatusTypeId
  readonly _tag = "Running"
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
      that._tag === "Running" &&
      this.runtimeFlags === that.runtimeFlags
    )
  }
}

/** @internal */
class Suspended implements Equal.Equal {
  readonly [FiberStatusTypeId]: FiberStatus.FiberStatusTypeId = FiberStatusTypeId
  readonly _tag = "Suspended"
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
      that._tag === "Suspended" &&
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
