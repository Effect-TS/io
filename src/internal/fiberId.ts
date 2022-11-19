import type * as FiberId from "@effect/io/Fiber/Id"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"

const FiberIdSymbolKey = "@effect/io/Fiber/Id"

/** @internal */
export const FiberIdTypeId: FiberId.FiberIdTypeId = Symbol.for(
  FiberIdSymbolKey
) as FiberId.FiberIdTypeId

/** @internal */
class None implements FiberId.None {
  readonly [FiberIdTypeId]: FiberId.FiberIdTypeId = FiberIdTypeId
  readonly _tag = "None";
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(FiberIdSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isFiberId(that) && that._tag === "None"
  }
}

/** @internal */
class Runtime implements FiberId.Runtime {
  readonly [FiberIdTypeId]: FiberId.FiberIdTypeId = FiberIdTypeId
  readonly _tag = "Runtime"
  constructor(
    readonly id: number,
    readonly startTimeMillis: number
  ) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(FiberIdSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag)),
      Equal.hashCombine(Equal.hash(this.id)),
      Equal.hashCombine(Equal.hash(this.startTimeMillis))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isFiberId(that) &&
      that._tag === "Runtime" &&
      this.id === that.id &&
      this.startTimeMillis === that.startTimeMillis
  }
}

/** @internal */
class Composite implements FiberId.Composite {
  readonly [FiberIdTypeId]: FiberId.FiberIdTypeId = FiberIdTypeId
  readonly _tag = "Composite"
  constructor(
    readonly left: FiberId.FiberId,
    readonly right: FiberId.FiberId
  ) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(FiberIdSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag)),
      Equal.hashCombine(Equal.hash(this.left)),
      Equal.hashCombine(Equal.hash(this.right))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isFiberId(that) &&
      that._tag === "Composite" &&
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
  return pipe(toSet(self), HashSet.every((id) => isNone(id)))
}

/** @internal */
export const combine = (that: FiberId.FiberId) => {
  return (self: FiberId.FiberId): FiberId.FiberId => {
    if (self._tag === "None") {
      return that
    }
    if (that._tag === "None") {
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
  switch (self._tag) {
    case "None": {
      return HashSet.empty()
    }
    case "Runtime": {
      return HashSet.make(self.id)
    }
    case "Composite": {
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
export const unsafeMake = (): FiberId.Runtime => {
  const id = MutableRef.get(_fiberCounter)
  pipe(_fiberCounter, MutableRef.set(id + 1))
  return new Runtime(id, new Date().getTime())
}

/** @internal */
export const threadName = (self: FiberId.FiberId): string => {
  const identifiers = Array.from(ids(self)).map((n) => `${n}`).join(",")
  const plural = identifiers.length > 1
  return `effect-fiber${plural ? "s" : ""}-${identifiers}`
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
  switch (self._tag) {
    case "None": {
      return HashSet.empty()
    }
    case "Composite": {
      return pipe(toSet(self.left), HashSet.union(toSet(self.right)))
    }
    case "Runtime": {
      return HashSet.make(self)
    }
  }
}
