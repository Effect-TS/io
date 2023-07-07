import * as Chunk from "@effect/data/Chunk"
import * as Context from "@effect/data/Context"
import * as Differ from "@effect/data/Differ"
import * as ContextPatch from "@effect/data/Differ/ContextPatch"
import * as HashSetPatch from "@effect/data/Differ/HashSetPatch"
import * as Either from "@effect/data/Either"
import * as Equal from "@effect/data/Equal"
import type { LazyArg } from "@effect/data/Function"
import { dual, identity, pipe } from "@effect/data/Function"
import { globalValue } from "@effect/data/Global"
import * as Hash from "@effect/data/Hash"
import * as HashMap from "@effect/data/HashMap"
import * as HashSet from "@effect/data/HashSet"
import * as List from "@effect/data/List"
import * as MutableRef from "@effect/data/MutableRef"
import * as Option from "@effect/data/Option"
import { pipeArguments } from "@effect/data/Pipeable"
import type { Predicate } from "@effect/data/Predicate"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import type * as Cause from "@effect/io/Cause"
import type * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import type * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import type * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as RuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"
import type * as FiberStatus from "@effect/io/Fiber/Status"
import type * as FiberRef from "@effect/io/FiberRef"
import * as _blockedRequests from "@effect/io/internal/blockedRequests"
import * as internalCause from "@effect/io/internal/cause"
import * as deferred from "@effect/io/internal/deferred"
import type * as FiberRuntime from "@effect/io/internal/fiberRuntime"
import type * as fiberScope from "@effect/io/internal/fiberScope"
import * as DeferredOpCodes from "@effect/io/internal/opCodes/deferred"
import * as OpCodes from "@effect/io/internal/opCodes/effect"
import * as _runtimeFlags from "@effect/io/internal/runtimeFlags"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as LogSpan from "@effect/io/Logger/Span"
import type * as MetricLabel from "@effect/io/Metric/Label"
import type * as Request from "@effect/io/Request"
import type * as BlockedRequests from "@effect/io/RequestBlock"
import type * as RequestResolver from "@effect/io/RequestResolver"
import type * as Scheduler from "@effect/io/Scheduler"
import * as scheduler from "@effect/io/Scheduler"
import type * as Scope from "@effect/io/Scope"
import type * as Tracer from "@effect/io/Tracer"

// -----------------------------------------------------------------------------
// Effect
// -----------------------------------------------------------------------------

/** @internal */
const EffectErrorSymbolKey = "@effect/io/Effect/Error"

/** @internal */
export const EffectErrorTypeId = Symbol.for(EffectErrorSymbolKey)

/** @internal */
export type EffectErrorTypeId = typeof EffectErrorTypeId

/** @internal */
export interface EffectError<E> {
  readonly [EffectErrorTypeId]: EffectErrorTypeId
  readonly _tag: "EffectError"
  readonly cause: Cause.Cause<E>
}

/** @internal */
export const isEffectError = (u: unknown): u is EffectError<unknown> =>
  typeof u === "object" && u != null && EffectErrorTypeId in u

/** @internal */
export const makeEffectError = <E>(cause: Cause.Cause<E>): EffectError<E> => ({
  [EffectErrorTypeId]: EffectErrorTypeId,
  _tag: "EffectError",
  cause
})

/**
 * @internal
 */
export const blocked = <R, E, A>(
  blockedRequests: BlockedRequests.RequestBlock<R>,
  _continue: Effect.Effect<R, E, A>
): Effect.Blocked<R, E, A> => {
  const effect = new EffectPrimitive("Blocked") as any
  effect.i0 = blockedRequests
  effect.i1 = _continue
  return effect
}

/**
 * @internal
 */
export const runRequestBlock = <R>(
  blockedRequests: BlockedRequests.RequestBlock<R>
): Effect.Blocked<R, never, void> => {
  const effect = new EffectPrimitive("RunBlocked") as any
  effect.i0 = blockedRequests
  return effect
}

/** @internal */
export const EffectTypeId: Effect.EffectTypeId = Symbol.for("@effect/io/Effect") as Effect.EffectTypeId

/** @internal */
export type Primitive =
  | Async
  | Commit
  | Failure
  | OnFailure
  | OnSuccess
  | OnStep
  | OnSuccessAndFailure
  | Success
  | Sync
  | UpdateRuntimeFlags
  | While
  | WithRuntime
  | Yield
  | OpTag
  | Blocked
  | RunBlocked
  | Either.Either<any, any>
  | Option.Option<any>

/** @internal */
export type Continuation =
  | OnSuccess
  | OnStep
  | OnSuccessAndFailure
  | OnFailure
  | While
  | RevertFlags

/** @internal */
export class RevertFlags {
  readonly _tag = OpCodes.OP_REVERT_FLAGS
  constructor(
    readonly patch: RuntimeFlagsPatch.RuntimeFlagsPatch,
    readonly op: Primitive & { _tag: OpCodes.OP_UPDATE_RUNTIME_FLAGS }
  ) {
  }
}

