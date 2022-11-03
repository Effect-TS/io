import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import type * as FiberId from "@effect/io/Fiber/Id"
import * as core from "@effect/io/internal/core"
import * as EffectOpCodes from "@effect/io/internal/opCodes/effect"
import * as STMOpCodes from "@effect/io/internal/opCodes/stm"
import type * as Scheduler from "@effect/io/internal/scheduler"
import { Stack } from "@effect/io/internal/stack"
import * as Entry from "@effect/io/internal/stm/entry"
import * as TExit from "@effect/io/internal/stm/exit"
import * as Journal from "@effect/io/internal/stm/journal"
import * as STMState from "@effect/io/internal/stm/state"
import * as TryCommit from "@effect/io/internal/stm/tryCommit"
import * as TxnId from "@effect/io/internal/stm/txnId"
import type * as Context from "@fp-ts/data/Context"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"

export const STMTypeId = Symbol.for("@effect/stm/STM")

export type STMTypeId = typeof STMTypeId

export interface STM<R, E, A> extends STM.Variance<R, E, A>, Effect.Effect<R, E, A> {}

export declare namespace STM {
  export interface Variance<R, E, A> {
    readonly [STMTypeId]: {
      readonly _R: (_: never) => R
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }
}

export type Primitive =
  | STMEffect
  | STMOnFailure
  | STMOnRetry
  | STMOnSuccess
  | STMProvide
  | STMSucceed
  | STMSucceedNow

const stmVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

const proto = Object.assign({}, core.proto, {
  [STMTypeId]: stmVariance,
  op: EffectOpCodes.OP_COMMIT
})

type STMOp<OpCode extends number, Body = {}> = STM<never, never, never> & Body & {
  readonly op: EffectOpCodes.OP_COMMIT
  readonly opSTM: OpCode
}

interface STMEffect extends
  STMOp<STMOpCodes.OP_EFFECT, {
    readonly evaluate: (
      journal: Journal.Journal,
      fiberId: FiberId.FiberId,
      context: Context.Context<unknown>
    ) => unknown
  }>
{}

interface STMOnFailure extends
  STMOp<STMOpCodes.OP_ON_FAILURE, {
    readonly first: STM<unknown, unknown, unknown>
    readonly failK: (error: unknown) => STM<unknown, unknown, unknown>
  }>
{}

interface STMOnRetry extends
  STMOp<STMOpCodes.OP_ON_RETRY, {
    readonly opSTM: STMOpCodes.OP_ON_RETRY
    readonly first: STM<unknown, unknown, unknown>
    readonly retryK: () => STM<unknown, unknown, unknown>
  }>
{}

interface STMOnSuccess extends
  STMOp<STMOpCodes.OP_ON_SUCCESS, {
    readonly first: STM<unknown, unknown, unknown>
    readonly successK: (a: unknown) => STM<unknown, unknown, unknown>
  }>
{}

interface STMProvide extends
  STMOp<STMOpCodes.OP_PROVIDE, {
    readonly stm: STM<unknown, unknown, unknown>
    readonly provide: (context: Context.Context<unknown>) => Context.Context<unknown>
  }>
{}

interface STMSucceed extends
  STMOp<STMOpCodes.OP_SUCCEED, {
    readonly opSTM: STMOpCodes.OP_SUCCEED
    readonly evaluate: () => unknown
  }>
{}

interface STMSucceedNow extends
  STMOp<STMOpCodes.OP_SUCCEED_NOW, {
    readonly opSTM: STMOpCodes.OP_SUCCEED_NOW
    readonly value: unknown
  }>
{}

export const STMFailExceptionTypeId = Symbol.for("@effect/stm/STM/FailException")

export type STMFailExceptionTypeId = typeof STMFailExceptionTypeId

export interface STMFailException<E> {
  readonly [STMFailExceptionTypeId]: STMFailExceptionTypeId
  readonly error: E
}

export class STMFailException<E> implements STMFailException<E> {
  readonly [STMFailExceptionTypeId]: STMFailExceptionTypeId = STMFailExceptionTypeId
  constructor(readonly error: E) {}
}

export const isFailException = (u: unknown): u is STMFailException<unknown> => {
  return typeof u === "object" && u != null && STMFailExceptionTypeId in u
}

export const STMDieExceptionTypeId = Symbol.for("@effect/stm/STM/DieException")

export type STMDieExceptionTypeId = typeof STMDieExceptionTypeId

export interface STMDieException {
  readonly [STMDieExceptionTypeId]: STMDieExceptionTypeId
  readonly defect: unknown
}

export class STMDieException implements STMDieException {
  readonly [STMDieExceptionTypeId]: STMDieExceptionTypeId = STMDieExceptionTypeId
  constructor(readonly defect: unknown) {}
}

export const isDieException = (u: unknown): u is STMDieException => {
  return typeof u === "object" && u != null && STMDieExceptionTypeId in u
}

export const STMInterruptExceptionTypeId = Symbol.for("@effect/stm/STM/InterruptException")

export type STMInterruptExceptionTypeId = typeof STMInterruptExceptionTypeId

export interface STMInterruptException {
  readonly [STMInterruptExceptionTypeId]: STMInterruptExceptionTypeId
  readonly fiberId: FiberId.FiberId
}
export class STMInterruptException implements STMInterruptException {
  readonly [STMInterruptExceptionTypeId]: STMInterruptExceptionTypeId = STMInterruptExceptionTypeId
  constructor(readonly fiberId: FiberId.FiberId) {}
}

export const isInterruptException = (u: unknown): u is STMInterruptException => {
  return typeof u === "object" && u != null && STMInterruptExceptionTypeId in u
}

export const STMRetryExceptionTypeId = Symbol.for("@effect/stm/STM/RetryException")

export type STMRetryExceptionTypeId = typeof STMRetryExceptionTypeId

export interface STMRetryException {
  readonly [STMRetryExceptionTypeId]: STMRetryExceptionTypeId
}

export class STMRetryException {
  readonly [STMRetryExceptionTypeId]: STMRetryExceptionTypeId = STMRetryExceptionTypeId
}

export const isRetryException = (u: unknown): u is STMRetryException => {
  return typeof u === "object" && u != null && STMRetryExceptionTypeId in u
}

export function effect<R, A>(
  f: (journal: Journal.Journal, fiberId: FiberId.FiberId, context: Context.Context<R>) => A
): STM<R, never, A> {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_EFFECT
  stm.evaluate = f
  stm.trace = trace
  return stm
}

export const fail = <E>(error: E): STM<never, E, never> => {
  return effect(() => {
    throw new STMFailException(error)
  })
}

export const die = (defect: unknown): STM<never, never, never> => {
  return effect(() => {
    throw new STMDieException(defect)
  })
}

export const interrupt = (): STM<never, never, never> => {
  return effect((_, fiberId) => {
    throw new STMInterruptException(fiberId)
  })
}

export const retry = (): STM<never, never, never> => {
  return effect(() => {
    throw new STMRetryException()
  })
}

export const succeed = <A>(value: A): STM<never, never, A> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_SUCCEED_NOW
  stm.value = value
  stm.trace = trace
  return stm
}

