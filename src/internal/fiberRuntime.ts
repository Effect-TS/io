import * as Boolean from "@effect/data/Boolean"
import * as Chunk from "@effect/data/Chunk"
import * as Context from "@effect/data/Context"
import type * as Either from "@effect/data/Either"
import type { LazyArg } from "@effect/data/Function"
import { dual, identity, pipe } from "@effect/data/Function"
import * as HashSet from "@effect/data/HashSet"
import * as List from "@effect/data/List"
import * as MRef from "@effect/data/MutableRef"
import * as Option from "@effect/data/Option"
import { pipeArguments } from "@effect/data/Pipeable"
import * as Predicate from "@effect/data/Predicate"
import * as RA from "@effect/data/ReadonlyArray"
import type * as Cause from "@effect/io/Cause"
import type * as Clock from "@effect/io/Clock"
import type { Concurrency } from "@effect/io/Concurrency"
import type { ConfigProvider } from "@effect/io/Config/Provider"
import * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import type * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import type * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as RuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"
import * as FiberStatus from "@effect/io/Fiber/Status"
import type * as FiberRef from "@effect/io/FiberRef"
import type * as FiberRefs from "@effect/io/FiberRefs"
import * as FiberRefsPatch from "@effect/io/FiberRefs/Patch"
import * as _RequestBlock from "@effect/io/internal/blockedRequests"
import * as internalCause from "@effect/io/internal/cause"
import * as causePretty from "@effect/io/internal/cause-pretty"
import * as clock from "@effect/io/internal/clock"
import { currentRequestMap } from "@effect/io/internal/completedRequestMap"
import * as concurrency from "@effect/io/internal/concurrency"
import { configProviderTag } from "@effect/io/internal/configProvider"
import * as core from "@effect/io/internal/core"
import * as defaultServices from "@effect/io/internal/defaultServices"
import * as internalEffect from "@effect/io/internal/effect"
import * as executionStrategy from "@effect/io/internal/executionStrategy"
import * as internalFiber from "@effect/io/internal/fiber"
import * as FiberMessage from "@effect/io/internal/fiberMessage"
import * as fiberRefs from "@effect/io/internal/fiberRefs"
import * as fiberScope from "@effect/io/internal/fiberScope"
import * as internalLogger from "@effect/io/internal/logger"
import * as metric from "@effect/io/internal/metric"
import * as metricBoundaries from "@effect/io/internal/metric/boundaries"
import * as metricLabel from "@effect/io/internal/metric/label"
import * as OpCodes from "@effect/io/internal/opCodes/effect"
import { complete } from "@effect/io/internal/request"
import * as _runtimeFlags from "@effect/io/internal/runtimeFlags"
import { OpSupervision } from "@effect/io/internal/runtimeFlags"
import * as supervisor from "@effect/io/internal/supervisor"
import * as SupervisorPatch from "@effect/io/internal/supervisor/patch"
import * as tracer from "@effect/io/internal/tracer"
import type { Logger } from "@effect/io/Logger"
import * as LogLevel from "@effect/io/Logger/Level"
import type * as MetricLabel from "@effect/io/Metric/Label"
import * as Ref from "@effect/io/Ref"
import type { Entry, Request } from "@effect/io/Request"
import type * as RequestBlock from "@effect/io/RequestBlock"
import type * as Scope from "@effect/io/Scope"
import type * as Supervisor from "@effect/io/Supervisor"
import type * as Tracer from "@effect/io/Tracer"

/** @internal */
export const fiberStarted = metric.counter("effect_fiber_started")
/** @internal */
export const fiberActive = metric.counter("effect_fiber_active")
/** @internal */
export const fiberSuccesses = metric.counter("effect_fiber_successes")
/** @internal */
export const fiberFailures = metric.counter("effect_fiber_failures")
/** @internal */
export const fiberLifetimes = metric.histogram(
  "effect_fiber_lifetimes",
  metricBoundaries.exponential({
    start: 1.0,
    factor: 2.0,
    count: 100
  })
)

/** @internal */
type EvaluationSignal =
  | EvaluationSignalContinue
  | EvaluationSignalDone
  | EvaluationSignalYieldNow

/** @internal */
const EvaluationSignalContinue = "Continue" as const

/** @internal */
type EvaluationSignalContinue = typeof EvaluationSignalContinue

/** @internal */
const EvaluationSignalDone = "Done" as const

/** @internal */
type EvaluationSignalDone = typeof EvaluationSignalDone

/** @internal */
const EvaluationSignalYieldNow = "Yield" as const

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

const contOpSuccess = {
  [OpCodes.OP_ON_SUCCESS]: (
    _: FiberRuntime<any, any>,
    cont: core.OnSuccess,
    value: unknown
  ) => {
    return cont.i1(value)
  },
  ["OnStep"]: (
    _: FiberRuntime<any, any>,
    cont: core.OnStep,
    value: unknown
  ) => {
    return cont.i1(core.exitSucceed(value))
  },
  [OpCodes.OP_ON_SUCCESS_AND_FAILURE]: (
    _: FiberRuntime<any, any>,
    cont: core.OnSuccessAndFailure,
    value: unknown
  ) => {
    return cont.i2(value)
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
      return core.exitSucceed(value)
    }
  },
  [OpCodes.OP_WHILE]: (
    self: FiberRuntime<any, any>,
    cont: core.While,
    value: unknown
  ) => {
    cont.i2(value)
    if (cont.i0()) {
      self.pushStack(cont)
      return cont.i1()
    } else {
      return core.unit
    }
  }
}

const drainQueueWhileRunningTable = {
  [FiberMessage.OP_INTERRUPT_SIGNAL]: (
    self: FiberRuntime<any, any>,
    runtimeFlags: RuntimeFlags.RuntimeFlags,
    cur: Effect.Effect<any, any, any>,
    message: FiberMessage.FiberMessage & { _tag: FiberMessage.OP_INTERRUPT_SIGNAL }
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
    message: FiberMessage.FiberMessage & { _tag: FiberMessage.OP_STATEFUL }
  ) => {
    message.onFiber(self, FiberStatus.running(runtimeFlags))
    return cur
  },
  [FiberMessage.OP_YIELD_NOW]: (
    _self: FiberRuntime<any, any>,
    _runtimeFlags: RuntimeFlags.RuntimeFlags,
    cur: Effect.Effect<any, any, any>,
    _message: FiberMessage.FiberMessage & { _tag: FiberMessage.OP_YIELD_NOW }
  ) => {
    return core.flatMap(core.yieldNow(), () => cur)
  }
}

/**
 * Executes all requests, submitting requests to each data source in parallel.
 */
const runBlockedRequests = <R>(self: RequestBlock.RequestBlock<R>) =>
  core.forEachSequentialDiscard(
    _RequestBlock.flatten(self),
    (requestsByRequestResolver) =>
      forEachParUnboundedDiscard(
        _RequestBlock.sequentialCollectionToChunk(requestsByRequestResolver),
        ([dataSource, sequential]) => {
          const map = new Map<Request<any, any>, Entry<any>>()
          for (const block of sequential) {
            for (const entry of block) {
              map.set(entry.request as Request<any, any>, entry)
            }
          }
          return core.fiberRefLocally(
            invokeWithInterrupt(dataSource.runAll(sequential), sequential.flat()),
            currentRequestMap,
            map
          )
        },
        false
      )
  )

/** @internal */
export class FiberRuntime<E, A> implements Fiber.RuntimeFiber<E, A> {
  readonly [internalFiber.FiberTypeId] = internalFiber.fiberVariance

  readonly [internalFiber.RuntimeFiberTypeId] = runtimeFiberVariance