/** @internal */
class EffectPrimitive {
  public i0 = undefined
  public i1 = undefined
  public i2 = undefined
  public trace = undefined;
  [EffectTypeId] = effectVariance
  constructor(readonly _tag: Primitive["_tag"]) {}
  [Equal.symbol](this: {}, that: unknown) {
    return this === that
  }
  [Hash.symbol](this: {}) {
    return Hash.random(this)
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
class EffectPrimitiveFailure {
  public i0 = undefined
  public i1 = undefined
  public i2 = undefined
  public trace = undefined;
  [EffectTypeId] = effectVariance
  constructor(readonly _tag: Primitive["_tag"]) {}
  [Equal.symbol](this: {}, that: unknown) {
    return this === that
  }
  [Hash.symbol](this: {}) {
    return Hash.random(this)
  }
  get cause() {
    return this.i0
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
class EffectPrimitiveSuccess {
  public i0 = undefined
  public i1 = undefined
  public i2 = undefined
  public trace = undefined;
  [EffectTypeId] = effectVariance
  constructor(readonly _tag: Primitive["_tag"]) {}
  [Equal.symbol](this: {}, that: unknown) {
    return this === that
  }
  [Hash.symbol](this: {}) {
    return Hash.random(this)
  }
  get value() {
    return this.i0
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
const effectVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export type Op<Tag extends string, Body = {}> = Effect.Effect<never, never, never> & Body & {
  readonly _tag: Tag
}

/** @internal */
export interface Async extends
  Op<OpCodes.OP_ASYNC, {
    readonly i0: (resume: (effect: Primitive) => void) => void
    readonly i1: FiberId.FiberId
  }>
{}

/** @internal */
export interface Blocked<R = any, E = any, A = any> extends
  Op<"Blocked", {
    readonly i0: BlockedRequests.RequestBlock<R>
    readonly i1: Effect.Effect<R, E, A>
  }>
{}

/** @internal */
export interface RunBlocked<R = any> extends
  Op<"RunBlocked", {
    readonly i0: BlockedRequests.RequestBlock<R>
  }>
{}

/** @internal */
export interface Failure extends
  Op<OpCodes.OP_FAILURE, {
    readonly i0: Cause.Cause<unknown>
  }>
{}

/** @internal */
export interface OpTag extends Op<OpCodes.OP_TAG, {}> {}

export interface Commit extends
  Op<OpCodes.OP_COMMIT, {
    commit(): Effect.Effect<unknown, unknown, unknown>
  }>
{}

/** @internal */
export interface OnFailure extends
  Op<OpCodes.OP_ON_FAILURE, {
    readonly i0: Primitive
    readonly i1: (a: Cause.Cause<unknown>) => Primitive
  }>
{}

/** @internal */
export interface OnSuccess extends
  Op<OpCodes.OP_ON_SUCCESS, {
    readonly i0: Primitive
    readonly i1: (a: unknown) => Primitive
  }>
{}

/** @internal */
export interface OnStep extends
  Op<"OnStep", {
    readonly i0: Primitive
    readonly i1: (result: Exit.Exit<any, any> | Blocked) => Primitive
  }>
{}

/** @internal */
export interface OnSuccessAndFailure extends
  Op<OpCodes.OP_ON_SUCCESS_AND_FAILURE, {
    readonly i0: Primitive
    readonly i1: (a: Cause.Cause<unknown>) => Primitive
    readonly i2: (a: unknown) => Primitive
  }>
{}

/** @internal */
export interface Success extends
  Op<OpCodes.OP_SUCCESS, {
    readonly i0: unknown
  }>
{}

/** @internal */
export interface Sync extends
  Op<OpCodes.OP_SYNC, {
    readonly i0: LazyArg<unknown>
  }>
{}

/** @internal */
export interface UpdateRuntimeFlags extends
  Op<OpCodes.OP_UPDATE_RUNTIME_FLAGS, {
    readonly i0: RuntimeFlagsPatch.RuntimeFlagsPatch
    readonly i1?: (oldRuntimeFlags: RuntimeFlags.RuntimeFlags) => Primitive
  }>
{}

/** @internal */
export interface While extends
  Op<OpCodes.OP_WHILE, {
    readonly i0: () => boolean
    readonly i1: () => Primitive
    readonly i2: (a: unknown) => void
  }>
{}

/** @internal */
export interface WithRuntime extends
  Op<OpCodes.OP_WITH_RUNTIME, {
    readonly i0: (fiber: FiberRuntime.FiberRuntime<unknown, unknown>, status: FiberStatus.Running) => Primitive
  }>
{}

/** @internal */
export interface Yield extends Op<OpCodes.OP_YIELD> {}

/** @internal */
export const isEffect = (u: unknown): u is Effect.Effect<unknown, unknown, unknown> =>
  typeof u === "object" && u != null && EffectTypeId in u

/* @internal */
export const withFiberRuntime = <R, E, A>(
  withRuntime: (fiber: FiberRuntime.FiberRuntime<E, A>, status: FiberStatus.Running) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const effect = new EffectPrimitive(OpCodes.OP_WITH_RUNTIME) as any
  effect.i0 = withRuntime
  return effect
}

/* @internal */
export const acquireUseRelease = dual<
  <A, R2, E2, A2, R3, X>(
    use: (a: A) => Effect.Effect<R2, E2, A2>,
    release: (a: A, exit: Exit.Exit<E2, A2>) => Effect.Effect<R3, never, X>
  ) => <R, E>(acquire: Effect.Effect<R, E, A>) => Effect.Effect<R | R2 | R3, E | E2, A2>,
  <R, E, A, R2, E2, A2, R3, X>(
    acquire: Effect.Effect<R, E, A>,
    use: (a: A) => Effect.Effect<R2, E2, A2>,
    release: (a: A, exit: Exit.Exit<E2, A2>) => Effect.Effect<R3, never, X>
  ) => Effect.Effect<R | R2 | R3, E | E2, A2>
>(3, (acquire, use, release) =>
  uninterruptibleMask((restore) =>
    flatMap(
      acquire,
      (a) =>
        flatMap(exit(suspend(() => restore(use(a)))), (exit) =>
          suspend(() => release(a, exit)).pipe(
            matchCauseEffect({
              onFailure: (cause) => {
                switch (exit._tag) {
                  case OpCodes.OP_FAILURE: {
                    return failCause(internalCause.parallel(exit.i0, cause))
                  }
                  case OpCodes.OP_SUCCESS: {
                    return failCause(cause)
                  }
                }
              },
              onSuccess: () => exit
            })
          ))
    )
  ))

/* @internal */
export const as = dual<
  <B>(value: B) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>,
  <R, E, A, B>(self: Effect.Effect<R, E, A>, value: B) => Effect.Effect<R, E, B>
>(2, (self, value) => flatMap(self, () => succeed(value)))

/* @internal */
export const asUnit = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, void> => as(self, void 0)

/* @internal */
export const async = <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => void,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> => {
  const effect = new EffectPrimitive(OpCodes.OP_ASYNC) as any
  effect.i0 = register
  effect.i1 = blockingOn
  return effect
}

/* @internal */
export const asyncInterruptEither = <R, E, A>(
  register: (
    callback: (effect: Effect.Effect<R, E, A>) => void
  ) => Either.Either<Effect.Effect<R, never, void>, Effect.Effect<R, E, A>>,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> =>
  suspend(() => {
    let cancelerRef: Effect.Effect<R, never, void> = unit
    return async<R, E, A>(
      (resume) => {
        const result = register(resume)
        if (Either.isRight(result)) {
          resume(result.right)
        } else {
          cancelerRef = result.left
        }
      },
      blockingOn
    ).pipe(
      onInterrupt(() => cancelerRef)
    )
  })

/* @internal */
export const asyncInterrupt = <R, E, A>(
  register: (callback: (effect: Effect.Effect<R, E, A>) => void) => Effect.Effect<R, never, void>,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> =>
  suspend(() => {
    let cancelerRef: Effect.Effect<R, never, void> = unit
    return async<R, E, A>(
      (resume) => {
        cancelerRef = register(resume)
      },
      blockingOn
    ).pipe(
      onInterrupt(() => cancelerRef)
    )
  })

/* @internal */
export const catchAllCause = dual<
  <E, R2, E2, A2>(
    f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E2, A2 | A>,
  <R, A, E, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R2 | R, E2, A2 | A>
>(2, (self, f) => {
  const effect = new EffectPrimitive(OpCodes.OP_ON_FAILURE) as any
  effect.i0 = self
  effect.i1 = f
  return effect
})

/* @internal */
export const catchAll = dual<
  <E, R2, E2, A2>(
    f: (e: E) => Effect.Effect<R2, E2, A2>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E2, A2 | A>,
  <R, A, E, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    f: (e: E) => Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R2 | R, E2, A2 | A>
>(2, (self, f) => matchEffect(self, { onFailure: f, onSuccess: succeed }))

/**
 * @macro identity
 * @internal
 */
export const unified = <Args extends ReadonlyArray<any>, Ret extends Effect.Effect<any, any, any>>(
  f: (...args: Args) => Ret
) => (...args: Args): Effect.Effect.Unify<Ret> => f(...args)

/* @internal */
export const catchSome = dual<
  <E, R2, E2, A2>(
    pf: (e: E) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E | E2, A2 | A>,
  <R, A, E, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    pf: (e: E) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => Effect.Effect<R2 | R, E | E2, A2 | A>
>(2, (self, pf) =>
  matchCauseEffect(self, {
    onFailure: unified((cause) => {
      const either = internalCause.failureOrCause(cause)
      switch (either._tag) {
        case "Left": {
          return pipe(pf(either.left), Option.getOrElse(() => failCause(cause)))
        }
        case "Right": {
          return failCause(either.right)
        }
      }
    }),
    onSuccess: succeed
  }))

/* @internal */
export const checkInterruptible = <R, E, A>(
  f: (isInterruptible: boolean) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  withFiberRuntime<R, E, A>((_, status) => f(_runtimeFlags.interruption(status.runtimeFlags)))

/* @internal */
export const die = (defect: unknown): Effect.Effect<never, never, never> => failCause(internalCause.die(defect))

/* @internal */
export const dieMessage = (message: string): Effect.Effect<never, never, never> =>
  failCauseSync(() => internalCause.die(internalCause.RuntimeException(message)))

/* @internal */
export const dieSync = (evaluate: LazyArg<unknown>): Effect.Effect<never, never, never> =>
  failCauseSync(() => internalCause.die(evaluate()))

/* @internal */
export const either = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Either.Either<E, A>> =>
  matchEffect(self, {
    onFailure: (e) => succeed(Either.left(e)),
    onSuccess: (a) => succeed(Either.right(a))
  })

/* @internal */
export const context = <R>(): Effect.Effect<R, never, Context.Context<R>> =>
  suspend(() => fiberRefGet(currentContext) as Effect.Effect<never, never, Context.Context<R>>)

/* @internal */
export const contextWithEffect = <R, R0, E, A>(
  f: (context: Context.Context<R0>) => Effect.Effect<R, E, A>
): Effect.Effect<R | R0, E, A> => flatMap(context<R0>(), f)

/* @internal */
export const exit = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Exit.Exit<E, A>> =>
  matchCause(self, {
    onFailure: exitFailCause,
    onSuccess: exitSucceed
  })

/* @internal */
export const fail = <E>(error: E): Effect.Effect<never, E, never> => failCause(internalCause.fail(error))

/* @internal */
export const failSync = <E>(evaluate: LazyArg<E>): Effect.Effect<never, E, never> =>
  failCauseSync(() => internalCause.fail(evaluate()))

/* @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, E, never> => {
  const effect = new EffectPrimitiveFailure(OpCodes.OP_FAILURE) as any
  effect.i0 = cause
  return effect
}

/* @internal */
export const failCauseSync = <E>(evaluate: LazyArg<Cause.Cause<E>>): Effect.Effect<never, E, never> =>
  flatMap(sync(evaluate), failCause)

/* @internal */
export const fiberId: Effect.Effect<never, never, FiberId.FiberId> = withFiberRuntime<never, never, FiberId.FiberId>((
  state
) => succeed(state.id()))

/* @internal */
export const fiberIdWith = <R, E, A>(
  f: (descriptor: FiberId.Runtime) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => withFiberRuntime<R, E, A>((state) => f(state.id()))

/* @internal */
export const flatMap = dual<
  <A, R1, E1, B>(
    f: (a: A) => Effect.Effect<R1, E1, B>
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R1 | R, E1 | E, B>,
  <R, E, A, R1, E1, B>(
    self: Effect.Effect<R, E, A>,
    f: (a: A) => Effect.Effect<R1, E1, B>
  ) => Effect.Effect<R1 | R, E1 | E, B>
>(2, (self, f) => {
  const effect = new EffectPrimitive(OpCodes.OP_ON_SUCCESS) as any
  effect.i0 = self
  effect.i1 = f
  return effect
})

/* @internal */
export const step = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, Exit.Exit<E, A> | Effect.Blocked<R, E, A>> => {
  const effect = new EffectPrimitive("OnStep") as any
  effect.i0 = self
  effect.i1 = exitSucceed
  return effect
}

/* @internal */
export const flatMapStep = <R, E, A, R1, E1, B>(
  self: Effect.Effect<R, E, A>,
  f: (step: Exit.Exit<E, A> | Effect.Blocked<R, E, A>) => Effect.Effect<R1, E1, B>
): Effect.Effect<R | R1, E1, B> => {
  const effect = new EffectPrimitive("OnStep") as any
  effect.i0 = self
  effect.i1 = f
  return effect
}

/* @internal */
export const flatten = <R, E, R1, E1, A>(self: Effect.Effect<R, E, Effect.Effect<R1, E1, A>>) => flatMap(self, identity)

/* @internal */
export const flip = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, A, E> =>
  matchEffect(self, { onFailure: succeed, onSuccess: fail })

/* @internal */
export const matchCause = dual<
  <E, A2, A, A3>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => A2
      readonly onSuccess: (a: A) => A3
    }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, A2 | A3>,
  <R, E, A2, A, A3>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => A2
      readonly onSuccess: (a: A) => A3
    }
  ) => Effect.Effect<R, never, A2 | A3>
>(2, (self, { onFailure, onSuccess }) =>
  matchCauseEffect(self, {
    onFailure: (cause) => succeed(onFailure(cause)),
    onSuccess: (a) => succeed(onSuccess(a))
  }))

/* @internal */
export const matchCauseEffect = dual<
  <E, A, R2, E2, A2, R3, E3, A3>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
    }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R3 | R, E2 | E3, A2 | A3>,
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
    }
  ) => Effect.Effect<R2 | R3 | R, E2 | E3, A2 | A3>
>(2, (self, { onFailure, onSuccess }) => {
  const effect = new EffectPrimitive(OpCodes.OP_ON_SUCCESS_AND_FAILURE) as any
  effect.i0 = self
  effect.i1 = onFailure
  effect.i2 = onSuccess
  return effect
})

/* @internal */
export const matchEffect = dual<
  <E, A, R2, E2, A2, R3, E3, A3>(
    options: {
      readonly onFailure: (e: E) => Effect.Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
    }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R3 | R, E2 | E3, A2 | A3>,
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onFailure: (e: E) => Effect.Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
    }
  ) => Effect.Effect<R2 | R3 | R, E2 | E3, A2 | A3>
>(2, (self, { onFailure, onSuccess }) =>
  matchCauseEffect(self, {
    onFailure: (cause) => {
      const failures = internalCause.failures(cause)
      const defects = internalCause.defects(cause)
      if (defects.length > 0) {
        return failCause(internalCause.electFailures(cause))
      }
      if (failures.length > 0) {
        return onFailure(Chunk.unsafeHead(failures))
      }
      return failCause(cause as Cause.Cause<never>)
    },
    onSuccess
  }))

/* @internal */
export const forEach = dual<
  <A, R, E, B>(f: (a: A, i: number) => Effect.Effect<R, E, B>) => (self: Iterable<A>) => Effect.Effect<R, E, Array<B>>,
  <A, R, E, B>(self: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, B>) => Effect.Effect<R, E, Array<B>>
>(2, (self, f) =>
  suspend(() => {
    const arr = ReadonlyArray.fromIterable(self)
    const ret = new Array(arr.length)
    let i = 0
    return as(
      whileLoop({
        while: () => i < arr.length,
        body: () => f(arr[i], i),
        step: (b) => {
          ret[i++] = b
        }
      }),
      ret
    )
  }))

/* @internal */
export const forEachDiscard = dual<
  <A, R, E, B>(f: (a: A, i: number) => Effect.Effect<R, E, B>) => (self: Iterable<A>) => Effect.Effect<R, E, void>,
  <A, R, E, B>(self: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, B>) => Effect.Effect<R, E, void>
>(2, (self, f) =>
  suspend(() => {
    const arr = ReadonlyArray.fromIterable(self)
    let i = 0
    return whileLoop({
      while: () => i < arr.length,
      body: () => f(arr[i], i),
      step: () => {
        i++
      }
    })
  }))

/* @internal */
export const if_ = dual<
  <R1, R2, E1, E2, A, A1>(
    options: {
      readonly onTrue: Effect.Effect<R1, E1, A>
      readonly onFalse: Effect.Effect<R2, E2, A1>
    }
  ) => <R = never, E = never>(
    self: Effect.Effect<R, E, boolean> | boolean
  ) => Effect.Effect<R | R1 | R2, E | E1 | E2, A | A1>,
  {
    <R1, R2, E1, E2, A, A1>(
      self: boolean,
      options: {
        readonly onTrue: Effect.Effect<R1, E1, A>
        readonly onFalse: Effect.Effect<R2, E2, A1>
      }
    ): Effect.Effect<R1 | R2, E1 | E2, A | A1>
    <R, E, R1, R2, E1, E2, A, A1>(
      self: Effect.Effect<R, E, boolean>,
      options: {
        readonly onTrue: Effect.Effect<R1, E1, A>
        readonly onFalse: Effect.Effect<R2, E2, A1>
      }
    ): Effect.Effect<R1 | R2 | R, E1 | E2 | E, A | A1>
  }
>(
  (args) => typeof args[0] === "boolean" || isEffect(args[0]),
  (self: boolean | Effect.Effect<unknown, unknown, unknown>, { onFalse, onTrue }: {
    readonly onTrue: Effect.Effect<unknown, unknown, unknown>
    readonly onFalse: Effect.Effect<unknown, unknown, unknown>
  }) => typeof self === "boolean" ? (self ? onTrue : onFalse) : flatMap(self, unified((b) => (b ? onTrue : onFalse)))
)

/* @internal */
export const interrupt: Effect.Effect<never, never, never> = flatMap(fiberId, (fiberId) => interruptWith(fiberId))

/* @internal */
export const interruptWith = (fiberId: FiberId.FiberId): Effect.Effect<never, never, never> =>
  failCause(internalCause.interrupt(fiberId))

/* @internal */
export const interruptible = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const effect = new EffectPrimitive(OpCodes.OP_UPDATE_RUNTIME_FLAGS) as any
  effect.i0 = RuntimeFlagsPatch.enable(_runtimeFlags.Interruption)
  const _continue = (orBlock: any) => {
    if (orBlock._tag === "Blocked") {
      return blocked(orBlock.i0, interruptible(orBlock.i1))
    } else {
      return orBlock
    }
  }
  effect.i1 = () => flatMapStep(self, _continue)
  return effect
}

/* @internal */
export const interruptibleMask = <R, E, A>(
  f: (restore: <RX, EX, AX>(effect: Effect.Effect<RX, EX, AX>) => Effect.Effect<RX, EX, AX>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const effect = new EffectPrimitive(OpCodes.OP_UPDATE_RUNTIME_FLAGS) as any
  effect.i0 = RuntimeFlagsPatch.enable(_runtimeFlags.Interruption)
  const _continue = (step: Exit.Exit<E, A> | Effect.Blocked<R, E, A>): Exit.Exit<E, A> | Effect.Blocked<R, E, A> => {
    if (step._tag === "Blocked") {
      return blocked(step.i0, interruptible(step.i1))
    }
    return step
  }
  effect.i1 = (oldFlags: RuntimeFlags.RuntimeFlags) =>
    _runtimeFlags.interruption(oldFlags)
      ? step(f(interruptible))
      : step(f(uninterruptible))
  return flatMap(effect, _continue)
}

/* @internal */
export const intoDeferred = dual<
  <E, A>(deferred: Deferred.Deferred<E, A>) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, boolean>,
  <R, E, A>(self: Effect.Effect<R, E, A>, deferred: Deferred.Deferred<E, A>) => Effect.Effect<R, never, boolean>
>(2, (self, deferred) =>
  uninterruptibleMask((restore) =>
    flatMap(
      exit(restore(self)),
      (exit) => deferredDone(deferred, exit)
    )
  ))

/* @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>,
  <R, E, A, B>(self: Effect.Effect<R, E, A>, f: (a: A) => B) => Effect.Effect<R, E, B>
>(2, (self, f) => flatMap(self, (a) => sync(() => f(a))))

/* @internal */
export const mapBoth = dual<
  <E, A, E2, A2>(
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E2, A2>,
  <R, E, A, E2, A2>(
    self: Effect.Effect<R, E, A>,
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ) => Effect.Effect<R, E2, A2>
>(2, (self, { onFailure, onSuccess }) =>
  matchEffect(self, {
    onFailure: (e) => failSync(() => onFailure(e)),
    onSuccess: (a) => sync(() => onSuccess(a))
  }))

/* @internal */
export const mapError = dual<
  <E, E2>(f: (e: E) => E2) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E2, A>,
  <R, A, E, E2>(self: Effect.Effect<R, E, A>, f: (e: E) => E2) => Effect.Effect<R, E2, A>
>(2, (self, f) =>
  matchCauseEffect(self, {
    onFailure: (cause) => {
      const either = internalCause.failureOrCause(cause)
      switch (either._tag) {
        case "Left": {
          return failSync(() => f(either.left))
        }
        case "Right": {
          return failCause(either.right)
        }
      }
    },
    onSuccess: succeed
  }))

/* @internal */
export const onError = dual<
  <E, R2, X>(
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, X>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E, A>,
  <R, A, E, R2, X>(
    self: Effect.Effect<R, E, A>,
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, X>
  ) => Effect.Effect<R2 | R, E, A>
>(2, (self, cleanup) => onExit(self, unified((exit) => exitIsSuccess(exit) ? unit : cleanup(exit.i0))))

/* @internal */
export const onExit = dual<
  <E, A, R2, X>(
    cleanup: (exit: Exit.Exit<E, A>) => Effect.Effect<R2, never, X>
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E, A>,
  <R, E, A, R2, X>(
    self: Effect.Effect<R, E, A>,
    cleanup: (exit: Exit.Exit<E, A>) => Effect.Effect<R2, never, X>
  ) => Effect.Effect<R2 | R, E, A>
>(2, (self, cleanup) =>
  uninterruptibleMask((restore) =>
    matchCauseEffect(restore(self), {
      onFailure: (cause1) => {
        const result = exitFailCause(cause1)
        return matchCauseEffect(cleanup(result), {
          onFailure: (cause2) => exitFailCause(internalCause.sequential(cause1, cause2)),
          onSuccess: () => result
        })
      },
      onSuccess: (success) => {
        const result = exitSucceed(success)
        return zipRight(cleanup(result), result)
      }
    })
  ))

/* @internal */
export const onInterrupt = dual<
  <R2, X>(
    cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect.Effect<R2, never, X>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R2 | R, E, A>,
  <R, E, A, R2, X>(
    self: Effect.Effect<R, E, A>,
    cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect.Effect<R2, never, X>
  ) => Effect.Effect<R2 | R, E, A>
>(2, (self, cleanup) =>
  onExit(
    self,
    exitMatch({
      onFailure: (cause) =>
        internalCause.isInterruptedOnly(cause)
          ? asUnit(cleanup(internalCause.interruptors(cause)))
          : unit,
      onSuccess: () => unit
    })
  ))

/* @internal */
export const orElse = dual<
  <R2, E2, A2>(
    that: LazyArg<Effect.Effect<R2, E2, A2>>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E2, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: LazyArg<Effect.Effect<R2, E2, A2>>
  ) => Effect.Effect<R | R2, E2, A | A2>
>(2, (self, that) => attemptOrElse(self, that, succeed))

/* @internal */
export const orDie = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A> => orDieWith(self, identity)

/* @internal */
export const orDieWith = dual<
  <E>(f: (error: E) => unknown) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, f: (error: E) => unknown) => Effect.Effect<R, never, A>
>(2, (self, f) =>
  matchEffect(self, {
    onFailure: (e) => die(f(e)),
    onSuccess: succeed
  }))

/* @internal */
export const partitionMap = <A, A1, A2>(
  elements: Iterable<A>,
  f: (a: A) => Either.Either<A1, A2>
): readonly [Array<A1>, Array<A2>] =>
  ReadonlyArray.fromIterable(elements).reduceRight(
    ([lefts, rights], current) => {
      const either = f(current)
      switch (either._tag) {
        case "Left": {
          return [[either.left, ...lefts], rights]
        }
        case "Right": {
          return [lefts, [either.right, ...rights]]
        }
      }
    },
    [new Array<A1>(), new Array<A2>()]
  )

/* @internal */
export const provideContext = dual<
  <R>(context: Context.Context<R>) => <E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<never, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, context: Context.Context<R>) => Effect.Effect<never, E, A>
>(2, <R, E, A>(self: Effect.Effect<R, E, A>, context: Context.Context<R>) =>
  fiberRefLocally(
    currentContext,
    context
  )(self as Effect.Effect<never, E, A>))

/* @internal */
export const provideSomeContext = dual<
  <R>(context: Context.Context<R>) => <R1, E, A>(self: Effect.Effect<R1, E, A>) => Effect.Effect<Exclude<R1, R>, E, A>,
  <R, R1, E, A>(self: Effect.Effect<R1, E, A>, context: Context.Context<R>) => Effect.Effect<Exclude<R1, R>, E, A>
>(2, <R1, R, E, A>(self: Effect.Effect<R1, E, A>, context: Context.Context<R>) =>
  fiberRefLocallyWith(
    currentContext,
    (parent) => Context.merge(parent, context)
  )(self as Effect.Effect<never, E, A>))

/* @internal */
export const contramapContext = dual<
  <R0, R>(
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => <E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R0, E, A>,
  <R0, R, E, A>(
    self: Effect.Effect<R, E, A>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => Effect.Effect<R0, E, A>
>(2, <R0, R, E, A>(
  self: Effect.Effect<R, E, A>,
  f: (context: Context.Context<R0>) => Context.Context<R>
) => contextWithEffect((context: Context.Context<R0>) => provideContext(self, f(context))))

/* @internal */
export const runtimeFlags: Effect.Effect<never, never, RuntimeFlags.RuntimeFlags> = withFiberRuntime<
  never,
  never,
  RuntimeFlags.RuntimeFlags
>((_, status) => succeed(status.runtimeFlags))

/* @internal */
export const succeed = <A>(value: A): Effect.Effect<never, never, A> => {
  const effect = new EffectPrimitiveSuccess(OpCodes.OP_SUCCESS) as any
  effect.i0 = value
  return effect
}

/* @internal */
export const suspend = <R, E, A>(effect: LazyArg<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A> =>
  flatMap(sync(effect), identity)

/* @internal */
export const sync = <A>(evaluate: LazyArg<A>): Effect.Effect<never, never, A> => {
  const effect = new EffectPrimitive(OpCodes.OP_SYNC) as any
  effect.i0 = evaluate
  return effect
}

/* @internal */
export const tap = dual<
  <A, R2, E2, _>(
    f: (a: A) => Effect.Effect<R2, E2, _>
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, A, R2, E2, _>(
    self: Effect.Effect<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, _>
  ) => Effect.Effect<R | R2, E | E2, A>
>(2, (self, f) => flatMap(self, (a) => as(f(a), a)))

/* @internal */
export const transplant = <R, E, A>(
  f: (grafter: <R2, E2, A2>(effect: Effect.Effect<R2, E2, A2>) => Effect.Effect<R2, E2, A2>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  withFiberRuntime<R, E, A>((state) => {
    const scopeOverride = state.getFiberRef(currentForkScopeOverride)
    const scope = pipe(scopeOverride, Option.getOrElse(() => state.scope()))
    return f(fiberRefLocally(currentForkScopeOverride, Option.some(scope)))
  })

/* @internal */
export const attemptOrElse = dual<
  <R2, E2, A2, A, R3, E3, A3>(
    that: LazyArg<Effect.Effect<R2, E2, A2>>,
    onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2 | R3, E2 | E3, A2 | A3>,
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Effect.Effect<R, E, A>,
    that: LazyArg<Effect.Effect<R2, E2, A2>>,
    onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
  ) => Effect.Effect<R | R2 | R3, E2 | E3, A2 | A3>
>(3, (self, that, onSuccess) =>
  matchCauseEffect(self, {
    onFailure: (cause) => {
      const defects = internalCause.defects(cause)
      if (defects.length > 0) {
        return failCause(Option.getOrThrow(internalCause.keepDefectsAndElectFailures(cause)))
      }
      return that()
    },
    onSuccess
  }))

/* @internal */
export const uninterruptible: <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const effect = new EffectPrimitive(OpCodes.OP_UPDATE_RUNTIME_FLAGS) as any
  effect.i0 = RuntimeFlagsPatch.disable(_runtimeFlags.Interruption)
  effect.i1 = () => flatMapStep(self, _continue)
  const _continue = (orBlock: any) => {
    if (orBlock._tag === "Blocked") {
      return blocked(orBlock.i0, uninterruptible(orBlock.i1))
    } else {
      return orBlock
    }
  }
  return effect
}

/* @internal */
export const uninterruptibleMask = <R, E, A>(
  f: (restore: <RX, EX, AX>(effect: Effect.Effect<RX, EX, AX>) => Effect.Effect<RX, EX, AX>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const effect = new EffectPrimitive(OpCodes.OP_UPDATE_RUNTIME_FLAGS) as any
  effect.i0 = RuntimeFlagsPatch.disable(_runtimeFlags.Interruption)
  const _continue = (step: Exit.Exit<E, A> | Effect.Blocked<R, E, A>): Exit.Exit<E, A> | Effect.Blocked<R, E, A> => {
    if (step._tag === "Blocked") {
      return blocked(step.i0, uninterruptible(step.i1))
    }
    return step
  }
  effect.i1 = (oldFlags: RuntimeFlags.RuntimeFlags) =>
    _runtimeFlags.interruption(oldFlags)
      ? step(f(interruptible))
      : step(f(uninterruptible))
  return flatMap(effect, _continue)
}

/* @internal */
export const unit: Effect.Effect<never, never, void> = succeed(void 0)

/* @internal */
export const updateRuntimeFlags = (patch: RuntimeFlagsPatch.RuntimeFlagsPatch): Effect.Effect<never, never, void> => {
  const effect = new EffectPrimitive(OpCodes.OP_UPDATE_RUNTIME_FLAGS) as any
  effect.i0 = patch
  effect.i1 = void 0
  return effect
}

/* @internal */
export const whenEffect = dual<
  <R, E>(
    predicate: Effect.Effect<R, E, boolean>
  ) => <R2, E2, A>(
    effect: Effect.Effect<R2, E2, A>
  ) => Effect.Effect<R | R2, E | E2, Option.Option<A>>,
  <R, E, A, R2, E2>(
    self: Effect.Effect<R2, E2, A>,
    predicate: Effect.Effect<R, E, boolean>
  ) => Effect.Effect<R | R2, E | E2, Option.Option<A>>
>(2, (self, predicate) =>
  flatMap(predicate, (b) => {
    if (b) {
      return pipe(self, map(Option.some))
    }
    return succeed(Option.none())
  }))

/* @internal */
export const whileLoop = <R, E, A>(
  options: {
    readonly while: LazyArg<boolean>
    readonly body: LazyArg<Effect.Effect<R, E, A>>
    readonly step: (a: A) => void
  }
): Effect.Effect<R, E, void> => {
  const effect = new EffectPrimitive(OpCodes.OP_WHILE) as any
  effect.i0 = options.while
  effect.i1 = options.body
  effect.i2 = options.step
  return effect
}

/* @internal */
export const withRuntimeFlags = dual<
  (update: RuntimeFlagsPatch.RuntimeFlagsPatch) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, update: RuntimeFlagsPatch.RuntimeFlagsPatch) => Effect.Effect<R, E, A>
>(2, (self, update) => {
  const effect = new EffectPrimitive(OpCodes.OP_UPDATE_RUNTIME_FLAGS) as any
  effect.i0 = update
  effect.i1 = () => self
  return effect
})

/* @internal */
export const yieldNow = (options?: {
  readonly priority?: number
}): Effect.Effect<never, never, void> => {
  const effect = new EffectPrimitive(OpCodes.OP_YIELD) as any
  return typeof options?.priority !== "undefined" ?
    withSchedulingPriority(options.priority)(effect) :
    effect
}

/* @internal */
export const zip = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, [A, A2]>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, [A, A2]>
>(2, <R, E, A, R2, E2, A2>(
  self: Effect.Effect<R, E, A>,
  that: Effect.Effect<R2, E2, A2>
): Effect.Effect<R | R2, E | E2, [A, A2]> => flatMap(self, (a) => map(that, (b) => [a, b] as [A, A2])))

/* @internal */
export const zipFlatten = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A extends ReadonlyArray<any>>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E | E2, [...A, A2]>,
  <R, E, A extends ReadonlyArray<any>, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, [...A, A2]>
>(2, <R, E, A extends ReadonlyArray<any>, R2, E2, A2>(
  self: Effect.Effect<R, E, A>,
  that: Effect.Effect<R2, E2, A2>
): Effect.Effect<R | R2, E | E2, [...A, A2]> => flatMap(self, (a) => map(that, (b) => [...a, b] as [...A, A2])))

/* @internal */
export const zipLeft = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, A>
>(2, (self, that) => flatMap(self, (a) => as(that, a)))

/* @internal */
export const zipRight = dual<
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, A2>
>(2, (self, that) => flatMap(self, () => that))

/* @internal */
export const zipWith = dual<
  <R2, E2, A2, A, B>(
    that: Effect.Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, B>,
  <R, E, R2, E2, A2, A, B>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B
  ) => Effect.Effect<R | R2, E | E2, B>
>(3, (self, that, f) => flatMap(self, (a) => map(that, (b) => f(a, b))))

/* @internal */
export const never: Effect.Effect<never, never, never> = asyncInterruptEither<never, never, never>(() => {
  const interval = setInterval(() => {
    //
  }, 2 ** 31 - 1)
  return Either.left(sync(() => clearInterval(interval)))
})

// -----------------------------------------------------------------------------
// Fiber
// -----------------------------------------------------------------------------

/* @internal */
export const interruptFiber = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, Exit.Exit<E, A>> =>
  flatMap(fiberId, (fiberId) => pipe(self, interruptAsFiber(fiberId)))

/* @internal */
export const interruptAsFiber = dual<
  (fiberId: FiberId.FiberId) => <E, A>(self: Fiber.Fiber<E, A>) => Effect.Effect<never, never, Exit.Exit<E, A>>,
  <E, A>(self: Fiber.Fiber<E, A>, fiberId: FiberId.FiberId) => Effect.Effect<never, never, Exit.Exit<E, A>>
>(2, (self, fiberId) => flatMap(self.interruptAsFork(fiberId), () => self.await()))

// -----------------------------------------------------------------------------
// LogLevel
// -----------------------------------------------------------------------------

/** @internal */
export const logLevelAll: LogLevel.LogLevel = {
  _tag: "All",
  syslog: 0,
  label: "ALL",
  ordinal: Number.MIN_SAFE_INTEGER
}

/** @internal */
export const logLevelFatal: LogLevel.LogLevel = {
  _tag: "Fatal",
  syslog: 2,
  label: "FATAL",
  ordinal: 50000
}

/** @internal */
export const logLevelError: LogLevel.LogLevel = {
  _tag: "Error",
  syslog: 3,
  label: "ERROR",
  ordinal: 40000
}

/** @internal */
export const logLevelWarning: LogLevel.LogLevel = {
  _tag: "Warning",
  syslog: 4,
  label: "WARN",
  ordinal: 30000
}

/** @internal */
export const logLevelInfo: LogLevel.LogLevel = {
  _tag: "Info",
  syslog: 6,
  label: "INFO",
  ordinal: 20000
}

/** @internal */
export const logLevelDebug: LogLevel.LogLevel = {
  _tag: "Debug",
  syslog: 7,
  label: "DEBUG",
  ordinal: 10000
}

/** @internal */
export const logLevelTrace: LogLevel.LogLevel = {
  _tag: "Trace",
  syslog: 7,
  label: "TRACE",
  ordinal: 0
}

/** @internal */
export const logLevelNone: LogLevel.LogLevel = {
  _tag: "None",
  syslog: 7,
  label: "OFF",
  ordinal: Number.MAX_SAFE_INTEGER
}

/** @internal */
export const allLogLevels: ReadonlyArray<LogLevel.LogLevel> = [
  logLevelAll,
  logLevelTrace,
  logLevelDebug,
  logLevelInfo,
  logLevelWarning,
  logLevelError,
  logLevelFatal,
  logLevelNone
]

// -----------------------------------------------------------------------------
// FiberRef
// -----------------------------------------------------------------------------

/** @internal */
const FiberRefSymbolKey = "@effect/io/FiberRef"

/** @internal */
export const FiberRefTypeId: FiberRef.FiberRefTypeId = Symbol.for(
  FiberRefSymbolKey
) as FiberRef.FiberRefTypeId

/** @internal */
const fiberRefVariance = {
  _A: (_: never) => _
}

/* @internal */
export const fiberRefGet = <A>(self: FiberRef.FiberRef<A>): Effect.Effect<never, never, A> =>
  fiberRefModify(self, (a) => [a, a] as const)

/* @internal */
export const fiberRefGetAndSet = dual<
  <A>(value: A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, A>,
  <A>(self: FiberRef.FiberRef<A>, value: A) => Effect.Effect<never, never, A>
>(2, (self, value) => fiberRefModify(self, (v) => [v, value] as const))

/* @internal */
export const fiberRefGetAndUpdate = dual<
  <A>(f: (a: A) => A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, A>,
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A) => Effect.Effect<never, never, A>
>(2, (self, f) => fiberRefModify(self, (v) => [v, f(v)] as const))

/* @internal */
export const fiberRefGetAndUpdateSome = dual<
  <A>(
    pf: (a: A) => Option.Option<A>
  ) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, A>,
  <A>(
    self: FiberRef.FiberRef<A>,
    pf: (a: A) => Option.Option<A>
  ) => Effect.Effect<never, never, A>
>(2, (self, pf) => fiberRefModify(self, (v) => [v, Option.getOrElse(pf(v), () => v)] as const))

/* @internal */
export const fiberRefGetWith = dual<
  <A, R, E, B>(f: (a: A) => Effect.Effect<R, E, B>) => (self: FiberRef.FiberRef<A>) => Effect.Effect<R, E, B>,
  <A, R, E, B>(self: FiberRef.FiberRef<A>, f: (a: A) => Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>
>(2, (self, f) => flatMap(fiberRefGet(self), f))

/* @internal */
export const fiberRefSet = dual<
  <A>(value: A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, void>,
  <A>(self: FiberRef.FiberRef<A>, value: A) => Effect.Effect<never, never, void>
>(2, (self, value) => fiberRefModify(self, () => [void 0, value] as const))

/* @internal */
export const fiberRefDelete = <A>(self: FiberRef.FiberRef<A>): Effect.Effect<never, never, void> =>
  withFiberRuntime<never, never, void>((state) => {
    state.unsafeDeleteFiberRef(self)
    return unit
  })

/* @internal */
export const fiberRefReset = <A>(self: FiberRef.FiberRef<A>): Effect.Effect<never, never, void> =>
  fiberRefSet(self, self.initial)

/* @internal */
export const fiberRefModify = dual<
  <A, B>(f: (a: A) => readonly [B, A]) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, B>,
  <A, B>(self: FiberRef.FiberRef<A>, f: (a: A) => readonly [B, A]) => Effect.Effect<never, never, B>
>(2, <A, B>(
  self: FiberRef.FiberRef<A>,
  f: (a: A) => readonly [B, A]
): Effect.Effect<never, never, B> =>
  withFiberRuntime<never, never, B>((state) => {
    const [b, a] = f(state.getFiberRef(self) as A)
    state.setFiberRef(self, a)
    return succeed(b)
  }))

/* @internal */
export const fiberRefModifySome = <A, B>(
  self: FiberRef.FiberRef<A>,
  def: B,
  f: (a: A) => Option.Option<readonly [B, A]>
): Effect.Effect<never, never, B> => fiberRefModify(self, (v) => Option.getOrElse(f(v), () => [def, v] as const))

/* @internal */
export const fiberRefUpdate = dual<
  <A>(f: (a: A) => A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, void>,
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A) => Effect.Effect<never, never, void>
>(2, (self, f) => fiberRefModify(self, (v) => [void 0, f(v)] as const))

/* @internal */
export const fiberRefUpdateSome = dual<
  <A>(pf: (a: A) => Option.Option<A>) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, void>,
  <A>(self: FiberRef.FiberRef<A>, pf: (a: A) => Option.Option<A>) => Effect.Effect<never, never, void>
>(2, (self, pf) => fiberRefModify(self, (v) => [void 0, Option.getOrElse(pf(v), () => v)] as const))

/* @internal */
export const fiberRefUpdateAndGet = dual<
  <A>(f: (a: A) => A) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, A>,
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A) => Effect.Effect<never, never, A>
>(2, (self, f) =>
  fiberRefModify(self, (v) => {
    const result = f(v)
    return [result, result] as const
  }))

/* @internal */
export const fiberRefUpdateSomeAndGet = dual<
  <A>(pf: (a: A) => Option.Option<A>) => (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, A>,
  <A>(self: FiberRef.FiberRef<A>, pf: (a: A) => Option.Option<A>) => Effect.Effect<never, never, A>
>(2, (self, pf) =>
  fiberRefModify(self, (v) => {
    const result = Option.getOrElse(pf(v), () => v)
    return [result, result] as const
  }))

// circular
/** @internal */
const RequestResolverSymbolKey = "@effect/io/RequestResolver"

/** @internal */
export const RequestResolverTypeId: RequestResolver.RequestResolverTypeId = Symbol.for(
  RequestResolverSymbolKey
) as RequestResolver.RequestResolverTypeId

const dataSourceVariance = {
  _R: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export class RequestResolverImpl<R, A> implements RequestResolver.RequestResolver<A, R> {
  readonly [RequestResolverTypeId] = dataSourceVariance
  constructor(
    readonly runAll: (
      requests: Array<Array<Request.Entry<A>>>
    ) => Effect.Effect<R, never, void>,
    readonly target?: unknown
  ) {
    this.runAll = runAll as any
  }
  [Hash.symbol](): number {
    return this.target ? Hash.hash(this.target) : Hash.random(this)
  }
  [Equal.symbol](that: unknown): boolean {
    return this.target ?
      isRequestResolver(that) && Equal.equals(this.target, (that as RequestResolverImpl<any, any>).target) :
      this === that
  }
  identified(...ids: Array<unknown>): RequestResolver.RequestResolver<A, R> {
    return new RequestResolverImpl(this.runAll, Chunk.fromIterable(ids))
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const isRequestResolver = (u: unknown): u is RequestResolver.RequestResolver<unknown, unknown> =>
  typeof u === "object" && u != null && RequestResolverTypeId in u

// end

/** @internal */
export const resolverLocally = dual<
  <A>(
    self: FiberRef.FiberRef<A>,
    value: A
  ) => <R, B extends Request.Request<any, any>>(
    use: RequestResolver.RequestResolver<B, R>
  ) => RequestResolver.RequestResolver<B, R>,
  <R, B extends Request.Request<any, any>, A>(
    use: RequestResolver.RequestResolver<B, R>,
    self: FiberRef.FiberRef<A>,
    value: A
  ) => RequestResolver.RequestResolver<B, R>
>(3, <R, B extends Request.Request<any, any>, A>(
  use: RequestResolver.RequestResolver<B, R>,
  self: FiberRef.FiberRef<A>,
  value: A
): RequestResolver.RequestResolver<B, R> =>
  new RequestResolverImpl<R, B>(
    (requests) =>
      fiberRefLocally(
        use.runAll(requests),
        self,
        value
      ),
    Chunk.make("Locally", use, self, value)
  ))

/** @internal */
export const requestBlockLocally = <R, A>(
  self: BlockedRequests.RequestBlock<R>,
  ref: FiberRef.FiberRef<A>,
  value: A
): BlockedRequests.RequestBlock<R> => _blockedRequests.reduce(self, LocallyReducer(ref, value))

const LocallyReducer = <R, A>(
  ref: FiberRef.FiberRef<A>,
  value: A
): BlockedRequests.RequestBlock.Reducer<R, BlockedRequests.RequestBlock<R>> => ({
  emptyCase: () => _blockedRequests.empty,
  parCase: (left, right) => _blockedRequests.par(left, right),
  seqCase: (left, right) => _blockedRequests.seq(left, right),
  singleCase: (dataSource, blockedRequest) =>
    _blockedRequests.single(
      resolverLocally(dataSource, ref, value),
      blockedRequest
    )
})

/* @internal */
export const fiberRefLocally: {
  <A>(self: FiberRef.FiberRef<A>, value: A): <R, E, B>(use: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>
  <R, E, B, A>(use: Effect.Effect<R, E, B>, self: FiberRef.FiberRef<A>, value: A): Effect.Effect<R, E, B>
} = dual<
  <A>(self: FiberRef.FiberRef<A>, value: A) => <R, E, B>(use: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>,
  <R, E, B, A>(use: Effect.Effect<R, E, B>, self: FiberRef.FiberRef<A>, value: A) => Effect.Effect<R, E, B>
>(3, (use, self, value) =>
  flatMap(
    acquireUseRelease(
      zipLeft(fiberRefGet(self), fiberRefSet(self, value)),
      () => step(use),
      (oldValue) => fiberRefSet(self, oldValue)
    ),
    (res) => {
      if (res._tag === "Blocked") {
        return blocked(res.i0, fiberRefLocally(res.i1, self, value))
      }
      return res
    }
  ))

/* @internal */
export const fiberRefLocallyWith = dual<
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A) => <R, E, B>(use: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>,
  <R, E, B, A>(use: Effect.Effect<R, E, B>, self: FiberRef.FiberRef<A>, f: (a: A) => A) => Effect.Effect<R, E, B>
>(3, (use, self, f) => fiberRefGetWith(self, (a) => pipe(use, fiberRefLocally(self, f(a)))))

/** @internal */
export const fiberRefUnsafeMake = <Value>(
  initial: Value,
  options?: {
    readonly fork?: (a: Value) => Value
    readonly join?: (left: Value, right: Value) => Value
  }
): FiberRef.FiberRef<Value> =>
  fiberRefUnsafeMakePatch(initial, {
    differ: Differ.update(),
    fork: options?.fork ?? identity,
    join: options?.join
  })

/** @internal */
export const fiberRefUnsafeMakeHashSet = <A>(
  initial: HashSet.HashSet<A>
): FiberRef.FiberRef<HashSet.HashSet<A>> =>
  fiberRefUnsafeMakePatch(initial, {
    differ: Differ.hashSet(),
    fork: HashSetPatch.empty<A>()
  })

/** @internal */
export const fiberRefUnsafeMakeContext = <A>(
  initial: Context.Context<A>
): FiberRef.FiberRef<Context.Context<A>> =>
  fiberRefUnsafeMakePatch(initial, {
    differ: Differ.environment(),
    fork: ContextPatch.empty<A, A>()
  })

/** @internal */
export const fiberRefUnsafeMakePatch = <Value, Patch>(
  initial: Value,
  options: {
    readonly differ: Differ.Differ<Value, Patch>
    readonly fork: Patch
    readonly join?: (oldV: Value, newV: Value) => Value
  }
): FiberRef.FiberRef<Value> => ({
  [FiberRefTypeId]: fiberRefVariance,
  initial,
  diff: (oldValue, newValue) => pipe(options.differ, Differ.diff(oldValue, newValue)),
  combine: (first, second) => pipe(options.differ, Differ.combine(first as Patch, second as Patch)),
  patch: (patch) => (oldValue) => pipe(options.differ, Differ.patch(patch as Patch, oldValue)),
  fork: options.fork,
  join: options.join ?? ((_, n) => n)
})

/** @internal */
export const fiberRefUnsafeMakeRuntimeFlags = (
  initial: RuntimeFlags.RuntimeFlags
): FiberRef.FiberRef<RuntimeFlags.RuntimeFlags> =>
  fiberRefUnsafeMakePatch(initial, {
    differ: _runtimeFlags.differ,
    fork: RuntimeFlagsPatch.empty
  })

/** @internal */
export const currentContext: FiberRef.FiberRef<Context.Context<never>> = fiberRefUnsafeMakeContext(
  Context.empty()
)

/** @internal */
export const currentSchedulingPriority: FiberRef.FiberRef<number> = fiberRefUnsafeMake(0)

/** @internal */
export const currentMaxFiberOps: FiberRef.FiberRef<number> = fiberRefUnsafeMake(2048)

/** @internal */
export const currentLogAnnotations: FiberRef.FiberRef<HashMap.HashMap<string, string>> = globalValue(
  Symbol.for("@effect/io/FiberRef/currentLogAnnotation"),
  () => fiberRefUnsafeMake(HashMap.empty())
)

/** @internal */
export const currentLogLevel: FiberRef.FiberRef<LogLevel.LogLevel> = fiberRefUnsafeMake<LogLevel.LogLevel>(
  logLevelInfo
)

/** @internal */
export const currentLogSpan: FiberRef.FiberRef<List.List<LogSpan.LogSpan>> = globalValue(
  Symbol.for("@effect/io/FiberRef/currentLogSpan"),
  () => fiberRefUnsafeMake(List.empty<LogSpan.LogSpan>())
)

/** @internal */
export const currentScheduler: FiberRef.FiberRef<Scheduler.Scheduler> = globalValue(
  Symbol.for("@effect/io/FiberRef/currentScheduler"),
  () => fiberRefUnsafeMake(scheduler.defaultScheduler)
)
/** @internal */
export const withScheduler = dual<
  (scheduler: Scheduler.Scheduler) => <R, E, B>(self: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>,
  <R, E, B>(self: Effect.Effect<R, E, B>, scheduler: Scheduler.Scheduler) => Effect.Effect<R, E, B>
>(2, (self, scheduler) => fiberRefLocally(self, currentScheduler, scheduler))

/** @internal */
export const withSchedulingPriority = dual<
  (priority: number) => <R, E, B>(self: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>,
  <R, E, B>(self: Effect.Effect<R, E, B>, priority: number) => Effect.Effect<R, E, B>
>(2, (self, scheduler) => fiberRefLocally(self, currentSchedulingPriority, scheduler))

/** @internal */
export const withMaxFiberOps = dual<
  (ops: number) => <R, E, B>(self: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>,
  <R, E, B>(self: Effect.Effect<R, E, B>, ops: number) => Effect.Effect<R, E, B>
>(2, (self, ops) => fiberRefLocally(self, currentMaxFiberOps, ops))

/**
 * @internal
 */
export const currentRequestBatchingEnabled = globalValue(
  Symbol.for("@effect/io/FiberRef/currentRequestBatchingEnabled"),
  () => fiberRefUnsafeMake(true)
)

/** @internal */
export const currentUnhandledErrorLogLevel: FiberRef.FiberRef<Option.Option<LogLevel.LogLevel>> = globalValue(
  Symbol.for("@effect/io/FiberRef/currentUnhandledErrorLogLevel"),
  () => fiberRefUnsafeMake(Option.some<LogLevel.LogLevel>(logLevelDebug))
)

/** @internal */
export const withUnhandledErrorLogLevel = dual<
  (level: Option.Option<LogLevel.LogLevel>) => <R, E, B>(self: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B>,
  <R, E, B>(self: Effect.Effect<R, E, B>, level: Option.Option<LogLevel.LogLevel>) => Effect.Effect<R, E, B>
>(2, (self, level) => fiberRefLocally(self, currentUnhandledErrorLogLevel, level))

/** @internal */
export const currentMetricLabels: FiberRef.FiberRef<HashSet.HashSet<MetricLabel.MetricLabel>> =
  fiberRefUnsafeMakeHashSet(
    HashSet.empty()
  )

/* @internal */
export const metricLabels: Effect.Effect<never, never, HashSet.HashSet<MetricLabel.MetricLabel>> = fiberRefGet(
  currentMetricLabels
)

/** @internal */
export const currentForkScopeOverride: FiberRef.FiberRef<Option.Option<fiberScope.FiberScope>> = globalValue(
  Symbol.for("@effect/io/FiberRef/currentForkScopeOverride"),
  () =>
    fiberRefUnsafeMake(Option.none(), {
      fork: () => Option.none() as Option.Option<fiberScope.FiberScope>,
      join: (parent, _) => parent
    })
)

/** @internal */
export const currentInterruptedCause: FiberRef.FiberRef<Cause.Cause<never>> = globalValue(
  Symbol.for("@effect/io/FiberRef/currentInterruptedCause"),
  () =>
    fiberRefUnsafeMake(internalCause.empty, {
      fork: () => internalCause.empty,
      join: (parent, _) => parent
    })
)

/** @internal */
export const currentTracerSpan: FiberRef.FiberRef<List.List<Tracer.Span>> = globalValue(
  Symbol.for("@effect/io/FiberRef/currentTracerSpan"),
  () => fiberRefUnsafeMake(List.empty<Tracer.Span>())
)

/** @internal */
export const currentTracerSpanAnnotations: FiberRef.FiberRef<HashMap.HashMap<string, Tracer.AttributeValue>> =
  globalValue(
    Symbol.for("@effect/io/FiberRef/currentTracerSpanAnnotations"),
    () => fiberRefUnsafeMake(HashMap.empty())
  )

// -----------------------------------------------------------------------------
// Scope
// -----------------------------------------------------------------------------

/** @internal */
export const ScopeTypeId: Scope.ScopeTypeId = Symbol.for("@effect/io/Scope") as Scope.ScopeTypeId

/** @internal */
export const CloseableScopeTypeId: Scope.CloseableScopeTypeId = Symbol.for(
  "@effect/io/CloseableScope"
) as Scope.CloseableScopeTypeId

/* @internal */
export const scopeAddFinalizer = (
  self: Scope.Scope,
  finalizer: Effect.Effect<never, never, unknown>
): Effect.Effect<never, never, void> => self.addFinalizer(() => asUnit(finalizer))

/* @internal */
export const scopeAddFinalizerExit = (
  self: Scope.Scope,
  finalizer: Scope.Scope.Finalizer
): Effect.Effect<never, never, void> => self.addFinalizer(finalizer)

/* @internal */
export const scopeClose = (
  self: Scope.Scope.Closeable,
  exit: Exit.Exit<unknown, unknown>
): Effect.Effect<never, never, void> => self.close(exit)

/* @internal */
export const scopeFork = (
  self: Scope.Scope,
  strategy: ExecutionStrategy.ExecutionStrategy
): Effect.Effect<never, never, Scope.Scope.Closeable> => self.fork(strategy)

// -----------------------------------------------------------------------------
// ReleaseMap
// -----------------------------------------------------------------------------

/** @internal */
export type ReleaseMapState = {
  _tag: "Exited"
  nextKey: number
  exit: Exit.Exit<unknown, unknown>
  update: (finalizer: Scope.Scope.Finalizer) => Scope.Scope.Finalizer
} | {
  _tag: "Running"
  nextKey: number
  finalizers: Map<number, Scope.Scope.Finalizer>
  update: (finalizer: Scope.Scope.Finalizer) => Scope.Scope.Finalizer
}

/** @internal */
export interface ReleaseMap {
  state: ReleaseMapState
}

/* @internal */
export const releaseMapAdd = dual<
  (finalizer: Scope.Scope.Finalizer) => (self: ReleaseMap) => Effect.Effect<never, never, Scope.Scope.Finalizer>,
  (self: ReleaseMap, finalizer: Scope.Scope.Finalizer) => Effect.Effect<never, never, Scope.Scope.Finalizer>
>(2, (self, finalizer) =>
  map(
    releaseMapAddIfOpen(self, finalizer),
    Option.match({
      onNone: (): Scope.Scope.Finalizer => () => unit,
      onSome: (key): Scope.Scope.Finalizer => (exit) => releaseMapRelease(key, exit)(self)
    })
  ))

/* @internal */
export const releaseMapRelease = dual<
  (key: number, exit: Exit.Exit<unknown, unknown>) => (self: ReleaseMap) => Effect.Effect<never, never, void>,
  (self: ReleaseMap, key: number, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<never, never, void>
>(3, (self, key, exit) =>
  suspend(() => {
    switch (self.state._tag) {
      case "Exited": {
        return unit
      }
      case "Running": {
        const finalizer = self.state.finalizers.get(key)
        self.state.finalizers.delete(key)
        if (finalizer != null) {
          return self.state.update(finalizer)(exit)
        }
        return unit
      }
    }
  }))

/* @internal */
export const releaseMapAddIfOpen = dual<
  (finalizer: Scope.Scope.Finalizer) => (self: ReleaseMap) => Effect.Effect<never, never, Option.Option<number>>,
  (self: ReleaseMap, finalizer: Scope.Scope.Finalizer) => Effect.Effect<never, never, Option.Option<number>>
>(2, (self, finalizer) =>
  suspend(() => {
    switch (self.state._tag) {
      case "Exited": {
        self.state.nextKey += 1
        return as(finalizer(self.state.exit), Option.none())
      }
      case "Running": {
        const key = self.state.nextKey
        self.state.finalizers.set(key, finalizer)
        self.state.nextKey += 1
        return succeed(Option.some(key))
      }
    }
  }))

/* @internal */
export const releaseMapGet = dual<
  (key: number) => (self: ReleaseMap) => Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>,
  (self: ReleaseMap, key: number) => Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>
>(
  2,
  (self, key) =>
    sync((): Option.Option<Scope.Scope.Finalizer> =>
      self.state._tag === "Running" ? Option.fromNullable(self.state.finalizers.get(key)) : Option.none()
    )
)

/* @internal */
export const releaseMapReplace = dual<
  (
    key: number,
    finalizer: Scope.Scope.Finalizer
  ) => (self: ReleaseMap) => Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>,
  (
    self: ReleaseMap,
    key: number,
    finalizer: Scope.Scope.Finalizer
  ) => Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>
>(3, (self, key, finalizer) =>
  suspend(() => {
    switch (self.state._tag) {
      case "Exited": {
        return as(finalizer(self.state.exit), Option.none())
      }
      case "Running": {
        const fin = Option.fromNullable(self.state.finalizers.get(key))
        self.state.finalizers.set(key, finalizer)
        return succeed(fin)
      }
    }
  }))

/* @internal */
export const releaseMapRemove = dual<
  (key: number) => (self: ReleaseMap) => Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>,
  (self: ReleaseMap, key: number) => Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>
>(2, (self, key) =>
  sync(() => {
    if (self.state._tag === "Exited") {
      return Option.none()
    }
    const fin = Option.fromNullable(self.state.finalizers.get(key))
    self.state.finalizers.delete(key)
    return fin
  }))

/* @internal */
export const releaseMapMake: Effect.Effect<never, never, ReleaseMap> = sync((): ReleaseMap => ({
  state: {
    _tag: "Running",
    nextKey: 0,
    finalizers: new Map(),
    update: identity
  }
}))

// -----------------------------------------------------------------------------
// Exit
// -----------------------------------------------------------------------------

/** @internal */
export const exitIsExit = (u: unknown): u is Exit.Exit<unknown, unknown> =>
  isEffect(u) && "_tag" in u && (u._tag === "Success" || u._tag === "Failure")

/** @internal */
export const exitIsFailure = <E, A>(self: Exit.Exit<E, A>): self is Exit.Failure<E, A> => self._tag === "Failure"

/** @internal */
export const exitIsSuccess = <E, A>(self: Exit.Exit<E, A>): self is Exit.Success<E, A> => self._tag === "Success"

/** @internal */
export const exitIsInterrupted = <E, A>(self: Exit.Exit<E, A>): boolean => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return internalCause.isInterrupted(self.i0)
    }
    case OpCodes.OP_SUCCESS: {
      return false
    }
  }
}

/** @internal */
export const exitAs = dual<
  <A2>(value: A2) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E, A2>,
  <E, A, A2>(self: Exit.Exit<E, A>, value: A2) => Exit.Exit<E, A2>
>(2, <E, A, A2>(self: Exit.Exit<E, A>, value: A2) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return exitFailCause(self.i0)
    }
    case OpCodes.OP_SUCCESS: {
      return exitSucceed(value) as Exit.Exit<E, A2>
    }
  }
})

/** @internal */
export const exitAsUnit = <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E, void> =>
  exitAs(self, void 0) as Exit.Exit<E, void>

/** @internal */
export const exitCauseOption = <E, A>(self: Exit.Exit<E, A>): Option.Option<Cause.Cause<E>> => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return Option.some(self.i0)
    }
    case OpCodes.OP_SUCCESS: {
      return Option.none()
    }
  }
}

/** @internal */
export const exitCollectAll = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>,
  options?: { readonly parallel?: boolean }
): Option.Option<Exit.Exit<E, Array<A>>> =>
  exitCollectAllInternal(exits, options?.parallel ? internalCause.parallel : internalCause.sequential)

/** @internal */
export const exitDie = (defect: unknown): Exit.Exit<never, never> =>
  exitFailCause(internalCause.die(defect)) as Exit.Exit<never, never>

/** @internal */
export const exitExists = dual<
  <A>(predicate: Predicate<A>) => <E>(self: Exit.Exit<E, A>) => boolean,
  <E, A>(self: Exit.Exit<E, A>, predicate: Predicate<A>) => boolean
>(2, (self, predicate) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return false
    }
    case OpCodes.OP_SUCCESS: {
      return predicate(self.i0)
    }
  }
})

/** @internal */
export const exitFail = <E>(error: E): Exit.Exit<E, never> =>
  exitFailCause(internalCause.fail(error)) as Exit.Exit<E, never>

/** @internal */
export const exitFailCause = <E>(cause: Cause.Cause<E>): Exit.Exit<E, never> => {
  const effect = new EffectPrimitiveFailure(OpCodes.OP_FAILURE) as any
  effect.i0 = cause
  return effect
}

/** @internal */
export const exitFlatMap = dual<
  <A, E2, A2>(f: (a: A) => Exit.Exit<E2, A2>) => <E>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, A2>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, f: (a: A) => Exit.Exit<E2, A2>) => Exit.Exit<E | E2, A2>
>(2, <E, A, E2, A2>(self: Exit.Exit<E, A>, f: (a: A) => Exit.Exit<E2, A2>) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return exitFailCause(self.i0) as Exit.Exit<E | E2, A2>
    }
    case OpCodes.OP_SUCCESS: {
      return f(self.i0) as Exit.Exit<E | E2, A2>
    }
  }
})

/** @internal */
export const exitFlatMapEffect = dual<
  <E, A, R, E2, A2>(
    f: (a: A) => Effect.Effect<R, E2, Exit.Exit<E, A2>>
  ) => (self: Exit.Exit<E, A>) => Effect.Effect<R, E2, Exit.Exit<E, A2>>,
  <E, A, R, E2, A2>(
    self: Exit.Exit<E, A>,
    f: (a: A) => Effect.Effect<R, E2, Exit.Exit<E, A2>>
  ) => Effect.Effect<R, E2, Exit.Exit<E, A2>>
>(2, (self, f) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return succeed(exitFailCause(self.i0))
    }
    case OpCodes.OP_SUCCESS: {
      return f(self.i0)
    }
  }
})

/** @internal */
export const exitFlatten = <E, E1, A>(
  self: Exit.Exit<E, Exit.Exit<E1, A>>
): Exit.Exit<E | E1, A> => pipe(self, exitFlatMap(identity)) as Exit.Exit<E | E1, A>

/** @internal */
export const exitForEachEffect = dual<
  <A, R, E2, B>(
    f: (a: A) => Effect.Effect<R, E2, B>
  ) => <E>(self: Exit.Exit<E, A>) => Effect.Effect<R, never, Exit.Exit<E | E2, B>>,
  <E, A, R, E2, B>(
    self: Exit.Exit<E, A>,
    f: (a: A) => Effect.Effect<R, E2, B>
  ) => Effect.Effect<R, never, Exit.Exit<E | E2, B>>
>(2, (self, f) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return succeed(exitFailCause(self.i0))
    }
    case OpCodes.OP_SUCCESS: {
      return exit(f(self.i0))
    }
  }
})

/** @internal */
export const exitFromEither = <E, A>(either: Either.Either<E, A>): Exit.Exit<E, A> => {
  switch (either._tag) {
    case "Left": {
      return exitFail(either.left) as Exit.Exit<E, A>
    }
    case "Right": {
      return exitSucceed(either.right) as Exit.Exit<E, A>
    }
  }
}

/** @internal */
export const exitFromOption = <A>(option: Option.Option<A>): Exit.Exit<void, A> => {
  switch (option._tag) {
    case "None": {
      return exitFail(void 0) as Exit.Exit<void, A>
    }
    case "Some": {
      return exitSucceed(option.value) as Exit.Exit<void, A>
    }
  }
}

/** @internal */
export const exitGetOrElse = dual<
  <E, A>(orElse: (cause: Cause.Cause<E>) => A) => (self: Exit.Exit<E, A>) => A,
  <E, A>(self: Exit.Exit<E, A>, orElse: (cause: Cause.Cause<E>) => A) => A
>(2, (self, orElse) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return orElse(self.i0)
    }
    case OpCodes.OP_SUCCESS: {
      return self.i0
    }
  }
})

/** @internal */
export const exitInterrupt = (fiberId: FiberId.FiberId): Exit.Exit<never, never> =>
  exitFailCause(internalCause.interrupt(fiberId)) as Exit.Exit<never, never>

/** @internal */
export const exitMap = dual<
  <A, B>(f: (a: A) => B) => <E>(self: Exit.Exit<E, A>) => Exit.Exit<E, B>,
  <E, A, B>(self: Exit.Exit<E, A>, f: (a: A) => B) => Exit.Exit<E, B>
>(2, <E, A, B>(self: Exit.Exit<E, A>, f: (a: A) => B) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return exitFailCause(self.i0) as Exit.Exit<E, B>
    }
    case OpCodes.OP_SUCCESS: {
      return exitSucceed(f(self.i0)) as Exit.Exit<E, B>
    }
  }
})

