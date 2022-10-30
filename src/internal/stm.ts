import { getCallTrace } from "@effect/io/Debug"
import type * as FiberId from "@effect/io/Fiber/Id"
import * as core from "@effect/io/internal/core"
import * as EffectOpCodes from "@effect/io/internal/opCodes/effect"
import * as STMOpCodes from "@effect/io/internal/opCodes/stm"
import type { TODO } from "@effect/io/internal/todo"
import type * as STM from "@effect/io/STM"
import type * as Context from "@fp-ts/data/Context"

/** @internal */
export const STMTypeId: STM.STMTypeId = Symbol.for("@effect/io/STM") as STM.STMTypeId

export type Primitive =
  | STMEffect
  | STMOnFailure
  | STMOnRetry
  | STMOnSuccess
  | STMProvide
  | STMSucceed
  | STMSucceedNow

/** @internal */
const stmVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
const proto = Object.assign({}, core.proto, {
  [STMTypeId]: stmVariance,
  op: EffectOpCodes.OP_COMMIT
})

type Journal = TODO

/** @internal */
type STMOp<OpCode extends number, Body = {}> = STM.STM<never, never, never> & Body & {
  readonly op: EffectOpCodes.OP_COMMIT
  readonly opSTM: OpCode
}

/** @internal */
interface STMEffect extends
  STMOp<STMOpCodes.OP_EFFECT, {
    readonly evaluate: (
      journal: Journal,
      fiberId: FiberId.FiberId,
      context: Context.Context<unknown>
    ) => unknown
  }>
{}

/** @internal */
interface STMOnFailure extends
  STMOp<STMOpCodes.OP_ON_FAILURE, {
    readonly first: STM.STM<unknown, unknown, unknown>
    readonly failK: (error: unknown) => STM.STM<unknown, unknown, unknown>
  }>
{}

/** @internal */
interface STMOnRetry extends
  STMOp<STMOpCodes.OP_ON_RETRY, {
    readonly opSTM: STMOpCodes.OP_ON_RETRY
    readonly first: STM.STM<unknown, unknown, unknown>
    readonly retryK: () => STM.STM<unknown, unknown, unknown>
  }>
{}

/** @internal */
interface STMOnSuccess extends
  STMOp<STMOpCodes.OP_ON_SUCCESS, {
    readonly first: STM.STM<unknown, unknown, unknown>
    readonly successK: (a: unknown) => STM.STM<unknown, unknown, unknown>
  }>
{}

/** @internal */
interface STMProvide extends
  STMOp<STMOpCodes.OP_PROVIDE, {
    readonly stm: STM.STM<unknown, unknown, unknown>
    readonly provide: (context: Context.Context<unknown>) => Context.Context<unknown>
  }>
{}

/** @internal */
interface STMSucceed extends
  STMOp<STMOpCodes.OP_SUCCEED, {
    readonly opSTM: STMOpCodes.OP_SUCCEED
    readonly evaluate: () => unknown
  }>
{}

/** @internal */
interface STMSucceedNow extends
  STMOp<STMOpCodes.OP_SUCCEED_NOW, {
    readonly opSTM: STMOpCodes.OP_SUCCEED_NOW
    readonly value: unknown
  }>
{}

/** @internal */
export const STMFailExceptionTypeId: STM.STMFailExceptionTypeId = Symbol.for(
  "@effect/io/STM/FailException"
) as STM.STMFailExceptionTypeId

/** @internal */
export class STMFailException<E> implements STM.STMFailException<E> {
  readonly [STMFailExceptionTypeId]: STM.STMFailExceptionTypeId = STMFailExceptionTypeId
  constructor(readonly error: E) {}
}

/** @internal */
export const isFailException = (u: unknown): u is STM.STMFailException<unknown> => {
  return typeof u === "object" && u != null && STMFailExceptionTypeId in u
}

/** @internal */
export const STMDieExceptionTypeId: STM.STMDieExceptionTypeId = Symbol.for(
  "@effect/io/STM/DieException"
) as STM.STMDieExceptionTypeId

/** @internal */
export class STMDieException implements STM.STMDieException {
  readonly [STMDieExceptionTypeId]: STM.STMDieExceptionTypeId = STMDieExceptionTypeId
  constructor(readonly defect: unknown) {}
}

/** @internal */
export const isDieException = (u: unknown): u is STM.STMDieException => {
  return typeof u === "object" && u != null && STMDieExceptionTypeId in u
}

