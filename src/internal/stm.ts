import * as Cause from "@effect/io/Cause"
import { getCallTrace, isTraceEnabled, runtimeDebug } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import type * as FiberId from "@effect/io/Fiber/Id"
import { StackAnnotation } from "@effect/io/internal/cause"
import * as core from "@effect/io/internal/core"
import * as EffectOpCodes from "@effect/io/internal/opCodes/effect"
import * as STMOpCodes from "@effect/io/internal/opCodes/stm"
import type * as Scheduler from "@effect/io/internal/scheduler"
import * as TExit from "@effect/io/internal/stm/exit"
import * as Journal from "@effect/io/internal/stm/journal"
import * as STMState from "@effect/io/internal/stm/state"
import * as TryCommit from "@effect/io/internal/stm/tryCommit"
import * as TxnId from "@effect/io/internal/stm/txnId"
import { RingBuffer } from "@effect/io/internal/support"
import * as Chunk from "@fp-ts/data/Chunk"
import type * as Context from "@fp-ts/data/Context"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"

export const STMTypeId = Symbol.for("@effect/stm/STM")

export type STMTypeId = typeof STMTypeId

export interface STM<R, E, A> extends STM.Variance<R, E, A>, Effect.Effect<R, E, A> {
  /** @internal */
  trace: string | undefined
  /** @internal */
  traced(trace: string | undefined): STM<R, E, A>
  /** @internal */
  commit(): Effect.Effect<R, E, A>
}

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
  | STMSync
  | STMSucceed
  | STMRetry
  | STMFail
  | STMDie
  | STMInterrupt

const stmVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

/**
 * @macro traced
 */
export const commit = <R, E, A>(self: STM<R, E, A>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<R, E, A>((state) => {
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
          (k: (effect: Effect.Effect<R, E, A>) => unknown): void => {
            if (STMState.isRunning(MutableRef.get(state))) {
              if (Journal.isInvalid(commitResult.journal)) {
                const result = tryCommit(fiberId, self, state, env, scheduler)
                switch (result.op) {
                  case TryCommit.OP_DONE: {
                    completeTryCommit(result.exit, k)
                    break
                  }
                  case TryCommit.OP_SUSPEND: {
                    Journal.addTodo(
                      txnId,
                      result.journal,
                      () => tryCommitAsync(fiberId, self, txnId, state, env, scheduler, k)
                    )
                    break
                  }
                }
              } else {
                Journal.addTodo(
                  txnId,
                  commitResult.journal,
                  () => tryCommitAsync(fiberId, self, txnId, state, env, scheduler, k)
                )
              }
            }
          }
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
  }).traced(trace)
}

const proto = Object.assign({}, {
  ...core.proto,
  [STMTypeId]: stmVariance,
  op: EffectOpCodes.OP_COMMIT,
  commit(this: STM<any, any, any>): Effect.Effect<any, any, any> {
    return commit(this)
  },
  traced(this: STM<any, any, any>, trace: string | undefined): STM<any, any, any> {
    if (!isTraceEnabled() || trace === this["trace"]) {
      return this
    }
    const fresh = Object.create(proto)
    Object.assign(fresh, this)
    fresh.trace = trace
    return fresh
  }
})

type STMOp<OpCode extends number, Body = {}> = STM<never, never, never> & Body & {
  readonly op: EffectOpCodes.OP_COMMIT
  readonly opSTM: OpCode
}

interface STMEffect extends
  STMOp<STMOpCodes.OP_WITH_STM_RUNTIME, {
    readonly evaluate: (
      runtime: STMDriver<unknown, unknown, unknown>
    ) => STM<unknown, unknown, unknown>
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

interface STMSync extends
  STMOp<STMOpCodes.OP_SYNC, {
    readonly evaluate: () => unknown
  }>
{}

interface STMSucceed extends
  STMOp<STMOpCodes.OP_SUCCEED, {
    readonly value: unknown
  }>
{}

interface STMRetry extends STMOp<STMOpCodes.OP_RETRY, {}> {}

interface STMFail extends
  STMOp<STMOpCodes.OP_FAIL, {
    readonly error: unknown
  }>
{}

interface STMDie extends
  STMOp<STMOpCodes.OP_DIE, {
    readonly defect: unknown
  }>
{}

interface STMInterrupt extends STMOp<STMOpCodes.OP_INTERRUPT, {}> {}

/**
 * @macro traced
 */
export function withSTMRuntime<R, E, A>(
  f: (runtime: STMDriver<unknown, unknown, unknown>) => STM<R, E, A>
): STM<R, E, A> {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_WITH_STM_RUNTIME
  stm.evaluate = f
  stm.trace = trace
  return stm
}

/**
 * @macro traced
 */
export const fail = <E>(error: E): STM<never, E, never> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_FAIL
  stm.error = error
  stm.trace = trace
  return stm
}

