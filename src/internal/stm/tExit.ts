import type * as FiberId from "@effect/io/Fiber/Id"
import type * as TExit from "@effect/io/STM/TExit"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
const TExitSymbolKey = "@effect/io/TExit"

/** @internal */
export const TExitTypeId: TExit.TExitTypeId = Symbol.for(
  TExitSymbolKey
) as TExit.TExitTypeId

/** @internal */
export const OP_FAIL: TExit.OP_FAIL = 0 as const

/** @internal */
export const OP_DIE: TExit.OP_DIE = 1 as const

/** @internal */
export const OP_INTERRUPT: TExit.OP_INTERRUPT = 2 as const

/** @internal */
export const OP_SUCCEED: TExit.OP_SUCCEED = 3 as const

/** @internal */
export const OP_RETRY: TExit.OP_RETRY = 4 as const

/** @internal */
export const tExitVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export const isTExit = (u: unknown): u is TExit.TExit<unknown, unknown> => {
  return typeof u === "object" && u != null && TExitTypeId in u
}

/** @internal */
export const isFail = <E, A>(self: TExit.TExit<E, A>): self is TExit.Fail<E> => {
  return self.op === OP_FAIL
}

/** @internal */
export const isDie = <E, A>(self: TExit.TExit<E, A>): self is TExit.Die => {
  return self.op === OP_DIE
}

/** @internal */
export const isInterrupt = <E, A>(self: TExit.TExit<E, A>): self is TExit.Interrupt => {
  return self.op === OP_INTERRUPT
}

/** @internal */
export const isSuccess = <E, A>(self: TExit.TExit<E, A>): self is TExit.Succeed<A> => {
  return self.op === OP_SUCCEED
}

/** @internal */
export const isRetry = <E, A>(self: TExit.TExit<E, A>): self is TExit.Retry => {
  return self.op === OP_RETRY
}

/** @internal */
export const fail = <E>(error: E): TExit.TExit<E, never> => ({
  [TExitTypeId]: tExitVariance,
  op: OP_FAIL,
  error,
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(TExitSymbolKey),
      Equal.hashCombine(Equal.hash(OP_FAIL)),
      Equal.hashCombine(Equal.hash(error))
    )
  },
  [Equal.symbolEqual](that: unknown): boolean {
    return isTExit(that) && that.op === OP_FAIL && Equal.equals(error, that.error)
  }
})

/** @internal */
export const die = (defect: unknown): TExit.TExit<never, never> => ({
  [TExitTypeId]: tExitVariance,
  op: OP_DIE,
  defect,
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(TExitSymbolKey),
      Equal.hashCombine(Equal.hash(OP_DIE)),
      Equal.hashCombine(Equal.hash(defect))
    )
  },
  [Equal.symbolEqual](that: unknown): boolean {
    return isTExit(that) && that.op === OP_DIE && Equal.equals(defect, that.defect)
  }
})

/** @internal */
export const interrupt = (fiberId: FiberId.FiberId): TExit.TExit<never, never> => ({
  [TExitTypeId]: tExitVariance,
  op: OP_INTERRUPT,
  fiberId,
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(TExitSymbolKey),
      Equal.hashCombine(Equal.hash(OP_INTERRUPT)),
      Equal.hashCombine(Equal.hash(fiberId))
    )
  },
  [Equal.symbolEqual](that: unknown): boolean {
    return isTExit(that) && that.op === OP_INTERRUPT && Equal.equals(fiberId, that.fiberId)
  }
})

/** @internal */
export const succeed = <A>(value: A): TExit.TExit<never, A> => ({
  [TExitTypeId]: tExitVariance,
  op: OP_SUCCEED,
  value,
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(TExitSymbolKey),
      Equal.hashCombine(Equal.hash(OP_SUCCEED)),
      Equal.hashCombine(Equal.hash(value))
    )
  },
  [Equal.symbolEqual](that: unknown): boolean {
    return isTExit(that) && that.op === OP_SUCCEED && Equal.equals(value, that.value)
  }
})

/** @internal */
const retryHash = Equal.hashRandom({ OP_RETRY })

/** @internal */
export const retry: TExit.TExit<never, never> = ({
  [TExitTypeId]: tExitVariance,
  op: OP_RETRY,
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(TExitSymbolKey),
      Equal.hashCombine(Equal.hash(OP_RETRY)),
      Equal.hashCombine(Equal.hash(retryHash))
    )
  },
  [Equal.symbolEqual](that: unknown): boolean {
    return isTExit(that) && isRetry(that)
  }
})

/** @internal */
export const unit = (): TExit.TExit<never, void> => succeed(undefined)