/** @internal */
export const exitMapBoth = dual<
  <E, A, E2, A2>(
    options: {
      readonly onFailure: (e: E) => E2
      readonly onSuccess: (a: A) => A2
    }
  ) => (self: Exit.Exit<E, A>) => Exit.Exit<E2, A2>,
  <E, A, E2, A2>(
    self: Exit.Exit<E, A>,
    options: {
      readonly onFailure: (e: E) => E2
      readonly onSuccess: (a: A) => A2
    }
  ) => Exit.Exit<E2, A2>
>(2, (self, { onFailure, onSuccess }) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return exitFailCause(pipe(self.i0, internalCause.map(onFailure)))
    }
    case OpCodes.OP_SUCCESS: {
      return exitSucceed(onSuccess(self.i0))
    }
  }
})

/** @internal */
export const exitMapError = dual<
  <E, E2>(f: (e: E) => E2) => <A>(self: Exit.Exit<E, A>) => Exit.Exit<E2, A>,
  <E, A, E2>(self: Exit.Exit<E, A>, f: (e: E) => E2) => Exit.Exit<E2, A>
>(2, <E, A, E2>(self: Exit.Exit<E, A>, f: (e: E) => E2) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return exitFailCause(pipe(self.i0, internalCause.map(f))) as Exit.Exit<E2, A>
    }
    case OpCodes.OP_SUCCESS: {
      return exitSucceed(self.i0) as Exit.Exit<E2, A>
    }
  }
})