/**
 * @macro traced
 */
export const die = (defect: unknown): STM<never, never, never> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_DIE
  stm.defect = defect
  stm.trace = trace
  return stm
}

/**
 * @macro traced
 */
export const interrupt = (): STM<never, never, never> => {
  const trace = getCallTrace()
  return withSTMRuntime((_) => {
    const stm = Object.create(proto)
    stm.opSTM = STMOpCodes.OP_INTERRUPT
    stm.trace = trace
    stm.fiberId = _.fiberId
    return stm
  })
}

/**
 * @macro traced
 */
export const retry = (): STM<never, never, never> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_RETRY
  stm.trace = trace
  return stm
}

/**
 * @macro traced
 */
export const succeed = <A>(value: A): STM<never, never, A> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_SUCCEED
  stm.value = value
  stm.trace = trace
  return stm
}

/**
 * @macro traced
 */
export const sync = <A>(evaluate: () => A): STM<never, never, A> => {
  const trace = getCallTrace()
  const stm = Object.create(proto)
  stm.opSTM = STMOpCodes.OP_SYNC
  stm.evaluate = evaluate
  stm.trace = trace
  return stm
}

/**
 * @macro traced
 */
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

/**
 * @macro traced
 */
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

/**
 * @macro traced
 */
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

/**
 * @macro traced
 */
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

/**
 * @macro traced
 */
export const map = <A, B>(f: (a: A) => B) => {
  const trace = getCallTrace()
  return <R, E>(self: STM<R, E, A>): STM<R, E, B> => {
    return pipe(self, flatMap((a) => sync(() => f(a)))).traced(trace)
  }
}

/**
 * @macro traced
 */
export const foldSTM = <E, R1, E1, A1, A, R2, E2, A2>(
  onFailure: (e: E) => STM<R1, E1, A1>,
  onSuccess: (a: A) => STM<R2, E2, A2>
) => {
  const trace = getCallTrace()
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
    ).traced(trace)
  }
}

/**
 * @macro traced
 */
export const ensuring = <R1, B>(finalizer: STM<R1, never, B>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E, A> =>
    pipe(
      self,
      foldSTM(
        (e) => pipe(finalizer, zipRight(fail(e))),
        (a) => pipe(finalizer, zipRight(succeed(a)))
      )
    ).traced(trace)
}

/**
 * @macro traced
 */
export const zip = <R1, E1, A1>(that: STM<R1, E1, A1>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, readonly [A, A1]> => {
    return pipe(self, zipWith(that, (a, a1) => [a, a1] as const)).traced(trace)
  }
}

/**
 * @macro traced
 */
export const zipLeft = <R1, E1, A1>(that: STM<R1, E1, A1>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, A> => {
    return pipe(self, flatMap((a) => pipe(that, map(() => a)))).traced(trace)
  }
}

/**
 * @macro traced
 */
export const zipRight = <R1, E1, A1>(that: STM<R1, E1, A1>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, A1> => {
    return pipe(self, flatMap(() => that)).traced(trace)
  }
}

/**
 * @macro traced
 */
export const zipWith = <R1, E1, A1, A, A2>(that: STM<R1, E1, A1>, f: (a: A, b: A1) => A2) => {
  const trace = getCallTrace()
  return <R, E>(self: STM<R, E, A>): STM<R1 | R, E | E1, A2> => {
    return pipe(self, flatMap((a) => pipe(that, map((b) => f(a, b))))).traced(trace)
  }
}

type Continuation = STMOnFailure | STMOnSuccess | STMOnRetry

