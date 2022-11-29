import * as Cause from "@effect/io/Cause"
import type * as Clock from "@effect/io/Clock"
import type { ConfigProvider } from "@effect/io/Config/Provider"
import { getCallTrace, isTraceEnabled, runtimeDebug } from "@effect/io/Debug"
import * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as RuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"
import * as FiberStatus from "@effect/io/Fiber/Status"
import type * as FiberRef from "@effect/io/FiberRef"
import type * as FiberRefs from "@effect/io/FiberRefs"
import { StackAnnotation } from "@effect/io/internal/cause"
import * as clock from "@effect/io/internal/clock"
import { configProviderTag } from "@effect/io/internal/configProvider"
import * as core from "@effect/io/internal/core"
import * as defaultServices from "@effect/io/internal/defaultServices"
import * as internalFiber from "@effect/io/internal/fiber"
import * as FiberMessage from "@effect/io/internal/fiberMessage"
import * as fiberRefs from "@effect/io/internal/fiberRefs"
import * as fiberScope from "@effect/io/internal/fiberScope"
import type { FiberScope } from "@effect/io/internal/fiberScope"
import * as internalLogger from "@effect/io/internal/logger"
import * as metric from "@effect/io/internal/metric"
import * as metricBoundaries from "@effect/io/internal/metric/boundaries"
import * as OpCodes from "@effect/io/internal/opCodes/effect"
import * as _runtimeFlags from "@effect/io/internal/runtimeFlags"
import { Stack } from "@effect/io/internal/stack"
import * as supervisor from "@effect/io/internal/supervisor"
import * as SupervisorPatch from "@effect/io/internal/supervisor/patch"
import { RingBuffer } from "@effect/io/internal/support"
import type { EnforceNonEmptyRecord, TupleEffect } from "@effect/io/internal/types"
import * as LogLevel from "@effect/io/Logger/Level"
import * as Ref from "@effect/io/Ref"
import type * as Scope from "@effect/io/Scope"
import type * as Supervisor from "@effect/io/Supervisor"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import * as Either from "@fp-ts/data/Either"
import { identity, pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"
import * as Option from "@fp-ts/data/Option"

const fibersStarted = metric.counter("effect_fiber_started")
const fiberSuccesses = metric.counter("effect_fiber_successes")
const fiberFailures = metric.counter("effect_fiber_failures")
const fiberLifetimes = metric.histogram("effect_fiber_lifetimes", metricBoundaries.exponential(1.0, 2.0, 100))

/** @internal */
type EvaluationSignal = EvaluationSignalContinue | EvaluationSignalDone | EvaluationSignalYieldNow

/** @internal */
const EvaluationSignalContinue = 0 as const

/** @internal */
type EvaluationSignalContinue = typeof EvaluationSignalContinue

/** @internal */
const EvaluationSignalDone = 1 as const

/** @internal */
type EvaluationSignalDone = typeof EvaluationSignalDone

/** @internal */
const EvaluationSignalYieldNow = 2 as const

/** @internal */
type EvaluationSignalYieldNow = typeof EvaluationSignalYieldNow

/** @internal */
export const runtimeFiberVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

const absurd = (_: never): never => {
  throw new Error(
    `BUG: FiberRuntime - ${JSON.stringify(_)} - please report an issue at https://github.com/Effect-TS/io/issues`
  )
}

const currentFiberURI = "@effect/io/Fiber/Current"

const contOpSuccess = {
  [OpCodes.OP_ON_SUCCESS]: (
    self: FiberRuntime<any, any>,
    cont: core.OnSuccess,
    value: unknown
  ) => {
    self.onExecute(cont)
    return cont.successK(value)
  },
  [OpCodes.OP_ON_SUCCESS_AND_FAILURE]: (
    self: FiberRuntime<any, any>,
    cont: core.OnSuccessAndFailure,
    value: unknown
  ) => {
    self.onExecute(cont)
    return cont.successK(value)
  },
  [OpCodes.OP_REVERT_FLAGS]: (
    self: FiberRuntime<any, any>,
    cont: core.RevertFlags,
    value: unknown
  ) => {
    self.patchRuntimeFlags(self._runtimeFlags, cont.patch)
    if (_runtimeFlags.interruptible(self._runtimeFlags) && self.isInterrupted()) {
      return core.exitFailCause(self.getInterruptedCause())
    } else {
      return core.succeed(value)
    }
  },
  [OpCodes.OP_WHILE]: (
    self: FiberRuntime<any, any>,
    cont: core.While,
    value: unknown
  ) => {
    cont.process(value)
    if (cont.check()) {
      self.pushStack(cont)
      self.onExecute(cont)
      return cont.body()
    } else {
      return core.unit()
    }
  }
}

const drainQueueWhileRunningTable = {
  [FiberMessage.OP_INTERRUPT_SIGNAL]: (
    self: FiberRuntime<any, any>,
    runtimeFlags: RuntimeFlags.RuntimeFlags,
    cur: Effect.Effect<any, any, any>,
    message: FiberMessage.FiberMessage & { op: FiberMessage.OP_INTERRUPT_SIGNAL }
  ) => {
    self.processNewInterruptSignal(message.cause)
    return _runtimeFlags.interruptible(runtimeFlags) ? core.exitFailCause(message.cause) : cur
  },
  [FiberMessage.OP_RESUME]: (
    _self: FiberRuntime<any, any>,
    _runtimeFlags: RuntimeFlags.RuntimeFlags,
    _cur: Effect.Effect<any, any, any>,
    _message: FiberMessage.FiberMessage
  ) => {
    throw new Error("It is illegal to have multiple concurrent run loops in a single fiber")
  },
  [FiberMessage.OP_STATEFUL]: (
    self: FiberRuntime<any, any>,
    runtimeFlags: RuntimeFlags.RuntimeFlags,
    cur: Effect.Effect<any, any, any>,
    message: FiberMessage.FiberMessage & { op: FiberMessage.OP_STATEFUL }
  ) => {
    message.onFiber(self, FiberStatus.running(runtimeFlags))
    return cur
  },
  [FiberMessage.OP_YIELD_NOW]: (
    _self: FiberRuntime<any, any>,
    _runtimeFlags: RuntimeFlags.RuntimeFlags,
    cur: Effect.Effect<any, any, any>,
    _message: FiberMessage.FiberMessage & { op: FiberMessage.OP_YIELD_NOW }
  ) => {
    return pipe(core.yieldNow(), core.flatMap(() => cur))
  }
}

/** @internal */
export class FiberRuntime<E, A> implements Fiber.RuntimeFiber<E, A> {
  readonly [internalFiber.FiberTypeId] = internalFiber.fiberVariance

  readonly [internalFiber.RuntimeFiberTypeId] = runtimeFiberVariance

  private _fiberRefs: FiberRefs.FiberRefs
  private _fiberId: FiberId.Runtime
  public _runtimeFlags: RuntimeFlags.RuntimeFlags
  constructor(
    fiberId: FiberId.Runtime,
    fiberRefs0: FiberRefs.FiberRefs,
    runtimeFlags0: RuntimeFlags.RuntimeFlags
  ) {
    this._runtimeFlags = runtimeFlags0
    this._fiberId = fiberId
    this._fiberRefs = fiberRefs0
    if (pipe(runtimeFlags0, _runtimeFlags.isEnabled(_runtimeFlags.RuntimeMetrics))) {
      fibersStarted.unsafeUpdate(1, HashSet.empty())
    }
  }
  private _queue = MutableQueue.unbounded<FiberMessage.FiberMessage>()
  private _children: Set<FiberRuntime<any, any>> | null = null
  private _observers = List.empty<(exit: Exit.Exit<E, A>) => void>()
  private _running = false
  private _stack: Stack<core.Continuation> | undefined = void 0
  private _executionTrace: RingBuffer<string> | undefined
  private _asyncInterruptor: ((effect: Effect.Effect<any, any, any>) => any) | null = null
  private _asyncBlockingOn: FiberId.FiberId | null = null
  private _exitValue: Exit.Exit<E, A> | null = null
  private _tracesInStack = 0

  /**
   * The identity of the fiber.
   */
  id(): FiberId.Runtime {
    return this._fiberId
  }

  /**
   * Begins execution of the effect associated with this fiber on in the
   * background. This can be called to "kick off" execution of a fiber after
   * it has been created.
   */
  resume<E, A>(effect: Effect.Effect<any, E, A>) {
    this.tell(FiberMessage.resume(effect))
  }

  /**
   * The status of the fiber.
   *
   * @macro traced
   */
  status(): Effect.Effect<never, never, FiberStatus.FiberStatus> {
    const trace = getCallTrace()
    return this.ask((_, status) => status).traced(trace)
  }

  /**
   * Gets the fiber runtime flags.
   *
   * @macro traced
   */
  runtimeFlags(): Effect.Effect<never, never, RuntimeFlags.RuntimeFlags> {
    const trace = getCallTrace()
    return this.ask((state, status) => {
      if (FiberStatus.isDone(status)) {
        return state._runtimeFlags
      }
      return status.runtimeFlags
    }).traced(trace)
  }

  /**
   * Returns the current `FiberScope` for the fiber.
   */
  scope(): fiberScope.FiberScope {
    return fiberScope.unsafeMake(this)
  }

  /**
   * Retrieves the immediate children of the fiber.
   *
   * @macro traced
   */
  children(): Effect.Effect<never, never, Chunk.Chunk<Fiber.RuntimeFiber<any, any>>> {
    const trace = getCallTrace()
    return this.ask((fiber) => Chunk.fromIterable(fiber.getChildren())).traced(trace)
  }

  /**
   * Gets the fiber's set of children.
   */
  getChildren(): Set<FiberRuntime<any, any>> {
    if (this._children === null) {
      this._children = new Set()
    }
    return this._children
  }

  /**
   * Retrieves the current supervisor the fiber uses for supervising effects.
   *
   * **NOTE**: This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  getSupervisor() {
    return this.getFiberRef(currentSupervisor)
  }

  /**
   * Retrieves the interrupted cause of the fiber, which will be `Cause.empty`
   * if the fiber has not been interrupted.
   *
   * **NOTE**: This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  getInterruptedCause() {
    return this.getFiberRef(core.interruptedCause)
  }

  /**
   * Retrieves the whole set of fiber refs.
   *
   * @macro traced
   */
  fiberRefs(): Effect.Effect<never, never, FiberRefs.FiberRefs> {
    const trace = getCallTrace()
    return this.ask((fiber) => fiber.unsafeGetFiberRefs()).traced(trace)
  }

  /**
   * Returns an effect that will contain information computed from the fiber
   * state and status while running on the fiber.
   *
   * This allows the outside world to interact safely with mutable fiber state
   * without locks or immutable data.
   *
   * @macro traced
   */
  ask<Z>(
    f: (runtime: FiberRuntime<any, any>, status: FiberStatus.FiberStatus) => Z
  ): Effect.Effect<never, never, Z> {
    const trace = getCallTrace()
    return core.suspendSucceed(() => {
      const deferred = core.deferredUnsafeMake<never, Z>(this._fiberId)
      this.tell(
        FiberMessage.stateful((fiber, status) => {
          pipe(deferred, core.deferredUnsafeDone(core.sync(() => f(fiber, status))))
        })
      )
      return core.deferredAwait(deferred)
    }).traced(trace)
  }

  /**
   * Adds a message to be processed by the fiber on the fiber.
   */
  tell(message: FiberMessage.FiberMessage): void {
    pipe(
      this._queue,
      MutableQueue.offer(message)
    )
    if (!this._running) {
      this._running = true
      this.drainQueueLaterOnExecutor()
    }
  }

  await(): Effect.Effect<never, never, Exit.Exit<E, A>> {
    const trace = getCallTrace()
    return core.asyncInterrupt<never, never, Exit.Exit<E, A>>((resume) => {
      const cb = (exit: Exit.Exit<E, A>) => resume(core.succeed(exit))
      this.tell(
        FiberMessage.stateful((fiber, _) => {
          if (fiber._exitValue !== null) {
            cb(this._exitValue!)
          } else {
            fiber.unsafeAddObserver(cb)
          }
        })
      )
      return Either.left(core.sync(() =>
        this.tell(
          FiberMessage.stateful((fiber, _) => {
            fiber.unsafeRemoveObserver(cb)
          })
        )
      ))
    }, this.id()).traced(trace)
  }

  inheritAll(): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return core.withFiberRuntime<never, never, void>((parentFiber, parentStatus) => {
      const parentFiberId = parentFiber.id()
      const parentFiberRefs = parentFiber.unsafeGetFiberRefs()
      const parentRuntimeFlags = parentStatus.runtimeFlags
      const childFiberRefs = this.unsafeGetFiberRefs()

      const updatedFiberRefs = pipe(
        parentFiberRefs,
        fiberRefs.joinAs(parentFiberId, childFiberRefs)
      )

      parentFiber.setFiberRefs(updatedFiberRefs)

      const updatedRuntimeFlags = parentFiber.getFiberRef(currentRuntimeFlags)

      const patch = pipe(
        parentRuntimeFlags,
        _runtimeFlags.diff(updatedRuntimeFlags),
        // Do not inherit WindDown or Interruption!
        RuntimeFlagsPatch.exclude(_runtimeFlags.Interruption),
        RuntimeFlagsPatch.exclude(_runtimeFlags.WindDown)
      )

      return core.updateRuntimeFlags(patch)
    }).traced(trace)
  }

  /**
   * Tentatively observes the fiber, but returns immediately if it is not
   * already done.
   *
   * @macro trace
   */
  poll(): Effect.Effect<never, never, Option.Option<Exit.Exit<E, A>>> {
    const trace = getCallTrace()
    return core.sync(() => Option.fromNullable(this._exitValue)).traced(trace)
  }

  /**
   * Unsafely observes the fiber, but returns immediately if it is not
   * already done.
   */
  unsafePoll(): Exit.Exit<E, A> | null {
    return this._exitValue
  }

  /**
   * In the background, interrupts the fiber as if interrupted from the
   * specified fiber. If the fiber has already exited, the returned effect will
   * resume immediately. Otherwise, the effect will resume when the fiber exits.
   *
   * @macro traced
   */
  interruptWithFork(fiberId: FiberId.FiberId): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return core.sync(() => this.tell(FiberMessage.interruptSignal(Cause.interrupt(fiberId)))).traced(trace)
  }

  /**
   * Adds an observer to the list of observers.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  unsafeAddObserver(observer: (exit: Exit.Exit<E, A>) => void): void {
    if (this._exitValue !== null) {
      observer(this._exitValue!)
    } else {
      this._observers = List.cons(observer, this._observers)
    }
  }

  /**
   * Removes the specified observer from the list of observers that will be
   * notified when the fiber exits.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  unsafeRemoveObserver(observer: (exit: Exit.Exit<E, A>) => void): void {
    this._observers = pipe(this._observers, List.filter((o) => o !== observer))
  }
  /**
   * Retrieves all fiber refs of the fiber.
   *
   * **NOTE**: This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  unsafeGetFiberRefs(): FiberRefs.FiberRefs {
    this.setFiberRef(currentRuntimeFlags, this._runtimeFlags)
    return this._fiberRefs
  }

  /**
   * Deletes the specified fiber ref.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  unsafeDeleteFiberRef<X>(fiberRef: FiberRef.FiberRef<X>): void {
    this._fiberRefs = pipe(this._fiberRefs, fiberRefs.delete(fiberRef))
  }

  /**
   * Retrieves the state of the fiber ref, or else its initial value.
   *
   * **NOTE**: This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  getFiberRef<X>(fiberRef: FiberRef.FiberRef<X>): X {
    return pipe(this._fiberRefs, fiberRefs.getOrDefault(fiberRef))
  }

  /**
   * Sets the fiber ref to the specified value.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  setFiberRef<X>(fiberRef: FiberRef.FiberRef<X>, value: X): void {
    this._fiberRefs = pipe(this._fiberRefs, fiberRefs.updatedAs(this._fiberId, fiberRef, value))
  }

  /**
   * Wholesale replaces all fiber refs of this fiber.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  setFiberRefs(fiberRefs: FiberRefs.FiberRefs): void {
    this._fiberRefs = fiberRefs
  }

  /**
   * Adds a reference to the specified fiber inside the children set.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  addChild(child: FiberRuntime<any, any>) {
    this.getChildren().add(child)
  }

  /**
   * Removes a reference to the specified fiber inside the children set.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  removeChild(child: FiberRuntime<any, any>) {
    this.getChildren().delete(child)
  }

  /**
   * On the current thread, executes all messages in the fiber's inbox. This
   * method may return before all work is done, in the event the fiber executes
   * an asynchronous operation.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  drainQueueOnCurrentThread() {
    let recurse = true
    while (recurse) {
      let evaluationSignal: EvaluationSignal = EvaluationSignalContinue
      const prev = globalThis[currentFiberURI]
      globalThis[currentFiberURI] = this
      try {
        while (evaluationSignal === EvaluationSignalContinue) {
          evaluationSignal = MutableQueue.isEmpty(this._queue) ?
            EvaluationSignalDone :
            this.evaluateMessageWhileSuspended(pipe(this._queue, MutableQueue.poll(null))!)
        }
      } finally {
        this._running = false
        globalThis[currentFiberURI] = prev
      }
      // Maybe someone added something to the queue between us checking, and us
      // giving up the drain. If so, we need to restart the draining, but only
      // if we beat everyone else to the restart:
      if (!MutableQueue.isEmpty(this._queue) && !this._running) {
        this._running = true
        if (evaluationSignal === EvaluationSignalYieldNow) {
          this.drainQueueLaterOnExecutor()
          recurse = false
        } else {
          recurse = true
        }
      } else {
        recurse = false
      }
    }
  }

  /**
   * Schedules the execution of all messages in the fiber's inbox.
   *
   * This method will return immediately after the scheduling
   * operation is completed, but potentially before such messages have been
   * executed.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  drainQueueLaterOnExecutor() {
    this.getFiberRef(core.currentScheduler).scheduleTask(this.run)
  }

  /**
   * Drains the fiber's message queue while the fiber is actively running,
   * returning the next effect to execute, which may be the input effect if no
   * additional effect needs to be executed.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  drainQueueWhileRunning(
    runtimeFlags: RuntimeFlags.RuntimeFlags,
    cur0: Effect.Effect<any, any, any>
  ) {
    let cur = cur0
    while (!MutableQueue.isEmpty(this._queue)) {
      const message = pipe(this._queue, MutableQueue.poll(void 0))!
      // @ts-expect-error
      cur = drainQueueWhileRunningTable[message.op](this, runtimeFlags, cur, message)
    }
    return cur
  }

  /**
   * Determines if the fiber is interrupted.
   *
   * **NOTE**: This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  isInterrupted(): boolean {
    return !Cause.isEmpty(this.getFiberRef(core.interruptedCause))
  }

  /**
   * Adds an interruptor to the set of interruptors that are interrupting this
   * fiber.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  addInterruptedCause(cause: Cause.Cause<never>) {
    const oldSC = this.getFiberRef(core.interruptedCause)
    this.setFiberRef(core.interruptedCause, Cause.sequential(oldSC, cause))
  }

  /**
   * Processes a new incoming interrupt signal.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  processNewInterruptSignal(cause: Cause.Cause<never>): void {
    this.addInterruptedCause(cause)
    this.sendInterruptSignalToAllChildren()
  }

  /**
   * Interrupts all children of the current fiber, returning an effect that will
   * await the exit of the children. This method will return null if the fiber
   * has no children.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  sendInterruptSignalToAllChildren(): boolean {
    if (this._children === null || this._children.size === 0) {
      return false
    }
    let told = false
    for (const child of this._children) {
      child.tell(FiberMessage.interruptSignal(Cause.interrupt(this.id())))
      told = true
    }
    return told
  }

  /**
   * Interrupts all children of the current fiber, returning an effect that will
   * await the exit of the children. This method will return null if the fiber
   * has no children.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  interruptAllChildren() {
    if (this.sendInterruptSignalToAllChildren()) {
      const it = this._children!.values()
      this._children = null
      let isDone = false
      const body = () => {
        const next = it.next()
        if (!next.done) {
          return core.asUnit(next.value.await())
        } else {
          return core.sync(() => {
            isDone = true
          })
        }
      }
      return core.whileLoop(
        () => !isDone,
        () => body(),
        () => {
          //
        }
      )
    }
    return null
  }

  reportExitValue(exit: Exit.Exit<E, A>) {
    if (pipe(this._runtimeFlags, _runtimeFlags.isEnabled(_runtimeFlags.RuntimeMetrics))) {
      switch (exit.op) {
        case OpCodes.OP_SUCCESS: {
          fiberSuccesses.unsafeUpdate(1, HashSet.empty())
          break
        }
        case OpCodes.OP_FAILURE: {
          fiberFailures.unsafeUpdate(1, HashSet.empty())
          break
        }
      }
    }
  }

  setExitValue(exit: Exit.Exit<E, A>) {
    this._exitValue = exit

    if (pipe(this._runtimeFlags, _runtimeFlags.isEnabled(_runtimeFlags.RuntimeMetrics))) {
      const startTimeMillis = this.id().startTimeMillis
      const endTimeMillis = new Date().getTime()
      fiberLifetimes.unsafeUpdate((endTimeMillis - startTimeMillis) / 1000.0, HashSet.empty())
    }

    this.reportExitValue(exit)

    pipe(
      this._observers,
      List.forEach((observer) => {
        observer(exit)
      })
    )
  }

  getLoggers() {
    return this.getFiberRef(internalLogger.currentLoggers)
  }

  log(
    message: string,
    cause: Cause.Cause<any>,
    overrideLogLevel: Option.Option<LogLevel.LogLevel>
  ): void {
    const logLevel = Option.isSome(overrideLogLevel) ?
      overrideLogLevel.value :
      this.getFiberRef(core.currentLogLevel)
    const spans = this.getFiberRef(core.currentLogSpan)
    const annotations = this.getFiberRef(core.currentLogAnnotations)
    const loggers = this.getLoggers()
    const contextMap = this.unsafeGetFiberRefs()
    pipe(
      loggers,
      HashSet.forEach((logger) => {
        logger.log(this.id(), logLevel, message, cause, contextMap, spans, annotations)
      })
    )
  }

  /**
   * Evaluates a single message on the current thread, while the fiber is
   * suspended. This method should only be called while evaluation of the
   * fiber's effect is suspended due to an asynchronous operation.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  evaluateMessageWhileSuspended(message: FiberMessage.FiberMessage): EvaluationSignal {
    switch (message.op) {
      case FiberMessage.OP_YIELD_NOW: {
        return EvaluationSignalYieldNow
      }
      case FiberMessage.OP_INTERRUPT_SIGNAL: {
        this.processNewInterruptSignal(message.cause)
        if (this._asyncInterruptor !== null) {
          this._asyncInterruptor(core.exitFailCause(message.cause))
          this._asyncInterruptor = null
        }
        return EvaluationSignalContinue
      }
      case FiberMessage.OP_RESUME: {
        this._asyncInterruptor = null
        this._asyncBlockingOn = null
        this.evaluateEffect(message.effect)
        return EvaluationSignalContinue
      }
      case FiberMessage.OP_STATEFUL: {
        message.onFiber(
          this,
          this._exitValue !== null ?
            FiberStatus.done :
            FiberStatus.suspended(this._runtimeFlags, this._asyncBlockingOn!)
        )
        return EvaluationSignalContinue
      }
      default: {
        return absurd(message)
      }
    }
  }

  /**
   * Evaluates an effect until completion, potentially asynchronously.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  evaluateEffect(effect0: Effect.Effect<any, any, any>) {
    this.getSupervisor().onResume(this)
    try {
      let effect: Effect.Effect<any, any, any> | null =
        _runtimeFlags.interruptible(this._runtimeFlags) && this.isInterrupted() ?
          core.exitFailCause(this.getInterruptedCause()) :
          effect0
      while (effect !== null) {
        try {
          const exit = this.runLoop(effect)
          this._runtimeFlags = pipe(this._runtimeFlags, _runtimeFlags.enable(_runtimeFlags.WindDown))
          const interruption = this.interruptAllChildren()
          if (interruption !== null) {
            effect = pipe(interruption, core.flatMap(() => exit))
          } else {
            if (MutableQueue.isEmpty(this._queue)) {
              // No more messages to process, so we will allow the fiber to end life:
              this.setExitValue(exit)
            } else {
              // There are messages, possibly added by the final op executed by
              // the fiber. To be safe, we should execute those now before we
              // allow the fiber to end life:
              this.tell(FiberMessage.resume(exit))
            }
            effect = null
          }
        } catch (e) {
          if (core.isEffect(e)) {
            if ((e as core.Primitive).op === OpCodes.OP_YIELD) {
              if (_runtimeFlags.cooperativeYielding(this._runtimeFlags)) {
                this.tell(FiberMessage.yieldNow)
                this.tell(FiberMessage.resume(core.unit()))
                effect = null
              } else {
                effect = core.unit()
              }
            } else if ((e as core.Primitive).op === OpCodes.OP_ASYNC) {
              // Terminate this evaluation, async resumption will continue evaluation:
              effect = null
            }
          } else {
            throw e
          }
        }
      }
    } finally {
      this.getSupervisor().onSuspend(this)
    }
  }

  /**
   * Begins execution of the effect associated with this fiber on the current
   * thread. This can be called to "kick off" execution of a fiber after it has
   * been created, in hopes that the effect can be executed synchronously.
   *
   * This is not the normal way of starting a fiber, but it is useful when the
   * express goal of executing the fiber is to synchronously produce its exit.
   */
  start<R>(effect: Effect.Effect<R, E, A>): void {
    if (!this._running) {
      this._running = true
      const prev = globalThis[currentFiberURI]
      globalThis[currentFiberURI] = this
      try {
        this.evaluateEffect(effect)
      } finally {
        this._running = false
        globalThis[currentFiberURI] = prev
        // Because we're special casing `start`, we have to be responsible
        // for spinning up the fiber if there were new messages added to
        // the queue between the completion of the effect and the transition
        // to the not running state.
        if (!MutableQueue.isEmpty(this._queue)) {
          this.drainQueueLaterOnExecutor()
        }
      }
    } else {
      this.tell(FiberMessage.resume(effect))
    }
  }

  /**
   * Begins execution of the effect associated with this fiber on in the
   * background, and on the correct thread pool. This can be called to "kick
   * off" execution of a fiber after it has been created, in hopes that the
   * effect can be executed synchronously.
   */
  startFork<R>(effect: Effect.Effect<R, E, A>): void {
    this.tell(FiberMessage.resume(effect))
  }

  /**
   * Takes the current runtime flags, patches them to return the new runtime
   * flags, and then makes any changes necessary to fiber state based on the
   * specified patch.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  patchRuntimeFlags(oldRuntimeFlags: RuntimeFlags.RuntimeFlags, patch: RuntimeFlagsPatch.RuntimeFlagsPatch) {
    const newRuntimeFlags = pipe(oldRuntimeFlags, _runtimeFlags.patch(patch))
    globalThis[currentFiberURI] = this
    this._runtimeFlags = newRuntimeFlags
    return newRuntimeFlags
  }

  /**
   * Initiates an asynchronous operation, by building a callback that will
   * resume execution, and then feeding that callback to the registration
   * function, handling error cases and repeated resumptions appropriately.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  initiateAsync(
    runtimeFlags: RuntimeFlags.RuntimeFlags,
    asyncRegister: (resume: (effect: Effect.Effect<any, any, any>) => void) => void
  ) {
    let alreadyCalled = false
    const callback = (effect: Effect.Effect<any, any, any>) => {
      if (!alreadyCalled) {
        alreadyCalled = true
        this.tell(FiberMessage.resume(effect))
      }
    }
    if (_runtimeFlags.interruptible(runtimeFlags)) {
      this._asyncInterruptor = callback
    }
    try {
      asyncRegister(callback)
    } catch (e) {
      callback(core.failCause(Cause.die(e)))
    }
  }

  pushStack(cont: core.Continuation) {
    this._stack = new Stack(cont, this._stack)
    if ("trace" in cont) {
      this._tracesInStack++
    }
  }

  popStack() {
    if (this._stack) {
      const current = this._stack
      this._stack = this._stack.previous
      if ("trace" in current.value) {
        this._tracesInStack--
      }
      return current.value
    }
    return
  }

  getNextSuccessCont() {
    let frame = this.popStack()
    while (frame) {
      if (frame.op !== OpCodes.OP_ON_FAILURE) {
        return frame
      }
      frame = this.popStack()
    }
  }

  getNextFailCont() {
    let frame = this.popStack()
    while (frame) {
      if (frame.op !== OpCodes.OP_ON_SUCCESS && frame.op !== OpCodes.OP_WHILE) {
        return frame
      }
      frame = this.popStack()
    }
  }

  onExecute(_op: core.Primitive) {
    if (_op.trace && isTraceEnabled()) {
      this.logTrace(_op.trace)
    }
  }

  [OpCodes.OP_SYNC](op: core.Primitive & { op: OpCodes.OP_SYNC }) {
    this.onExecute(op)
    const value = op.evaluate()
    const cont = this.getNextSuccessCont()
    if (cont !== undefined) {
      if (!(cont.op in contOpSuccess)) {
        // @ts-expect-error
        absurd(cont)
      }
      // @ts-expect-error
      return contOpSuccess[cont.op](this, cont, value)
    } else {
      throw core.exitSucceed(value)
    }
  }

  [OpCodes.OP_SUCCESS](op: core.Primitive & { op: OpCodes.OP_SUCCESS }) {
    this.onExecute(op)
    const oldCur = op
    const cont = this.getNextSuccessCont()
    if (cont !== undefined) {
      if (!(cont.op in contOpSuccess)) {
        // @ts-expect-error
        absurd(cont)
      }
      // @ts-expect-error
      return contOpSuccess[cont.op](this, cont, oldCur.value)
    } else {
      throw oldCur
    }
  }

  [OpCodes.OP_FAILURE](op: core.Primitive & { op: OpCodes.OP_FAILURE }) {
    this.onExecute(op)
    let cause = op.cause
    if (this._tracesInStack > 0 || (this._executionTrace && this._executionTrace.size > 0)) {
      if (Cause.isAnnotatedType(cause) && Cause.isStackAnnotation(cause.annotation)) {
        const stack = cause.annotation.stack
        const execution = cause.annotation.execution
        const currentStack = this.stackToLines()
        const currentExecution = this._executionTrace?.toChunkReversed() || Chunk.empty
        cause = Cause.annotated(
          cause.cause,
          new StackAnnotation(
            pipe(
              stack.length === 0 ?
                currentStack :
                currentStack.length === 0 ?
                stack :
                Chunk.unsafeLast(stack) === Chunk.unsafeLast(currentStack) ?
                stack :
                pipe(
                  stack,
                  Chunk.concat(currentStack)
                ),
              Chunk.dedupeAdjacent,
              Chunk.take(runtimeDebug.traceStackLimit)
            ),
            pipe(
              execution.length === 0 ?
                currentExecution :
                currentExecution.length === 0 ?
                execution :
                Chunk.unsafeLast(execution) === Chunk.unsafeLast(currentExecution) ?
                execution :
                pipe(
                  execution,
                  Chunk.concat(currentExecution)
                ),
              Chunk.dedupeAdjacent,
              Chunk.take(runtimeDebug.traceExecutionLimit)
            )
          )
        )
      } else {
        cause = Cause.annotated(
          op.cause,
          new StackAnnotation(this.stackToLines(), this._executionTrace?.toChunkReversed() || Chunk.empty)
        )
      }
    }
    const cont = this.getNextFailCont()
    if (cont !== undefined) {
      switch (cont.op) {
        case OpCodes.OP_ON_FAILURE:
        case OpCodes.OP_ON_SUCCESS_AND_FAILURE: {
          if (!(_runtimeFlags.interruptible(this._runtimeFlags) && this.isInterrupted())) {
            this.onExecute(cont)
            return cont.failK(cause)
          } else {
            return core.failCause(Cause.stripFailures(cause))
          }
        }
        case OpCodes.OP_REVERT_FLAGS: {
          this.patchRuntimeFlags(this._runtimeFlags, cont.patch)
          if (_runtimeFlags.interruptible(this._runtimeFlags) && this.isInterrupted()) {
            return core.exitFailCause(Cause.sequential(cause, this.getInterruptedCause()))
          } else {
            return core.failCause(cause)
          }
        }
        default: {
          absurd(cont)
        }
      }
    } else {
      throw Exit.failCause(cause)
    }
  }

  [OpCodes.OP_WITH_RUNTIME](op: core.Primitive & { op: OpCodes.OP_WITH_RUNTIME }) {
    this.onExecute(op)
    return op.withRuntime(
      this as FiberRuntime<unknown, unknown>,
      FiberStatus.running(this._runtimeFlags) as FiberStatus.Running
    )
  }

  [OpCodes.OP_UPDATE_RUNTIME_FLAGS](op: core.Primitive & { op: OpCodes.OP_UPDATE_RUNTIME_FLAGS }) {
    this.onExecute(op)
    if (op.scope === undefined) {
      this.patchRuntimeFlags(this._runtimeFlags, op.update)
      return core.unit()
    } else {
      const updateFlags = op.update
      const oldRuntimeFlags = this._runtimeFlags
      const newRuntimeFlags = pipe(oldRuntimeFlags, _runtimeFlags.patch(updateFlags))
      if (newRuntimeFlags === oldRuntimeFlags) {
        // No change, short circuit
        return op.scope(oldRuntimeFlags)
      } else {
        // One more chance to short circuit: if we're immediately going
        // to interrupt. Interruption will cause immediate reversion of
        // the flag, so as long as we "peek ahead", there's no need to
        // set them to begin with.
        if (_runtimeFlags.interruptible(newRuntimeFlags) && this.isInterrupted()) {
          return core.exitFailCause(this.getInterruptedCause())
        } else {
          // Impossible to short circuit, so record the changes
          this.patchRuntimeFlags(this._runtimeFlags, updateFlags)
          // Since we updated the flags, we need to revert them
          const revertFlags = pipe(newRuntimeFlags, _runtimeFlags.diff(oldRuntimeFlags))
          this.pushStack(new core.RevertFlags(revertFlags))
          return op.scope(oldRuntimeFlags)
        }
      }
    }
  }

  [OpCodes.OP_ON_SUCCESS](op: core.Primitive & { op: OpCodes.OP_ON_SUCCESS }) {
    this.pushStack(op)
    return op.first
  }

  [OpCodes.OP_ON_FAILURE](op: core.Primitive & { op: OpCodes.OP_ON_FAILURE }) {
    this.pushStack(op)
    return op.first
  }

  [OpCodes.OP_ON_SUCCESS_AND_FAILURE](op: core.Primitive & { op: OpCodes.OP_ON_SUCCESS_AND_FAILURE }) {
    this.pushStack(op)
    return op.first
  }

  [OpCodes.OP_ASYNC](op: core.Primitive & { op: OpCodes.OP_ASYNC }) {
    this.onExecute(op)
    this._asyncBlockingOn = op.blockingOn
    this.initiateAsync(this._runtimeFlags, op.register)
    throw op
  }

  [OpCodes.OP_YIELD](op: core.Primitive & { op: OpCodes.OP_YIELD }) {
    this.onExecute(op)
    throw op
  }

  [OpCodes.OP_WHILE](op: core.Primitive & { op: OpCodes.OP_WHILE }) {
    const check = op.check
    const body = op.body
    if (check()) {
      this.onExecute(op)
      this.pushStack(op)
      return body()
    } else {
      return core.unit()
    }
  }

  [OpCodes.OP_COMMIT](op: core.Primitive & { op: OpCodes.OP_COMMIT }) {
    return op.commit()
  }

  /**
   * The main run-loop for evaluating effects.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  runLoop(effect0: Effect.Effect<any, any, any>): Exit.Exit<any, any> {
    let cur = effect0
    let ops = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (_runtimeFlags.opSupervision(this._runtimeFlags)) {
        this.getSupervisor().onEffect(this, cur)
      }
      cur = this.drainQueueWhileRunning(this._runtimeFlags, cur)
      ops += 1
      if (ops >= 2048) {
        ops = 0
        const oldCur = cur
        cur = pipe(core.yieldNow(), core.flatMap(() => oldCur))
      }
      try {
        if (!((cur as core.Primitive).op in this)) {
          // @ts-expect-error
          absurd(cur)
        }
        // @ts-expect-error
        cur = this[(cur as core.Primitive).op](cur as core.Primitive)
      } catch (e) {
        if (core.isEffect(e)) {
          if (
            (e as core.Primitive).op === OpCodes.OP_YIELD ||
            (e as core.Primitive).op === OpCodes.OP_ASYNC
          ) {
            throw e
          }
          if (
            (e as core.Primitive).op === OpCodes.OP_SUCCESS ||
            (e as core.Primitive).op === OpCodes.OP_FAILURE
          ) {
            return e as Exit.Exit<E, A>
          }
        } else {
          if (core.isEffectError(e)) {
            cur = core.failCause(e.cause)
          } else if (Cause.isInterruptedException(e)) {
            cur = core.exitFailCause(
              Cause.sequential(Cause.die(e), Cause.interrupt(FiberId.none))
            )
          } else {
            cur = core.failCause(Cause.die(e))
          }
        }
      }
    }
  }

  logTrace(trace: string) {
    if (!this._executionTrace) {
      this._executionTrace = new RingBuffer<string>(runtimeDebug.traceExecutionLimit)
    }
    const isNew = this._executionTrace.push(trace)
    if (isNew) {
      if (runtimeDebug.traceExecutionLogEnabled) {
        this.log(`Executing: ${trace}`, Cause.empty, Option.some(LogLevel.Debug))
      }
    }
  }

  stackToLines(): Chunk.Chunk<string> {
    if (this._tracesInStack === 0) {
      return Chunk.empty
    }
    const lines: Array<string> = []
    let current = this._stack
    let last: undefined | string = undefined
    let seen = 0
    while (current !== undefined && lines.length < runtimeDebug.traceStackLimit && seen < this._tracesInStack) {
      switch (current.value.op) {
        case OpCodes.OP_ON_FAILURE:
        case OpCodes.OP_ON_SUCCESS:
        case OpCodes.OP_ON_SUCCESS_AND_FAILURE: {
          if (current.value.trace) {
            seen++
            if (current.value.trace !== last) {
              last = current.value.trace
              lines.push(current.value.trace)
            }
          }
          break
        }
      }
      current = current.previous
    }
    return Chunk.unsafeFromArray(lines)
  }

  run = () => {
    this.drainQueueOnCurrentThread()
  }
}

// circular with Effect

/** @internal */
export const acquireRelease = <R, E, A, R2, X>(
  acquire: Effect.Effect<R, E, A>,
  release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
): Effect.Effect<R | R2 | Scope.Scope, E, A> => {
  const trace = getCallTrace()
  return pipe(
    acquire,
    core.tap((a) => addFinalizer((exit) => release(a, exit))),
    core.uninterruptible
  ).traced(trace)
}