/** @internal */
export const exitMapErrorCause = dual<
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => <A>(self: Exit.Exit<E, A>) => Exit.Exit<E2, A>,
  <E, A, E2>(self: Exit.Exit<E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => Exit.Exit<E2, A>
>(2, <E, A, E2>(self: Exit.Exit<E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return exitFailCause(f(self.i0)) as Exit.Exit<E2, A>
    }
    case OpCodes.OP_SUCCESS: {
      return exitSucceed(self.i0) as Exit.Exit<E2, A>
    }
  }
})

/** @internal */
export const exitMatch = dual<
  <E, A, Z>(options: {
    readonly onFailure: (cause: Cause.Cause<E>) => Z
    readonly onSuccess: (a: A) => Z
  }) => (self: Exit.Exit<E, A>) => Z,
  <E, A, Z>(self: Exit.Exit<E, A>, options: {
    readonly onFailure: (cause: Cause.Cause<E>) => Z
    readonly onSuccess: (a: A) => Z
  }) => Z
>(2, (self, { onFailure, onSuccess }) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return onFailure(self.i0)
    }
    case OpCodes.OP_SUCCESS: {
      return onSuccess(self.i0)
    }
  }
})

/** @internal */
export const exitMatchEffect = dual<
  <E, A, R, E2, A2, R2, E3, A3>(
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R2, E3, A3>
    }
  ) => (self: Exit.Exit<E, A>) => Effect.Effect<R | R2, E3 | E3, A3 | A3>,
  <E, A, R, E2, A2, R2, E3, A3>(
    self: Exit.Exit<E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R2, E3, A3>
    }
  ) => Effect.Effect<R | R2, E2 | E3, A2 | A3>