export const sync = <A>(evaluate: () => A): STM<never, never, A> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_SUCCEED
  stm.evaluate = evaluate
  stm.trace = trace
  return stm
}

export const catchAll = <E, R1, E1, B>(f: (e: E) => STM<R1, E1, B>) => {
  const trace = getCallTrace()
  return <R, A>(self: STM<R, E, A>): STM<R | R1, E1, A | B> => {
    const stm = Object.create(proto)
    stm.opSTM = STMOpCodes.OP_ON_FAILURE
    stm.first = self
    stm.failK = f
    stm.trace = trace
    return stm
  }
}

export const orTry = <R1, E1, A1>(that: () => STM<R1, E1, A1>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, A | A1> => {
    const stm = Object.create(proto)
    stm.opSTM = STMOpCodes.OP_ON_RETRY
    stm.first = self
    stm.retryK = that
    stm.trace = trace
    return stm
  }
}

export const flatMap = <A, R1, E1, A2>(f: (a: A) => STM<R1, E1, A2>) => {
  const trace = getCallTrace()
  return <R, E>(self: STM<R, E, A>): STM<R1 | R, E | E1, A2> => {
    const stm = Object.create(proto)
    stm.opSTM = STMOpCodes.OP_ON_SUCCESS
    stm.first = self
    stm.successK = f
    stm.trace = trace
    return stm
  }
}

