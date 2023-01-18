import type * as Cause from "@effect/io/Cause"
import { getCallTrace, isTraceEnabled } from "@effect/io/Debug"
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
import * as internalCause from "@effect/io/internal/cause"
import * as deferred from "@effect/io/internal/deferred"
import type * as FiberRuntime from "@effect/io/internal/fiberRuntime"
import type * as fiberScope from "@effect/io/internal/fiberScope"
import * as DeferredOpCodes from "@effect/io/internal/opCodes/deferred"
import * as OpCodes from "@effect/io/internal/opCodes/effect"
import * as _runtimeFlags from "@effect/io/internal/runtimeFlags"
import * as scheduler from "@effect/io/internal/scheduler"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as LogSpan from "@effect/io/Logger/Span"
import type * as MetricLabel from "@effect/io/Metric/Label"
import type * as Scheduler from "@effect/io/Scheduler"
import type * as Scope from "@effect/io/Scope"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import * as Differ from "@fp-ts/data/Differ"
import * as ContextPatch from "@fp-ts/data/Differ/ContextPatch"
import * as HashSetPatch from "@fp-ts/data/Differ/HashSetPatch"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import type { LazyArg } from "@fp-ts/data/Function"
import { identity, pipe } from "@fp-ts/data/Function"
import * as Hash from "@fp-ts/data/Hash"
import * as HashMap from "@fp-ts/data/HashMap"
import * as HashSet from "@fp-ts/data/HashSet"
import * as MutableRef from "@fp-ts/data/MutableRef"
import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

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
export const isEffectError = (u: unknown): u is EffectError<unknown> => {
  return typeof u === "object" && u != null && EffectErrorTypeId in u
}

/** @internal */
export const makeEffectError = <E>(cause: Cause.Cause<E>): EffectError<E> => ({
  [EffectErrorTypeId]: EffectErrorTypeId,
  _tag: "EffectError",
  cause
})

/** @internal */
export const EffectTypeId: Effect.EffectTypeId = Symbol.for("@effect/io/Effect") as Effect.EffectTypeId

/** @internal */
export type Primitive =
  | Async
  | Commit
  | Failure
  | OnFailure
  | OnSuccess
  | OnSuccessAndFailure
  | Success
  | Sync
  | UpdateRuntimeFlags
  | While
  | WithRuntime
  | Yield

/** @internal */
export type Continuation =
  | OnSuccess
  | OnSuccessAndFailure
  | OnFailure
  | While
  | RevertFlags

/** @internal */
export class RevertFlags {
  readonly _tag = OpCodes.OP_REVERT_FLAGS
  constructor(readonly patch: RuntimeFlagsPatch.RuntimeFlagsPatch) {
  }
}

/** @internal */
const effectVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export const proto = {
  [EffectTypeId]: effectVariance,
  [Equal.symbol](this: {}, that: unknown) {
    return this === that
  },
  [Hash.symbol](this: {}) {
    return Hash.random(this)
  },
  traced(this: Effect.Effect<never, never, never>, trace: string | undefined): Effect.Effect<never, never, never> {
    if (!isTraceEnabled() || trace === this["trace"]) {
      return this
    }
    const fresh = Object.create(proto)
    Object.assign(fresh, this)
    fresh.trace = trace
    return fresh
  }
}

/** @internal */
export type Op<Tag extends string, Body = {}> = Effect.Effect<never, never, never> & Body & {
  readonly _tag: Tag
  readonly trace?: string
}

/** @internal */
export interface Async extends
  Op<OpCodes.OP_ASYNC, {
    readonly register: (resume: (effect: Primitive) => void) => void
    readonly blockingOn: FiberId.FiberId
  }>
{}

/** @internal */
export interface Failure extends Op<OpCodes.OP_FAILURE, { readonly cause: Cause.Cause<unknown> }> {}

export interface Commit extends
  Op<OpCodes.OP_COMMIT, {
    commit(): Effect.Effect<unknown, unknown, unknown>
  }>
{}

/** @internal */
export interface OnFailure extends
  Op<OpCodes.OP_ON_FAILURE, {
    readonly first: Primitive
    readonly failK: (a: Cause.Cause<unknown>) => Primitive
  }>
{}

/** @internal */
export interface OnSuccess extends
  Op<OpCodes.OP_ON_SUCCESS, {
    readonly first: Primitive
    readonly successK: (a: unknown) => Primitive
  }>
{}

/** @internal */
export interface OnSuccessAndFailure extends
  Op<OpCodes.OP_ON_SUCCESS_AND_FAILURE, {
    readonly first: Primitive
    readonly failK: (a: Cause.Cause<unknown>) => Primitive
    readonly successK: (a: unknown) => Primitive
  }>
{}

/** @internal */
export interface Success extends Op<OpCodes.OP_SUCCESS, { readonly value: unknown }> {}

/** @internal */
export interface Sync extends
  Op<OpCodes.OP_SYNC, {
    readonly evaluate: LazyArg<unknown>
  }>
{}

/** @internal */
export interface UpdateRuntimeFlags extends
  Op<OpCodes.OP_UPDATE_RUNTIME_FLAGS, {
    readonly update: RuntimeFlagsPatch.RuntimeFlagsPatch
    readonly scope?: (oldRuntimeFlags: RuntimeFlags.RuntimeFlags) => Primitive
  }>
{}

/** @internal */
export interface While extends
  Op<OpCodes.OP_WHILE, {
    readonly check: () => boolean
    readonly body: () => Primitive
    readonly process: (a: unknown) => void
  }>
{}

/** @internal */
export interface WithRuntime extends
  Op<OpCodes.OP_WITH_RUNTIME, {
    readonly withRuntime: (fiber: FiberRuntime.FiberRuntime<unknown, unknown>, status: FiberStatus.Running) => Primitive
  }>
{}

/** @internal */
export interface Yield extends Op<OpCodes.OP_YIELD> {
  readonly priority: "normal" | "background"
}

/** @internal */
export const isEffect = (u: unknown): u is Effect.Effect<unknown, unknown, unknown> => {
  return typeof u === "object" && u != null && EffectTypeId in u
}

/**
 * @macro traced
 * @internal
 */