>(2, (self, { onFailure, onSuccess }) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return onFailure(self.i0)
    }
    case OpCodes.OP_SUCCESS: {
      return onSuccess(self.i0)
    }
  }
})

/** @internal */
export const exitSucceed = <A>(value: A): Exit.Exit<never, A> => {
  const effect = new EffectPrimitiveSuccess(OpCodes.OP_SUCCESS) as any
  effect.i0 = value
  return effect
}

/** @internal */
export const exitUnannotate = <E, A>(exit: Exit.Exit<E, A>): Exit.Exit<E, A> =>
  exitIsSuccess(exit) ? exit : exitFailCause(internalCause.unannotate(exit.i0))

/** @internal */
export const exitUnit: Exit.Exit<never, void> = exitSucceed(void 0)

/** @internal */
export const exitZip = dual<
  <E2, A2>(that: Exit.Exit<E2, A2>) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, readonly [A, A2]>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, that: Exit.Exit<E2, A2>) => Exit.Exit<E | E2, readonly [A, A2]>
>(2, (self, that) =>
  exitZipWith(self, that, {
    onSuccess: (a, a2) => [a, a2] as const,
    onFailure: internalCause.sequential
  }))

/** @internal */
export const exitZipLeft = dual<
  <E2, A2>(that: Exit.Exit<E2, A2>) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, A>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, that: Exit.Exit<E2, A2>) => Exit.Exit<E | E2, A>