export const provideSomeEnvironment = <R0, R>(f: (context: Context.Context<R0>) => Context.Context<R>) => {
  const trace = getCallTrace()
  return <E, A>(self: STM<R, E, A>): STM<R0, E, A> => {
    const stm = Object.create(proto)
    stm.opSTM = STMOpCodes.OP_PROVIDE
    stm.stm = self
    stm.provide = f
    stm.trace = trace
    return stm
  }
}

export const map = <A, B>(f: (a: A) => B) => {
  return <R, E>(self: STM<R, E, A>): STM<R, E, B> => {
    return pipe(self, flatMap((a) => sync(() => f(a))))
  }
}

export const foldSTM = <E, R1, E1, A1, A, R2, E2, A2>(
  onFailure: (e: E) => STM<R1, E1, A1>,
  onSuccess: (a: A) => STM<R2, E2, A2>
) => {
  return <R>(self: STM<R, E, A>): STM<R | R1 | R2, E1 | E2, A1 | A2> => {
    return pipe(
      self,
      map(Either.right),
      catchAll((e) => pipe(onFailure(e), map(Either.left))),
      flatMap((either): STM<R | R1 | R2, E1 | E2, A1 | A2> => {
        switch (either._tag) {
          case "Left": {
            return succeed(either.left)
          }
          case "Right": {
            return onSuccess(either.right)
          }
        }
      })
    )
  }
}

export const ensuring = <R1, B>(finalizer: STM<R1, never, B>) => {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E, A> =>
    pipe(
      self,
      foldSTM(
        (e) => pipe(finalizer, zipRight(fail(e))),
        (a) => pipe(finalizer, zipRight(succeed(a)))
      )
    )
}

export const zip = <R1, E1, A1>(that: STM<R1, E1, A1>) => {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, readonly [A, A1]> => {
    return pipe(self, zipWith(that, (a, a1) => [a, a1]))
  }
}

export const zipLeft = <R1, E1, A1>(that: STM<R1, E1, A1>) => {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, A> => {
    return pipe(self, flatMap((a) => pipe(that, map(() => a))))
  }
}

export const zipRight = <R1, E1, A1>(that: STM<R1, E1, A1>) => {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, A1> => {
    return pipe(self, flatMap(() => that))
  }
}

export const zipWith = <R1, E1, A1, A, A2>(that: STM<R1, E1, A1>, f: (a: A, b: A1) => A2) => {
  return <R, E>(self: STM<R, E, A>): STM<R1 | R, E | E1, A2> => {
    return pipe(self, flatMap((a) => pipe(that, map((b) => f(a, b)))))
  }
}

