import type * as FiberId from "@effect/io/Fiber/Id"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
const TExitSymbolKey = "@effect/io/TExit"

/** @internal */
export const TExitTypeId = Symbol.for(TExitSymbolKey)

/** @internal */
export type TExitTypeId = typeof TExitTypeId

/** @internal */
export type TExit<E, A> = Fail<E> | Die | Interrupt | Succeed<A> | Retry

/** @internal */
export interface Variance<E, A> {
  readonly [TExitTypeId]: {
    readonly _E: (_: never) => E
    readonly _A: (_: never) => A
  }
}

/** @internal */
const variance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export const OP_FAIL = 0 as const

/** @internal */
export type OP_FAIL = typeof OP_FAIL

/** @internal */
export const OP_DIE = 1 as const

/** @internal */
export type OP_DIE = typeof OP_DIE

/** @internal */
export const OP_INTERRUPT = 2 as const

/** @internal */
export type OP_INTERRUPT = typeof OP_INTERRUPT

/** @internal */
export const OP_SUCCEED = 3 as const

/** @internal */
export type OP_SUCCEED = typeof OP_SUCCEED

/** @internal */
export const OP_RETRY = 4 as const

/** @internal */
export type OP_RETRY = typeof OP_RETRY

/** @internal */
export interface Fail<E> extends Variance<E, never>, Equal.Equal {
  readonly op: OP_FAIL
  readonly error: E
}

/** @internal */
export interface Die extends Variance<never, never>, Equal.Equal {
  readonly op: OP_DIE
  readonly defect: unknown
}

/** @internal */
export interface Interrupt extends Variance<never, never>, Equal.Equal {
  readonly op: OP_INTERRUPT
  readonly fiberId: FiberId.FiberId
}

/** @internal */
export interface Succeed<A> extends Variance<never, A>, Equal.Equal {
  readonly op: OP_SUCCEED
  readonly value: A
}

/** @internal */
export interface Retry extends Variance<never, never>, Equal.Equal {
  readonly op: OP_RETRY
}

/** @internal */
export const isTExit = (u: unknown): u is TExit<unknown, unknown> => {
  return typeof u === "object" && u != null && TExitTypeId in u
}

/** @internal */
export const isFail = <E, A>(self: TExit<E, A>): self is Fail<E> => {
  return self.op === OP_FAIL
}

/** @internal */
export const isDie = <E, A>(self: TExit<E, A>): self is Die => {
  return self.op === OP_DIE
}

/** @internal */
export const isInterrupt = <E, A>(self: TExit<E, A>): self is Interrupt => {
  return self.op === OP_INTERRUPT
}

/** @internal */
export const isSuccess = <E, A>(self: TExit<E, A>): self is Succeed<A> => {
  return self.op === OP_SUCCEED
}

/** @internal */
export const isRetry = <E, A>(self: TExit<E, A>): self is Retry => {
  return self.op === OP_RETRY
}

/** @internal */
export const fail = <E>(error: E): TExit<E, never> => ({
  [TExitTypeId]: variance,
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
export const die = (defect: unknown): TExit<never, never> => ({
  [TExitTypeId]: variance,
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
export const interrupt = (fiberId: FiberId.FiberId): TExit<never, never> => ({
  [TExitTypeId]: variance,
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
export const succeed = <A>(value: A): TExit<never, A> => ({
  [TExitTypeId]: variance,
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
export const retry: TExit<never, never> = ({
  [TExitTypeId]: variance,
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
export const unit = (): TExit<never, void> => succeed(undefined)
