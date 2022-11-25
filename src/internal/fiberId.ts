import type * as FiberId from "@effect/io/Fiber/Id"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"

/** @internal */
const FiberIdSymbolKey = "@effect/io/Fiber/Id"

/** @internal */
export const FiberIdTypeId: FiberId.FiberIdTypeId = Symbol.for(
  FiberIdSymbolKey
) as FiberId.FiberIdTypeId

/** @internal */
const OP_NONE = 0 as const

/** @internal */
export type OP_NONE = typeof OP_NONE

/** @internal */
const OP_RUNTIME = 1 as const

/** @internal */
export type OP_RUNTIME = typeof OP_RUNTIME

/** @internal */
const OP_COMPOSITE = 2 as const

/** @internal */
export type OP_COMPOSITE = typeof OP_COMPOSITE

/** @internal */
class None implements FiberId.None {
  readonly [FiberIdTypeId]: FiberId.FiberIdTypeId = FiberIdTypeId
  readonly op = OP_NONE;
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(FiberIdSymbolKey),
      Equal.hashCombine(Equal.hash(this.op))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isFiberId(that) && that.op === OP_NONE
  }
}

/** @internal */
class Runtime implements FiberId.Runtime {
  readonly [FiberIdTypeId]: FiberId.FiberIdTypeId = FiberIdTypeId
  readonly op = OP_RUNTIME
  constructor(
    readonly id: number,
    readonly startTimeMillis: number
  ) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(FiberIdSymbolKey),
      Equal.hashCombine(Equal.hash(this.op)),
      Equal.hashCombine(Equal.hash(this.id)),
      Equal.hashCombine(Equal.hash(this.startTimeMillis))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isFiberId(that) &&
      that.op === OP_RUNTIME &&
      this.id === that.id &&
      this.startTimeMillis === that.startTimeMillis
  }
}

/** @internal */
class Composite implements FiberId.Composite {
  readonly [FiberIdTypeId]: FiberId.FiberIdTypeId = FiberIdTypeId
  readonly op = OP_COMPOSITE
  constructor(
    readonly left: FiberId.FiberId,
    readonly right: FiberId.FiberId
  ) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(FiberIdSymbolKey),
      Equal.hashCombine(Equal.hash(this.op)),
      Equal.hashCombine(Equal.hash(this.left)),
      Equal.hashCombine(Equal.hash(this.right))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isFiberId(that) &&
      that.op === OP_COMPOSITE &&
      Equal.equals(this.left, that.left) &&
      Equal.equals(this.right, that.right)
  }
}

/** @internal */
export const none: FiberId.FiberId = new None()

/** @internal */
export const runtime = (id: number, startTimeMillis: number): FiberId.FiberId => {
  return new Runtime(id, startTimeMillis)
}

/** @internal */
export const composite = (left: FiberId.FiberId, right: FiberId.FiberId): FiberId.FiberId => {
  return new Composite(left, right)
}

/** @internal */
export const isFiberId = (self: unknown): self is FiberId.FiberId => {
  return typeof self === "object" && self != null && FiberIdTypeId in self
}

/** @internal */
export const isNone = (self: FiberId.FiberId): self is FiberId.None => {
  return self.op === OP_NONE || pipe(toSet(self), HashSet.every((id) => isNone(id)))
}

/** @internal */
export const isRuntime = (self: FiberId.FiberId): self is FiberId.Runtime => {
  return self.op === OP_RUNTIME
}

/** @internal */
export const isComposite = (self: FiberId.FiberId): self is FiberId.Composite => {
  return self.op === OP_COMPOSITE
}

/** @internal */
export const combine = (that: FiberId.FiberId) => {
  return (self: FiberId.FiberId): FiberId.FiberId => {
    if (self.op === OP_NONE) {
      return that
    }
    if (that.op === OP_NONE) {
      return self
    }
    return new Composite(self, that)
  }
}

/** @internal */
export const combineAll = (fiberIds: HashSet.HashSet<FiberId.FiberId>): FiberId.FiberId => {
  return pipe(fiberIds, HashSet.reduce(none as FiberId.FiberId, (a, b) => combine(b)(a)))
}

/** @internal */
export const getOrElse = (that: FiberId.FiberId) => {
  return (self: FiberId.FiberId): FiberId.FiberId => isNone(self) ? that : self
}

/** @internal */
export const ids = (self: FiberId.FiberId): HashSet.HashSet<number> => {
  switch (self.op) {
    case OP_NONE: {
      return HashSet.empty()
    }
    case OP_RUNTIME: {
      return HashSet.make(self.id)
    }
    case OP_COMPOSITE: {
      return pipe(ids(self.left), HashSet.union(ids(self.right)))
    }
  }
}

const _fiberCounter = MutableRef.make(0)

/** @internal */
export const make = (id: number, startTimeSeconds: number): FiberId.FiberId => {
  return new Runtime(id, startTimeSeconds)
}

/** @internal */
export const threadName = (self: FiberId.FiberId): string => {
  const identifiers = Array.from(ids(self)).map((n) => `#${n}`).join(",")
  return identifiers
}

/** @internal */
export const toOption = (self: FiberId.FiberId): Option.Option<FiberId.FiberId> => {
  const fiberIds = toSet(self)
  if (HashSet.size(fiberIds) === 0) {
    return Option.none
  }
  let first = true
  let acc: FiberId.FiberId
  for (const fiberId of fiberIds) {
    if (first) {
      acc = fiberId
      first = false
    } else {
      // @ts-expect-error
      acc = pipe(acc, combine(fiberId))
    }
  }
  // @ts-expect-error
  return Option.some(acc)
}

/** @internal */
export const toSet = (self: FiberId.FiberId): HashSet.HashSet<FiberId.Runtime> => {
  switch (self.op) {
    case OP_NONE: {
      return HashSet.empty()
    }
    case OP_RUNTIME: {
      return HashSet.make(self)
    }
    case OP_COMPOSITE: {
      return pipe(toSet(self.left), HashSet.union(toSet(self.right)))
    }
  }
}

/** @internal */
export const unsafeMake = (): FiberId.Runtime => {
  const id = MutableRef.get(_fiberCounter)
  pipe(_fiberCounter, MutableRef.set(id + 1))
  return new Runtime(id, new Date().getTime())
}