export const commit = <R, E, A>(self: STM<R, E, A>): Effect.Effect<R, E, A> => {
  return core.withFiberRuntime((state) => {
    const fiberId = state.id()
    const env = state.getFiberRef(core.currentEnvironment) as Context.Context<R>
    const scheduler = state.getFiberRef(core.currentScheduler)
    const commitResult = tryCommitSync(fiberId, self, env, scheduler)
    switch (commitResult.op) {
      case TryCommit.OP_DONE: {
        return core.done(commitResult.exit)
      }
      case TryCommit.OP_SUSPEND: {
        const txnId = TxnId.make()
        const state = MutableRef.make<STMState.STMState<E, A>>(STMState.running)
        const io = core.async(
          tryCommitAsync(commitResult.journal, fiberId, self, txnId, state, env, scheduler)
        )
        return core.uninterruptibleMask((restore) =>
          pipe(
            restore(io),
            core.catchAllCause((cause) => {
              let currentState = MutableRef.get(state)
              if (Equal.equals(currentState, STMState.running)) {
                pipe(state, MutableRef.set(STMState.interrupted as STMState.STMState<E, A>))
              }
              currentState = MutableRef.get(state)
              return currentState.op === STMState.OP_DONE
                ? core.done(currentState.exit)
                : core.failCause(cause)
            })
          )
        )
      }
    }
  })
}

type Continuation = STMOnFailure | STMOnSuccess | STMOnRetry

export class STMDriver<R, E, A> {
  private yieldOpCount = 2048
  private contStack: Stack<Continuation> | undefined
  private envStack: Stack<Context.Context<unknown>>

  constructor(
    readonly self: STM<R, E, A>,
    readonly journal: Journal.Journal,
    readonly fiberId: FiberId.FiberId,
    r0: Context.Context<R>
  ) {
    this.envStack = new Stack(r0 as Context.Context<unknown>)
  }

  private unwindStack(error: unknown, isRetry: boolean): Primitive | undefined {
    let result: Primitive | undefined = undefined
    while (this.contStack && result === undefined) {
      const cont = this.contStack.value
      this.contStack = this.contStack.previous
      if (cont.opSTM === STMOpCodes.OP_ON_FAILURE) {
        if (!isRetry) {
          result = cont.failK(error) as Primitive
        }
      }
      if (cont.opSTM === STMOpCodes.OP_ON_RETRY) {
        if (isRetry) {
          result = cont.retryK() as Primitive
        }
      }
    }
    return result
  }

  run(): TExit.Exit<E, A> {
    let curr = this.self as Primitive | undefined
    let exit: TExit.Exit<unknown, unknown> | undefined = undefined
    let opCount = 0

    while (exit === undefined && curr !== undefined) {
      if (opCount === this.yieldOpCount) {
        let valid = true
        for (const [, entry] of this.journal) {
          valid = Entry.isValid(entry)
        }
        if (!valid) {
          exit = TExit.retry
        } else {
          opCount = 0
        }
      } else {
        const current = curr
        switch (current.opSTM) {
          case STMOpCodes.OP_EFFECT: {
            try {
              const a = current.evaluate(this.journal, this.fiberId, this.envStack.value)
              if (!this.contStack) {
                exit = TExit.succeed(a)
              } else {
                const cont = this.contStack.value
                this.contStack = this.contStack.previous
                if (
                  cont.opSTM === STMOpCodes.OP_ON_FAILURE ||
                  cont.opSTM === STMOpCodes.OP_ON_RETRY
                ) {
                  curr = succeed(a) as Primitive
                } else {
                  curr = cont.successK(a) as Primitive
                }
              }
            } catch (error) {
              if (isRetryException(error)) {
                curr = this.unwindStack(undefined, true)
                if (!curr) {
                  exit = TExit.retry
                }
              } else if (isFailException(error)) {
                curr = this.unwindStack(error.error, false)
                if (!curr) {
                  exit = TExit.fail(error.error)
                }
              } else if (isDieException(error)) {
                curr = this.unwindStack(error.defect, false)
                if (!curr) {
                  exit = TExit.die(error.defect)
                }
              } else if (isInterruptException(error)) {
                exit = TExit.interrupt(error.fiberId)
              } else {
                throw error
              }
            }
            break
          }

          case STMOpCodes.OP_ON_SUCCESS: {
            this.contStack = new Stack(current, this.contStack)
            curr = current.first as Primitive
            break
          }

          case STMOpCodes.OP_ON_FAILURE: {
            this.contStack = new Stack(current, this.contStack)
            curr = current.first as Primitive
            break
          }

          case STMOpCodes.OP_ON_RETRY: {
            this.contStack = new Stack(current, this.contStack)
            curr = current.first as Primitive
            break
          }

          case STMOpCodes.OP_PROVIDE: {
            this.envStack = new Stack(current.provide(this.envStack.value), this.envStack)
            curr = pipe(
              current.stm,
              ensuring(sync(() => {
                this.envStack = this.envStack.previous!
              }))
            ) as Primitive
            break
          }

          case STMOpCodes.OP_SUCCEED_NOW: {
            const value = current.value
            if (!this.contStack) {
              exit = TExit.succeed(value)
            } else {
              const cont = this.contStack.value
              this.contStack = this.contStack.previous
              if (
                cont.opSTM === STMOpCodes.OP_ON_FAILURE ||
                cont.opSTM === STMOpCodes.OP_ON_RETRY
              ) {
                curr = succeed(value) as Primitive
              } else {
                curr = cont.successK(value) as Primitive
              }
            }
            break
          }

          case STMOpCodes.OP_SUCCEED: {
            const value = current.evaluate()
            if (!this.contStack) {
              exit = TExit.succeed(value)
            } else {
              const cont = this.contStack.value
              this.contStack = this.contStack.previous
              if (
                cont.opSTM === STMOpCodes.OP_ON_FAILURE ||
                cont.opSTM === STMOpCodes.OP_ON_RETRY
              ) {
                curr = succeed(value) as Primitive
              } else {
                curr = cont.successK(value) as Primitive
              }
            }
            break
          }
        }
        opCount = opCount + 1
      }
    }

    return exit as TExit.Exit<E, A>
  }
}