>(2, (self, that) =>
  exitZipWith(self, that, {
    onSuccess: (a, _) => a,
    onFailure: internalCause.sequential
  }))

/** @internal */
export const exitZipRight = dual<
  <E2, A2>(that: Exit.Exit<E2, A2>) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, A2>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, that: Exit.Exit<E2, A2>) => Exit.Exit<E | E2, A2>
>(2, (self, that) =>
  exitZipWith(self, that, {
    onSuccess: (_, a2) => a2,
    onFailure: internalCause.sequential
  }))

/** @internal */
export const exitZipPar = dual<
  <E2, A2>(that: Exit.Exit<E2, A2>) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, readonly [A, A2]>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, that: Exit.Exit<E2, A2>) => Exit.Exit<E | E2, readonly [A, A2]>
>(2, (self, that) =>
  exitZipWith(self, that, {
    onSuccess: (a, a2) => [a, a2] as const,
    onFailure: internalCause.parallel
  }))

/** @internal */
export const exitZipParLeft = dual<
  <E2, A2>(that: Exit.Exit<E2, A2>) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, A>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, that: Exit.Exit<E2, A2>) => Exit.Exit<E | E2, A>
>(2, (self, that) =>
  exitZipWith(self, that, {
    onSuccess: (a, _) => a,
    onFailure: internalCause.parallel
  }))