export const acquireUseRelease = <R, E, A, R2, E2, A2, R3, X>(
  acquire: Effect.Effect<R, E, A>,
  use: (a: A) => Effect.Effect<R2, E2, A2>,
  release: (a: A, exit: Exit.Exit<E2, A2>) => Effect.Effect<R3, never, X>
): Effect.Effect<R | R2 | R3, E | E2, A2> => {
  const trace = getCallTrace()
  return uninterruptibleMask((restore) =>
    pipe(
      acquire,
      flatMap((a) =>
        pipe(
          suspendSucceed(() => restore(use(a))),
          exit,
          flatMap((exit) =>
            pipe(
              suspendSucceed(() => release(a, exit)),
              matchCauseEffect(
                (cause) => {
                  switch (exit._tag) {
                    case OpCodes.OP_FAILURE: {
                      return failCause(internalCause.parallel(exit.cause, cause))
                    }
                    case OpCodes.OP_SUCCESS: {
                      return failCause(cause)
                    }
                  }
                },
                () => exit
              )
            )
          )
        )
      )
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const as = <B>(value: B) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, B> => {
    return pipe(self, flatMap(() => succeed(value))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const asUnit = <R, E, A>(self: Effect.Effect<R, E, A>) => {
  const trace = getCallTrace()
  return pipe(self, as<void>(void 0)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const async = <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => void,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect._tag = OpCodes.OP_ASYNC
  effect.register = register
  effect.blockingOn = blockingOn
  effect.trace = trace
  return effect
}

/**
 * @macro traced
 * @internal
 */
export const asyncInterruptEither = <R, E, A>(
  register: (
    callback: (effect: Effect.Effect<R, E, A>) => void
  ) => Either.Either<Effect.Effect<R, never, void>, Effect.Effect<R, E, A>>,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return suspendSucceed(() => {
    let cancelerRef: Effect.Effect<R, never, void> = unit()
    return pipe(
      async<R, E, A>(
        (resume) => {
          const result = register(resume)
          if (Either.isRight(result)) {
            resume(result.right)
          } else {
            cancelerRef = result.left
          }
        },
        blockingOn
      ),
      onInterrupt(() => cancelerRef)
    )
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const asyncInterrupt = <R, E, A>(
  register: (
    callback: (effect: Effect.Effect<R, E, A>) => void
  ) => Effect.Effect<R, never, void>,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return suspendSucceed(() => {
    let cancelerRef: Effect.Effect<R, never, void> = unit()
    return pipe(
      async<R, E, A>(
        (resume) => {
          cancelerRef = register(resume)
        },
        blockingOn
      ),
      onInterrupt(() => cancelerRef)
    )
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const catchAllCause = <E, R2, E2, A2>(
  f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E2, A | A2> => {
    const effect = Object.create(proto)
    effect._tag = OpCodes.OP_ON_FAILURE
    effect.first = self
    effect.failK = f
    effect.trace = trace
    return effect
  }
}

/**
 * @macro traced
 * @internal
 */
export const catchAll = <E, R2, E2, A2>(f: (e: E) => Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R2 | R, E2, A2 | A> => {
    return pipe(self, matchEffect(f, succeed)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const catchSome = <E, R2, E2, A2>(pf: (e: E) => Option.Option<Effect.Effect<R2, E2, A2>>) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return pipe(
      self,
      matchCauseEffect(
        (cause): Effect.Effect<R2, E | E2, A2> => {
          const either = internalCause.failureOrCause(cause)
          switch (either._tag) {
            case "Left": {
              return pipe(pf(either.left), Option.getOrElse(() => failCause(cause)))
            }
            case "Right": {
              return failCause(either.right)
            }
          }
        },
        succeed
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const checkInterruptible = <R, E, A>(
  f: (isInterruptible: boolean) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return withFiberRuntime<R, E, A>(
    (_, status) => f(_runtimeFlags.interruption(status.runtimeFlags))
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const die = (defect: unknown): Effect.Effect<never, never, never> => {
  const trace = getCallTrace()
  return failCause(internalCause.die(defect)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const dieSync = (evaluate: LazyArg<unknown>): Effect.Effect<never, never, never> => {
  const trace = getCallTrace()
  return failCauseSync(() => internalCause.die(evaluate())).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const done = <E, A>(exit: Exit.Exit<E, A>): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  return suspendSucceed(() => exit).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const either = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Either.Either<E, A>> => {
  const trace = getCallTrace()
  return pipe(
    self,
    matchEffect(
      (e) => succeed(Either.left(e)),
      (a) => succeed(Either.right(a))
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const environment = <R>(): Effect.Effect<R, never, Context.Context<R>> => {
  const trace = getCallTrace()
  return suspendSucceed(
    () => fiberRefGet(currentEnvironment) as Effect.Effect<never, never, Context.Context<R>>
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const environmentWithEffect = <R, R0, E, A>(
  f: (context: Context.Context<R0>) => Effect.Effect<R, E, A>
): Effect.Effect<R | R0, E, A> => {
  const trace = getCallTrace()
  return pipe(environment<R0>(), flatMap(f)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const exit = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Exit.Exit<E, A>> => {
  const trace = getCallTrace()
  return pipe(self, matchCause(failCause, succeed)).traced(trace) as Effect.Effect<R, never, Exit.Exit<E, A>>
}

/**
 * @macro traced
 * @internal
 */
export const fail = <E>(error: E): Effect.Effect<never, E, never> => {
  const trace = getCallTrace()
  return failCause(internalCause.fail(error)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const failSync = <E>(evaluate: LazyArg<E>): Effect.Effect<never, E, never> => {
  const trace = getCallTrace()
  return failCauseSync(() => internalCause.fail(evaluate())).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const failCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, E, never> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect._tag = OpCodes.OP_FAILURE
  effect.cause = cause
  effect.trace = trace
  return effect
}

/**
 * @macro traced
 * @internal
 */
export const failCauseSync = <E>(evaluate: LazyArg<Cause.Cause<E>>): Effect.Effect<never, E, never> => {
  const trace = getCallTrace()
  return pipe(sync(evaluate), flatMap(failCause)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fiberId = (): Effect.Effect<never, never, FiberId.FiberId> => {
  const trace = getCallTrace()
  return withFiberRuntime<never, never, FiberId.FiberId>(
    (state) => succeed(state.id())
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fiberIdWith = <R, E, A>(
  f: (descriptor: FiberId.Runtime) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return withFiberRuntime<R, E, A>(
    (state) => f(state.id())
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const flatMap = <A, R1, E1, B>(f: (a: A) => Effect.Effect<R1, E1, B>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E | E1, B> => {
    const effect = Object.create(proto)
    effect._tag = OpCodes.OP_ON_SUCCESS
    effect.first = self
    effect.successK = f
    effect.trace = trace
    return effect
  }
}

/**
 * @macro traced
 * @internal
 */
export const flatten = <R, E, R1, E1, A>(self: Effect.Effect<R, E, Effect.Effect<R1, E1, A>>) => {
  const trace = getCallTrace()
  return pipe(self, flatMap(identity)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const flip = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, A, E> => {
  const trace = getCallTrace()
  return pipe(self, matchEffect(succeed, fail)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const matchCause = <E, A2, A, A3>(
  onFailure: (cause: Cause.Cause<E>) => A2,
  onSuccess: (a: A) => A3
) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A2 | A3> =>
    pipe(
      self,
      matchCauseEffect(
        (cause) => succeed(onFailure(cause)),
        (a) => succeed(onSuccess(a))
      )
    ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const matchCauseEffect = <E, A, R2, E2, A2, R3, E3, A3>(
  onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>,
  onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<
    R | R2 | R3,
    E2 | E3,
    A2 | A3
  > => {
    const effect = Object.create(proto)
    effect._tag = OpCodes.OP_ON_SUCCESS_AND_FAILURE
    effect.first = self
    effect.failK = onFailure
    effect.successK = onSuccess
    effect.trace = trace
    return effect
  }
}

/**
 * @macro traced
 * @internal
 */
export const matchEffect = <E, A, R2, E2, A2, R3, E3, A3>(
  onFailure: (e: E) => Effect.Effect<R2, E2, A2>,
  onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2 | R3, E2 | E3, A2 | A3> => {
    return pipe(
      self,
      matchCauseEffect(
        (cause) => {
          const either = internalCause.failureOrCause(cause)
          switch (either._tag) {
            case "Left": {
              return onFailure(either.left)
            }
            case "Right": {
              return failCause(either.right)
            }
          }
        },
        onSuccess
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const forEach = <A, R, E, B>(
  f: (a: A) => Effect.Effect<R, E, B>
) => {
  const trace = getCallTrace()
  return (self: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> =>
    suspendSucceed(() => {
      const arr = Array.from(self)
      const ret = new Array(arr.length)
      let i = 0
      return pipe(
        whileLoop(
          () => i < arr.length,
          () => f(arr[i]),
          (b) => {
            ret[i++] = b
          }
        ),
        as(Chunk.unsafeFromArray(ret))
      )
    }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const forEachDiscard = <A, R, E, B>(
  f: (a: A) => Effect.Effect<R, E, B>
) => {
  const trace = getCallTrace()
  return (self: Iterable<A>): Effect.Effect<R, E, void> =>
    suspendSucceed(() => {
      const arr = Array.from(self)
      let i = 0

      return whileLoop(
        () => i < arr.length,
        () => f(arr[i++]),
        () => {
          //
        }
      )
    }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fromOption = <A>(option: Option.Option<A>): Effect.Effect<never, Option.Option<never>, A> => {
  const trace = getCallTrace()
  switch (option._tag) {
    case "None": {
      return fail(Option.none).traced(trace)
    }
    case "Some": {
      return succeed(option.value).traced(trace)
    }
  }
}

/**
 * @macro traced
 * @internal
 */
export const fromEither = <E, A>(either: Either.Either<E, A>): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  switch (either._tag) {
    case "Left": {
      return fail(either.left).traced(trace)
    }
    case "Right": {
      return succeed(either.right).traced(trace)
    }
  }
}

/**
 * @macro traced
 * @internal
 */
export const ifEffect = <R1, R2, E1, E2, A, A1>(
  onTrue: Effect.Effect<R1, E1, A>,
  onFalse: Effect.Effect<R2, E2, A1>
) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, boolean>): Effect.Effect<R | R1 | R2, E | E1 | E2, A | A1> => {
    return pipe(
      self,
      flatMap((b): Effect.Effect<R1 | R2, E1 | E2, A | A1> => (b ? onTrue : onFalse))
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const interrupt = (): Effect.Effect<never, never, never> => {
  const trace = getCallTrace()
  return pipe(fiberId(), flatMap((fiberId) => interruptWith(fiberId))).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const interruptWith = (fiberId: FiberId.FiberId): Effect.Effect<never, never, never> => {
  const trace = getCallTrace()
  return failCause(internalCause.interrupt(fiberId)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const interruptible = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect._tag = OpCodes.OP_UPDATE_RUNTIME_FLAGS
  effect.update = RuntimeFlagsPatch.enable(_runtimeFlags.Interruption)
  effect.scope = () => self
  effect.trace = trace
  return effect
}

/**
 * @macro traced
 * @internal
 */
export const interruptibleMask = <R, E, A>(
  f: (
    restore: <RX, EX, AX>(
      effect: Effect.Effect<RX, EX, AX>
    ) => Effect.Effect<RX, EX, AX>
  ) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect._tag = OpCodes.OP_UPDATE_RUNTIME_FLAGS
  effect.update = RuntimeFlagsPatch.enable(_runtimeFlags.Interruption)
  effect.scope = (oldFlags: RuntimeFlags.RuntimeFlags) =>
    _runtimeFlags.interruption(oldFlags)
      ? f(interruptible)
      : f(uninterruptible)
  effect.trace = trace
  return effect
}

/**
 * @macro traced
 * @internal
 */
export const intoDeferred = <E, A>(deferred: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, boolean> =>
    uninterruptibleMask((restore) => {
      return pipe(
        restore(self),
        exit,
        flatMap((exit) => deferredDone(deferred)(exit))
      )
    }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const map = <A, B>(f: (a: A) => B) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, B> => {
    return pipe(self, flatMap((a) => sync(() => f(a)))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const mapError = <E, E2>(f: (e: E) => E2) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E2, A> => {
    return pipe(
      self,
      matchCauseEffect(
        (cause) => {
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
        succeed
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const never = (): Effect.Effect<never, never, never> => {
  const trace = getCallTrace()
  return asyncInterruptEither<never, never, never>(() => {
    const interval = setInterval(() => {
      //
    }, 2 ** 31 - 1)
    return Either.left(sync(() => clearInterval(interval)))
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const onError = <E, R2, X>(cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, X>) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E, A> => {
    return pipe(
      self,
      onExit(
        (exit): Effect.Effect<R2, never, X | void> =>
          exitIsSuccess(exit) ?
            unit() :
            cleanup(exit.cause)
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const onExit = <E, A, R2, X>(cleanup: (exit: Exit.Exit<E, A>) => Effect.Effect<R2, never, X>) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E, A> => {
    return uninterruptibleMask((restore) =>
      pipe(
        restore(self),
        matchCauseEffect(
          (cause1) => {
            const result = exitFailCause(cause1)
            return pipe(
              cleanup(result),
              matchCauseEffect(
                (cause2) => exitFailCause(internalCause.sequential(cause1, cause2)),
                () => result
              )
            )
          },
          (success) => {
            const result = exitSucceed(success)
            return pipe(cleanup(result), zipRight(result))
          }
        )
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const onInterrupt = <R2, X>(
  cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect.Effect<R2, never, X>
) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E, A> => {
    return pipe(
      self,
      onExit(
        exitMatch(
          (cause) =>
            internalCause.isInterruptedOnly(cause) ?
              asUnit(cleanup(internalCause.interruptors(cause))) :
              unit(),
          () => unit()
        )
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const orElse = <R2, E2, A2>(that: LazyArg<Effect.Effect<R2, E2, A2>>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E2, A | A2> => {
    return pipe(self, tryOrElse(that, succeed)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const orDie = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A> => {
  const trace = getCallTrace()
  return pipe(self, orDieWith(identity)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const orDieWith = <E>(f: (e: E) => unknown) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A> => {
    return pipe(self, matchEffect((e) => die(f(e)), succeed)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const partitionMap = <A, A1, A2>(
  elements: Iterable<A>,
  f: (a: A) => Either.Either<A1, A2>
): readonly [Chunk.Chunk<A1>, Chunk.Chunk<A2>] => {
  return Array.from(elements).reduceRight(
    ([lefts, rights], current) => {
      const either = f(current)
      switch (either._tag) {
        case "Left": {
          return [pipe(lefts, Chunk.prepend(either.left)), rights] as const
        }
        case "Right": {
          return [lefts, pipe(rights, Chunk.prepend(either.right))] as const
        }
      }
    },
    [Chunk.empty<A1>(), Chunk.empty<A2>()] as const
  )
}

/**
 * @macro traced
 * @internal
 */
export const provideEnvironment = <R>(environment: Context.Context<R>) => {
  const trace = getCallTrace()
  return <E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<never, E, A> => {
    return pipe(
      self as Effect.Effect<never, E, A>,
      fiberRefLocally(currentEnvironment)(environment as Context.Context<never>)
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const provideSomeEnvironment = <R0, R>(f: (context: Context.Context<R0>) => Context.Context<R>) => {
  const trace = getCallTrace()
  return <E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R0, E, A> =>
    environmentWithEffect((context: Context.Context<R0>) => pipe(self, provideEnvironment(f(context)))).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const runtimeFlags = (): Effect.Effect<never, never, RuntimeFlags.RuntimeFlags> => {
  const trace = getCallTrace()
  return withFiberRuntime<never, never, RuntimeFlags.RuntimeFlags>((_, status) => succeed(status.runtimeFlags)).traced(
    trace
  )
}

/**
 * @macro traced
 * @internal
 */
export const service = <T>(tag: Context.Tag<T>): Effect.Effect<T, never, T> => {
  const trace = getCallTrace()
  return serviceWithEffect(tag)(succeed).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const serviceWith = <T>(tag: Context.Tag<T>) => {
  const trace = getCallTrace()
  return <A>(f: (a: T) => A): Effect.Effect<T, never, A> => {
    return serviceWithEffect(tag)((a) => sync(() => f(a))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const serviceWithEffect = <T>(tag: Context.Tag<T>) => {
  return <R, E, A>(f: (a: T) => Effect.Effect<R, E, A>): Effect.Effect<R | T, E, A> => {
    const trace = getCallTrace()
    return suspendSucceed(() =>
      pipe(
        fiberRefGet(currentEnvironment),
        flatMap((env) => f(pipe(env, Context.unsafeGet(tag))))
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const succeed = <A>(value: A): Effect.Effect<never, never, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect._tag = OpCodes.OP_SUCCESS
  effect.value = value
  effect.trace = trace
  return effect
}

/**
 * @macro traced
 * @internal
 */
export const suspendSucceed = <R, E, A>(
  effect: LazyArg<Effect.Effect<R, E, A>>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return pipe(sync(effect), flatMap(identity)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const sync = <A>(evaluate: LazyArg<A>): Effect.Effect<never, never, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect._tag = OpCodes.OP_SYNC
  effect.evaluate = evaluate
  effect.trace = trace
  return effect
}

/**
 * @macro traced
 * @internal
 */
export const tags = (): Effect.Effect<never, never, HashSet.HashSet<MetricLabel.MetricLabel>> => {
  const trace = getCallTrace()
  return fiberRefGet(currentTags).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const tap = <A, R2, E2, X>(f: (a: A) => Effect.Effect<R2, E2, X>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A> => {
    return pipe(self, flatMap((a: A) => pipe(f(a), as(a)))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const traced = (trace: string | undefined) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => self.traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const transplant = <R, E, A>(
  f: (grafter: <R2, E2, A2>(effect: Effect.Effect<R2, E2, A2>) => Effect.Effect<R2, E2, A2>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return withFiberRuntime<R, E, A>((state) => {
    const scopeOverride = state.getFiberRef(forkScopeOverride)
    const scope = pipe(scopeOverride, Option.getOrElse(() => state.scope()))
    return f(fiberRefLocally(forkScopeOverride)(Option.some(scope)))
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const tryOrElse = <R2, E2, A2, A, R3, E3, A3>(
  that: LazyArg<Effect.Effect<R2, E2, A2>>,
  onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2 | R3, E2 | E3, A2 | A3> => {
    return pipe(
      self,
      matchCauseEffect(
        (cause) => {
          const option = internalCause.keepDefects(cause)
          switch (option._tag) {
            case "None": {
              return that()
            }
            case "Some": {
              return failCause(option.value)
            }
          }
        },
        onSuccess
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const uninterruptible = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect._tag = OpCodes.OP_UPDATE_RUNTIME_FLAGS
  effect.update = RuntimeFlagsPatch.disable(_runtimeFlags.Interruption)
  effect.scope = () => self
  effect.trace = trace
  return effect
}

/**
 * @macro traced
 * @internal
 */
export const uninterruptibleMask = <R, E, A>(
  f: (
    restore: <RX, EX, AX>(
      effect: Effect.Effect<RX, EX, AX>
    ) => Effect.Effect<RX, EX, AX>
  ) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect._tag = OpCodes.OP_UPDATE_RUNTIME_FLAGS
  effect.update = RuntimeFlagsPatch.disable(_runtimeFlags.Interruption)
  effect.scope = (oldFlags: RuntimeFlags.RuntimeFlags) => {
    return _runtimeFlags.interruption(oldFlags)
      ? f(interruptible)
      : f(uninterruptible)
  }
  effect.trace = trace
  return effect
}

/**
 * @macro traced
 * @internal
 */
export const unit: (_: void) => Effect.Effect<never, never, void> = () => {
  const trace = getCallTrace()
  return succeed(undefined).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const updateRuntimeFlags = (
  patch: RuntimeFlagsPatch.RuntimeFlagsPatch
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect._tag = OpCodes.OP_UPDATE_RUNTIME_FLAGS
  effect.update = patch
  effect.scope = undefined
  effect.trace = trace
  return effect
}

/**
 * @macro traced
 * @internal
 */
export const whenEffect = <R, E>(predicate: Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return <R2, E2, A>(effect: Effect.Effect<R2, E2, A>): Effect.Effect<R | R2, E | E2, Option.Option<A>> => {
    return pipe(
      predicate,
      flatMap((b) => {
        if (b) {
          return pipe(effect, map(Option.some))
        }
        return succeed(Option.none)
      })
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const whileLoop = <R, E, A>(
  check: LazyArg<boolean>,
  body: LazyArg<Effect.Effect<R, E, A>>,
  process: (a: A) => void
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect._tag = OpCodes.OP_WHILE
  effect.check = check
  effect.body = body
  effect.process = process
  effect.trace = trace
  return effect
}

/**
 * @macro traced
 * @internal
 */
export const withFiberRuntime = <R, E, A>(
  withRuntime: (
    fiber: FiberRuntime.FiberRuntime<E, A>,
    status: FiberStatus.Running
  ) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect._tag = OpCodes.OP_WITH_RUNTIME
  effect.withRuntime = withRuntime
  effect.trace = trace
  return effect
}

/**
 * @macro traced
 * @internal
 */
export const withParallelism = (parallelism: number) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    const trace = getCallTrace()
    return suspendSucceed(
      () => fiberRefLocally(currentParallelism)(Option.some(parallelism))(self)
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const withParallelismUnbounded = <R, E, A>(self: Effect.Effect<R, E, A>) => {
  const trace = getCallTrace()
  return suspendSucceed(
    () => fiberRefLocally(currentParallelism)(Option.none as Option.Option<number>)(self)
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const withRuntimeFlags = (
  update: RuntimeFlagsPatch.RuntimeFlagsPatch
) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    const effect = Object.create(proto)
    effect._tag = OpCodes.OP_UPDATE_RUNTIME_FLAGS
    effect.update = update
    effect.scope = () => self
    effect.trace = trace
    return effect
  }
}

/**
 * @macro traced
 * @internal
 */
export const yieldNow: (priority?: "background" | "normal") => Effect.Effect<never, never, void> = (
  priority = "normal"
) => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect._tag = OpCodes.OP_YIELD
  effect.trace = trace
  effect.priority = priority
  return effect
}

/**
 * @macro traced
 * @internal
 */
export const zip = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, readonly [A, A2]> => {
    return pipe(self, flatMap((a) => pipe(that, map((b) => [a, b] as const)))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const zipLeft = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A> => {
    return pipe(self, flatMap((a) => pipe(that, as(a)))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const zipRight = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A2> => {
    return pipe(self, flatMap(() => that)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const zipWith = <R2, E2, A2, A, B>(that: Effect.Effect<R2, E2, A2>, f: (a: A, b: A2) => B) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, B> => {
    return pipe(self, flatMap((a) => pipe(that, map((b) => f(a, b))))).traced(trace)
  }
}

// -----------------------------------------------------------------------------
// Fiber
// -----------------------------------------------------------------------------

/**
 * @macro traced
 * @internal
 */
export const interruptFiber = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, Exit.Exit<E, A>> => {
  const trace = getCallTrace()
  return pipe(
    fiberId(),
    flatMap((fiberId) => pipe(self, interruptAsFiber(fiberId)))
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const interruptAsFiber = (fiberId: FiberId.FiberId) => {
  const trace = getCallTrace()
  return <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, Exit.Exit<E, A>> => {
    return pipe(self.interruptAsFork(fiberId), flatMap(() => self.await())).traced(trace)
  }
}

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

/**
 * @macro traced
 * @internal
 */
export const fiberRefGet = <A>(self: FiberRef.FiberRef<A>): Effect.Effect<never, never, A> => {
  const trace = getCallTrace()
  return fiberRefModify(self)((a) => [a, a] as const).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefGetAndSet = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return (value: A): Effect.Effect<never, never, A> => {
    return fiberRefModify(self)((v) => [v, value] as const).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefGetAndUpdate = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return (f: (a: A) => A): Effect.Effect<never, never, A> => {
    return fiberRefModify(self)((v) => [v, f(v)] as const).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefGetAndUpdateSome = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return (pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A> => {
    return fiberRefModify(self)((v) => [v, pipe(pf(v), Option.getOrElse(() => v))] as const).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefGetWith = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return <R, E, B>(f: (a: A) => Effect.Effect<R, E, B>): Effect.Effect<R, E, B> => {
    return pipe(fiberRefGet(self), flatMap(f)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefSet = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return (value: A): Effect.Effect<never, never, void> => {
    return fiberRefModify(self)(() => [undefined, value] as const).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefDelete = <A>(self: FiberRef.FiberRef<A>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return withFiberRuntime<never, never, void>((state) => {
    state.unsafeDeleteFiberRef(self)
    return unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefReset = <A>(self: FiberRef.FiberRef<A>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return fiberRefSet(self)(self.initial).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefModify = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return <B>(f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B> =>
    withFiberRuntime<never, never, B>((state) => {
      const [b, a] = f(state.getFiberRef(self) as A)
      state.setFiberRef(self, a)
      return succeed(b)
    }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefModifySome = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return <B>(def: B, f: (a: A) => Option.Option<readonly [B, A]>): Effect.Effect<never, never, B> =>
    fiberRefModify(self)((v) => pipe(f(v), Option.getOrElse(() => [def, v] as const))).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefUpdate = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return (f: (a: A) => A): Effect.Effect<never, never, void> =>
    fiberRefModify(self)((v) => [void 0, f(v)] as const).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefUpdateSome = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return (pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, void> =>
    fiberRefModify(self)((v) => [void 0, pipe(pf(v), Option.getOrElse(() => v))] as const).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefUpdateAndGet = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return (f: (a: A) => A): Effect.Effect<never, never, A> =>
    fiberRefModify(self)((v) => {
      const result = f(v)
      return [result, result] as const
    }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefUpdateSomeAndGet = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return (pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A> =>
    fiberRefModify(self)((v) => {
      const result = pipe(pf(v), Option.getOrElse(() => v))
      return [result, result] as const
    }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefLocally = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return (value: A) => {
    return <R, E, B>(use: Effect.Effect<R, E, B>): Effect.Effect<R, E, B> => {
      return acquireUseRelease(
        pipe(fiberRefGet(self), zipLeft(fiberRefSet(self)(value))),
        () => use,
        (oldValue) => fiberRefSet(self)(oldValue)
      ).traced(trace)
    }
  }
}

/**
 * @macro traced
 * @internal
 */
export const fiberRefLocallyWith = <A>(self: FiberRef.FiberRef<A>) => {
  const trace = getCallTrace()
  return (f: (a: A) => A) => {
    return <R, E, B>(use: Effect.Effect<R, E, B>): Effect.Effect<R, E, B> => {
      return fiberRefGetWith(self)((a) => pipe(use, fiberRefLocally(self)(f(a)))).traced(trace)
    }
  }
}

/** @internal */
export const fiberRefUnsafeMake = <Value>(
  initial: Value,
  fork: (a: Value) => Value = identity,
  join: (left: Value, right: Value) => Value = (_, a) => a
): FiberRef.FiberRef<Value> => {
  return fiberRefUnsafeMakePatch(
    initial,
    Differ.update(),
    fork,
    join
  )
}

/** @internal */
export const fiberRefUnsafeMakeHashSet = <A>(
  initial: HashSet.HashSet<A>
): FiberRef.FiberRef<HashSet.HashSet<A>> => {
  return fiberRefUnsafeMakePatch(
    initial,
    Differ.hashSet(),
    HashSetPatch.empty()
  )
}

/** @internal */
export const fiberRefUnsafeMakeEnvironment = <A>(
  initial: Context.Context<A>
): FiberRef.FiberRef<Context.Context<A>> => {
  return fiberRefUnsafeMakePatch(
    initial,
    Differ.environment(),
    ContextPatch.empty()
  )
}

/** @internal */
export const fiberRefUnsafeMakePatch = <Value, Patch>(
  initial: Value,
  differ: Differ.Differ<Value, Patch>,
  fork: Patch,
  join: (oldV: Value, newV: Value) => Value = (_, n) => n
): FiberRef.FiberRef<Value> => ({
  [FiberRefTypeId]: fiberRefVariance,
  initial,
  diff: (oldValue, newValue) => pipe(differ, Differ.diff(oldValue, newValue)),
  combine: (first, second) => pipe(differ, Differ.combine(first as Patch, second as Patch)),
  patch: (patch) => (oldValue) => pipe(differ, Differ.patch(patch as Patch, oldValue)),
  fork,
  join
})

/** @internal */
export const fiberRefUnsafeMakeRuntimeFlags = (
  initial: RuntimeFlags.RuntimeFlags
): FiberRef.FiberRef<RuntimeFlags.RuntimeFlags> => {
  return fiberRefUnsafeMakePatch(
    initial,
    _runtimeFlags.differ(),
    RuntimeFlagsPatch.empty
  )
}

/** @internal */
export const currentEnvironment: FiberRef.FiberRef<Context.Context<never>> = fiberRefUnsafeMakeEnvironment(
  Context.empty()
)

/** @internal */
export const currentLogAnnotations: FiberRef.FiberRef<HashMap.HashMap<string, string>> = fiberRefUnsafeMake(
  HashMap.empty()
)

/** @internal */
export const currentLogLevel: FiberRef.FiberRef<LogLevel.LogLevel> = fiberRefUnsafeMake<LogLevel.LogLevel>(
  logLevelInfo
)

/** @internal */
export const currentLogSpan: FiberRef.FiberRef<Chunk.Chunk<LogSpan.LogSpan>> = fiberRefUnsafeMake(
  Chunk.empty<LogSpan.LogSpan>()
)

/** @internal */
export const currentScheduler: FiberRef.FiberRef<Scheduler.Scheduler> = fiberRefUnsafeMake(scheduler.defaultScheduler)

/** @internal */
export const currentParallelism: FiberRef.FiberRef<Option.Option<number>> = fiberRefUnsafeMake<Option.Option<number>>(
  Option.none
)

/** @internal */
export const currentTags: FiberRef.FiberRef<HashSet.HashSet<MetricLabel.MetricLabel>> = fiberRefUnsafeMakeHashSet(
  HashSet.empty()
)

/** @internal */
export const forkScopeOverride: FiberRef.FiberRef<Option.Option<fiberScope.FiberScope>> = fiberRefUnsafeMake(
  Option.none,
  () => Option.none as Option.Option<fiberScope.FiberScope>,
  (parent, _) => parent
)

/** @internal */
export const interruptedCause: FiberRef.FiberRef<Cause.Cause<never>> = fiberRefUnsafeMake(
  internalCause.empty,
  () => internalCause.empty,
  (parent, _) => parent
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

/**
 * @macro traced
 * @internal
 */
export const scopeAddFinalizer = (finalizer: Effect.Effect<never, never, unknown>) => {
  const trace = getCallTrace()
  return (self: Scope.Scope): Effect.Effect<never, never, void> => {
    return self.addFinalizer(() => asUnit(finalizer)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const scopeAddFinalizerExit = (finalizer: Scope.Scope.Finalizer) => {
  const trace = getCallTrace()
  return (self: Scope.Scope): Effect.Effect<never, never, void> => {
    return self.addFinalizer(finalizer).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const scopeClose = (exit: Exit.Exit<unknown, unknown>) => {
  const trace = getCallTrace()
  return (self: Scope.Scope.Closeable): Effect.Effect<never, never, void> => {
    return self.close(exit).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const scopeFork = (strategy: ExecutionStrategy.ExecutionStrategy) => {
  const trace = getCallTrace()
  return (self: Scope.Scope): Effect.Effect<never, never, Scope.Scope.Closeable> => {
    return self.fork(strategy).traced(trace)
  }
}

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

/**
 * @macro traced
 * @internal
 */
export const releaseMapAdd = (finalizer: Scope.Scope.Finalizer) => {
  const trace = getCallTrace()
  return (self: ReleaseMap): Effect.Effect<never, never, Scope.Scope.Finalizer> => {
    return pipe(
      self,
      releaseMapAddIfOpen(finalizer),
      map(Option.match(
        (): Scope.Scope.Finalizer => () => unit(),
        (key): Scope.Scope.Finalizer => (exit) => releaseMapRelease(key, exit)(self)
      ))
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const releaseMapRelease = (key: number, exit: Exit.Exit<unknown, unknown>) => {
  const trace = getCallTrace()
  return (self: ReleaseMap): Effect.Effect<never, never, void> => {
    return suspendSucceed(() => {
      switch (self.state._tag) {
        case "Exited": {
          return unit()
        }
        case "Running": {
          const finalizer = self.state.finalizers.get(key)
          self.state.finalizers.delete(key)
          if (finalizer !== undefined) {
            return self.state.update(finalizer)(exit)
          }
          return unit()
        }
      }
    }).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const releaseMapAddIfOpen = (finalizer: Scope.Scope.Finalizer) => {
  const trace = getCallTrace()
  return (self: ReleaseMap): Effect.Effect<never, never, Option.Option<number>> => {
    return suspendSucceed(() => {
      switch (self.state._tag) {
        case "Exited": {
          self.state.nextKey += 1
          return pipe(finalizer(self.state.exit), as(Option.none))
        }
        case "Running": {
          const key = self.state.nextKey
          self.state.finalizers.set(key, finalizer)
          self.state.nextKey += 1
          return succeed(Option.some(key))
        }
      }
    }).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const releaseMapGet = (key: number) => {
  const trace = getCallTrace()
  return (self: ReleaseMap): Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>> => {
    return sync((): Option.Option<Scope.Scope.Finalizer> =>
      self.state._tag === "Running" ? Option.fromNullable(self.state.finalizers.get(key)) : Option.none
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const releaseMapReplace = (key: number, finalizer: Scope.Scope.Finalizer) => {
  const trace = getCallTrace()
  return (self: ReleaseMap): Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>> => {
    return suspendSucceed(() => {
      switch (self.state._tag) {
        case "Exited": {
          return as(Option.none)(finalizer(self.state.exit))
        }
        case "Running": {
          const fin = Option.fromNullable(self.state.finalizers.get(key))
          self.state.finalizers.set(key, finalizer)
          return succeed(fin)
        }
      }
    }).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const releaseMapRemove = (key: number) => {
  const trace = getCallTrace()
  return (self: ReleaseMap): Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>> => {
    return sync(() => {
      if (self.state._tag === "Exited") {
        return Option.none
      }
      const fin = Option.fromNullable(self.state.finalizers.get(key))
      self.state.finalizers.delete(key)
      return fin
    }).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const releaseMapMake = (): Effect.Effect<never, never, ReleaseMap> => {
  const trace = getCallTrace()
  return sync((): ReleaseMap => ({
    state: {
      _tag: "Running",
      nextKey: 0,
      finalizers: new Map(),
      update: identity
    }
  })).traced(trace)
}

// -----------------------------------------------------------------------------
// Exit
// -----------------------------------------------------------------------------

/** @internal */
export const exitIsExit = (u: unknown): u is Exit.Exit<unknown, unknown> => {
  return isEffect(u) && "_tag" in u && (u._tag === "Success" || u._tag === "Failure")
}

/** @internal */
export const exitIsFailure = <E, A>(self: Exit.Exit<E, A>): self is Exit.Failure<E> => {
  return self._tag === "Failure"
}

/** @internal */
export const exitIsSuccess = <E, A>(self: Exit.Exit<E, A>): self is Exit.Success<A> => {
  return self._tag === "Success"
}

/** @internal */
export const exitSucceed = <A>(value: A): Exit.Exit<never, A> => {
  const exit = Object.create(proto)
  exit._tag = OpCodes.OP_SUCCESS
  exit.value = value
  exit.trace = undefined
  return exit
}

/** @internal */
export const exitFail = <E>(error: E): Exit.Exit<E, never> => {
  return exitFailCause(internalCause.fail(error)) as Exit.Exit<E, never>
}

/** @internal */
export const exitFailCause = <E>(cause: Cause.Cause<E>): Exit.Exit<E, never> => {
  const exit = Object.create(proto)
  exit._tag = OpCodes.OP_FAILURE
  exit.cause = cause
  exit.trace = undefined
  return exit
}

/** @internal */
export const exitDie = (defect: unknown): Exit.Exit<never, never> => {
  return exitFailCause(internalCause.die(defect)) as Exit.Exit<never, never>
}

/** @internal */
export const exitInterrupt = (fiberId: FiberId.FiberId): Exit.Exit<never, never> => {
  return exitFailCause(internalCause.interrupt(fiberId)) as Exit.Exit<never, never>
}

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
export const exitIsInterrupted = <E, A>(self: Exit.Exit<E, A>): boolean => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return internalCause.isInterrupted(self.cause)
    }
    case OpCodes.OP_SUCCESS: {
      return false
    }
  }
}

/** @internal */
export const exitCauseOption = <E, A>(self: Exit.Exit<E, A>): Option.Option<Cause.Cause<E>> => {
  switch (self._tag) {
    case OpCodes.OP_FAILURE: {
      return Option.some(self.cause)
    }
    case OpCodes.OP_SUCCESS: {
      return Option.none
    }
  }
}

/** @internal */
export const exitGetOrElse = <E, A>(orElse: (cause: Cause.Cause<E>) => A) => {
  return (self: Exit.Exit<E, A>): A => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        return orElse(self.cause)
      }
      case OpCodes.OP_SUCCESS: {
        return self.value
      }
    }
  }
}

/** @internal */
export const exitExists = <A>(predicate: Predicate<A>) => {
  return <E>(self: Exit.Exit<E, A>): boolean => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        return false
      }
      case OpCodes.OP_SUCCESS: {
        return predicate(self.value)
      }
    }
  }
}

/** @internal */
export const exitAs = <A1>(value: A1) => {
  return <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E, A1> => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        return self as Exit.Exit<E, A1>
      }
      case OpCodes.OP_SUCCESS: {
        return exitSucceed(value) as Exit.Exit<E, A1>
      }
    }
  }
}

/** @internal */
export const exitAsUnit = <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E, void> => {
  return pipe(self, exitAs(void 0)) as Exit.Exit<E, void>
}

/** @internal */
export const exitMap = <A, B>(f: (a: A) => B) => {
  return <E>(self: Exit.Exit<E, A>): Exit.Exit<E, B> => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        return self as Exit.Exit<E, B>
      }
      case OpCodes.OP_SUCCESS: {
        return exitSucceed(f(self.value)) as Exit.Exit<E, B>
      }
    }
  }
}

/** @internal */
export const exitMapBoth = <E, A, E1, A1>(
  onFailure: (e: E) => E1,
  onSuccess: (a: A) => A1
) => {
  return (self: Exit.Exit<E, A>): Exit.Exit<E1, A1> => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        return exitFailCause(pipe(self.cause, internalCause.map(onFailure))) as Exit.Exit<E1, A1>
      }
      case OpCodes.OP_SUCCESS: {
        return exitSucceed(onSuccess(self.value)) as Exit.Exit<E1, A1>
      }
    }
  }
}

/** @internal */
export const exitUnannotate = <E, A>(exit: Exit.Exit<E, A>): Exit.Exit<E, A> =>
  exitIsSuccess(exit) ? exit : exitFailCause(internalCause.unannotate(exit.cause))

/** @internal */
export const exitMapError = <E, E1>(f: (e: E) => E1) => {
  return <A>(self: Exit.Exit<E, A>): Exit.Exit<E1, A> => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        return exitFailCause(pipe(self.cause, internalCause.map(f))) as Exit.Exit<E1, A>
      }
      case OpCodes.OP_SUCCESS: {
        return self as Exit.Exit<E1, A>
      }
    }
  }
}

/** @internal */
export const exitMapErrorCause = <E, E1>(f: (cause: Cause.Cause<E>) => Cause.Cause<E1>) => {
  return <A>(self: Exit.Exit<E, A>): Exit.Exit<E1, A> => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        return exitFailCause(f(self.cause)) as Exit.Exit<E1, A>
      }
      case OpCodes.OP_SUCCESS: {
        return self as Exit.Exit<E1, A>
      }
    }
  }
}

/** @internal */
export const exitFlatMap = <A, E1, A1>(f: (a: A) => Exit.Exit<E1, A1>) => {
  return <E>(self: Exit.Exit<E, A>): Exit.Exit<E | E1, A1> => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        return self as Exit.Exit<E | E1, A1>
      }
      case OpCodes.OP_SUCCESS: {
        return f(self.value) as Exit.Exit<E | E1, A1>
      }
    }
  }
}

/** @internal */
export const exitFlatMapEffect = <E, A, R, E1, A1>(
  f: (a: A) => Effect.Effect<R, E1, Exit.Exit<E, A1>>
) => {
  return (self: Exit.Exit<E, A>): Effect.Effect<R, E1, Exit.Exit<E, A1>> => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        return succeed(self)
      }
      case OpCodes.OP_SUCCESS: {
        return f(self.value)
      }
    }
  }
}

/** @internal */
export const exitFlatten = <E, E1, A>(
  self: Exit.Exit<E, Exit.Exit<E1, A>>
): Exit.Exit<E | E1, A> => {
  return pipe(self, exitFlatMap(identity)) as Exit.Exit<E | E1, A>
}

/** @internal */
export const exitMatch = <E, A, Z>(
  onFailure: (cause: Cause.Cause<E>) => Z,
  onSuccess: (a: A) => Z
) => {
  return (self: Exit.Exit<E, A>): Z => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        return onFailure(self.cause)
      }
      case OpCodes.OP_SUCCESS: {
        return onSuccess(self.value)
      }
    }
  }
}

/** @internal */
export const exitMatchEffect = <E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R1, E1, A1>,
  onSuccess: (a: A) => Effect.Effect<R2, E2, A2>
) => {
  return (self: Exit.Exit<E, A>): Effect.Effect<R1 | R2, E1 | E2, A1 | A2> => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        return onFailure(self.cause)
      }
      case OpCodes.OP_SUCCESS: {
        return onSuccess(self.value)
      }
    }
  }
}

/** @internal */
export const exitForEachEffect = <A, R, E1, B>(f: (a: A) => Effect.Effect<R, E1, B>) => {
  return <E>(self: Exit.Exit<E, A>): Effect.Effect<R, never, Exit.Exit<E | E1, B>> => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        return succeed(exitFailCause(self.cause))
      }
      case OpCodes.OP_SUCCESS: {
        return exit(f(self.value))
      }
    }
  }
}

/** @internal */
export const exitZip = <E2, A2>(that: Exit.Exit<E2, A2>) => {
  return <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E | E2, readonly [A, A2]> => {
    return pipe(
      self,
      exitZipWith(
        that,
        (a, a2) => [a, a2] as const,
        internalCause.sequential
      )
    ) as Exit.Exit<E | E2, readonly [A, A2]>
  }
}

/** @internal */
export const exitZipLeft = <E2, A2>(that: Exit.Exit<E2, A2>) => {
  return <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E | E2, A> => {
    return pipe(
      self,
      exitZipWith(
        that,
        (a, _) => a,
        internalCause.sequential
      )
    ) as Exit.Exit<E | E2, A>
  }
}

/** @internal */
export const exitZipRight = <E2, A2>(that: Exit.Exit<E2, A2>) => {
  return <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E | E2, A2> => {
    return pipe(
      self,
      exitZipWith(
        that,
        (_, a2) => a2,
        internalCause.sequential
      )
    ) as Exit.Exit<E | E2, A2>
  }
}

/** @internal */
export const exitZipPar = <E2, A2>(that: Exit.Exit<E2, A2>) => {
  return <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E | E2, readonly [A, A2]> => {
    return pipe(
      self,
      exitZipWith(
        that,
        (a, a2) => [a, a2] as const,
        internalCause.parallel
      )
    ) as Exit.Exit<E | E2, readonly [A, A2]>
  }
}

/** @internal */
export const exitZipParLeft = <E2, A2>(that: Exit.Exit<E2, A2>) => {
  return <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E | E2, A> => {
    return pipe(
      self,
      exitZipWith(that, (a, _) => a, internalCause.parallel)
    ) as Exit.Exit<E | E2, A>
  }
}

/** @internal */
export const exitZipParRight = <E2, A2>(that: Exit.Exit<E2, A2>) => {
  return <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E | E2, A2> => {
    return pipe(
      self,
      exitZipWith(that, (_, a2) => a2, internalCause.parallel)
    ) as Exit.Exit<E | E2, A2>
  }
}

/** @internal */
export const exitZipWith = <E, E1, A, B, C>(
  that: Exit.Exit<E1, B>,
  f: (a: A, b: B) => C,
  g: (c: Cause.Cause<E>, c1: Cause.Cause<E1>) => Cause.Cause<E | E1>
) => {
  return (self: Exit.Exit<E, A>): Exit.Exit<E | E1, C> => {
    switch (self._tag) {
      case OpCodes.OP_FAILURE: {
        switch (that._tag) {
          case OpCodes.OP_SUCCESS: {
            return self as Exit.Exit<E | E1, C>
          }
          case OpCodes.OP_FAILURE: {
            return exitFailCause(g(self.cause, that.cause)) as Exit.Exit<E | E1, C>
          }
        }
      }
      case OpCodes.OP_SUCCESS: {
        switch (that._tag) {
          case OpCodes.OP_SUCCESS: {
            return exitSucceed(f(self.value, that.value)) as Exit.Exit<E | E1, C>
          }
          case OpCodes.OP_FAILURE: {
            return that as Exit.Exit<E | E1, C>
          }
        }
      }
    }
  }
}

/** @internal */
export const exitCollectAll = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>
): Option.Option<Exit.Exit<E, Chunk.Chunk<A>>> => {
  return exitCollectAllInternal(exits, internalCause.sequential)
}

/** @internal */
export const exitCollectAllPar = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>
): Option.Option<Exit.Exit<E, Chunk.Chunk<A>>> => {
  return exitCollectAllInternal(exits, internalCause.parallel)
}

/** @internal */
export const exitUnit: (_: void) => Exit.Exit<never, void> = () => exitSucceed(void 0)

/** @internal */
const exitCollectAllInternal = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>,
  combineCauses: (causeA: Cause.Cause<E>, causeB: Cause.Cause<E>) => Cause.Cause<E>
): Option.Option<Exit.Exit<E, Chunk.Chunk<A>>> => {
  const list = Chunk.fromIterable(exits)
  if (!Chunk.isNonEmpty(list)) {
    return Option.none
  }
  return pipe(
    Chunk.tailNonEmpty(list),
    Chunk.reduce(
      pipe(Chunk.headNonEmpty(list), exitMap<A, Chunk.Chunk<A>>(Chunk.of)),
      (accumulator, current) =>
        pipe(
          accumulator,
          exitZipWith(
            current,
            (list, value) => pipe(list, Chunk.prepend(value)),
            combineCauses
          )
        )
    ),
    exitMap(Chunk.reverse),
    Option.some
  )
}

// -----------------------------------------------------------------------------
// Deferred
// -----------------------------------------------------------------------------

/** @internal */
export const deferredUnsafeMake = <E, A>(fiberId: FiberId.FiberId): Deferred.Deferred<E, A> => {
  return {
    [deferred.DeferredTypeId]: deferred.deferredVariance,
    state: MutableRef.make(deferred.pending([])),
    blockingOn: fiberId
  }
}

/**
 * @macro traced
 * @internal
 */
export const deferredMake = <E, A>(): Effect.Effect<never, never, Deferred.Deferred<E, A>> => {
  const trace = getCallTrace()
  return pipe(fiberId(), flatMap((id) => deferredMakeAs<E, A>(id))).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredMakeAs = <E, A>(
  fiberId: FiberId.FiberId
): Effect.Effect<never, never, Deferred.Deferred<E, A>> => {
  const trace = getCallTrace()
  return sync(() => deferredUnsafeMake<E, A>(fiberId)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredSucceed = <E, A>(self: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return (value: A): Effect.Effect<never, never, boolean> => deferredCompleteWith(self)(succeed(value)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredSync = <E, A>(self: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return (evaluate: LazyArg<A>): Effect.Effect<never, never, boolean> =>
    deferredCompleteWith(self)(sync(evaluate)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredFail = <E, A>(self: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return (error: E): Effect.Effect<never, never, boolean> => deferredCompleteWith(self)(fail(error)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredFailSync = <E, A>(self: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return (evaluate: LazyArg<E>): Effect.Effect<never, never, boolean> => {
    return deferredCompleteWith(self)(failSync(evaluate)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const deferredFailCause = <E, A>(self: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return (cause: Cause.Cause<E>): Effect.Effect<never, never, boolean> =>
    deferredCompleteWith(self)(failCause(cause)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredFailCauseSync = <E, A>(self: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return (evaluate: LazyArg<Cause.Cause<E>>): Effect.Effect<never, never, boolean> =>
    deferredCompleteWith(self)(failCauseSync(evaluate)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredDie = <E, A>(self: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return (defect: unknown): Effect.Effect<never, never, boolean> =>
    deferredCompleteWith(self)(die(defect)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredDieSync = <E, A>(self: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return (evaluate: LazyArg<unknown>): Effect.Effect<never, never, boolean> =>
    deferredCompleteWith(self)(dieSync(evaluate)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredDone = <E, A>(self: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return (exit: Exit.Exit<E, A>): Effect.Effect<never, never, boolean> =>
    deferredCompleteWith(self)(done(exit)).traced(trace)
}

/** @internal */
export const deferredUnsafeDone = <E, A>(self: Deferred.Deferred<E, A>) => {
  return (effect: Effect.Effect<never, E, A>): void => {
    const state = MutableRef.get(self.state)
    if (state._tag === DeferredOpCodes.OP_STATE_PENDING) {
      pipe(self.state, MutableRef.set(deferred.done(effect)))
      for (let i = state.joiners.length - 1; i >= 0; i--) {
        state.joiners[i](effect)
      }
    }
  }
}

/**
 * @macro traced
 * @internal
 */
export const deferredInterrupt = <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
  const trace = getCallTrace()
  return pipe(
    fiberId(),
    flatMap((fiberId) => deferredCompleteWith(self)(interruptWith(fiberId)))
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredInterruptWith = <E, A>(self: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return (fiberId: FiberId.FiberId): Effect.Effect<never, never, boolean> =>
    deferredCompleteWith(self)(interruptWith(fiberId)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredAwait = <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  return asyncInterruptEither<never, E, A>((k) => {
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
  }, self.blockingOn).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredComplete = <E, A>(self: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return (effect: Effect.Effect<never, E, A>): Effect.Effect<never, never, boolean> => {
    return pipe(effect, intoDeferred(self)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const deferredCompleteWith = <E, A>(self: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return (effect: Effect.Effect<never, E, A>): Effect.Effect<never, never, boolean> => {
    return sync(() => {
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
    }).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const deferredIsDone = <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
  const trace = getCallTrace()
  return sync(() => MutableRef.get(self.state)._tag === DeferredOpCodes.OP_STATE_DONE).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const deferredPoll = <E, A>(
  self: Deferred.Deferred<E, A>
): Effect.Effect<never, never, Option.Option<Effect.Effect<never, E, A>>> => {
  const trace = getCallTrace()
  return sync(() => {
    const state = MutableRef.get(self.state)
    switch (state._tag) {
      case DeferredOpCodes.OP_STATE_DONE: {
        return Option.some(state.effect)
      }
      case DeferredOpCodes.OP_STATE_PENDING: {
        return Option.none
      }
    }
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
const deferredInterruptJoiner = <E, A>(
  self: Deferred.Deferred<E, A>,
  joiner: (effect: Effect.Effect<never, E, A>) => void
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return sync(() => {
    const state = MutableRef.get(self.state)
    if (state._tag === DeferredOpCodes.OP_STATE_PENDING) {
      pipe(
        self.state,
        MutableRef.set(deferred.pending(state.joiners.filter((j) => j !== joiner)))
      )
    }
  }).traced(trace)
}