/** @internal */
export const addFinalizer = <R, X>(
  finalizer: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R, never, X>
): Effect.Effect<R | Scope.Scope, never, void> => {
  const trace = getCallTrace()
  return pipe(
    core.environment<R | Scope.Scope>(),
    core.flatMap((environment) =>
      pipe(
        scope(),
        core.flatMap(
          core.scopeAddFinalizerExit((exit) =>
            pipe(
              finalizer(exit),
              core.provideEnvironment(environment),
              core.asUnit
            )
          )
        )
      )
    )
  ).traced(trace)
}

/** @internal */
export const collect = <A, R, E, B>(f: (a: A) => Effect.Effect<R, Option.Option<E>, B>) => {
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    const trace = getCallTrace()
    return pipe(elements, core.forEach((a) => unsome(f(a))), core.map(Chunk.compact)).traced(trace)
  }
}

/** @internal */
export const collectPar = <A, R, E, B>(f: (a: A) => Effect.Effect<R, Option.Option<E>, B>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return pipe(elements, forEachPar((a) => unsome(f(a))), core.map(Chunk.compact)).traced(trace)
  }
}

/** @internal */
export const collectAllPar = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, E, Chunk.Chunk<A>> => {
  const trace = getCallTrace()
  return pipe(effects, forEachPar(identity)).traced(trace)
}