/** @internal */
export const STMInterruptExceptionTypeId: STM.STMInterruptExceptionTypeId = Symbol.for(
  "@effect/io/STM/InterruptException"
) as STM.STMInterruptExceptionTypeId

/** @internal */
export class STMInterruptException implements STM.STMInterruptException {
  readonly [STMInterruptExceptionTypeId]: STM.STMInterruptExceptionTypeId = STMInterruptExceptionTypeId
  constructor(readonly fiberId: FiberId.FiberId) {}
}

/** @internal */
export const isInterruptException = (u: unknown): u is STM.STMInterruptException => {
  return typeof u === "object" && u != null && STMInterruptExceptionTypeId in u
}

/** @internal */
export const STMRetryExceptionTypeId: STM.STMRetryExceptionTypeId = Symbol.for(
  "@effect/io/STM/RetryException"
) as STM.STMRetryExceptionTypeId

/** @internal */
export class STMRetryException {
  readonly [STMRetryExceptionTypeId]: STM.STMRetryExceptionTypeId = STMRetryExceptionTypeId
}

/** @internal */
export const isRetryException = (u: unknown): u is STM.STMRetryException => {
  return typeof u === "object" && u != null && STMRetryExceptionTypeId in u
}

/** @internal */
export const fail = <E>(error: E): STM.STM<never, E, never> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_EFFECT
  stm.evaluate = () => {
    throw new STMFailException(error)
  }
  stm.trace = trace
  return stm
}

/** @internal */
export const die = (defect: unknown): STM.STM<never, never, never> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_EFFECT
  stm.evaluate = () => {
    throw new STMDieException(defect)
  }
  stm.trace = trace
  return stm
}

/** @internal */
export const interrupt = (): STM.STM<never, never, never> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_EFFECT
  stm.evaluate = (_: Journal, fiberId: FiberId.FiberId) => {
    throw new STMInterruptException(fiberId)
  }
  stm.trace = trace
  return stm
}

/** @internal */
export const retry = (): STM.STM<never, never, never> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_EFFECT
  stm.evaluate = () => {
    throw new STMRetryException()
  }
  stm.trace = trace
  return stm
}

/** @internal */
export const succeed = <A>(value: A): STM.STM<never, never, A> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_SUCCEED_NOW
  stm.value = value
  stm.trace = trace
  return stm
}

/** @internal */
export const sync = <A>(evaluate: () => A): STM.STM<never, never, A> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_SUCCEED
  stm.evaluate = evaluate
  stm.trace = trace
  return stm
}

/** @internal */
export const catchAll = <E, R1, E1, B>(f: (e: E) => STM.STM<R1, E1, B>) => {
  const trace = getCallTrace()
  return <R, A>(self: STM.STM<R, E, A>): STM.STM<R1 | R, E1, A | B> => {
    const stm = Object.create(proto)
    stm.opSTM = STMOpCodes.OP_ON_FAILURE
    stm.first = self
    stm.failK = f
    stm.trace = trace
    return stm
  }
}

/** @internal */
export const orTry = <R1, E1, A1>(that: () => STM.STM<R1, E1, A1>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: STM.STM<R, E, A>): STM.STM<R | R1, E | E1, A | A1> => {
    const stm = Object.create(proto)
    stm.opSTM = STMOpCodes.OP_ON_RETRY
    stm.first = self
    stm.retryK = that
    stm.trace = trace
    return stm
  }
}

/** @internal */
export const flatMap = <A, R1, E1, A2>(f: (a: A) => STM.STM<R1, E1, A2>) => {
  const trace = getCallTrace()
  return <R, E>(self: STM.STM<R, E, A>): STM.STM<R1 | R, E | E1, A2> => {
    const stm = Object.create(proto)
    stm.opSTM = STMOpCodes.OP_ON_SUCCESS
    stm.first = self
    stm.successK = f
    stm.trace = trace
    return stm
  }
}

/** @internal */
export const provideSomeEnvironment = <R0, R>(f: (context: Context.Context<R0>) => Context.Context<R>) => {
  const trace = getCallTrace()
  return <E, A>(self: STM.STM<R, E, A>): STM.STM<R0, E, A> => {
    const stm = Object.create(proto)
    stm.opSTM = STMOpCodes.OP_PROVIDE
    stm.stm = self
    stm.provide = f
    stm.trace = trace
    return stm
  }
}