/** @internal */
export const exitZipParRight = dual<
  <E2, A2>(that: Exit.Exit<E2, A2>) => <E, A>(self: Exit.Exit<E, A>) => Exit.Exit<E | E2, A2>,
  <E, A, E2, A2>(self: Exit.Exit<E, A>, that: Exit.Exit<E2, A2>) => Exit.Exit<E | E2, A2>
>(2, (self, that) =>
  exitZipWith(self, that, {
    onSuccess: (_, a2) => a2,
    onFailure: internalCause.parallel
  }))

/** @internal */
export const exitZipWith = dual<
  <E, E2, A, B, C>(
    that: Exit.Exit<E2, B>,
    options: {
      readonly onSuccess: (a: A, b: B) => C
      readonly onFailure: (cause: Cause.Cause<E>, cause2: Cause.Cause<E2>) => Cause.Cause<E | E2>
    }
  ) => (self: Exit.Exit<E, A>) => Exit.Exit<E | E2, C>,
  <E, E2, A, B, C>(
    self: Exit.Exit<E, A>,
    that: Exit.Exit<E2, B>,
    options: {
      readonly onSuccess: (a: A, b: B) => C
      readonly onFailure: (cause: Cause.Cause<E>, cause2: Cause.Cause<E2>) => Cause.Cause<E | E2>
    }
  ) => Exit.Exit<E | E2, C>