  pipe() {
    return pipeArguments(this, arguments)
  }

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
    this._supervisor = this.getFiberRef(currentSupervisor)
    if (_runtimeFlags.runtimeMetrics(runtimeFlags0)) {
      const tags = this.getFiberRef(core.currentMetricLabels)
      fiberStarted.unsafeUpdate(1, tags)
      fiberActive.unsafeUpdate(1, tags)
    }
  }
  private _queue = new Array<FiberMessage.FiberMessage>()
  private _children: Set<FiberRuntime<any, any>> | null = null
  private _observers = new Array<(exit: Exit.Exit<E, A>) => void>()
  private _running = false
  private _stack: Array<core.Continuation> = []
  private _asyncInterruptor: ((effect: Effect.Effect<any, any, any>) => any) | null = null
  private _asyncBlockingOn: FiberId.FiberId | null = null
  private _exitValue: Exit.Exit<E, A> | null = null
  private _steps: Array<boolean> = [false]
  public _supervisor: Supervisor.Supervisor<any>

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
  resume<E, A>(effect: Effect.Effect<any, E, A>): void {
    this.tell(FiberMessage.resume(effect))
  }

  /**
   * The status of the fiber.
   */
  status(): Effect.Effect<never, never, FiberStatus.FiberStatus> {
    return this.ask((_, status) => status)
  }

  /**
   * Gets the fiber runtime flags.
   */
  runtimeFlags(): Effect.Effect<never, never, RuntimeFlags.RuntimeFlags> {
    return this.ask((state, status) => {
      if (FiberStatus.isDone(status)) {
        return state._runtimeFlags
      }
      return status.runtimeFlags
    })
  }

  /**
   * Returns the current `FiberScope` for the fiber.
   */
  scope(): fiberScope.FiberScope {
    return fiberScope.unsafeMake(this)
  }

  /**
   * Retrieves the immediate children of the fiber.
   */
  children(): Effect.Effect<never, never, Array<Fiber.RuntimeFiber<any, any>>> {
    return this.ask((fiber) => Array.from(fiber.getChildren()))
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
   * Retrieves the interrupted cause of the fiber, which will be `Cause.empty`
   * if the fiber has not been interrupted.
   *
   * **NOTE**: This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  getInterruptedCause() {
    return this.getFiberRef(core.currentInterruptedCause)
  }

  /**
   * Retrieves the whole set of fiber refs.
   */
  fiberRefs(): Effect.Effect<never, never, FiberRefs.FiberRefs> {
    return this.ask((fiber) => fiber.unsafeGetFiberRefs())
  }

  /**
   * Returns an effect that will contain information computed from the fiber
   * state and status while running on the fiber.
   *
   * This allows the outside world to interact safely with mutable fiber state
   * without locks or immutable data.
   */
  ask<Z>(
    f: (runtime: FiberRuntime<any, any>, status: FiberStatus.FiberStatus) => Z
  ): Effect.Effect<never, never, Z> {
    return core.suspend(() => {
      const deferred = core.deferredUnsafeMake<never, Z>(this._fiberId)
      this.tell(
        FiberMessage.stateful((fiber, status) => {
          core.deferredUnsafeDone(deferred, core.sync(() => f(fiber, status)))
        })
      )
      return core.deferredAwait(deferred)
    })
  }

  /**
   * Adds a message to be processed by the fiber on the fiber.
   */
  tell(message: FiberMessage.FiberMessage): void {
    this._queue.push(message)
    if (!this._running) {
      this._running = true
      this.drainQueueLaterOnExecutor()
    }
  }

  await(): Effect.Effect<never, never, Exit.Exit<E, A>> {
    return core.async<never, never, Exit.Exit<E, A>>((resume) => {
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
      return core.sync(() =>
        this.tell(
          FiberMessage.stateful((fiber, _) => {
            fiber.unsafeRemoveObserver(cb)
          })
        )
      )
    }, this.id())
  }

  inheritAll(): Effect.Effect<never, never, void> {
    return core.withFiberRuntime<never, never, void>((parentFiber, parentStatus) => {
      const parentFiberId = parentFiber.id()
      const parentFiberRefs = parentFiber.unsafeGetFiberRefs()
      const parentRuntimeFlags = parentStatus.runtimeFlags
      const childFiberRefs = this.unsafeGetFiberRefs()
      const updatedFiberRefs = fiberRefs.joinAs(parentFiberRefs, parentFiberId, childFiberRefs)

      parentFiber.setFiberRefs(updatedFiberRefs)

      const updatedRuntimeFlags = parentFiber.getFiberRef(currentRuntimeFlags)

      const patch = pipe(
        _runtimeFlags.diff(parentRuntimeFlags, updatedRuntimeFlags),
        // Do not inherit WindDown or Interruption!
        RuntimeFlagsPatch.exclude(_runtimeFlags.Interruption),
        RuntimeFlagsPatch.exclude(_runtimeFlags.WindDown)
      )

      return core.updateRuntimeFlags(patch)
    })
  }

  /**
   * Tentatively observes the fiber, but returns immediately if it is not
   * already done.
   */
  poll(): Effect.Effect<never, never, Option.Option<Exit.Exit<E, A>>> {
    return core.sync(() => Option.fromNullable(this._exitValue))
  }

  /**
   * Unsafely observes the fiber, but returns immediately if it is not
   * already done.
   */
  unsafePoll(): Exit.Exit<E, A> | null {
    return this._exitValue
  }

  /**
   * In the background, interrupts the fiber as if interrupted from the specified fiber.
   */
  interruptAsFork(fiberId: FiberId.FiberId): Effect.Effect<never, never, void> {
    return core.sync(() => this.tell(FiberMessage.interruptSignal(internalCause.interrupt(fiberId))))
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
      this._observers.push(observer)
    }
  }

  /**
   * Removes the specified observer from the list of observers that will be
   * notified when the fiber exits.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  unsafeRemoveObserver(observer: (exit: Exit.Exit<E, A>) => void): void {
    this._observers = this._observers.filter((o) => o !== observer)
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
    this._fiberRefs = fiberRefs.delete_(this._fiberRefs, fiberRef)
  }

  /**
   * Retrieves the state of the fiber ref, or else its initial value.
   *
   * **NOTE**: This method is safe to invoke on any fiber, but if not invoked
   * on this fiber, then values derived from the fiber's state (including the
   * log annotations and log level) may not be up-to-date.
   */
  getFiberRef<X>(fiberRef: FiberRef.FiberRef<X>): X {
    if (this._fiberRefs.locals.has(fiberRef)) {
      return this._fiberRefs.locals.get(fiberRef)![0][1] as X
    }
    return fiberRef.initial
  }

  /**
   * Sets the fiber ref to the specified value.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  setFiberRef<X>(fiberRef: FiberRef.FiberRef<X>, value: X): void {
    this._fiberRefs = fiberRefs.updatedAs(this._fiberRefs, {
      fiberId: this._fiberId,
      fiberRef,
      value
    })
    // @ts-expect-error
    if (fiberRef === currentSupervisor) {
      // @ts-expect-error
      this._supervisor = value
    }
  }

  /**
   * Wholesale replaces all fiber refs of this fiber.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  setFiberRefs(fiberRefs: FiberRefs.FiberRefs): void {
    this._fiberRefs = fiberRefs
    this._supervisor = this.getFiberRef(currentSupervisor)
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
      const prev = (globalThis as any)[internalFiber.currentFiberURI]
      ;(globalThis as any)[internalFiber.currentFiberURI] = this
      try {
        while (evaluationSignal === EvaluationSignalContinue) {
          evaluationSignal = this._queue.length === 0 ?
            EvaluationSignalDone :
            this.evaluateMessageWhileSuspended(this._queue.splice(0, 1)[0]!)
        }
      } finally {
        this._running = false
        ;(globalThis as any)[internalFiber.currentFiberURI] = prev
      }
      // Maybe someone added something to the queue between us checking, and us
      // giving up the drain. If so, we need to restart the draining, but only
      // if we beat everyone else to the restart:
      if (this._queue.length > 0 && !this._running) {
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
    this.getFiberRef(core.currentScheduler).scheduleTask(
      this.run,
      this.getFiberRef(core.currentSchedulingPriority)
    )
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
    while (this._queue.length > 0) {
      const message = this._queue.splice(0, 1)[0]
      // @ts-expect-error
      cur = drainQueueWhileRunningTable[message._tag](this, runtimeFlags, cur, message)
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
    return !internalCause.isEmpty(this.getFiberRef(core.currentInterruptedCause))
  }

  /**
   * Adds an interruptor to the set of interruptors that are interrupting this
   * fiber.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  addInterruptedCause(cause: Cause.Cause<never>) {
    const oldSC = this.getFiberRef(core.currentInterruptedCause)
    this.setFiberRef(core.currentInterruptedCause, internalCause.sequential(oldSC, cause))
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
      child.tell(FiberMessage.interruptSignal(internalCause.interrupt(this.id())))
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
      return core.whileLoop({
        while: () => !isDone,
        body,
        step: () => {
          //
        }
      })
    }
    return null
  }

  reportExitValue(exit: Exit.Exit<E, A>) {
    if (_runtimeFlags.runtimeMetrics(this._runtimeFlags)) {
      const tags = this.getFiberRef(core.currentMetricLabels)
      fiberActive.unsafeUpdate(-1, tags)
      switch (exit._tag) {
        case OpCodes.OP_SUCCESS: {
          fiberSuccesses.unsafeUpdate(1, tags)
          break
        }
        case OpCodes.OP_FAILURE: {
          fiberFailures.unsafeUpdate(1, tags)
          break
        }
      }
    }
    if (exit._tag === "Failure") {
      const level = this.getFiberRef(core.currentUnhandledErrorLogLevel)
      if (!internalCause.isInterruptedOnly(exit.cause) && level._tag === "Some") {
        this.log("Fiber terminated with a non handled error", exit.cause, level)
      }
    }
  }

  setExitValue(exit: Exit.Exit<E, A>) {
    this._exitValue = exit

    if (_runtimeFlags.runtimeMetrics(this._runtimeFlags)) {
      const tags = this.getFiberRef(core.currentMetricLabels)
      const startTimeMillis = this.id().startTimeMillis
      const endTimeMillis = new Date().getTime()
      fiberLifetimes.unsafeUpdate((endTimeMillis - startTimeMillis) / 1000.0, tags)
    }

    this.reportExitValue(exit)

    for (let i = this._observers.length - 1; i >= 0; i--) {
      this._observers[i](exit)
    }
  }

  getLoggers() {
    return this.getFiberRef(currentLoggers)
  }

  log(
    message: unknown,
    cause: Cause.Cause<any>,
    overrideLogLevel: Option.Option<LogLevel.LogLevel>
  ): void {
    const logLevel = Option.isSome(overrideLogLevel) ?
      overrideLogLevel.value :
      this.getFiberRef(core.currentLogLevel)
    const minimumLogLevel = this.getFiberRef(currentMinimumLogLevel)
    if (LogLevel.greaterThan(minimumLogLevel, logLevel)) {
      return
    }
    const spans = this.getFiberRef(core.currentLogSpan)
    const annotations = this.getFiberRef(core.currentLogAnnotations)
    const loggers = this.getLoggers()
    const contextMap = this.unsafeGetFiberRefs()
    if (HashSet.size(loggers) > 0) {
      const clockService = Context.get(this.getFiberRef(defaultServices.currentServices), clock.clockTag)
      const date = new Date(clockService.unsafeCurrentTimeMillis())
      for (const logger of loggers) {
        logger.log({
          fiberId: this.id(),
          logLevel,
          message,
          cause,
          context: contextMap,
          spans,
          annotations,
          date
        })
      }
    }
  }

  /**
   * Evaluates a single message on the current thread, while the fiber is
   * suspended. This method should only be called while evaluation of the
   * fiber's effect is suspended due to an asynchronous operation.
   *
   * **NOTE**: This method must be invoked by the fiber itself.
   */
  evaluateMessageWhileSuspended(message: FiberMessage.FiberMessage): EvaluationSignal {
    switch (message._tag) {
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
    this._supervisor.onResume(this)
    try {
      let effect: Effect.Effect<any, any, any> | null =
        _runtimeFlags.interruptible(this._runtimeFlags) && this.isInterrupted() ?
          core.exitFailCause(this.getInterruptedCause()) :
          effect0
      while (effect !== null) {
        try {
          const eff: Effect.Effect<any, any, any> = effect
          const exit = this.runLoop(eff)
          this._runtimeFlags = pipe(this._runtimeFlags, _runtimeFlags.enable(_runtimeFlags.WindDown))
          const interruption = this.interruptAllChildren()
          if (interruption !== null) {
            effect = core.flatMap(interruption, () => exit)
          } else {
            if (this._queue.length === 0) {
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
            if ((e as core.Primitive)._tag === OpCodes.OP_YIELD) {
              if (_runtimeFlags.cooperativeYielding(this._runtimeFlags)) {
                this.tell(FiberMessage.yieldNow())
                this.tell(FiberMessage.resume(core.exitUnit))
                effect = null
              } else {
                effect = core.exitUnit
              }
            } else if ((e as core.Primitive)._tag === OpCodes.OP_ASYNC) {
              // Terminate this evaluation, async resumption will continue evaluation:
              effect = null
            }
          } else {
            throw e
          }
        }
      }
    } finally {
      this._supervisor.onSuspend(this)
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
      const prev = (globalThis as any)[internalFiber.currentFiberURI]
      ;(globalThis as any)[internalFiber.currentFiberURI] = this
      try {
        this.evaluateEffect(effect)
      } finally {
        this._running = false
        ;(globalThis as any)[internalFiber.currentFiberURI] = prev
        // Because we're special casing `start`, we have to be responsible
        // for spinning up the fiber if there were new messages added to
        // the queue between the completion of the effect and the transition
        // to the not running state.
        if (this._queue.length > 0) {
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
    const newRuntimeFlags = _runtimeFlags.patch(oldRuntimeFlags, patch)
    ;(globalThis as any)[internalFiber.currentFiberURI] = this
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
      callback(core.failCause(internalCause.die(e)))
    }
  }

  pushStack(cont: core.Continuation) {
    this._stack.push(cont)
    if (cont._tag === "OnStep") {
      this._steps.push(true)
    }
    if (cont._tag === "RevertFlags") {
      this._steps.push(false)
    }
  }

  popStack() {
    const item = this._stack.pop()
    if (item) {
      if (item._tag === "OnStep" || item._tag === "RevertFlags") {
        this._steps.pop()
      }
      return item
    }
    return
  }

  getNextSuccessCont() {
    let frame = this.popStack()
    while (frame) {
      if (frame._tag !== OpCodes.OP_ON_FAILURE) {
        return frame
      }
      frame = this.popStack()
    }
  }

  getNextFailCont() {
    let frame = this.popStack()
    while (frame) {
      if (frame._tag !== OpCodes.OP_ON_SUCCESS && frame._tag !== OpCodes.OP_WHILE) {
        return frame
      }
      frame = this.popStack()
    }
  }

  [OpCodes.OP_TAG](op: core.Primitive & { _tag: OpCodes.OP_SYNC }) {
    return core.map(
      core.fiberRefGet(core.currentContext),
      (context) => {
        try {
          return Context.unsafeGet(context, op as unknown as Context.Tag<any, any>)
        } catch (e) {
          console.log(e)
          throw e
        }
      }
    )
  }

  ["Left"](op: core.Primitive & { _tag: "Left" }) {
    return core.exitFail((op as any).i0)
  }

  ["None"](_: core.Primitive & { _tag: "None" }) {
    return core.exitFail(internalCause.NoSuchElementException())
  }

  ["Right"](op: core.Primitive & { _tag: "Right" }) {
    return core.exitSucceed((op as any).i0)
  }

  ["Some"](op: core.Primitive & { _tag: "Some" }) {
    return core.exitSucceed((op as any).i0)
  }

  [OpCodes.OP_SYNC](op: core.Primitive & { _tag: OpCodes.OP_SYNC }) {
    const value = op.i0()
    const cont = this.getNextSuccessCont()
    if (cont !== undefined) {
      if (!(cont._tag in contOpSuccess)) {
        // @ts-expect-error
        absurd(cont)
      }
      // @ts-expect-error
      return contOpSuccess[cont._tag](this, cont, value)
    } else {
      throw core.exitSucceed(value)
    }
  }

  [OpCodes.OP_SUCCESS](op: core.Primitive & { _tag: OpCodes.OP_SUCCESS }) {
    const oldCur = op
    const cont = this.getNextSuccessCont()
    if (cont !== undefined) {
      if (!(cont._tag in contOpSuccess)) {
        // @ts-expect-error
        absurd(cont)
      }
      // @ts-expect-error
      return contOpSuccess[cont._tag](this, cont, oldCur.i0)
    } else {
      throw oldCur
    }
  }

  [OpCodes.OP_FAILURE](op: core.Primitive & { _tag: OpCodes.OP_FAILURE }) {
    const span = this.getFiberRef(core.currentTracerSpan)
    const cause = List.isNil(span) || span.head._tag === "ExternalSpan" ?
      op.i0 :
      internalCause.annotated(op.i0, internalCause.makeSpanAnnotation(span.head))
    const cont = this.getNextFailCont()
    if (cont !== undefined) {
      switch (cont._tag) {
        case OpCodes.OP_ON_FAILURE:
        case OpCodes.OP_ON_SUCCESS_AND_FAILURE: {
          if (!(_runtimeFlags.interruptible(this._runtimeFlags) && this.isInterrupted())) {
            return cont.i1(cause)
          } else {
            return core.exitFailCause(internalCause.stripFailures(cause))
          }
        }
        case "OnStep": {
          if (!(_runtimeFlags.interruptible(this._runtimeFlags) && this.isInterrupted())) {
            return cont.i1(core.exitFailCause(cause))
          } else {
            return core.exitFailCause(internalCause.stripFailures(cause))
          }
        }
        case OpCodes.OP_REVERT_FLAGS: {
          this.patchRuntimeFlags(this._runtimeFlags, cont.patch)
          if (_runtimeFlags.interruptible(this._runtimeFlags) && this.isInterrupted()) {
            return core.exitFailCause(internalCause.sequential(cause, this.getInterruptedCause()))
          } else {
            return core.exitFailCause(cause)
          }
        }
        default: {
          absurd(cont)
        }
      }
    } else {
      throw core.exitFailCause(cause)
    }
  }

  [OpCodes.OP_WITH_RUNTIME](op: core.Primitive & { _tag: OpCodes.OP_WITH_RUNTIME }) {
    return op.i0(
      this as FiberRuntime<unknown, unknown>,
      FiberStatus.running(this._runtimeFlags) as FiberStatus.Running
    )
  }

  ["Blocked"](op: core.Primitive & { _tag: "Blocked" }) {
    if (this._steps[this._steps.length - 1]) {
      const nextOp = this.popStack()
      if (nextOp) {
        switch (nextOp._tag) {
          case "OnStep": {
            return nextOp.i1(op)
          }
          case "OnSuccess": {
            return core.blocked(op.i0, core.flatMap(op.i1, nextOp.i1))
          }
          case "OnSuccessAndFailure": {
            return core.blocked(
              op.i0,
              core.matchCauseEffect(op.i1, {
                onFailure: nextOp.i1,
                onSuccess: nextOp.i2
              })
            )
          }
          case "OnFailure": {
            return core.blocked(op.i0, core.catchAllCause(op.i1, nextOp.i1))
          }
          case "While": {
            return core.blocked(
              op.i0,
              core.flatMap(op.i1, (a) => {
                nextOp.i2(a)
                if (nextOp.i0()) {
                  return core.whileLoop({
                    while: nextOp.i0,
                    body: nextOp.i1,
                    step: nextOp.i2
                  })
                }
                return core.unit
              })
            )
          }
          case "RevertFlags": {
            this.pushStack(nextOp)
            break
          }
        }
      }
    }
    return core.uninterruptibleMask((restore) =>
      core.flatMap(
        fork(core.runRequestBlock(op.i0)),
        () => restore(op.i1)
      )
    )
  }

  ["RunBlocked"](op: core.Primitive & { _tag: "RunBlocked" }) {
    return runBlockedRequests(op.i0)
  }

  [OpCodes.OP_UPDATE_RUNTIME_FLAGS](op: core.Primitive & { _tag: OpCodes.OP_UPDATE_RUNTIME_FLAGS }) {
    const updateFlags = op.i0
    const oldRuntimeFlags = this._runtimeFlags
    const newRuntimeFlags = _runtimeFlags.patch(oldRuntimeFlags, updateFlags)
    // One more chance to short circuit: if we're immediately going
    // to interrupt. Interruption will cause immediate reversion of
    // the flag, so as long as we "peek ahead", there's no need to
    // set them to begin with.
    if (_runtimeFlags.interruptible(newRuntimeFlags) && this.isInterrupted()) {
      return core.exitFailCause(this.getInterruptedCause())
    } else {
      // Impossible to short circuit, so record the changes
      this.patchRuntimeFlags(this._runtimeFlags, updateFlags)
      if (op.i1) {
        // Since we updated the flags, we need to revert them
        const revertFlags = _runtimeFlags.diff(newRuntimeFlags, oldRuntimeFlags)
        this.pushStack(new core.RevertFlags(revertFlags, op))
        return op.i1(oldRuntimeFlags)
      } else {
        return core.exitUnit
      }
    }
  }

  [OpCodes.OP_ON_SUCCESS](op: core.Primitive & { _tag: OpCodes.OP_ON_SUCCESS }) {
    this.pushStack(op)
    return op.i0
  }

  ["OnStep"](op: core.Primitive & { _tag: "OnStep" }) {
    this.pushStack(op)
    return op.i0
  }

  [OpCodes.OP_ON_FAILURE](op: core.Primitive & { _tag: OpCodes.OP_ON_FAILURE }) {
    this.pushStack(op)
    return op.i0
  }

  [OpCodes.OP_ON_SUCCESS_AND_FAILURE](op: core.Primitive & { _tag: OpCodes.OP_ON_SUCCESS_AND_FAILURE }) {
    this.pushStack(op)
    return op.i0
  }

  [OpCodes.OP_ASYNC](op: core.Primitive & { _tag: OpCodes.OP_ASYNC }) {
    this._asyncBlockingOn = op.i1
    this.initiateAsync(this._runtimeFlags, op.i0)
    throw op
  }

  [OpCodes.OP_YIELD](op: core.Primitive & { op: OpCodes.OP_YIELD }) {
    throw op
  }

  [OpCodes.OP_WHILE](op: core.Primitive & { _tag: OpCodes.OP_WHILE }) {
    const check = op.i0
    const body = op.i1
    if (check()) {
      this.pushStack(op)
      return body()
    } else {
      return core.exitUnit
    }
  }

  [OpCodes.OP_COMMIT](op: core.Primitive & { _tag: OpCodes.OP_COMMIT }) {
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
      if ((this._runtimeFlags & OpSupervision) !== 0) {
        this._supervisor.onEffect(this, cur)
      }
      if (this._queue.length > 0) {
        cur = this.drainQueueWhileRunning(this._runtimeFlags, cur)
      }
      ops += 1
      if (ops >= this.getFiberRef(core.currentMaxFiberOps)) {
        ops = 0
        const oldCur = cur
        cur = core.flatMap(core.yieldNow(), () => oldCur)
      }
      try {
        if (!((cur as core.Primitive)._tag in this)) {
          if (typeof cur === "function") {
            console.log((cur as any)())
          }
          // @ts-expect-error
          absurd(cur)
        }
        // @ts-expect-error
        cur = this._supervisor.onRun(
          // @ts-expect-error
          () => this[(cur as core.Primitive)._tag](cur as core.Primitive),
          this
        )
      } catch (e) {
        if (core.isEffect(e)) {
          if (
            (e as core.Primitive)._tag === OpCodes.OP_YIELD ||
            (e as core.Primitive)._tag === OpCodes.OP_ASYNC
          ) {
            throw e
          }
          if (
            (e as core.Primitive)._tag === OpCodes.OP_SUCCESS ||
            (e as core.Primitive)._tag === OpCodes.OP_FAILURE
          ) {
            return e as Exit.Exit<E, A>
          }
        } else {
          if (core.isEffectError(e)) {
            cur = core.exitFailCause(e.cause)
          } else if (internalCause.isInterruptedException(e)) {
            cur = core.exitFailCause(
              internalCause.sequential(internalCause.die(e), internalCause.interrupt(FiberId.none))
            )
          } else {
            cur = core.exitFailCause(internalCause.die(e))
          }
        }
      }
    }
  }

  run = () => {
    this.drainQueueOnCurrentThread()
  }
}

// circular with Logger

/** @internal */
export const currentMinimumLogLevel: FiberRef.FiberRef<LogLevel.LogLevel> = core.fiberRefUnsafeMake<LogLevel.LogLevel>(
  LogLevel.fromLiteral("Info")
)

/** @internal */
export const defaultLogger: Logger<unknown, void> = internalLogger.makeLogger((options) => {
  const formatted = internalLogger.stringLogger.log(options)
  globalThis.console.log(formatted)
})

/** @internal */
export const filterMinimumLogLevel: Logger<unknown, void> = internalLogger.makeLogger((options) => {
  const formatted = internalLogger.stringLogger.log(options)
  globalThis.console.log(formatted)
})

/** @internal */
export const logFmtLogger: Logger<unknown, void> = internalLogger.makeLogger((options) => {
  const formatted = internalLogger.logfmtLogger.log(options)
  globalThis.console.log(formatted)
})

/** @internal */
export const tracerLogger = internalLogger.makeLogger<unknown, void>(({
  annotations,
  cause,
  context,
  fiberId,
  logLevel,
  message
}) => {
  const span = Option.flatMap(fiberRefs.get(context, core.currentTracerSpan), List.head)
  const clockService = Option.map(
    fiberRefs.get(context, defaultServices.currentServices),
    (_) => Context.get(_, clock.clockTag)
  )
  if (span._tag === "None" || span.value._tag === "ExternalSpan" || clockService._tag === "None") {
    return
  }

  const attributes = Object.fromEntries(annotations)
  attributes["effect.fiberId"] = FiberId.threadName(fiberId)
  attributes["effect.logLevel"] = logLevel.label

  if (cause !== null && cause !== internalCause.empty) {
    attributes["effect.cause"] = causePretty.pretty(cause)
  }

  span.value.event(
    String(message),
    clockService.value.unsafeCurrentTimeNanos(),
    attributes
  )
})

/** @internal */
export const currentLoggers: FiberRef.FiberRef<
  HashSet.HashSet<Logger<unknown, any>>
> = core.fiberRefUnsafeMakeHashSet(HashSet.make(defaultLogger, tracerLogger))

// circular with Effect

/* @internal */
export const acquireRelease: {
  <A, R2, X>(
    release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
  ): <R, E>(acquire: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R | Scope.Scope, E, A>
  <R, E, A, R2, X>(
    acquire: Effect.Effect<R, E, A>,
    release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
  ): Effect.Effect<Scope.Scope | R | R2, E, A>
} = dual<
  {
    <A, R2, X>(
      release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
    ): <R, E>(acquire: Effect.Effect<R, E, A>) => Effect.Effect<R | R2 | Scope.Scope, E, A>
  },
  {
    <R, E, A, R2, X>(
      acquire: Effect.Effect<R, E, A>,
      release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
    ): Effect.Effect<R | R2 | Scope.Scope, E, A>
  }
>((args) => core.isEffect(args[0]), (acquire, release) => {
  return core.uninterruptible(
    core.tap(acquire, (a) => addFinalizer((exit) => release(a, exit)))
  )
})

/* @internal */
export const acquireReleaseInterruptible: {
  <A, R2, X>(
    release: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
  ): <R, E>(acquire: Effect.Effect<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E, A>
  <R, E, A, R2, X>(
    acquire: Effect.Effect<R, E, A>,
    release: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
  ): Effect.Effect<Scope.Scope | R | R2, E, A>
} = dual<
  {
    <A, R2, X>(
      release: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
    ): <R, E>(acquire: Effect.Effect<R, E, A>) => Effect.Effect<R | R2 | Scope.Scope, E, A>
  },
  {
    <R, E, A, R2, X>(
      acquire: Effect.Effect<R, E, A>,
      release: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
    ): Effect.Effect<R | R2 | Scope.Scope, E, A>
  }
>((args) => core.isEffect(args[0]), (acquire, release) => {
  return ensuring(
    acquire,
    addFinalizer((exit) => release(exit))
  )
})

/* @internal */
export const addFinalizer = <R, X>(
  finalizer: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R, never, X>
): Effect.Effect<R | Scope.Scope, never, void> =>
  core.withFiberRuntime(
    (runtime) => {
      const acquireRefs = runtime.unsafeGetFiberRefs()
      return core.flatMap(scope, (scope) =>
        core.scopeAddFinalizerExit(scope, (exit) =>
          core.withFiberRuntime((runtimeFinalizer) => {
            const pre = runtimeFinalizer.unsafeGetFiberRefs()
            const patch = FiberRefsPatch.diff(pre, acquireRefs)
            const inverse = FiberRefsPatch.diff(acquireRefs, pre)
            runtimeFinalizer.setFiberRefs(FiberRefsPatch.patch(patch, runtimeFinalizer.id(), acquireRefs))
            return ensuring(
              finalizer(exit) as Effect.Effect<never, never, X>,
              core.sync(() => {
                runtimeFinalizer.setFiberRefs(
                  FiberRefsPatch.patch(inverse, runtimeFinalizer.id(), runtimeFinalizer.unsafeGetFiberRefs())
                )
              })
            )
          })))
    }
  )

/* @internal */
export const daemonChildren = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const forkScope = core.fiberRefLocally(core.currentForkScopeOverride, Option.some(fiberScope.globalScope))
  return forkScope(self)
}

/** @internal */
const _existsParFound = Symbol("@effect/io/Effect/existsPar/found")

/* @internal */
export const exists = dual<
  <R, E, A>(f: (a: A, i: number) => Effect.Effect<R, E, boolean>, options?: {
    readonly concurrency?: Concurrency
    readonly batching?: boolean | "inherit"
  }) => (elements: Iterable<A>) => Effect.Effect<R, E, boolean>,
  <R, E, A>(elements: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, boolean>, options?: {
    readonly concurrency: Concurrency
    readonly batching?: boolean | "inherit"
  }) => Effect.Effect<R, E, boolean>
>((args) => Predicate.isIterable(args[0]), (elements, f, options) =>
  concurrency.matchSimple(
    options,
    () => core.suspend(() => existsLoop(elements[Symbol.iterator](), 0, f)),
    () =>
      core.matchEffect(
        forEachOptions(
          elements,
          (a, i) => core.if_(f(a, i), { onTrue: core.fail(_existsParFound), onFalse: core.unit }),
          options
        ),
        {
          onFailure: (e) => e === _existsParFound ? core.succeed(true) : core.fail(e),
          onSuccess: () => core.succeed(false)
        }
      )
  ))

const existsLoop = <R, E, A>(
  iterator: Iterator<A>,
  index: number,
  f: (a: A, i: number) => Effect.Effect<R, E, boolean>
): Effect.Effect<R, E, boolean> => {
  const next = iterator.next()
  if (next.done) {
    return core.succeed(false)
  }
  return pipe(core.flatMap(
    f(next.value, index),
    (b) => b ? core.succeed(b) : existsLoop(iterator, index + 1, f)
  ))
}

/* @internal */
export const filter = dual<
  <A, R, E>(
    f: (a: A, i: number) => Effect.Effect<R, E, boolean>,
    options?: {
      readonly concurrency?: Concurrency
      readonly batching?: boolean | "inherit"
      readonly negate?: boolean
    }
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Array<A>>,
  <A, R, E>(elements: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, boolean>, options?: {
    readonly concurrency?: Concurrency
    readonly batching?: boolean | "inherit"
    readonly negate?: boolean
  }) => Effect.Effect<R, E, Array<A>>
>(
  (args) => Predicate.isIterable(args[0]),
  <A, R, E>(elements: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, boolean>, options?: {
    readonly concurrency?: Concurrency
    readonly batching?: boolean | "inherit"
    readonly negate?: boolean
  }) => {
    const predicate = options?.negate ? (a: A, i: number) => core.map(f(a, i), Boolean.not) : f
    return concurrency.matchSimple(
      options,
      () =>
        core.suspend(() =>
          RA.fromIterable(elements).reduceRight(
            (effect, a, i) =>
              core.zipWith(
                effect,
                core.suspend(() => predicate(a, i)),
                (list, b) => b ? [a, ...list] : list
              ),
            core.sync(() => new Array<A>()) as Effect.Effect<R, E, Array<A>>
          )
        ),
      () =>
        core.map(
          forEachOptions(
            elements,
            (a, i) => core.map(predicate(a, i), (b) => (b ? Option.some(a) : Option.none())),
            options
          ),
          RA.compact
        )
    )
  }
)

// === all

const allResolveInput = (
  input: Iterable<Effect.Effect<any, any, any>> | Record<string, Effect.Effect<any, any, any>>
): readonly [Iterable<Effect.Effect<any, any, any>>, Option.Option<(as: ReadonlyArray<any>) => any>] => {
  if (Array.isArray(input) || Predicate.isIterable(input)) {
    return [input, Option.none()]
  }
  const keys = Object.keys(input)
  const size = keys.length
  return [
    keys.map((k) => input[k]),
    Option.some((values: ReadonlyArray<any>) => {
      const res = {}
      for (let i = 0; i < size; i++) {
        ;(res as any)[keys[i]] = values[i]
      }
      return res
    })
  ]
}

const allValidate = ((
  effects: Iterable<Effect.Effect<any, any, any>>,
  reconcile: Option.Option<(as: ReadonlyArray<any>) => any>,
  options?: Effect.All.Options
) => {
  const eitherEffects: Array<Effect.Effect<unknown, never, Either.Either<unknown, unknown>>> = []
  for (const effect of effects) {
    eitherEffects.push(core.either(effect))
  }
  return core.flatMap(
    forEachOptions(eitherEffects, identity, {
      concurrency: options?.concurrency,
      batching: options?.batching
    }),
    (eithers) => {
      const none = Option.none()
      const size = eithers.length
      const errors: Array<unknown> = new Array(size)
      const successes: Array<unknown> = new Array(size)
      let errored = false
      for (let i = 0; i < size; i++) {
        const either = eithers[i] as Either.Either<unknown, unknown>
        if (either._tag === "Left") {
          errors[i] = Option.some(either.left)
          errored = true
        } else {
          successes[i] = either.right
          errors[i] = none
        }
      }
      if (errored) {
        return reconcile._tag === "Some" ?
          core.fail(reconcile.value(errors)) :
          core.fail(errors)
      } else if (options?.discard) {
        return core.unit
      }
      return reconcile._tag === "Some" ?
        core.succeed(reconcile.value(successes)) :
        core.succeed(successes)
    }
  )
})

const allEither = ((
  effects: Iterable<Effect.Effect<any, any, any>>,
  reconcile: Option.Option<(as: ReadonlyArray<any>) => any>,
  options?: Effect.All.Options
) => {
  const eitherEffects: Array<Effect.Effect<unknown, never, Either.Either<unknown, unknown>>> = []
  for (const effect of effects) {
    eitherEffects.push(core.either(effect))
  }

  if (options?.discard) {
    return forEachOptions(eitherEffects, identity, {
      concurrency: options?.concurrency,
      batching: options?.batching,
      discard: true
    })
  }

  return core.map(
    forEachOptions(eitherEffects, identity, {
      concurrency: options?.concurrency,
      batching: options?.batching
    }),
    (eithers) =>
      reconcile._tag === "Some" ?
        reconcile.value(eithers) :
        eithers
  )
})

/* @internal */
export const all = ((
  arg: Iterable<Effect.Effect<any, any, any>> | Record<string, Effect.Effect<any, any, any>>,
  options?: Effect.All.Options
) => {
  const [effects, reconcile] = allResolveInput(arg)

  if (options?.mode === "validate") {
    return allValidate(effects, reconcile, options)
  } else if (options?.mode === "either") {
    return allEither(effects, reconcile, options)
  }

  return reconcile._tag === "Some" ?
    core.map(
      forEachOptions(effects, identity, options as any),
      reconcile.value
    ) :
    forEachOptions(effects, identity, options as any)
}) as Effect.All.Signature

/* @internal */
export const allWith: Effect.All.SignatureWith = (options) => (arg) => all(arg, options)

/* @internal */
export const allSuccesses = <R, E, A>(
  elements: Iterable<Effect.Effect<R, E, A>>,
  options?: {
    readonly concurrency?: Concurrency
    readonly batching?: boolean | "inherit"
  }
): Effect.Effect<R, never, Array<A>> =>
  core.map(
    all(RA.fromIterable(elements).map(core.exit), options as Effect.All.Options),
    RA.filterMap((exit) => core.exitIsSuccess(exit) ? Option.some(exit.i0) : Option.none())
  )

/* @internal */
export const replicate = dual<
  (n: number) => <R, E, A>(self: Effect.Effect<R, E, A>) => Array<Effect.Effect<R, E, A>>,
  <R, E, A>(self: Effect.Effect<R, E, A>, n: number) => Array<Effect.Effect<R, E, A>>
>(2, (self, n) => Array.from({ length: n }, () => self))

/* @internal */
export const replicateEffect = dual<
  {
    (n: number, options?: {
      readonly discard?: false
    }): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, Array<A>>
    (n: number, options: {
      readonly discard: true
    }): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, void>
  },
  {
    <R, E, A>(self: Effect.Effect<R, E, A>, n: number, options?: {
      readonly discard?: false
    }): Effect.Effect<R, E, Array<A>>
    <R, E, A>(self: Effect.Effect<R, E, A>, n: number, options: {
      readonly discard: true
    }): Effect.Effect<R, E, void>
  }
>(
  (args) => core.isEffect(args[0]),
  (self, n, options) => all(replicate(n)(self), options as { readonly discard: boolean })
)

// @ts-expect-error
export const forEachOptions = dual<
  {
    <A, R, E, B>(f: (a: A, i: number) => Effect.Effect<R, E, B>, options?: {
      readonly concurrency?: Concurrency
      readonly batching?: boolean | "inherit"
      readonly discard?: false
    }): (self: Iterable<A>) => Effect.Effect<R, E, Array<B>>
    <A, R, E, B>(f: (a: A, i: number) => Effect.Effect<R, E, B>, options: {
      readonly concurrency?: Concurrency
      readonly batching?: boolean | "inherit"
      readonly discard: true
    }): (self: Iterable<A>) => Effect.Effect<R, E, void>
  },
  {
    <A, R, E, B>(self: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, B>, options?: {
      readonly concurrency?: Concurrency
      readonly batching?: boolean | "inherit"
      readonly discard?: false
    }): Effect.Effect<R, E, Array<B>>
    <A, R, E, B>(self: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, B>, options: {
      readonly concurrency?: Concurrency
      readonly batching?: boolean | "inherit"
      readonly discard: true
    }): Effect.Effect<R, E, void>
  }
>((args) => Predicate.isIterable(args[0]), (self, f, options) =>
  core.withFiberRuntime((r) => {
    const requestBatchingEnabled = options?.batching === true ||
      (options?.batching === "inherit" && r.getFiberRef(core.currentRequestBatching))

    if (options?.discard) {
      return concurrency.match(
        options,
        () => requestBatchingEnabled ? forEachBatchedDiscard(self, f) : core.forEachSequentialDiscard(self, f),
        () => forEachParUnboundedDiscard(self, f, requestBatchingEnabled),
        (n) => forEachParNDiscard(self, n, f, requestBatchingEnabled)
      )
    }

    return concurrency.match(
      options,
      () => requestBatchingEnabled ? forEachParN(self, 1, f, true) : core.forEachSequential(self, f),
      () => forEachParUnbounded(self, f, requestBatchingEnabled),
      (n) => forEachParN(self, n, f, requestBatchingEnabled)
    )
  }))

/* @internal */
export const forEachParUnbounded = <A, R, E, B>(
  self: Iterable<A>,
  f: (a: A, i: number) => Effect.Effect<R, E, B>,
  batching: boolean
): Effect.Effect<R, E, Array<B>> =>
  core.suspend(() => {
    const as = RA.fromIterable(self)
    const array = new Array<B>(as.length)
    const fn = (a: A, i: number) => core.flatMap(f(a, i), (b) => core.sync(() => array[i] = b))
    return core.zipRight(forEachParUnboundedDiscard(as, fn, batching), core.succeed(array))
  })

const forEachBatchedDiscard = <R, E, A, _>(
  self: Iterable<A>,
  f: (a: A, i: number) => Effect.Effect<R, E, _>
): Effect.Effect<R, E, void> =>
  core.suspend(() => {
    const as = RA.fromIterable(self)
    const size = as.length
    if (size === 0) {
      return core.unit
    } else if (size === 1) {
      return core.asUnit(f(as[0], 0))
    }
    const effects = as.map(f)
    const blocked = new Array<Effect.Blocked<R, E, void>>()
    const loop = (i: number): Effect.Effect<R, E, void> =>
      i === effects.length ?
        core.suspend(() => {
          if (blocked.length > 0) {
            const requests = blocked.map((b) => b.i0).reduce(_RequestBlock.par)
            return core.blocked(
              requests,
              forEachBatchedDiscard(blocked.map((b) => b.i1), identity)
            )
          }
          return core.unit
        }) :
        core.flatMapStep(effects[i], (s) => {
          if (s._tag === "Blocked") {
            blocked.push(s)
            return loop(i + 1)
          } else if (s._tag === "Failure") {
            return core.suspend(() => {
              if (blocked.length > 0) {
                const requests = blocked.map((b) => b.i0).reduce(_RequestBlock.par)
                return core.blocked(
                  requests,
                  core.flatMap(forEachBatchedDiscard(blocked.map((b) => b.i1), identity), () => s)
                )
              }
              return core.unit
            })
          } else {
            return loop(i + 1)
          }
        })
    return loop(0)
  })

/* @internal */
export const forEachParUnboundedDiscard = <R, E, A, _>(
  self: Iterable<A>,
  f: (a: A, i: number) => Effect.Effect<R, E, _>,
  batching: boolean
): Effect.Effect<R, E, void> =>
  core.suspend(() => {
    const as = RA.fromIterable(self)
    const size = as.length
    if (size === 0) {
      return core.unit
    } else if (size === 1) {
      return core.asUnit(f(as[0], 0))
    }
    return core.uninterruptibleMask((restore) => {
      const deferred = core.deferredUnsafeMake<void, Effect.Effect<any, any, any>>(FiberId.none)
      let ref = 0
      const residual: Array<Effect.Blocked<any, any, any>> = []
      const joinOrder: Array<Fiber.RuntimeFiber<any, any>> = []
      const process = core.transplant((graft) =>
        core.forEachSequential(as, (a, i) =>
          pipe(
            graft(pipe(
              core.suspend(() => restore((batching ? core.step : core.exit)(f(a, i)))),
              core.flatMap(
                (exit) => {
                  switch (exit._tag) {
                    case "Failure": {
                      if (residual.length > 0) {
                        const requests = residual.map((blocked) => blocked.i0).reduce(_RequestBlock.par)
                        const _continue = forEachParUnboundedDiscard(residual, (blocked) => blocked.i1, batching)
                        return core.blocked(
                          requests,
                          core.matchCauseEffect(_continue, {
                            onFailure: (cause) =>
                              core.zipRight(
                                core.deferredFail(deferred, void 0),
                                core.failCause(internalCause.parallel(cause, exit.cause))
                              ),
                            onSuccess: () =>
                              core.zipRight(
                                core.deferredFail(deferred, void 0),
                                core.failCause(exit.cause)
                              )
                          })
                        )
                      }
                      return core.zipRight(
                        core.deferredFail(deferred, void 0),
                        core.failCause(exit.cause)
                      )
                    }
                    default: {
                      if (exit._tag === "Blocked") {
                        residual.push(exit)
                      }
                      if (ref + 1 === size) {
                        if (residual.length > 0) {
                          const requests = residual.map((blocked) => blocked.i0).reduce(_RequestBlock.par)
                          const _continue = forEachParUnboundedDiscard(residual, (blocked) => blocked.i1, batching)
                          return core.deferredSucceed(deferred, core.blocked(requests, _continue))
                        } else {
                          core.deferredUnsafeDone(deferred, core.exitSucceed(core.exitUnit))
                        }
                      } else {
                        ref = ref + 1
                      }
                      return core.unit
                    }
                  }
                }
              )
            )),
            forkDaemon,
            core.map((fiber) => {
              fiber.unsafeAddObserver(() => {
                joinOrder.push(fiber)
              })
              return fiber
            })
          ))
      )
      return core.flatMap(process, (fibers) =>
        core.matchCauseEffect(
          restore(core.deferredAwait(deferred)),
          {
            onFailure: (cause) =>
              core.flatMap(
                forEachParUnbounded(fibers, core.interruptFiber, batching),
                (exits) => {
                  const exit = core.exitCollectAll(exits, { parallel: true })
                  if (exit._tag === "Some" && core.exitIsFailure(exit.value)) {
                    return core.failCause(
                      internalCause.parallel(internalCause.stripFailures(cause), exit.value.i0)
                    )
                  } else {
                    return core.failCause(internalCause.stripFailures(cause))
                  }
                }
              ),
            onSuccess: (rest) =>
              core.flatMap(rest, () => core.forEachSequentialDiscard(joinOrder, (f) => f.inheritAll()))
          }
        ))
    })
  })

/* @internal */
export const forEachParN = <A, R, E, B>(
  self: Iterable<A>,
  n: number,
  f: (a: A, i: number) => Effect.Effect<R, E, B>,
  batching: boolean
): Effect.Effect<R, E, Array<B>> =>
  core.suspend(() => {
    const as = RA.fromIterable(self)
    const array = new Array<B>(as.length)
    const fn = (a: A, i: number) => core.map(f(a, i), (b) => array[i] = b)
    return core.zipRight(forEachParNDiscard(as, n, fn, batching), core.succeed(array))
  })

/* @internal */
export const forEachParNDiscard = <A, R, E, _>(
  self: Iterable<A>,
  n: number,
  f: (a: A, i: number) => Effect.Effect<R, E, _>,
  batching: boolean
): Effect.Effect<R, E, void> =>
  core.suspend(() => {
    let i = 0
    const iterator = self[Symbol.iterator]()
    const residual: Array<Effect.Blocked<any, any, any>> = []
    const worker: Effect.Effect<R, E, void> = core.flatMap(
      core.sync(() => iterator.next()),
      (next) =>
        next.done ?
          core.unit :
          core.flatMap((batching ? core.step : core.exit)(core.asUnit(f(next.value, i++))), (res) => {
            switch (res._tag) {
              case "Blocked": {
                residual.push(res)
                return worker
              }
              case "Failure": {
                return res
              }
              case "Success":
                return worker
            }
          })
    )
    const effects: Array<Effect.Effect<R, E, void>> = []
    for (let i = 0; i < n; i++) {
      effects.push(worker)
    }
    return core.flatMap(core.exit(forEachParUnboundedDiscard(effects, identity, batching)), (exit) => {
      if (residual.length === 0) {
        return exit
      }
      const requests = residual.map((blocked) => blocked.i0).reduce(_RequestBlock.par)
      const _continue = forEachParNDiscard(residual, n, (blocked) => blocked.i1, batching)
      if (exit._tag === "Failure") {
        return core.blocked(
          requests,
          core.matchCauseEffect(_continue, {
            onFailure: (cause) => core.exitFailCause(internalCause.parallel(exit.cause, cause)),
            onSuccess: () => exit
          })
        )
      }
      return core.blocked(requests, _continue)
    })
  })

/* @internal */
export const fork = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> =>
  core.withFiberRuntime<R, never, Fiber.RuntimeFiber<E, A>>((state, status) =>
    core.succeed(unsafeFork(self, state, status.runtimeFlags))
  )

/* @internal */
export const forkDaemon = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> =>
  forkWithScopeOverride(self, fiberScope.globalScope)

/* @internal */
export const forkWithErrorHandler = dual<
  <E, X>(
    handler: (e: E) => Effect.Effect<never, never, X>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>>,
  <R, E, A, X>(
    self: Effect.Effect<R, E, A>,
    handler: (e: E) => Effect.Effect<never, never, X>
  ) => Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>>
>(2, (self, handler) =>
  fork(core.onError(self, (cause) => {
    const either = internalCause.failureOrCause(cause)
    switch (either._tag) {
      case "Left": {
        return handler(either.left)
      }
      case "Right": {
        return core.failCause(either.right)
      }
    }
  })))

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
  const childFiberRefs = fiberRefs.forkAs(parentFiberRefs, childId)
  const childFiber = new FiberRuntime<E, A>(childId, childFiberRefs, parentRuntimeFlags)
  const childContext = fiberRefs.getOrDefault(
    childFiberRefs,
    core.currentContext as unknown as FiberRef.FiberRef<Context.Context<R>>
  )
  const supervisor = childFiber._supervisor

  supervisor.onStart(
    childContext,
    effect,
    Option.some(parentFiber),
    childFiber
  )

  childFiber.unsafeAddObserver((exit) => supervisor.onEnd(exit, childFiber))

  const parentScope = overrideScope !== null ? overrideScope : pipe(
    parentFiber.getFiberRef(core.currentForkScopeOverride),
    Option.getOrElse(() => parentFiber.scope())
  )

  parentScope.add(parentRuntimeFlags, childFiber)

  return childFiber
}

/* @internal */
const forkWithScopeOverride = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  scopeOverride: fiberScope.FiberScope
): Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>> =>
  core.withFiberRuntime<R, never, Fiber.RuntimeFiber<E, A>>((parentFiber, parentStatus) =>
    core.succeed(unsafeFork(self, parentFiber, parentStatus.runtimeFlags, scopeOverride))
  )

/* @internal */
export const mergeAll = dual<
  <Z, A>(zero: Z, f: (z: Z, a: A, i: number) => Z, options?: {
    readonly concurrency?: Concurrency
    readonly batching?: boolean | "inherit"
  }) => <R, E>(elements: Iterable<Effect.Effect<R, E, A>>) => Effect.Effect<R, E, Z>,
  <R, E, A, Z>(elements: Iterable<Effect.Effect<R, E, A>>, zero: Z, f: (z: Z, a: A, i: number) => Z, options?: {
    readonly concurrency?: Concurrency
    readonly batching?: boolean | "inherit"
  }) => Effect.Effect<R, E, Z>
>(
  (args) => Predicate.isIterable(args[0]),
  <R, E, A, Z>(elements: Iterable<Effect.Effect<R, E, A>>, zero: Z, f: (z: Z, a: A, i: number) => Z, options?: {
    readonly concurrency?: Concurrency
    readonly batching?: boolean | "inherit"
  }) =>
    concurrency.matchSimple(
      options,
      () =>
        RA.fromIterable(elements).reduce(
          (acc, a, i) => core.zipWith(acc, a, (acc, a) => f(acc, a, i)),
          core.succeed(zero) as Effect.Effect<R, E, Z>
        ),
      () =>
        core.flatMap(Ref.make(zero), (acc) =>
          core.flatMap(
            forEachOptions(
              elements,
              (effect, i) => core.flatMap(effect, (a) => Ref.update(acc, (b) => f(b, a, i))),
              options
            ),
            () => Ref.get(acc)
          ))
    )
)

/* @internal */
export const partition = dual<
  <R, E, A, B>(
    f: (a: A, i: number) => Effect.Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency
      readonly batching?: boolean | "inherit"
    }
  ) => (elements: Iterable<A>) => Effect.Effect<R, never, readonly [Array<E>, Array<B>]>,
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect.Effect<R, E, B>,
    options?: {
      readonly concurrency?: Concurrency
      readonly batching?: boolean | "inherit"
    }
  ) => Effect.Effect<R, never, readonly [Array<E>, Array<B>]>
>((args) => Predicate.isIterable(args[0]), (elements, f, options) =>
  pipe(
    forEachOptions(elements, (a, i) => core.either(f(a, i)), options),
    core.map((chunk) => core.partitionMap(chunk, identity))
  ))

/* @internal */
export const validateAll = dual<
  {
    <R, E, A, B>(
      f: (a: A, i: number) => Effect.Effect<R, E, B>,
      options?: {
        readonly concurrency?: Concurrency
        readonly batching?: boolean | "inherit"
        readonly discard?: false
      }
    ): (elements: Iterable<A>) => Effect.Effect<R, Array<E>, Array<B>>
    <R, E, A, B>(
      f: (a: A, i: number) => Effect.Effect<R, E, B>,
      options: {
        readonly concurrency?: Concurrency
        readonly batching?: boolean | "inherit"
        readonly discard: true
      }
    ): (elements: Iterable<A>) => Effect.Effect<R, Array<E>, void>
  },
  {
    <R, E, A, B>(
      elements: Iterable<A>,
      f: (a: A, i: number) => Effect.Effect<R, E, B>,
      options?: {
        readonly concurrency?: Concurrency
        readonly batching?: boolean | "inherit"
        readonly discard?: false
      }
    ): Effect.Effect<R, Array<E>, Array<B>>
    <R, E, A, B>(
      elements: Iterable<A>,
      f: (a: A, i: number) => Effect.Effect<R, E, B>,
      options: {
        readonly concurrency?: Concurrency
        readonly batching?: boolean | "inherit"
        readonly discard: true
      }
    ): Effect.Effect<R, Array<E>, void>
  }
>(
  (args) => Predicate.isIterable(args[0]),
  <R, E, A, B>(elements: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, B>, options?: {
    readonly concurrency?: Concurrency
    readonly batching?: boolean | "inherit"
    readonly discard?: boolean
  }): Effect.Effect<R, Array<E>, any> =>
    core.flatMap(
      partition(elements, f, {
        concurrency: options?.concurrency,
        batching: options?.batching
      }),
      ([es, bs]) =>
        es.length === 0
          ? options?.discard ? core.unit : core.succeed(bs)
          : core.fail(es)
    )
)

/* @internal */
export const raceAll = <R, E, A>(all: Iterable<Effect.Effect<R, E, A>>) => {
  const list = Chunk.fromIterable(all)
  if (!Chunk.isNonEmpty(list)) {
    return core.dieSync(() => internalCause.IllegalArgumentException(`Received an empty collection of effects`))
  }
  const self = Chunk.headNonEmpty(list)
  const effects = Chunk.tailNonEmpty(list)
  const inheritAll = (res: readonly [A, Fiber.Fiber<E, A>]) =>
    pipe(
      internalFiber.inheritAll(res[1]),
      core.as(res[0])
    )
  return pipe(
    core.deferredMake<E, readonly [A, Fiber.Fiber<E, A>]>(),
    core.flatMap((done) =>
      pipe(
        Ref.make(effects.length),
        core.flatMap((fails) =>
          core.uninterruptibleMask<R, E, A>((restore) =>
            pipe(
              fork(core.interruptible(self)),
              core.flatMap((head) =>
                pipe(
                  effects,
                  core.forEachSequential((effect) => fork(core.interruptible(effect))),
                  core.map(Chunk.unsafeFromArray),
                  core.map((tail) => pipe(tail, Chunk.prepend(head)) as Chunk.Chunk<Fiber.RuntimeFiber<E, A>>),
                  core.tap((fibers) =>
                    pipe(
                      fibers,
                      RA.reduce(core.unit, (effect, fiber) =>
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
                          RA.reduce(
                            core.unit,
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
}

/* @internal */
const raceAllArbiter = <E, E1, A, A1>(
  fibers: Iterable<Fiber.Fiber<E | E1, A | A1>>,
  winner: Fiber.Fiber<E | E1, A | A1>,
  deferred: Deferred.Deferred<E | E1, readonly [A | A1, Fiber.Fiber<E | E1, A | A1>]>,
  fails: Ref.Ref<number>
) =>
  (exit: Exit.Exit<E | E1, A | A1>): Effect.Effect<never, never, void> =>
    core.exitMatchEffect(exit, {
      onFailure: (cause) =>
        pipe(
          Ref.modify(fails, (fails) =>
            [
              fails === 0 ?
                pipe(core.deferredFailCause(deferred, cause), core.asUnit) :
                core.unit,
              fails - 1
            ] as const),
          core.flatten
        ),
      onSuccess: (value): Effect.Effect<never, never, void> =>
        pipe(
          core.deferredSucceed(deferred, [value, winner] as const),
          core.flatMap((set) =>
            set ?
              pipe(
                Chunk.fromIterable(fibers),
                RA.reduce(
                  core.unit,
                  (effect, fiber) =>
                    fiber === winner ?
                      effect :
                      pipe(effect, core.zipLeft(core.interruptFiber(fiber)))
                )
              ) :
              core.unit
          )
        )
    })

/* @internal */
export const reduceEffect = dual<
  <R, E, A>(
    zero: Effect.Effect<R, E, A>,
    f: (acc: A, a: A, i: number) => A,
    options?: {
      readonly concurrency?: Concurrency
      readonly batching?: boolean | "inherit"
    }
  ) => (elements: Iterable<Effect.Effect<R, E, A>>) => Effect.Effect<R, E, A>,
  <R, E, A>(
    elements: Iterable<Effect.Effect<R, E, A>>,
    zero: Effect.Effect<R, E, A>,
    f: (acc: A, a: A, i: number) => A,
    options?: {
      readonly concurrency?: Concurrency
      readonly batching?: boolean | "inherit"
    }
  ) => Effect.Effect<R, E, A>
>((args) => Predicate.isIterable(args[0]), <R, E, A>(
  elements: Iterable<Effect.Effect<R, E, A>>,
  zero: Effect.Effect<R, E, A>,
  f: (acc: A, a: A, i: number) => A,
  options?: {
    readonly concurrency?: Concurrency
    readonly batching?: boolean | "inherit"
  }
) =>
  concurrency.matchSimple(
    options,
    () => RA.fromIterable(elements).reduce((acc, a, i) => core.zipWith(acc, a, (acc, a) => f(acc, a, i)), zero),
    () =>
      core.suspend(() =>
        pipe(
          mergeAll(
            [zero, ...elements],
            Option.none() as Option.Option<A>,
            (acc, elem, i) => {
              switch (acc._tag) {
                case "None": {
                  return Option.some(elem)
                }
                case "Some": {
                  return Option.some(f(acc.value, elem, i))
                }
              }
            },
            options
          ),
          core.map((option) => {
            switch (option._tag) {
              case "None": {
                throw new Error(
                  "BUG: Effect.reduceEffect - please report an issue at https://github.com/Effect-TS/io/issues"
                )
              }
              case "Some": {
                return option.value
              }
            }
          })
        )
      )
  ))

/* @internal */
export const parallelFinalizers = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | Scope.Scope, E, A> =>
  core.flatMap(scope, (outerScope) =>
    core.flatMap(scopeMake(executionStrategy.parallel), (innerScope) =>
      pipe(
        outerScope.addFinalizer((exit) => innerScope.close(exit)),
        core.zipRight(scopeExtend(self, innerScope))
      )))

/* @internal */
export const scopeWith = <R, E, A>(
  f: (scope: Scope.Scope) => Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, E, A> => core.flatMap(scopeTag, f)

/* @internal */
export const scopedEffect = <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<Exclude<R, Scope.Scope>, E, A> =>
  core.flatMap(scopeMake(), (scope) => scopeUse(scope)(effect))

/* @internal */
export const sequentialFinalizers = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | Scope.Scope, E, A> =>
  scopeWith((scope) =>
    pipe(
      core.scopeFork(scope, executionStrategy.sequential),
      core.flatMap((scope) => scopeExtend(scope)(self))
    )
  )

/* @internal */
export const tagMetricsScoped = (key: string, value: string): Effect.Effect<Scope.Scope, never, void> =>
  labelMetricsScoped([metricLabel.make(key, value)])

/* @internal */
export const labelMetricsScoped = (
  labels: ReadonlyArray<MetricLabel.MetricLabel>
): Effect.Effect<Scope.Scope, never, void> => labelMetricsScopedSet(HashSet.fromIterable(labels))

/* @internal */
export const labelMetricsScopedSet = (
  labels: HashSet.HashSet<MetricLabel.MetricLabel>
): Effect.Effect<Scope.Scope, never, void> =>
  fiberRefLocallyScopedWith(core.currentMetricLabels, (set) => pipe(set, HashSet.union(labels)))

/* @internal */
export const using = dual<
  <A, R2, E2, A2>(
    use: (a: A) => Effect.Effect<R2, E2, A2>
  ) => <R, E>(self: Effect.Effect<R | Scope.Scope, E, A>) => Effect.Effect<R | R2, E | E2, A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R | Scope.Scope, E, A>,
    use: (a: A) => Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, A2>
>(2, (self, use) =>
  core.acquireUseRelease(
    scopeMake(),
    (scope) => core.flatMap(scopeExtend(self, scope), use),
    (scope, exit) => core.scopeClose(scope, exit)
  ))

/* @internal */
export const unsome = <R, E, A>(
  self: Effect.Effect<R, Option.Option<E>, A>
): Effect.Effect<R, E, Option.Option<A>> =>
  core.matchEffect(self, {
    onFailure: (option) => {
      switch (option._tag) {
        case "None": {
          return core.succeed(Option.none())
        }
        case "Some": {
          return core.fail(option.value)
        }
      }
    },
    onSuccess: (a) => core.succeed(Option.some(a))
  })

/** @internal */
export const validate = dual<
  <R1, E1, B>(
    that: Effect.Effect<R1, E1, B>,
    options?: {
      readonly concurrent?: boolean
      readonly batching?: boolean | "inherit"
    }
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E | E1, [A, B]>,
  <R, E, A, R1, E1, B>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R1, E1, B>,
    options?: {
      readonly concurrent?: boolean
      readonly batching?: boolean | "inherit"
    }
  ) => Effect.Effect<R | R1, E | E1, [A, B]>
>(
  (args) => core.isEffect(args[1]),
  (self, that, options) => validateWith(self, that, (a, b) => [a, b], options)
)

/** @internal */
export const validateWith = dual<
  <A, R1, E1, B, C>(
    that: Effect.Effect<R1, E1, B>,
    f: (a: A, b: B) => C,
    options?: {
      readonly concurrent?: boolean
      readonly batching?: boolean | "inherit"
    }
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E | E1, C>,
  <R, E, A, R1, E1, B, C>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R1, E1, B>,
    f: (a: A, b: B) => C,
    options?: {
      readonly concurrent?: boolean
      readonly batching?: boolean | "inherit"
    }
  ) => Effect.Effect<R | R1, E | E1, C>
>((args) => core.isEffect(args[1]), (self, that, f, options) =>
  core.flatten(zipWithOptions(
    core.exit(self),
    core.exit(that),
    (ea, eb) =>
      core.exitZipWith(ea, eb, {
        onSuccess: f,
        onFailure: (ca, cb) => options?.concurrent ? internalCause.parallel(ca, cb) : internalCause.sequential(ca, cb)
      }),
    options
  )))

/* @internal */
export const validateAllPar = dual<
  <R, E, A, B>(
    f: (a: A) => Effect.Effect<R, E, B>
  ) => (elements: Iterable<A>) => Effect.Effect<R, Array<E>, Array<B>>,
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A) => Effect.Effect<R, E, B>
  ) => Effect.Effect<R, Array<E>, Array<B>>
>(2, (elements, f) =>
  core.flatMap(
    partition(elements, f),
    ([es, bs]) =>
      es.length === 0
        ? core.succeed(bs)
        : core.fail(es)
  ))

/* @internal */
export const validateAllParDiscard = dual<
  <R, E, A, B>(
    f: (a: A) => Effect.Effect<R, E, B>
  ) => (elements: Iterable<A>) => Effect.Effect<R, Array<E>, void>,
  <R, E, A, B>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, E, B>) => Effect.Effect<R, Array<E>, void>
>(2, (elements, f) =>
  core.flatMap(
    partition(elements, f),
    ([es, _]) =>
      es.length === 0
        ? core.unit
        : core.fail(es)
  ))

/* @internal */
export const validateFirst = dual<
  <R, E, A, B>(f: (a: A, i: number) => Effect.Effect<R, E, B>, options?: {
    readonly concurrency?: Concurrency
    readonly batching?: boolean | "inherit"
  }) => (elements: Iterable<A>) => Effect.Effect<R, Array<E>, B>,
  <R, E, A, B>(elements: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, B>, options?: {
    readonly concurrency?: Concurrency
    readonly batching?: boolean | "inherit"
  }) => Effect.Effect<R, Array<E>, B>
>(
  (args) => Predicate.isIterable(args[0]),
  (elements, f, options) => core.flip(forEachOptions(elements, (a, i) => core.flip(f(a, i)), options))
)

/* @internal */
export const withClockScoped = <A extends Clock.Clock>(value: A) =>
  fiberRefLocallyScopedWith(defaultServices.currentServices, Context.add(clock.clockTag, value))

/* @internal */
export const withConfigProviderScoped = (value: ConfigProvider) =>
  fiberRefLocallyScopedWith(defaultServices.currentServices, Context.add(configProviderTag, value))

/* @internal */
export const withEarlyRelease = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, E, readonly [Effect.Effect<never, never, void>, A]> =>
  scopeWith((parent) =>
    core.flatMap(core.scopeFork(parent, executionStrategy.sequential), (child) =>
      pipe(
        self,
        scopeExtend(child),
        core.map((value) =>
          [
            core.fiberIdWith((fiberId) => core.scopeClose(child, core.exitInterrupt(fiberId))),
            value
          ] as const
        )
      ))
  )

/** @internal */
export const zipOptions = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean
      readonly batching?: boolean | "inherit"
    }
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, [A, A2]>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean
      readonly batching?: boolean | "inherit"
    }
  ) => Effect.Effect<R | R2, E | E2, [A, A2]>
>((args) => core.isEffect(args[1]), (
  self,
  that,
  options
) => zipWithOptions(self, that, (a, b) => [a, b], options))

/** @internal */
export const zipLeftOptions = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean
      readonly batching?: boolean | "inherit"
    }
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean
      readonly batching?: boolean | "inherit"
    }
  ) => Effect.Effect<R | R2, E | E2, A>
>(
  (args) => core.isEffect(args[1]),
  (self, that, options) => zipWithOptions(self, that, (a, _) => a, options)
)

/** @internal */
export const zipRightOptions = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean
      readonly batching?: boolean | "inherit"
    }
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    options?: {
      readonly concurrent?: boolean
      readonly batching?: boolean | "inherit"
    }
  ) => Effect.Effect<R | R2, E | E2, A2>
>((args) => core.isEffect(args[1]), (self, that, options) => zipWithOptions(self, that, (_, b) => b, options))

/** @internal */
export const zipWithOptions = dual<
  <R2, E2, A2, A, B>(
    that: Effect.Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B,
    options?: {
      readonly concurrent?: boolean
      readonly batching?: boolean | "inherit"
    }
  ) => <R, E>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, B>,
  <R, E, A, R2, E2, A2, B>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B,
    options?: {
      readonly concurrent?: boolean
      readonly batching?: boolean | "inherit"
    }
  ) => Effect.Effect<R | R2, E | E2, B>
>((args) => core.isEffect(args[1]), <R, E, A, R2, E2, A2, B>(
  self: Effect.Effect<R, E, A>,
  that: Effect.Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B,
  options?: {
    readonly concurrent?: boolean
    readonly batching?: boolean | "inherit"
  }
): Effect.Effect<R | R2, E | E2, B> =>
  core.map(
    all([self, that], {
      concurrency: options?.concurrent ? 2 : 1,
      batching: options?.batching
    }),
    ([a, a2]) => f(a, a2)
  ))

/* @internal */
export const withRuntimeFlagsScoped = (
  update: RuntimeFlagsPatch.RuntimeFlagsPatch
): Effect.Effect<Scope.Scope, never, void> => {
  if (update === RuntimeFlagsPatch.empty) {
    return core.unit
  }
  return pipe(
    core.runtimeFlags,
    core.flatMap((runtimeFlags) => {
      const updatedRuntimeFlags = _runtimeFlags.patch(runtimeFlags, update)
      const revertRuntimeFlags = _runtimeFlags.diff(updatedRuntimeFlags, runtimeFlags)
      return pipe(
        core.updateRuntimeFlags(update),
        core.zipRight(addFinalizer(() => core.updateRuntimeFlags(revertRuntimeFlags))),
        core.asUnit
      )
    }),
    core.uninterruptible
  )
}

// circular with ReleaseMap

/* @internal */
export const releaseMapReleaseAll = (
  strategy: ExecutionStrategy.ExecutionStrategy,
  exit: Exit.Exit<unknown, unknown>
) =>
  (self: core.ReleaseMap): Effect.Effect<never, never, void> =>
    core.suspend(() => {
      switch (self.state._tag) {
        case "Exited": {
          return core.unit
        }
        case "Running": {
          const finalizersMap = self.state.finalizers
          const update = self.state.update
          const finalizers = Array.from(finalizersMap.keys()).sort((a, b) => b - a).map((key) =>
            finalizersMap.get(key)!
          )
          self.state = { _tag: "Exited", nextKey: self.state.nextKey, exit, update }
          return executionStrategy.isSequential(strategy) ?
            pipe(
              finalizers,
              core.forEachSequential((fin) => core.exit(update(fin)(exit))),
              core.flatMap((results) =>
                pipe(
                  core.exitCollectAll(results),
                  Option.map(core.exitAsUnit),
                  Option.getOrElse(() => core.exitUnit)
                )
              )
            ) :
            executionStrategy.isParallel(strategy) ?
            pipe(
              forEachParUnbounded(finalizers, (fin) => core.exit(update(fin)(exit)), false),
              core.flatMap((results) =>
                pipe(
                  core.exitCollectAll(results, { parallel: true }),
                  Option.map(core.exitAsUnit),
                  Option.getOrElse(() => core.exitUnit)
                )
              )
            ) :
            pipe(
              forEachParN(finalizers, strategy.parallelism, (fin) => core.exit(update(fin)(exit)), false),
              core.flatMap((results) =>
                pipe(
                  core.exitCollectAll(results, { parallel: true }),
                  Option.map(core.exitAsUnit),
                  Option.getOrElse(() => core.exitUnit)
                )
              )
            )
        }
      }
    })

// circular with Scope

/** @internal */
export const scopeTag = Context.Tag<Scope.Scope>(core.ScopeTypeId)

/* @internal */
export const scope: Effect.Effect<Scope.Scope, never, Scope.Scope> = scopeTag

/* @internal */
export const scopeMake = (
  strategy: ExecutionStrategy.ExecutionStrategy = executionStrategy.sequential
): Effect.Effect<never, never, Scope.Scope.Closeable> =>
  core.map(core.releaseMapMake, (rm): Scope.Scope.Closeable => ({
    [core.ScopeTypeId]: core.ScopeTypeId,
    [core.CloseableScopeTypeId]: core.CloseableScopeTypeId,
    pipe() {
      return pipeArguments(this, arguments)
    },
    fork: (strategy) =>
      core.uninterruptible(
        pipe(
          scopeMake(strategy),
          core.flatMap((scope) =>
            pipe(
              core.releaseMapAdd(rm, (exit) => core.scopeClose(scope, exit)),
              core.tap((fin) => core.scopeAddFinalizerExit(scope, fin)),
              core.as(scope)
            )
          )
        )
      ),
    close: (exit) => core.asUnit(releaseMapReleaseAll(strategy, exit)(rm)),
    addFinalizer: (fin) => core.asUnit(core.releaseMapAdd(fin)(rm))
  }))

/* @internal */
export const scopeExtend = dual<
  (scope: Scope.Scope) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Scope.Scope>, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, scope: Scope.Scope) => Effect.Effect<Exclude<R, Scope.Scope>, E, A>
>(
  2,
  <R, E, A>(effect: Effect.Effect<R, E, A>, scope: Scope.Scope) =>
    core.mapInputContext<Exclude<R, Scope.Scope>, R, E, A>(
      effect,
      // @ts-expect-error
      Context.merge(Context.make(scopeTag, scope))
    )
)

/* @internal */
export const scopeUse = dual<
  (
    scope: Scope.Scope.Closeable
  ) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Scope.Scope>, E, A>,
  <R, E, A>(
    effect: Effect.Effect<R, E, A>,
    scope: Scope.Scope.Closeable
  ) => Effect.Effect<Exclude<R, Scope.Scope>, E, A>
>(2, (effect, scope) =>
  pipe(
    effect,
    scopeExtend(scope),
    core.onExit((exit) => scope.close(exit))
  ))

// circular with Supervisor

/** @internal */
export const fiberRefUnsafeMakeSupervisor = (
  initial: Supervisor.Supervisor<any>
): FiberRef.FiberRef<Supervisor.Supervisor<any>> =>
  core.fiberRefUnsafeMakePatch(initial, {
    differ: SupervisorPatch.differ,
    fork: SupervisorPatch.empty
  })

// circular with FiberRef

/* @internal */
export const fiberRefLocallyScoped = dual<
  <A>(value: A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<Scope.Scope, never, void>,
  <A>(self: FiberRef.FiberRef<A>, value: A) => Effect.Effect<Scope.Scope, never, void>
>(2, (self, value) =>
  core.asUnit(
    acquireRelease(
      core.flatMap(
        core.fiberRefGet(self),
        (oldValue) => core.as(core.fiberRefSet(self, value), oldValue)
      ),
      (oldValue) => core.fiberRefSet(self, oldValue)
    )
  ))

/* @internal */
export const fiberRefLocallyScopedWith = dual<
  <A>(f: (a: A) => A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<Scope.Scope, never, void>,
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A) => Effect.Effect<Scope.Scope, never, void>
>(2, (self, f) => core.fiberRefGetWith(self, (a) => fiberRefLocallyScoped(self, f(a))))

/* @internal */
export const fiberRefMake = <A>(
  initial: A,
  options?: {
    readonly fork?: (a: A) => A
    readonly join?: (left: A, right: A) => A
  }
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<A>> =>
  fiberRefMakeWith(() => core.fiberRefUnsafeMake(initial, options))

/* @internal */
export const fiberRefMakeWith = <Value>(
  ref: LazyArg<FiberRef.FiberRef<Value>>
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<Value>> =>
  acquireRelease(
    core.tap(core.sync(ref), (ref) => core.fiberRefUpdate(ref, identity)),
    (fiberRef) => core.fiberRefDelete(fiberRef)
  )

/* @internal */
export const fiberRefMakeContext = <A>(
  initial: Context.Context<A>
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<Context.Context<A>>> =>
  fiberRefMakeWith(() => core.fiberRefUnsafeMakeContext(initial))

/* @internal */
export const fiberRefMakeRuntimeFlags = (
  initial: RuntimeFlags.RuntimeFlags
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<RuntimeFlags.RuntimeFlags>> =>
  fiberRefMakeWith(() => core.fiberRefUnsafeMakeRuntimeFlags(initial))

/** @internal */
export const currentRuntimeFlags: FiberRef.FiberRef<RuntimeFlags.RuntimeFlags> = core.fiberRefUnsafeMakeRuntimeFlags(
  _runtimeFlags.none
)

/** @internal */
export const currentSupervisor: FiberRef.FiberRef<Supervisor.Supervisor<any>> = fiberRefUnsafeMakeSupervisor(
  supervisor.none
)

// circular with Fiber

/* @internal */
export const fiberAwaitAll = (fibers: Iterable<Fiber.Fiber<any, any>>): Effect.Effect<never, never, void> =>
  core.asUnit(internalFiber._await(fiberAll(fibers)))

/** @internal */
export const fiberAll = <E, A>(fibers: Iterable<Fiber.Fiber<E, A>>): Fiber.Fiber<E, Array<A>> => ({
  [internalFiber.FiberTypeId]: internalFiber.fiberVariance,
  id: () => RA.fromIterable(fibers).reduce((id, fiber) => FiberId.combine(id, fiber.id()), FiberId.none),
  await: () => core.exit(forEachParUnbounded(fibers, (fiber) => core.flatten(fiber.await()), false)),
  children: () => core.map(forEachParUnbounded(fibers, (fiber) => fiber.children(), false), RA.flatten),
  inheritAll: () => core.forEachSequentialDiscard(fibers, (fiber) => fiber.inheritAll()),
  poll: () =>
    core.map(
      core.forEachSequential(fibers, (fiber) => fiber.poll()),
      RA.reduceRight(
        Option.some<Exit.Exit<E, Array<A>>>(core.exitSucceed(new Array())),
        (optionB, optionA) => {
          switch (optionA._tag) {
            case "None": {
              return Option.none()
            }
            case "Some": {
              switch (optionB._tag) {
                case "None": {
                  return Option.none()
                }
                case "Some": {
                  return Option.some(
                    core.exitZipWith(optionA.value, optionB.value, {
                      onSuccess: (a, chunk) => [a, ...chunk],
                      onFailure: internalCause.parallel
                    })
                  )
                }
              }
            }
          }
        }
      )
    ),
  interruptAsFork: (fiberId) => core.forEachSequentialDiscard(fibers, (fiber) => fiber.interruptAsFork(fiberId)),
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/* @internal */
export const fiberInterruptFork = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, void> =>
  core.asUnit(forkDaemon(core.interruptFiber(self)))

/* @internal */
export const fiberJoinAll = <E, A>(fibers: Iterable<Fiber.Fiber<E, A>>): Effect.Effect<never, E, void> =>
  core.asUnit(internalFiber.join(fiberAll(fibers)))

/* @internal */
export const fiberScoped = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<Scope.Scope, never, Fiber.Fiber<E, A>> =>
  acquireRelease(core.succeed(self), core.interruptFiber)

//
// circular race
//

/** @internal */
export const raceWith = dual<
  <E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    options: {
      readonly other: Effect.Effect<R1, E1, A1>
      readonly onSelfDone: (exit: Exit.Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect.Effect<R2, E2, A2>
      readonly onOtherDone: (exit: Exit.Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect.Effect<R3, E3, A3>
    }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1 | R2 | R3, E2 | E3, A2 | A3>,
  <R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly other: Effect.Effect<R1, E1, A1>
      readonly onSelfDone: (exit: Exit.Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect.Effect<R2, E2, A2>
      readonly onOtherDone: (exit: Exit.Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect.Effect<R3, E3, A3>
    }
  ) => Effect.Effect<R | R1 | R2 | R3, E2 | E3, A2 | A3>
>(2, <R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  self: Effect.Effect<R, E, A>,
  options: {
    readonly other: Effect.Effect<R1, E1, A1>
    readonly onSelfDone: (exit: Exit.Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect.Effect<R2, E2, A2>
    readonly onOtherDone: (exit: Exit.Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect.Effect<R3, E3, A3>
  }
) =>
  raceFibersWith(self, {
    other: options.other,
    onSelfWin: (winner, loser) =>
      core.flatMap(winner.await(), (exit) => {
        switch (exit._tag) {
          case OpCodes.OP_SUCCESS: {
            return core.flatMap(
              winner.inheritAll(),
              () => options.onSelfDone(exit, loser)
            )
          }
          case OpCodes.OP_FAILURE: {
            return options.onSelfDone(exit, loser)
          }
        }
      }),
    onOtherWin: (winner, loser) =>
      core.flatMap(winner.await(), (exit) => {
        switch (exit._tag) {
          case OpCodes.OP_SUCCESS: {
            return core.flatMap(
              winner.inheritAll(),
              () => options.onOtherDone(exit, loser)
            )
          }
          case OpCodes.OP_FAILURE: {
            return options.onOtherDone(exit, loser)
          }
        }
      })
  }))

/** @internal */
export const race = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, A | A2>
>(2, (self, that) =>
  core.checkInterruptible((isInterruptible) =>
    pipe(
      raceDisconnect(self, isInterruptible),
      raceAwait(raceDisconnect(that, isInterruptible))
    )
  ))

/** @internal */
export const disconnect = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  core.uninterruptibleMask((restore) =>
    core.fiberIdWith((fiberId) =>
      core.flatMap(forkDaemon(restore(self)), (fiber) =>
        pipe(
          restore(internalFiber.join(fiber)),
          core.onInterrupt(() => pipe(fiber, internalFiber.interruptAsFork(fiberId)))
        ))
    )
  )

const raceDisconnect = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  isInterruptible: boolean
): Effect.Effect<R, E, A> =>
  isInterruptible ?
    disconnect(self) :
    core.interruptible(disconnect(core.uninterruptible(self)))

/** @internal */
export const raceAwait = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, A | A2>
>(
  2,
  (self, that) =>
    core.fiberIdWith((parentFiberId) =>
      raceWith(self, {
        other: that,
        onSelfDone: (exit, right) =>
          core.exitMatchEffect(exit, {
            onFailure: (cause) =>
              pipe(
                internalFiber.join(right),
                internalEffect.mapErrorCause((cause2) => internalCause.parallel(cause, cause2))
              ),
            onSuccess: (value) =>
              pipe(
                right,
                core.interruptAsFiber(parentFiberId),
                core.as(value)
              )
          }),
        onOtherDone: (exit, left) =>
          core.exitMatchEffect(exit, {
            onFailure: (cause) =>
              pipe(
                internalFiber.join(left),
                internalEffect.mapErrorCause((cause2) => internalCause.parallel(cause2, cause))
              ),
            onSuccess: (value) =>
              pipe(
                left,
                core.interruptAsFiber(parentFiberId),
                core.as(value)
              )
          })
      })
    )
)

/** @internal */
export const raceFibersWith = dual<
  <E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    options: {
      readonly other: Effect.Effect<R1, E1, A1>
      readonly onSelfWin: (
        winner: Fiber.RuntimeFiber<E, A>,
        loser: Fiber.RuntimeFiber<E1, A1>
      ) => Effect.Effect<R2, E2, A2>
      readonly onOtherWin: (
        winner: Fiber.RuntimeFiber<E1, A1>,
        loser: Fiber.RuntimeFiber<E, A>
      ) => Effect.Effect<R3, E3, A3>
    }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<
    R | R1 | R2 | R3,
    E2 | E3,
    A2 | A3
  >,
  <R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly other: Effect.Effect<R1, E1, A1>
      readonly onSelfWin: (
        winner: Fiber.RuntimeFiber<E, A>,
        loser: Fiber.RuntimeFiber<E1, A1>
      ) => Effect.Effect<R2, E2, A2>
      readonly onOtherWin: (
        winner: Fiber.RuntimeFiber<E1, A1>,
        loser: Fiber.RuntimeFiber<E, A>
      ) => Effect.Effect<R3, E3, A3>
    }
  ) => Effect.Effect<
    R | R1 | R2 | R3,
    E2 | E3,
    A2 | A3
  >
>(2, <R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  self: Effect.Effect<R, E, A>,
  options: {
    readonly other: Effect.Effect<R1, E1, A1>
    readonly onSelfWin: (
      winner: Fiber.RuntimeFiber<E, A>,
      loser: Fiber.RuntimeFiber<E1, A1>
    ) => Effect.Effect<R2, E2, A2>
    readonly onOtherWin: (
      winner: Fiber.RuntimeFiber<E1, A1>,
      loser: Fiber.RuntimeFiber<E, A>
    ) => Effect.Effect<R3, E3, A3>
  }
) =>
  core.withFiberRuntime<R | R1 | R2 | R3, E2 | E3, A2 | A3>((parentFiber, parentStatus) => {
    const parentRuntimeFlags = parentStatus.runtimeFlags
    const raceIndicator = MRef.make(true)
    const leftFiber: FiberRuntime<E, A> = unsafeMakeChildFiber(
      self,
      parentFiber,
      parentRuntimeFlags
    )
    const rightFiber: FiberRuntime<E1, A1> = unsafeMakeChildFiber(
      options.other,
      parentFiber,
      parentRuntimeFlags
    )
    leftFiber.startFork(self)
    rightFiber.startFork(options.other)
    leftFiber.setFiberRef(core.currentForkScopeOverride, Option.some(parentFiber.scope()))
    rightFiber.setFiberRef(core.currentForkScopeOverride, Option.some(parentFiber.scope()))
    return core.async<R | R1 | R2 | R3, E2 | E3, A2 | A3>((cb) => {
      leftFiber.unsafeAddObserver(() => completeRace(leftFiber, rightFiber, options.onSelfWin, raceIndicator, cb))
      rightFiber.unsafeAddObserver(() => completeRace(rightFiber, leftFiber, options.onOtherWin, raceIndicator, cb))
    }, FiberId.combine(leftFiber.id(), rightFiber.id()))
  }))

const completeRace = <R, R1, R2, E2, A2, R3, E3, A3>(
  winner: Fiber.RuntimeFiber<any, any>,
  loser: Fiber.RuntimeFiber<any, any>,
  cont: (winner: Fiber.RuntimeFiber<any, any>, loser: Fiber.RuntimeFiber<any, any>) => Effect.Effect<any, any, any>,
  ab: MRef.MutableRef<boolean>,
  cb: (_: Effect.Effect<R | R1 | R2 | R3, E2 | E3, A2 | A3>) => void
): void => {
  if (MRef.compareAndSet(true, false)(ab)) {
    cb(cont(winner, loser))
  }
}

/** @internal */
export const ensuring = dual<
  <R1, X>(
    finalizer: Effect.Effect<R1, never, X>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R1, E, A>,
  <R, E, A, R1, X>(
    self: Effect.Effect<R, E, A>,
    finalizer: Effect.Effect<R1, never, X>
  ) => Effect.Effect<R | R1, E, A>
>(2, (self, finalizer) =>
  core.uninterruptibleMask((restore) =>
    core.matchCauseEffect(restore(self), {
      onFailure: (cause1) =>
        core.matchCauseEffect(finalizer, {
          onFailure: (cause2) => core.failCause(internalCause.sequential(cause1, cause2)),
          onSuccess: () => core.failCause(cause1)
        }),
      onSuccess: (a) => core.as(finalizer, a)
    })
  ))

/** @internal */
export const invokeWithInterrupt: <R, E, A>(
  self: Effect.Effect<R, E, A>,
  entries: ReadonlyArray<Entry<unknown>>
) => Effect.Effect<R, E, void> = <R, E, A>(dataSource: Effect.Effect<R, E, A>, all: ReadonlyArray<Entry<unknown>>) =>
  core.fiberIdWith((id) =>
    core.flatMap(
      core.flatMap(
        forkDaemon(core.interruptible(dataSource)),
        (processing) =>
          core.async<never, E, void>((cb) => {
            const counts = all.map((_) => _.listeners.count)
            const checkDone = () => {
              if (counts.every((count) => count === 0)) {
                cleanup.forEach((f) => f())
                cb(core.interruptFiber(processing))
              }
            }
            processing.unsafeAddObserver((exit) => {
              cleanup.forEach((f) => f())
              cb(exit)
            })
            const cleanup = all.map((r, i) => {
              const observer = (count: number) => {
                counts[i] = count
                checkDone()
              }
              r.listeners.addObserver(observer)
              return () => r.listeners.removeObserver(observer)
            })
            checkDone()
            return core.sync(() => {
              cleanup.forEach((f) => f())
            })
          })
      ),
      () =>
        core.suspend(() => {
          const residual = all.flatMap((entry) => {
            if (!entry.state.completed) {
              return [entry]
            }
            return []
          })
          return core.forEachSequentialDiscard(
            residual,
            (entry) => complete(entry.request as any, core.exitInterrupt(id))
          )
        })
    )
  )

/** @internal */
export const interruptWhenPossible = dual<
  (all: Iterable<Request<any, any>>) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R, E, void>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    all: Iterable<Request<any, any>>
  ) => Effect.Effect<R, E, void>
>(2, (self, all) =>
  core.fiberRefGetWith(
    currentRequestMap,
    (map) =>
      core.suspend(() => {
        const entries = RA.fromIterable(all).flatMap((_) => map.has(_) ? [map.get(_)!] : [])
        return invokeWithInterrupt(self, entries)
      })
  ))

// circular Tracer

/** @internal */
export const useSpanScoped = (
  name: string,
  options?: {
    readonly attributes?: Record<string, Tracer.AttributeValue>
    readonly links?: ReadonlyArray<Tracer.SpanLink>
    readonly parent?: Tracer.ParentSpan
    readonly root?: boolean
    readonly context?: Context.Context<never>
  }
): Effect.Effect<Scope.Scope, never, Tracer.Span> =>
  acquireRelease(
    internalEffect.makeSpan(name, options),
    (span, exit) =>
      core.flatMap(
        internalEffect.currentTimeNanosTracing,
        (endTime) => core.sync(() => span.end(endTime, exit))
      )
  )

/* @internal */
export const withSpanScoped = (
  name: string,
  options?: {
    readonly attributes?: Record<string, Tracer.AttributeValue>
    readonly links?: ReadonlyArray<Tracer.SpanLink>
    readonly parent?: Tracer.ParentSpan
    readonly root?: boolean
    readonly context?: Context.Context<never>
  }
): Effect.Effect<Scope.Scope, never, void> =>
  core.flatMap(
    internalEffect.makeSpan(name, options),
    (span) =>
      fiberRefLocallyScopedWith(
        core.currentTracerSpan,
        List.prepend(span)
      )
  )

/* @internal */
export const withTracerScoped = (value: Tracer.Tracer): Effect.Effect<Scope.Scope, never, void> =>
  fiberRefLocallyScopedWith(defaultServices.currentServices, Context.add(tracer.tracerTag, value))

/* @internal */
export const withParentSpanScoped = (span: Tracer.ParentSpan): Effect.Effect<Scope.Scope, never, void> =>
  fiberRefLocallyScopedWith(core.currentTracerSpan, List.prepend(span))