/** @internal */
export const collectAllParDiscard = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  return pipe(effects, forEachParDiscard(identity)).traced(trace)
}

/** @internal */
export const collectAllSuccessesPar = <R, E, A>(
  elements: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, never, Chunk.Chunk<A>> => {
  const trace = getCallTrace()
  return pipe(
    Array.from(elements).map(core.exit),
    collectAllWithPar((exit) => (core.exitIsSuccess(exit) ? Option.some(exit.value) : Option.none))
  ).traced(trace)
}

/** @internal */
export const collectAllWithPar = <A, B>(pf: (a: A) => Option.Option<B>) => {
  const trace = getCallTrace()
  return <R, E>(elements: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return pipe(collectAllPar(elements), core.map(Chunk.filterMap(pf))).traced(trace)
  }
}

/** @internal */
export const daemonChildren = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const forkScope = pipe(
    core.forkScopeOverride,
    core.fiberRefLocally(Option.some(fiberScope.globalScope as FiberScope))
  )
  return forkScope(self).traced(trace)
}

/** @internal */
const _existsParFound = Symbol("@effect/io/Effect/existsPar/found")

/** @internal */
export const existsPar = <R, E, A>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, boolean> => {
    return pipe(
      elements,
      forEachPar((a) => pipe(f(a), core.ifEffect(core.fail(_existsParFound), core.unit()))),
      core.foldEffect(
        (e) => e === _existsParFound ? core.succeed(true) : core.fail(e),
        () => core.succeed(false)
      )
    ).traced(trace)
  }
}

