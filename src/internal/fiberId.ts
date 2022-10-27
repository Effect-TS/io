import type * as FiberId from "@effect/io/Fiber/Id"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"
import * as SafeEval from "@fp-ts/data/SafeEval"

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
  constructor(readonly fiberIds: HashSet.HashSet<FiberId.Runtime>) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(FiberIdSymbolKey),
      Equal.hashCombine(Equal.hash(this._tag)),
      Equal.hashCombine(Equal.hash(this.fiberIds))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isFiberId(that) &&
      that._tag === "Composite" &&
      Equal.equals(this.fiberIds, that.fiberIds)
  }
}

/** @internal */
export const none: FiberId.FiberId = new None()

/** @internal */
export const runtime = (id: number, startTimeMillis: number): FiberId.FiberId => {
  return new Runtime(id, startTimeMillis)
}

/** @internal */
export const composite = (fiberIds: HashSet.HashSet<FiberId.Runtime>): FiberId.FiberId => {
  return new Composite(fiberIds)
}

/** @internal */
export const isFiberId = (self: unknown): self is FiberId.FiberId => {
  return typeof self === "object" && self != null && FiberIdTypeId in self
}

/** @internal */
export const isNone = (self: FiberId.FiberId): self is FiberId.None => {
  return SafeEval.execute(isNoneSafe(self))
}

const isNoneSafe = (self: FiberId.FiberId): SafeEval.SafeEval<boolean> => {
  switch (self._tag) {
    case "None": {
      return SafeEval.succeed(true)
    }
    case "Runtime": {
      return SafeEval.succeed(false)
    }
    case "Composite": {
      let base = SafeEval.succeed(true)
      for (const fiberId of self.fiberIds) {
        base = SafeEval.suspend(() =>
          pipe(
            isNoneSafe(fiberId),
            SafeEval.zipWith(base, (a, b) => a && b)
          )
        )
      }
      return base
    }
  }
}

/** @internal */
export const combine = (that: FiberId.FiberId) => {
  return (self: FiberId.FiberId): FiberId.FiberId => {
    switch (self._tag) {
      case "None": {
        return that
      }
      case "Runtime": {
        switch (that._tag) {
          case "None": {
            return self
          }
          case "Runtime": {
            return new Composite(HashSet.make(self, that))
          }
          case "Composite": {
            return new Composite(pipe(that.fiberIds, HashSet.add(self)))
          }
        }
      }
      case "Composite": {
        switch (that._tag) {
          case "None": {
            return self
          }
          case "Runtime": {
            return new Composite(pipe(self.fiberIds, HashSet.add(that)))
          }
          case "Composite": {
            return new Composite(pipe(self.fiberIds, HashSet.union(that.fiberIds)))
          }
        }
      }
    }
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
  return SafeEval.execute(idsSafe(self))
}

const idsSafe = (self: FiberId.FiberId): SafeEval.SafeEval<HashSet.HashSet<number>> => {
  switch (self._tag) {
    case "None": {
      return SafeEval.succeed(HashSet.empty())
    }
    case "Runtime": {
      return SafeEval.succeed(HashSet.from([self.id]))
    }
    case "Composite": {
      let base = SafeEval.succeed(HashSet.empty<number>())
      for (const fiberId of self.fiberIds) {
        base = pipe(
          SafeEval.suspend(() => idsSafe(fiberId)),
          SafeEval.zipWith(base, (a, b) => pipe(a, HashSet.union(b)))
        )
      }
      return base
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
  return SafeEval.execute(toOptionSafe(self))
}

const toOptionSafe = (self: FiberId.FiberId): SafeEval.SafeEval<Option.Option<FiberId.FiberId>> => {
  switch (self._tag) {
    case "None": {
      return SafeEval.succeed(Option.none)
    }
    case "Runtime": {
      return SafeEval.succeed(Option.some(self))
    }
    case "Composite": {
      let base = SafeEval.succeed(HashSet.empty<FiberId.FiberId>())
      for (const fiberId of self.fiberIds) {
        base = pipe(
          base,
          SafeEval.zipWith(
            SafeEval.suspend(() => toOptionSafe(fiberId)),
            (fiberIds, optionFiberId) =>
              optionFiberId._tag === "Some" ?
                pipe(fiberIds, HashSet.add(optionFiberId.value)) :
                fiberIds
          )
        )
      }
      return pipe(
        base,
        SafeEval.map((fiberIds) =>
          HashSet.size(fiberIds) === 0 ?
            Option.none :
            Option.some(combineAll(fiberIds))
        )
      )
    }
  }
}