const tryCommit = <R, E, A>(
  fiberId: FiberId.FiberId,
  stm: STM<R, E, A>,
  state: MutableRef.MutableRef<STMState.STMState<E, A>>,
  env: Context.Context<R>,
  scheduler: Scheduler.Scheduler
): TryCommit.TryCommit<E, A> => {
  const journal: Journal.Journal = new Map()
  const tExit = new STMDriver(stm, journal, fiberId, env).run()
  const analysis = Journal.analyzeJournal(journal)

  if (analysis === Journal.JournalAnalysisReadWrite) {
    pipe(state, MutableRef.set(STMState.fromTExit(tExit)))
    Journal.commitJournal(journal)
  } else if (analysis === Journal.JournalAnalysisInvalid) {
    throw new Error("BUG: STM.TryCommit.tryCommit - please report an issue at https://github.com/Effect-TS/io/issues")
  }

  switch (tExit.op) {
    case TExit.OP_SUCCEED: {
      return completeTodos(Exit.succeed(tExit.value), journal, scheduler)
    }
    case TExit.OP_FAIL: {
      return completeTodos(Exit.fail(tExit.error), journal, scheduler)
    }
    case TExit.OP_DIE: {
      return completeTodos(Exit.die(tExit.defect), journal, scheduler)
    }
    case TExit.OP_INTERRUPT: {
      return completeTodos(Exit.interrupt(fiberId), journal, scheduler)
    }
    case TExit.OP_RETRY: {
      return TryCommit.suspend(journal)
    }
  }
}