/** @internal */
export const filterPar = <A, R, E>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<A>> => {
    return pipe(
      elements,
      forEachPar((a) => pipe(f(a), core.map((b) => (b ? Option.some(a) : Option.none)))),
      core.map(Chunk.compact)
    ).traced(trace)
  }
}

/** @internal */
export const filterNotPar = <A, R, E>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<A>> => {
    return pipe(elements, filterPar((a) => pipe(f(a), core.map((b) => !b)))).traced(trace)
  }
}

/** @internal */
export const forEachExec = <R, E, A, B>(
  f: (a: A) => Effect.Effect<R, E, B>,
  strategy: ExecutionStrategy.ExecutionStrategy
) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return core.suspendSucceed(() =>
      pipe(
        strategy,
        ExecutionStrategy.match(
          () => pipe(elements, core.forEach(f)),
          () => pipe(elements, forEachPar(f), core.withParallelismUnbounded),
          (parallelism) => pipe(elements, forEachPar(f), core.withParallelism(parallelism))
        )
      )
    ).traced(trace)
  }
}

/** @internal */
export const forEachPar = <A, R, E, B>(
  f: (a: A) => Effect.Effect<R, E, B>
) => {
  const trace = getCallTrace()
  return (self: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> =>
    pipe(
      core.currentParallelism,
      core.fiberRefGetWith(
        (o) => o._tag === "None" ? forEachParUnbounded(f)(self) : forEachParN(o.value, f)(self)
      )
    ).traced(trace)
}

/** @internal */
export const forEachParDiscard = <A, R, E, _>(
  f: (a: A) => Effect.Effect<R, E, _>
) => {
  const trace = getCallTrace()
  return (self: Iterable<A>): Effect.Effect<R, E, void> =>
    pipe(
      core.currentParallelism,
      core.fiberRefGetWith(
        (o) => o._tag === "None" ? forEachParUnboundedDiscard(f)(self) : forEachParNDiscard(o.value, f)(self)
      )
    ).traced(trace)
}

/** @internal */
const forEachParUnbounded = <A, R, E, B>(
  f: (a: A) => Effect.Effect<R, E, B>
) => {
  const trace = getCallTrace()
  return (self: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> =>
    core.suspendSucceed(() => {
      const as = Array.from(self).map((v, i) => [v, i] as const)
      const array = new Array<B>(as.length)
      const fn = ([a, i]: readonly [A, number]) => pipe(f(a), core.flatMap((b) => core.sync(() => array[i] = b)))
      return pipe(as, forEachParUnboundedDiscard(fn), core.zipRight(core.succeed(Chunk.unsafeFromArray(array))))
    }).traced(trace)
}

/** @internal */
const forEachParUnboundedDiscard = <R, E, A, _>(f: (a: A) => Effect.Effect<R, E, _>) => {
  const trace = getCallTrace()
  return (self: Iterable<A>): Effect.Effect<R, E, void> =>
    core.suspendSucceed(() => {
      const as = Array.from(self)
      const size = as.length
      if (size === 0) {
        return core.unit()
      } else if (size === 1) {
        return core.asUnit(f(as[0]))
      }
      return core.uninterruptibleMask((restore) => {
        const deferred = core.deferredUnsafeMake<void, void>(FiberId.none)
        let ref = 0
        const process = core.transplant((graft) => {
          return pipe(
            as,
            core.forEach((a) =>
              pipe(
                graft(pipe(
                  restore(core.suspendSucceed(() => f(a))),
                  core.foldCauseEffect(
                    (cause) => pipe(deferred, core.deferredFail<void>(void 0), core.zipRight(core.failCause(cause))),
                    () => {
                      if (ref + 1 === size) {
                        pipe(deferred, core.deferredUnsafeDone(core.unit() as Effect.Effect<never, void, void>))
                      } else {
                        ref = ref + 1
                      }
                      return core.unit()
                    }
                  )
                )),
                forkDaemon
              )
            )
          )
        })
        return pipe(
          process,
          core.flatMap((fibers) =>
            pipe(
              restore(core.deferredAwait(deferred)),
              core.foldCauseEffect(
                (cause) =>
                  pipe(
                    fibers,
                    forEachParUnbounded(core.interruptFiber),
                    core.flatMap(
                      (exits) => {
                        const exit = core.exitCollectAllPar(exits)
                        if (exit._tag === "Some" && core.exitIsFailure(exit.value)) {
                          return core.failCause(Cause.parallel(Cause.stripFailures(cause), exit.value.cause))
                        } else {
                          return core.failCause(Cause.stripFailures(cause))
                        }
                      }
                    )
                  ),
                () => pipe(fibers, core.forEachDiscard((f) => f.inheritAll()))
              )
            )
          )
        )
      })
    }).traced(trace)
}

const forEachParN = <A, R, E, B>(
  n: number,
  f: (a: A) => Effect.Effect<R, E, B>
) => {
  const trace = getCallTrace()
  return (self: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> =>
    core.suspendSucceed(() => {
      const as = Array.from(self).map((v, i) => [v, i] as const)
      const array = new Array<B>(as.length)
      const fn = ([a, i]: readonly [A, number]) => pipe(f(a), core.map((b) => array[i] = b))
      return pipe(as, forEachParNDiscard(n, fn), core.zipRight(core.succeed(Chunk.unsafeFromArray(array))))
    }).traced(trace)
}

/** @internal */
const forEachParNDiscard = <A, R, E, _>(n: number, f: (a: A) => Effect.Effect<R, E, _>) => {
  const trace = getCallTrace()
  return (self: Iterable<A>): Effect.Effect<R, E, void> =>
    core.suspendSucceed(() => {
      const iterator = self[Symbol.iterator]()

      const worker: Effect.Effect<R, E, void> = pipe(
        core.sync(() => iterator.next()),
        core.flatMap((next) => next.done ? core.unit() : pipe(core.asUnit(f(next.value)), core.flatMap(() => worker)))
      )

      const effects: Array<Effect.Effect<R, E, void>> = []

      for (let i = 0; i < n; i++) {
        effects.push(worker)
      }

      return pipe(effects, forEachParUnboundedDiscard(identity))
    }).traced(trace)
}

/** @internal */
export const forEachParWithIndex = <R, E, A, B>(f: (a: A, i: number) => Effect.Effect<R, E, B>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return core.suspendSucceed(() =>
      pipe(
        core.sync<Array<B>>(() => []),
        core.flatMap((array) =>
          pipe(
            Array.from(elements).map((a, i) => [a, i] as [A, number]),
            forEachParDiscard(
              ([a, i]) =>
                pipe(
                  core.suspendSucceed(() => f(a, i)),
                  core.flatMap((b) =>
                    core.sync(() => {
                      array[i] = b
                    })
                  )
                )
            ),
            core.map(() => Chunk.unsafeFromArray(array))
          )
        )
      )
    ).traced(trace)
  }
}

/** @internal */
export const fork = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<R, never, Fiber.RuntimeFiber<E, A>>((state, status) =>
    core.succeed(unsafeFork(self, state, status.runtimeFlags))
  ).traced(trace)
}

/** @internal */
export const forkAllDiscard = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, never, void> => {
  const trace = getCallTrace()
  return pipe(effects, core.forEachDiscard(fork)).traced(trace)
}

/** @internal */
export const forkDaemon = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> => {
  const trace = getCallTrace()
  return pipe(self, forkWithScopeOverride(fiberScope.globalScope)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const forkWithErrorHandler = <E, X>(handler: (e: E) => Effect.Effect<never, never, X>) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> => {
    return pipe(
      self,
      core.onError((cause) => {
        const either = Cause.failureOrCause(cause)
        switch (either._tag) {
          case "Left": {
            return handler(either.left)
          }
          case "Right": {
            return core.failCause(either.right)
          }
        }
      }),
      fork
    ).traced(trace)
  }
}

/** @internal */
export const unsafeFork = <R, E, A, E2, B>(
  effect: Effect.Effect<R, E, A>,
  parentFiber: FiberRuntime<E2, B>,
  parentRuntimeFlags: RuntimeFlags.RuntimeFlags,
  overrideScope: fiberScope.FiberScope | null = null
): FiberRuntime<E, A> => {
  const childFiber = unsafeMakeChildFiber(effect, parentFiber, parentRuntimeFlags, overrideScope)
  childFiber.resume(effect)
  return childFiber
}

/** @internal */
export const unsafeMakeChildFiber = <R, E, A, E2, B>(
  effect: Effect.Effect<R, E, A>,
  parentFiber: FiberRuntime<E2, B>,
  parentRuntimeFlags: RuntimeFlags.RuntimeFlags,
  overrideScope: fiberScope.FiberScope | null = null
): FiberRuntime<E, A> => {
  const childId = FiberId.unsafeMake()
  const parentFiberRefs = parentFiber.unsafeGetFiberRefs()
  const childFiberRefs = pipe(parentFiberRefs, fiberRefs.forkAs(childId))
  const childFiber = new FiberRuntime<E, A>(childId, childFiberRefs, parentRuntimeFlags)
  const childEnvironment = pipe(
    childFiberRefs,
    fiberRefs.getOrDefault(
      core.currentEnvironment as unknown as FiberRef.FiberRef<Context.Context<R>>
    )
  )
  const supervisor = childFiber.getSupervisor()

  supervisor.onStart(
    childEnvironment,
    effect,
    Option.some(parentFiber),
    childFiber
  )

  childFiber.unsafeAddObserver((exit) => supervisor.onEnd(exit, childFiber))

  const parentScope = overrideScope !== null ? overrideScope : pipe(
    parentFiber.getFiberRef(core.forkScopeOverride),
    Option.getOrElse(() => parentFiber.scope())
  )

  parentScope.add(parentRuntimeFlags, childFiber)

  return childFiber
}

/**
 * @macro traced
 * @internal
 */
const forkWithScopeOverride = (scopeOverride: fiberScope.FiberScope) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> => {
    return core.withFiberRuntime<R, never, Fiber.RuntimeFiber<E, A>>((parentFiber, parentStatus) =>
      core.succeed(unsafeFork(self, parentFiber, parentStatus.runtimeFlags, scopeOverride))
    ).traced(trace)
  }
}

/** @internal */
export const mergeAllPar = <Z, A>(zero: Z, f: (z: Z, a: A) => Z) => {
  const trace = getCallTrace()
  return <R, E>(elements: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, Z> => {
    return pipe(
      Ref.make(zero),
      core.flatMap((acc) =>
        pipe(
          elements,
          forEachParDiscard(core.flatMap((a) => pipe(acc, Ref.update((b) => f(b, a))))),
          core.flatMap(() => Ref.get(acc))
        )
      )
    ).traced(trace)
  }
}

/** @internal */
export function onDone<E, A, R1, X1, R2, X2>(
  onError: (e: E) => Effect.Effect<R1, never, X1>,
  onSuccess: (a: A) => Effect.Effect<R2, never, X2>
) {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1 | R2, never, void> => {
    return core.uninterruptibleMask((restore) =>
      pipe(
        restore(self),
        core.foldEffect(
          (e) => restore(onError(e)),
          (a) => restore(onSuccess(a))
        ),
        forkDaemon,
        core.asUnit
      )
    ).traced(trace)
  }
}

/** @internal */
export function onDoneCause<E, A, R1, X1, R2, X2>(
  onCause: (cause: Cause.Cause<E>) => Effect.Effect<R1, never, X1>,
  onSuccess: (a: A) => Effect.Effect<R2, never, X2>
) {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1 | R2, never, void> => {
    return core.uninterruptibleMask((restore) =>
      pipe(
        restore(self),
        core.foldCauseEffect(
          (c) => restore(onCause(c)),
          (a) => restore(onSuccess(a))
        ),
        forkDaemon,
        core.asUnit
      )
    ).traced(trace)
  }
}

/** @internal */
export const partitionPar = <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, B>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, never, readonly [List.List<E>, List.List<B>]> => {
    return pipe(
      elements,
      forEachPar((a) => core.either(f(a))),
      core.map((chunk) => core.partitionMap(chunk, identity))
    ).traced(trace)
  }
}

/** @internal */
export const raceAll = <R1, E1, A1>(effects: Iterable<Effect.Effect<R1, E1, A1>>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E | E1, A | A1> => {
    const inheritAll = (res: readonly [A | A1, Fiber.Fiber<E | E1, A | A1>]) =>
      pipe(
        internalFiber.inheritAll(res[1]),
        core.as(res[0])
      )
    return pipe(
      core.sync(() => Chunk.fromIterable(effects)),
      core.flatMap((effects) =>
        pipe(
          core.deferredMake<E | E1, readonly [A | A1, Fiber.Fiber<E | E1, A | A1>]>(),
          core.flatMap((done) =>
            pipe(
              Ref.make(effects.length),
              core.flatMap((fails) =>
                core.uninterruptibleMask<R | R1, E | E1, A | A1>((restore) =>
                  pipe(
                    fork(core.interruptible(self)),
                    core.flatMap((head) =>
                      pipe(
                        effects,
                        core.forEach((effect) => fork(core.interruptible(effect))),
                        core.map((tail) =>
                          pipe(tail, Chunk.prepend(head)) as Chunk.Chunk<Fiber.RuntimeFiber<E | E1, A | A1>>
                        ),
                        core.tap((fibers) =>
                          pipe(
                            fibers,
                            Chunk.reduce(core.unit(), (effect, fiber) =>
                              pipe(
                                effect,
                                core.zipRight(
                                  pipe(
                                    internalFiber._await(fiber),
                                    core.flatMap(raceAllArbiter(fibers, fiber, done, fails)),
                                    fork,
                                    core.asUnit
                                  )
                                )
                              ))
                          )
                        ),
                        core.flatMap((fibers) =>
                          pipe(
                            restore(pipe(Deferred.await(done), core.flatMap(inheritAll))),
                            core.onInterrupt(() =>
                              pipe(
                                fibers,
                                Chunk.reduce(
                                  core.unit(),
                                  (effect, fiber) => pipe(effect, core.zipLeft(core.interruptFiber(fiber)))
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
const raceAllArbiter = <E, E1, A, A1>(
  fibers: Chunk.Chunk<Fiber.Fiber<E | E1, A | A1>>,
  winner: Fiber.Fiber<E | E1, A | A1>,
  deferred: Deferred.Deferred<E | E1, readonly [A | A1, Fiber.Fiber<E | E1, A | A1>]>,
  fails: Ref.Ref<number>
) => {
  const trace = getCallTrace()
  return (exit: Exit.Exit<E | E1, A | A1>): Effect.Effect<never, never, void> => {
    return pipe(
      exit,
      core.exitMatchEffect(
        (cause) =>
          pipe(
            fails,
            Ref.modify((fails) =>
              [
                fails === 0 ?
                  pipe(deferred, core.deferredFailCause<E | E1>(cause), core.asUnit) :
                  core.unit(),
                fails - 1
              ] as const
            ),
            core.flatten
          ),
        (value): Effect.Effect<never, never, void> =>
          pipe(
            deferred,
            core.deferredSucceed([value, winner] as const),
            core.flatMap((set) =>
              set ?
                pipe(
                  fibers,
                  Chunk.reduce(
                    core.unit(),
                    (effect, fiber) =>
                      fiber === winner ?
                        effect :
                        pipe(effect, core.zipLeft(core.interruptFiber(fiber)))
                  )
                ) :
                core.unit()
            )
          )
      )
    ).traced(trace)
  }
}

/** @internal */
export const reduceAllPar = <R, E, A>(
  zero: Effect.Effect<R, E, A>,
  f: (acc: A, a: A) => A
) => {
  const trace = getCallTrace()
  return (elements: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A> => {
    return core.suspendSucceed(() =>
      pipe(
        [zero, ...Array.from(elements)],
        mergeAllPar(
          Option.none as Option.Option<A>,
          (acc, elem) => {
            switch (acc._tag) {
              case "None": {
                return Option.some(elem)
              }
              case "Some": {
                return Option.some(f(acc.value, elem))
              }
            }
          }
        ),
        core.map((option) => {
          switch (option._tag) {
            case "None": {
              throw new Error(
                "BUG: Effect.reduceAllPar - please report an issue at https://github.com/Effect-TS/io/issues"
              )
            }
            case "Some": {
              return option.value
            }
          }
        })
      )
    ).traced(trace)
  }
}

/** @internal */
export const parallelFinalizers = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | Scope.Scope, E, A> => {
  const trace = getCallTrace()
  return pipe(
    scope(),
    core.flatMap((outerScope) =>
      pipe(
        scopeMake(ExecutionStrategy.parallel),
        core.flatMap((innerScope) =>
          pipe(
            outerScope.addFinalizer((exit) => innerScope.close(exit)),
            core.zipRight(pipe(innerScope, scopeExtend(self)))
          )
        )
      )
    )
  ).traced(trace)
}

/** @internal */
export const scope = () => {
  const trace = getCallTrace()
  return core.service(scopeTag).traced(trace)
}

/** @internal */
export const scopeWith = <R, E, A>(
  f: (scope: Scope.Scope) => Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, E, A> => {
  const trace = getCallTrace()
  return core.serviceWithEffect(scopeTag)(f).traced(trace)
}

/** @internal */
export const scopedEffect = <R, E, A>(
  effect: Effect.Effect<R, E, A>
): Effect.Effect<Exclude<R, Scope.Scope>, E, A> => {
  const trace = getCallTrace()
  return pipe(scopeMake(), core.flatMap(scopeUse(effect))).traced(trace)
}

/** @internal */
export const sequentialFinalizers = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | Scope.Scope, E, A> => {
  const trace = getCallTrace()
  return scopeWith((scope) =>
    pipe(
      scope,
      core.scopeFork(ExecutionStrategy.sequential),
      core.flatMap(scopeExtend(self))
    )
  ).traced(trace)
}

/** @internal */
export const some = <R, E, A>(
  self: Effect.Effect<R, E, Option.Option<A>>
): Effect.Effect<R, Option.Option<E>, A> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.foldEffect(
      (e) => core.fail(Option.some(e)),
      (option) => {
        switch (option._tag) {
          case "None": {
            return core.fail(Option.none)
          }
          case "Some": {
            return core.succeed(option.value)
          }
        }
      }
    )
  ).traced(trace)
}

/** @internal */
export const someWith = <R, E, A, R1, E1, A1>(
  f: (effect: Effect.Effect<R, Option.Option<E>, A>) => Effect.Effect<R1, Option.Option<E1>, A1>
) => {
  const trace = getCallTrace()
  return (self: Effect.Effect<R, E, Option.Option<A>>): Effect.Effect<R | R1, E | E1, Option.Option<A1>> => {
    return core.suspendSucceed(() => unsome(f(some(self)))).traced(trace)
  }
}

/** @internal */
export function structPar<NER extends Record<string, Effect.Effect<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> | Record<string, Effect.Effect<any, any, any>>
): Effect.Effect<
  [NER[keyof NER]] extends [{ [core.EffectTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [NER[keyof NER]] extends [{ [core.EffectTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  {
    [K in keyof NER]: [NER[K]] extends [{ [core.EffectTypeId]: { _A: (_: never) => infer A } }] ? A : never
  }
> {
  const trace = getCallTrace()
  return pipe(
    Object.entries(r),
    forEachPar(([_, e]) => pipe(e, core.map((a) => [_, a] as const))),
    core.map((values) => {
      const res = {}
      for (const [k, v] of values) {
        res[k] = v
      }
      return res
    })
  ).traced(trace) as any
}

/** @internal */
export const tuplePar = <T extends [Effect.Effect<any, any, any>, ...Array<Effect.Effect<any, any, any>>]>(
  ...t: T
): Effect.Effect<
  [T[number]] extends [{ [core.EffectTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [T[number]] extends [{ [core.EffectTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  TupleEffect<T>
> => {
  const trace = getCallTrace()
  return pipe(collectAllPar(t), core.map(Chunk.toReadonlyArray)).traced(trace) as any
}

/** @internal */
export const using = <A, R2, E2, A2>(use: (a: A) => Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R | Scope.Scope, E, A>): Effect.Effect<R | R2, E | E2, A2> => {
    return core.acquireUseRelease(
      scopeMake(),
      (scope) => pipe(scope, scopeExtend(self), core.flatMap(use)),
      (scope, exit) => pipe(scope, core.scopeClose(exit))
    ).traced(trace)
  }
}

/** @internal */
export const unsome = <R, E, A>(
  self: Effect.Effect<R, Option.Option<E>, A>
): Effect.Effect<R, E, Option.Option<A>> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.foldEffect(
      (option) => {
        switch (option._tag) {
          case "None": {
            return core.succeed(Option.none)
          }
          case "Some": {
            return core.fail(option.value)
          }
        }
      },
      (a) => core.succeed(Option.some(a))
    )
  ).traced(trace)
}

/** @internal */
export const validateAllPar = <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, B>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, Chunk.Chunk<E>, Chunk.Chunk<B>> => {
    return pipe(
      elements,
      partitionPar(f),
      core.flatMap(([es, bs]) =>
        List.isNil(es)
          ? core.succeed(Chunk.fromIterable(bs))
          : core.fail(Chunk.fromIterable(es))
      )
    ).traced(trace)
  }
}

/** @internal */
export const validateAllParDiscard = <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, B>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, Chunk.Chunk<E>, void> => {
    return pipe(
      elements,
      partitionPar(f),
      core.flatMap(([es, _]) =>
        List.isNil(es)
          ? core.unit()
          : core.fail(Chunk.fromIterable(es))
      )
    ).traced(trace)
  }
}

/** @internal */
export const validateFirstPar = <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, B>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, Chunk.Chunk<E>, B> => {
    return pipe(elements, forEachPar((a) => core.flip(f(a))), core.flip).traced(trace)
  }
}

/** @internal */
export const withClockScoped = <A extends Clock.Clock>(value: A) => {
  const trace = getCallTrace()
  return pipe(
    defaultServices.currentServices,
    fiberRefLocallyScopedWith(Context.add(clock.clockTag)(value))
  ).traced(trace)
}

/** @internal */
export const withConfigProviderScoped = (value: ConfigProvider) => {
  const trace = getCallTrace()
  return pipe(
    defaultServices.currentServices,
    fiberRefLocallyScopedWith(Context.add(configProviderTag)(value))
  ).traced(trace)
}

/** @internal */
export const withEarlyRelease = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, E, readonly [Effect.Effect<never, never, void>, A]> => {
  const trace = getCallTrace()
  return scopeWith((parent) =>
    pipe(
      parent,
      core.scopeFork(ExecutionStrategy.sequential),
      core.flatMap((child) =>
        pipe(
          child,
          scopeExtend(self),
          core.map((value) =>
            [
              core.fiberIdWith((fiberId) => pipe(child, core.scopeClose(core.exitInterrupt(fiberId)))),
              value
            ] as const
          )
        )
      )
    )
  ).traced(trace)
}

/** @internal */
export const withRuntimeFlagsScoped = (
  update: RuntimeFlagsPatch.RuntimeFlagsPatch
): Effect.Effect<Scope.Scope, never, void> => {
  const trace = getCallTrace()
  if (update === RuntimeFlagsPatch.empty) {
    return core.unit()
  }
  return pipe(
    core.runtimeFlags(),
    core.flatMap((runtimeFlags) => {
      const updatedRuntimeFlags = _runtimeFlags.patch(update)(runtimeFlags)
      const revertRuntimeFlags = pipe(updatedRuntimeFlags, _runtimeFlags.diff(runtimeFlags))
      return pipe(
        core.updateRuntimeFlags(update),
        core.zipRight(addFinalizer(() => core.updateRuntimeFlags(revertRuntimeFlags))),
        core.asUnit
      )
    }),
    core.uninterruptible
  ).traced(trace)
}

// circular with ReleaseMap

/** @internal */
export const releaseMapReleaseAll = (
  strategy: ExecutionStrategy.ExecutionStrategy,
  exit: Exit.Exit<unknown, unknown>
) => {
  const trace = getCallTrace()
  return (self: core.ReleaseMap) => {
    return core.suspendSucceed(() => {
      switch (self.state._tag) {
        case "Exited": {
          return core.unit()
        }
        case "Running": {
          const finalizersMap = self.state.finalizers
          const update = self.state.update
          const finalizers = Array.from(finalizersMap.keys()).sort((a, b) => b - a).map((key) =>
            finalizersMap.get(key)!
          )
          self.state = { _tag: "Exited", nextKey: self.state.nextKey, exit, update }
          return ExecutionStrategy.isSequential(strategy) ?
            pipe(
              finalizers,
              core.forEach((fin) => core.exit(update(fin)(exit))),
              core.flatMap((results) =>
                pipe(
                  core.exitCollectAll(results),
                  Option.map(core.exitAsUnit),
                  Option.getOrElse(() => core.exitUnit())
                )
              )
            ) :
            ExecutionStrategy.isParallel(strategy) ?
            pipe(
              finalizers,
              forEachPar((fin) => core.exit(update(fin)(exit))),
              core.flatMap((results) =>
                pipe(
                  core.exitCollectAllPar(results),
                  Option.map(core.exitAsUnit),
                  Option.getOrElse(() => core.exitUnit())
                )
              )
            ) :
            pipe(
              finalizers,
              forEachPar((fin) => core.exit(update(fin)(exit))),
              core.flatMap((results) =>
                pipe(
                  core.exitCollectAllPar(results),
                  Option.map(core.exitAsUnit),
                  Option.getOrElse(() => core.exitUnit())
                )
              ),
              core.withParallelism(strategy.parallelism)
            )
        }
      }
    }).traced(trace)
  }
}

// circular with Scope

/** @internal */
export const scopeTag = Context.Tag<Scope.Scope>()

/** @internal */
export const scopeMake: (
  executionStrategy?: ExecutionStrategy.ExecutionStrategy
) => Effect.Effect<never, never, Scope.Scope.Closeable> = (strategy = ExecutionStrategy.sequential) =>
  pipe(
    core.releaseMapMake(),
    core.map((rm): Scope.Scope.Closeable => ({
      [core.ScopeTypeId]: core.ScopeTypeId,
      [core.CloseableScopeTypeId]: core.CloseableScopeTypeId,
      fork: (strategy) => {
        const trace = getCallTrace()
        return core.uninterruptible(
          pipe(
            scopeMake(strategy),
            core.flatMap((scope) =>
              pipe(
                rm,
                core.releaseMapAdd((exit) => pipe(scope, core.scopeClose(exit))),
                core.tap((fin) => pipe(scope, core.scopeAddFinalizerExit(fin))),
                core.as(scope)
              )
            )
          )
        ).traced(trace)
      },
      close: (exit) => {
        const trace = getCallTrace()
        return core.asUnit(releaseMapReleaseAll(strategy, exit)(rm)).traced(trace)
      },
      addFinalizer: (fin) => {
        const trace = getCallTrace()
        return core.asUnit(core.releaseMapAdd(fin)(rm)).traced(trace)
      }
    }))
  )

/** @internal */
export const scopeExtend = <R, E, A>(effect: Effect.Effect<R, E, A>) => {
  const trace = getCallTrace()
  return (self: Scope.Scope): Effect.Effect<Exclude<R, Scope.Scope>, E, A> => {
    return pipe(
      effect,
      core.provideSomeEnvironment<Exclude<R, Scope.Scope>, R>(
        // @ts-expect-error
        Context.merge(pipe(
          Context.empty(),
          Context.add(scopeTag)(self)
        ))
      )
    ).traced(trace)
  }
}

/** @internal */
export const scopeUse = <R, E, A>(effect: Effect.Effect<R, E, A>) => {
  const trace = getCallTrace()
  return (self: Scope.Scope.Closeable): Effect.Effect<Exclude<R, Scope.Scope>, E, A> => {
    return pipe(
      self,
      scopeExtend(effect),
      core.onExit((exit) => self.close(exit))
    ).traced(trace)
  }
}

// circular with Supervisor

/** @internal */
export const fiberRefUnsafeMakeSupervisor = (
  initial: Supervisor.Supervisor<any>
): FiberRef.FiberRef<Supervisor.Supervisor<any>> => {
  return core.fiberRefUnsafeMakePatch(
    initial,
    SupervisorPatch.differ,
    SupervisorPatch.empty
  )
}

// circular with FiberRef

/** @internal */
export const fiberRefLocallyScoped = <A>(value: A) => {
  const trace = getCallTrace()
  return (self: FiberRef.FiberRef<A>): Effect.Effect<Scope.Scope, never, void> => {
    return pipe(
      acquireRelease(
        pipe(
          core.fiberRefGet(self),
          core.flatMap((oldValue) => pipe(self, core.fiberRefSet(value), core.as(oldValue)))
        ),
        (oldValue) => pipe(self, core.fiberRefSet(oldValue))
      ),
      core.asUnit
    ).traced(trace)
  }
}

/** @internal */
export const fiberRefLocallyScopedWith = <A>(f: (a: A) => A) => {
  const trace = getCallTrace()
  return (self: FiberRef.FiberRef<A>): Effect.Effect<Scope.Scope, never, void> => {
    return pipe(self, core.fiberRefGetWith((a) => pipe(self, fiberRefLocallyScoped(f(a))))).traced(trace)
  }
}

/** @internal */
export const fiberRefMake = <A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (left: A, right: A) => A = (_, a) => a
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<A>> => {
  const trace = getCallTrace()
  return fiberRefMakeWith(() => core.fiberRefUnsafeMake(initial, fork, join)).traced(trace)
}

/** @internal */
export const fiberRefMakeWith = <Value>(
  ref: () => FiberRef.FiberRef<Value>
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<Value>> => {
  const trace = getCallTrace()
  return acquireRelease(
    pipe(core.sync(ref), core.tap(core.fiberRefUpdate(identity))),
    (fiberRef) => core.fiberRefDelete(fiberRef)
  ).traced(trace)
}

/** @internal */
export const fiberRefMakeEnvironment = <A>(
  initial: Context.Context<A>
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<Context.Context<A>>> => {
  const trace = getCallTrace()
  return fiberRefMakeWith(() => core.fiberRefUnsafeMakeEnvironment(initial)).traced(trace)
}

export const fiberRefMakeRuntimeFlags = (
  initial: RuntimeFlags.RuntimeFlags
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<RuntimeFlags.RuntimeFlags>> => {
  const trace = getCallTrace()
  return fiberRefMakeWith(() => core.fiberRefUnsafeMakeRuntimeFlags(initial)).traced(trace)
}

/** @internal */
export const currentRuntimeFlags: FiberRef.FiberRef<RuntimeFlags.RuntimeFlags> = core.fiberRefUnsafeMakeRuntimeFlags(
  _runtimeFlags.none
)

/** @internal */
export const currentSupervisor: FiberRef.FiberRef<Supervisor.Supervisor<any>> = fiberRefUnsafeMakeSupervisor(
  supervisor.none
)

// circular with Fiber

/** @internal */
export const fiberAwaitAll = (
  fibers: Iterable<Fiber.Fiber<any, any>>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return pipe(internalFiber._await(fiberCollectAll(fibers)), core.asUnit).traced(trace)
}

/** @internal */
export function fiberCollectAll<E, A>(fibers: Iterable<Fiber.Fiber<E, A>>): Fiber.Fiber<E, Chunk.Chunk<A>> {
  return {
    [internalFiber.FiberTypeId]: internalFiber.fiberVariance,
    id: () => Array.from(fibers).reduce((id, fiber) => pipe(id, FiberId.combine(fiber.id())), FiberId.none),
    await: () => {
      const trace = getCallTrace()
      return pipe(fibers, forEachPar((fiber) => core.flatten(fiber.await())), core.exit).traced(trace)
    },
    children: () => {
      const trace = getCallTrace()
      return pipe(fibers, forEachPar((fiber) => fiber.children()), core.map(Chunk.flatten)).traced(trace)
    },
    inheritAll: () => {
      const trace = getCallTrace()
      return pipe(fibers, core.forEachDiscard((fiber) => fiber.inheritAll())).traced(trace)
    },
    poll: () => {
      const trace = getCallTrace()
      return pipe(
        fibers,
        core.forEach((fiber) => fiber.poll()),
        core.map(
          Chunk.reduceRight(
            Option.some<Exit.Exit<E, Chunk.Chunk<A>>>(core.exitSucceed(Chunk.empty)),
            (optionB, optionA) => {
              switch (optionA._tag) {
                case "None": {
                  return Option.none
                }
                case "Some": {
                  switch (optionB._tag) {
                    case "None": {
                      return Option.none
                    }
                    case "Some": {
                      return Option.some(
                        pipe(
                          optionA.value,
                          core.exitZipWith(
                            optionB.value,
                            (a, chunk) => pipe(chunk, Chunk.prepend(a)),
                            Cause.parallel
                          )
                        )
                      )
                    }
                  }
                }
              }
            }
          )
        )
      ).traced(trace)
    },
    interruptWithFork: (fiberId) => {
      const trace = getCallTrace()
      return pipe(
        fibers,
        core.forEachDiscard((fiber) => fiber.interruptWithFork(fiberId))
      ).traced(trace)
    }
  }
}

/** @internal */
export const fiberInterruptFork = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return pipe(core.interruptFiber(self), forkDaemon, core.asUnit).traced(trace)
}

/** @internal */
export const fiberJoinAll = <E, A>(fibers: Iterable<Fiber.Fiber<E, A>>): Effect.Effect<never, E, void> => {
  const trace = getCallTrace()
  return pipe(fiberCollectAll(fibers), internalFiber.join, core.asUnit).traced(trace)
}

/** @internal */
export const fiberScoped = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<Scope.Scope, never, Fiber.Fiber<E, A>> => {
  const trace = getCallTrace()
  return acquireRelease(core.succeed(self), core.interruptFiber).traced(trace)
}