export class STMDriver<R, E, A> {
  private contStack: Array<Continuation> = []
  private env: Context.Context<unknown>
  private execution: RingBuffer<string> | undefined
  private tracesInStack = 0

  constructor(
    readonly self: STM<R, E, A>,
    readonly journal: Journal.Journal,
    readonly fiberId: FiberId.FiberId,
    r0: Context.Context<R>
  ) {
    this.env = r0 as Context.Context<unknown>
  }

  private logTrace(trace: string | undefined) {
    if (trace) {
      if (!this.execution) {
        this.execution = new RingBuffer<string>(runtimeDebug.traceExecutionLimit)
      }
      this.execution.push(trace)
    }
  }

  pushStack(cont: Continuation) {
    this.contStack.push(cont)
    if ("trace" in cont) {
      this.tracesInStack++
    }
  }

  popStack() {
    const item = this.contStack.pop()
    if (item) {
      if ("trace" in item) {
        this.tracesInStack--
      }
      return item
    }
    return
  }

  stackToLines(): Chunk.Chunk<string> {
    if (this.tracesInStack === 0) {
      return Chunk.empty
    }
    const lines: Array<string> = []
    let current = this.contStack.length - 1
    let last: undefined | string = undefined
    let seen = 0
    while (current >= 0 && lines.length < runtimeDebug.traceStackLimit && seen < this.tracesInStack) {
      const value = this.contStack[current]!
      switch (value.opSTM) {
        case STMOpCodes.OP_ON_SUCCESS:
        case STMOpCodes.OP_ON_FAILURE:
        case STMOpCodes.OP_ON_RETRY: {
          if (value.trace) {
            seen++
            if (value.trace !== last) {
              last = value.trace
              lines.push(value.trace)
            }
          }
          break
        }
      }
      current = current - 1
    }
    return Chunk.unsafeFromArray(lines)
  }

  nextSuccess() {
    let current = this.popStack()
    while (current && current.opSTM !== STMOpCodes.OP_ON_SUCCESS) {
      current = this.popStack()
    }
    return current
  }

  nextFailure() {
    let current = this.popStack()
    while (current && current.opSTM !== STMOpCodes.OP_ON_FAILURE) {
      current = this.popStack()
    }
    return current
  }

  nextRetry() {
    let current = this.popStack()
    while (current && current.opSTM !== STMOpCodes.OP_ON_RETRY) {
      current = this.popStack()
    }
    return current
  }