const tryCommitSync = <R, E, A>(
  fiberId: FiberId.FiberId,
  stm: STM<R, E, A>,
  env: Context.Context<R>,
  scheduler: Scheduler.Scheduler
): TryCommit.TryCommit<E, A> => {
  const journal: Journal.Journal = new Map()
  const tExit = new STMDriver(stm, journal, fiberId, env).run()
  const analysis = Journal.analyzeJournal(journal)

  if (analysis === Journal.JournalAnalysisReadWrite && tExit.op === TExit.OP_SUCCEED) {
    Journal.commitJournal(journal)
  } else if (analysis === Journal.JournalAnalysisInvalid) {
    throw new Error(
      "BUG: STM.TryCommit.tryCommitSync - please report an issue at https://github.com/Effect-TS/io/issues"
    )
  }

  switch (tExit.op) {
    case TExit.OP_SUCCEED: {
      return completeTodos(Exit.succeed(tExit.value), journal, scheduler)
    }
    case TExit.OP_FAIL: {
      return completeTodos(Exit.fail(tExit.error), journal, scheduler)
    }
    case TExit.OP_DIE: {
      return completeTodos(Exit.die(tExit.defect), journal, scheduler)
    }
    case TExit.OP_INTERRUPT: {
      return completeTodos(Exit.interrupt(fiberId), journal, scheduler)
    }
    case TExit.OP_RETRY: {
      return TryCommit.suspend(journal)
    }
  }
}

const tryCommitAsync = <R, E, A>(
  journal: Journal.Journal | undefined,
  fiberId: FiberId.FiberId,
  stm: STM<R, E, A>,
  txnId: TxnId.TxnId,
  state: MutableRef.MutableRef<STMState.STMState<E, A>>,
  context: Context.Context<R>,
  scheduler: Scheduler.Scheduler
) => {
  return (k: (effect: Effect.Effect<R, E, A>) => unknown): void => {
    if (STMState.isRunning(MutableRef.get(state))) {
      if (journal == null) {
        const result = tryCommit(fiberId, stm, state, context, scheduler)
        switch (result.op) {
          case TryCommit.OP_DONE: {
            completeTryCommit(result.exit, k)
            break
          }
          case TryCommit.OP_SUSPEND: {
            suspendTryCommit(
              fiberId,
              stm,
              txnId,
              state,
              context,
              k,
              result.journal,
              result.journal,
              scheduler
            )
            break
          }
        }
      } else {
        suspendTryCommit(fiberId, stm, txnId, state, context, k, journal, journal, scheduler)
      }
    }
  }
}

const completeTodos = <E, A>(
  exit: Exit.Exit<E, A>,
  journal: Journal.Journal,
  scheduler: Scheduler.Scheduler
): TryCommit.TryCommit<E, A> => {
  const todos = Journal.collectTodos(journal)
  if (todos.size > 0) {
    scheduler.scheduleTask(() => Journal.execTodos(todos))
  }
  return TryCommit.done(exit)
}

const completeTryCommit = <R, E, A>(
  exit: Exit.Exit<E, A>,
  k: (effect: Effect.Effect<R, E, A>) => unknown
): void => {
  k(core.done(exit))
}

const suspendTryCommit = <R, E, A>(
  fiberId: FiberId.FiberId,
  stm: STM<R, E, A>,
  txnId: TxnId.TxnId,
  state: MutableRef.MutableRef<STMState.STMState<E, A>>,
  context: Context.Context<R>,
  k: (effect: Effect.Effect<R, E, A>) => unknown,
  accum: Journal.Journal,
  journal: Journal.Journal,
  scheduler: Scheduler.Scheduler
): void => {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    Journal.addTodo(
      txnId,
      journal,
      () => tryCommitAsync(undefined, fiberId, stm, txnId, state, context, scheduler)(k)
    )
    if (Journal.isInvalid(journal)) {
      const result = tryCommit(fiberId, stm, state, context, scheduler)
      switch (result.op) {
        case TryCommit.OP_DONE: {
          completeTryCommit(result.exit, k)
          return
        }
        case TryCommit.OP_SUSPEND: {
          const untracked = Journal.untrackedTodoTargets(accum, result.journal)
          if (untracked.size > 0) {
            for (const entry of untracked) {
              accum.set(entry[0], entry[1])
            }
            journal = untracked
          }
          break
        }
      }
    } else {
      return
    }
  }
}