>(3, (
  self,
  that,
  { onFailure, onSuccess }
) => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      switch (that._tag) {
        case OpCodes.OP_SUCCESS: {
          return exitFailCause(self.i0)
        }
        case OpCodes.OP_FAILURE: {
          return exitFailCause(onFailure(self.i0, that.i0))
        }
      }
    }
    case OpCodes.OP_SUCCESS: {
      switch (that._tag) {
        case OpCodes.OP_SUCCESS: {
          return exitSucceed(onSuccess(self.i0, that.i0))
        }
        case OpCodes.OP_FAILURE: {
          return exitFailCause(that.i0)
        }
      }
    }
  }
})

const exitCollectAllInternal = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>,
  combineCauses: (causeA: Cause.Cause<E>, causeB: Cause.Cause<E>) => Cause.Cause<E>
): Option.Option<Exit.Exit<E, Array<A>>> => {
  const list = Chunk.fromIterable(exits)
  if (!Chunk.isNonEmpty(list)) {
    return Option.none()
  }
  return pipe(
    Chunk.tailNonEmpty(list),
    ReadonlyArray.reduce(
      pipe(Chunk.headNonEmpty(list), exitMap<A, Chunk.Chunk<A>>(Chunk.of)),
      (accumulator, current) =>
        pipe(
          accumulator,
          exitZipWith(current, {
            onSuccess: (list, value) => pipe(list, Chunk.prepend(value)),
            onFailure: combineCauses
          })
        )
    ),
    exitMap(Chunk.reverse),
    exitMap((chunk) => Array.from(chunk)),
    Option.some
  )
}

// -----------------------------------------------------------------------------
// Deferred
// -----------------------------------------------------------------------------

/** @internal */
export const deferredUnsafeMake = <E, A>(fiberId: FiberId.FiberId): Deferred.Deferred<E, A> => ({
  [deferred.DeferredTypeId]: deferred.deferredVariance,
  state: MutableRef.make(deferred.pending([])),
  blockingOn: fiberId
})

/* @internal */
export const deferredMake = <E, A>(): Effect.Effect<never, never, Deferred.Deferred<E, A>> =>
  flatMap(fiberId, (id) => deferredMakeAs<E, A>(id))

/* @internal */
export const deferredMakeAs = <E, A>(fiberId: FiberId.FiberId): Effect.Effect<never, never, Deferred.Deferred<E, A>> =>
  sync(() => deferredUnsafeMake<E, A>(fiberId))

/* @internal */
export const deferredAwait = <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, E, A> =>
  asyncInterruptEither<never, E, A>((k) => {
    const state = MutableRef.get(self.state)
    switch (state._tag) {
      case DeferredOpCodes.OP_STATE_DONE: {
        return Either.right(state.effect)
      }
      case DeferredOpCodes.OP_STATE_PENDING: {
        pipe(
          self.state,
          MutableRef.set(deferred.pending([k, ...state.joiners]))
        )
        return Either.left(deferredInterruptJoiner(self, k))
      }
    }
  }, self.blockingOn)

/* @internal */
export const deferredComplete = dual<
  <E, A>(effect: Effect.Effect<never, E, A>) => (self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, effect: Effect.Effect<never, E, A>) => Effect.Effect<never, never, boolean>
>(2, (self, effect) => intoDeferred(effect, self))

/* @internal */
export const deferredCompleteWith = dual<
  <E, A>(effect: Effect.Effect<never, E, A>) => (self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, effect: Effect.Effect<never, E, A>) => Effect.Effect<never, never, boolean>
>(2, (self, effect) =>
  sync(() => {
    const state = MutableRef.get(self.state)
    switch (state._tag) {
      case DeferredOpCodes.OP_STATE_DONE: {
        return false
      }
      case DeferredOpCodes.OP_STATE_PENDING: {
        pipe(self.state, MutableRef.set(deferred.done(effect)))
        for (let i = 0; i < state.joiners.length; i++) {
          state.joiners[i](effect)
        }
        return true
      }
    }
  }))

/* @internal */
export const deferredDone = dual<
  <E, A>(exit: Exit.Exit<E, A>) => (self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, exit: Exit.Exit<E, A>) => Effect.Effect<never, never, boolean>
>(2, (self, exit) => deferredCompleteWith(self, exit))

/* @internal */
export const deferredFail = dual<
  <E>(error: E) => <A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, error: E) => Effect.Effect<never, never, boolean>
>(2, (self, error) => deferredCompleteWith(self, fail(error)))

/* @internal */
export const deferredFailSync = dual<
  <E>(evaluate: LazyArg<E>) => <A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, evaluate: LazyArg<E>) => Effect.Effect<never, never, boolean>
>(2, (self, evaluate) => deferredCompleteWith(self, failSync(evaluate)))

/* @internal */
export const deferredFailCause = dual<
  <E>(cause: Cause.Cause<E>) => <A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, cause: Cause.Cause<E>) => Effect.Effect<never, never, boolean>
>(2, (self, cause) => deferredCompleteWith(self, failCause(cause)))

/* @internal */
export const deferredFailCauseSync = dual<
  <E>(evaluate: LazyArg<Cause.Cause<E>>) => <A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, evaluate: LazyArg<Cause.Cause<E>>) => Effect.Effect<never, never, boolean>
>(2, (self, evaluate) => deferredCompleteWith(self, failCauseSync(evaluate)))

/* @internal */
export const deferredDie = dual<
  (defect: unknown) => <E, A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, defect: unknown) => Effect.Effect<never, never, boolean>
>(2, (self, defect) => deferredCompleteWith(self, die(defect)))

/* @internal */
export const deferredDieSync = dual<
  (evaluate: LazyArg<unknown>) => <E, A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, evaluate: LazyArg<unknown>) => Effect.Effect<never, never, boolean>
>(2, (self, evaluate) => deferredCompleteWith(self, dieSync(evaluate)))

/* @internal */
export const deferredInterrupt = <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> =>
  flatMap(fiberId, (fiberId) => deferredCompleteWith(self, interruptWith(fiberId)))

/* @internal */
export const deferredInterruptWith = dual<
  (fiberId: FiberId.FiberId) => <E, A>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, fiberId: FiberId.FiberId) => Effect.Effect<never, never, boolean>
>(2, (self, fiberId) => deferredCompleteWith(self, interruptWith(fiberId)))

/* @internal */
export const deferredIsDone = <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> =>
  sync(() => MutableRef.get(self.state)._tag === DeferredOpCodes.OP_STATE_DONE)

/* @internal */
export const deferredPoll = <E, A>(
  self: Deferred.Deferred<E, A>
): Effect.Effect<never, never, Option.Option<Effect.Effect<never, E, A>>> =>
  sync(() => {
    const state = MutableRef.get(self.state)
    switch (state._tag) {
      case DeferredOpCodes.OP_STATE_DONE: {
        return Option.some(state.effect)
      }
      case DeferredOpCodes.OP_STATE_PENDING: {
        return Option.none()
      }
    }
  })

/* @internal */
export const deferredSucceed = dual<
  <A>(value: A) => <E>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, value: A) => Effect.Effect<never, never, boolean>
>(2, (self, value) => deferredCompleteWith(self, succeed(value)))

/* @internal */
export const deferredSync = dual<
  <A>(evaluate: LazyArg<A>) => <E>(self: Deferred.Deferred<E, A>) => Effect.Effect<never, never, boolean>,
  <E, A>(self: Deferred.Deferred<E, A>, evaluate: LazyArg<A>) => Effect.Effect<never, never, boolean>
>(2, (self, evaluate) => deferredCompleteWith(self, sync(evaluate)))

/** @internal */
export const deferredUnsafeDone = <E, A>(self: Deferred.Deferred<E, A>, effect: Effect.Effect<never, E, A>): void => {
  const state = MutableRef.get(self.state)
  if (state._tag === DeferredOpCodes.OP_STATE_PENDING) {
    pipe(self.state, MutableRef.set(deferred.done(effect)))
    for (let i = state.joiners.length - 1; i >= 0; i--) {
      state.joiners[i](effect)
    }
  }
}

const deferredInterruptJoiner = <E, A>(
  self: Deferred.Deferred<E, A>,
  joiner: (effect: Effect.Effect<never, E, A>) => void
): Effect.Effect<never, never, void> =>
  sync(() => {
    const state = MutableRef.get(self.state)
    if (state._tag === DeferredOpCodes.OP_STATE_PENDING) {
      pipe(
        self.state,
        MutableRef.set(deferred.pending(state.joiners.filter((j) => j !== joiner)))
      )
    }
  })