  run(): TExit.Exit<E, A> {
    let curr = this.self as Primitive | undefined
    let exit: TExit.Exit<unknown, unknown> | undefined = undefined
    while (exit === undefined && curr !== undefined) {
      try {
        const current = curr
        switch (current.opSTM) {
          case STMOpCodes.OP_DIE: {
            this.logTrace(curr.trace)
            const annotation = new StackAnnotation(
              this.stackToLines(),
              this.execution?.toChunkReversed() || Chunk.empty
            )
            exit = TExit.die(current.defect, annotation)
            break
          }
          case STMOpCodes.OP_FAIL: {
            this.logTrace(curr.trace)
            const annotation = new StackAnnotation(
              this.stackToLines(),
              this.execution?.toChunkReversed() || Chunk.empty
            )
            const cont = this.nextFailure()
            if (!cont) {
              exit = TExit.fail(current.error, annotation)
            } else {
              this.logTrace(cont.trace)
              curr = cont.failK(current.error) as Primitive
            }
            break
          }
          case STMOpCodes.OP_RETRY: {
            this.logTrace(curr.trace)
            const cont = this.nextRetry()
            if (!cont) {
              exit = TExit.retry
            } else {
              this.logTrace(cont.trace)
              curr = cont.retryK() as Primitive
            }
            break
          }
          case STMOpCodes.OP_INTERRUPT: {
            this.logTrace(curr.trace)
            const annotation = new StackAnnotation(
              this.stackToLines(),
              this.execution?.toChunkReversed() || Chunk.empty
            )
            exit = TExit.interrupt(this.fiberId, annotation)
            break
          }
          case STMOpCodes.OP_WITH_STM_RUNTIME: {
            this.logTrace(current.trace)
            curr = current.evaluate(this) as Primitive
            break
          }
          case STMOpCodes.OP_ON_SUCCESS:
          case STMOpCodes.OP_ON_FAILURE:
          case STMOpCodes.OP_ON_RETRY: {
            this.pushStack(current)
            curr = current.first as Primitive
            break
          }
          case STMOpCodes.OP_PROVIDE: {
            this.logTrace(current.trace)
            const env = this.env
            this.env = current.provide(env)
            curr = pipe(
              current.stm,
              ensuring(sync(() => (this.env = env)))
            ) as Primitive
            break
          }
          case STMOpCodes.OP_SUCCEED: {
            this.logTrace(current.trace)
            const value = current.value
            const cont = this.nextSuccess()
            if (!cont) {
              exit = TExit.succeed(value)
            } else {
              this.logTrace(cont.trace)
              curr = cont.successK(value) as Primitive
            }
            break
          }
          case STMOpCodes.OP_SYNC: {
            this.logTrace(current.trace)
            const value = current.evaluate()
            const cont = this.nextSuccess()
            if (!cont) {
              exit = TExit.succeed(value)
            } else {
              this.logTrace(cont.trace)
              curr = cont.successK(value) as Primitive
            }
            break
          }
        }
      } catch (e) {
        curr = die(e) as Primitive
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
      const cause = Cause.fail(tExit.error)
      return completeTodos(
        Exit.failCause(
          tExit.annotation.stack.length > 0 || tExit.annotation.execution.length > 0 ?
            Cause.annotated(cause, tExit.annotation) :
            cause
        ),
        journal,
        scheduler
      )
    }
    case TExit.OP_DIE: {
      const cause = Cause.die(tExit.defect)
      return completeTodos(
        Exit.failCause(
          tExit.annotation.stack.length > 0 || tExit.annotation.execution.length > 0 ?
            Cause.annotated(cause, tExit.annotation) :
            cause
        ),
        journal,
        scheduler
      )
    }
    case TExit.OP_INTERRUPT: {
      const cause = Cause.interrupt(fiberId)
      return completeTodos(
        Exit.failCause(
          tExit.annotation.stack.length > 0 || tExit.annotation.execution.length > 0 ?
            Cause.annotated(cause, tExit.annotation) :
            cause
        ),
        journal,
        scheduler
      )
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
      const cause = Cause.fail(tExit.error)
      return completeTodos(
        Exit.failCause(
          tExit.annotation.stack.length > 0 || tExit.annotation.execution.length > 0 ?
            Cause.annotated(cause, tExit.annotation) :
            cause
        ),
        journal,
        scheduler
      )
    }
    case TExit.OP_DIE: {
      const cause = Cause.die(tExit.defect)
      return completeTodos(
        Exit.failCause(
          tExit.annotation.stack.length > 0 || tExit.annotation.execution.length > 0 ?
            Cause.annotated(cause, tExit.annotation) :
            cause
        ),
        journal,
        scheduler
      )
    }
    case TExit.OP_INTERRUPT: {
      const cause = Cause.interrupt(fiberId)
      return completeTodos(
        Exit.failCause(
          tExit.annotation.stack.length > 0 || tExit.annotation.execution.length > 0 ?
            Cause.annotated(cause, tExit.annotation) :
            cause
        ),
        journal,
        scheduler
      )
    }
    case TExit.OP_RETRY: {
      return TryCommit.suspend(journal)
    }
  }
}

const tryCommitAsync = <R, E, A>(
  fiberId: FiberId.FiberId,
  self: STM<R, E, A>,
  txnId: TxnId.TxnId,
  state: MutableRef.MutableRef<STMState.STMState<E, A>>,
  context: Context.Context<R>,
  scheduler: Scheduler.Scheduler,
  k: (effect: Effect.Effect<R, E, A>) => unknown
) => {
  if (STMState.isRunning(MutableRef.get(state))) {
    const result = tryCommit(fiberId, self, state, context, scheduler)
    switch (result.op) {
      case TryCommit.OP_DONE: {
        completeTryCommit(result.exit, k)
        break
      }
      case TryCommit.OP_SUSPEND: {
        Journal.addTodo(
          txnId,
          result.journal,
          () => tryCommitAsync(fiberId, self, txnId, state, context, scheduler, k)
        )
        break
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
