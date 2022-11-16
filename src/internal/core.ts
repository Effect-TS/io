import * as Cause from "@effect/io/Cause"
import { getCallTrace, runtimeDebug } from "@effect/io/Debug"
import type * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import type * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import type * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as RuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"
import type * as FiberScope from "@effect/io/Fiber/Scope"
import type * as FiberStatus from "@effect/io/Fiber/Status"
import type * as FiberRef from "@effect/io/FiberRef"
import * as deferred from "@effect/io/internal/deferred"
import type * as FiberRuntime from "@effect/io/internal/fiberRuntime"
import * as OpCodes from "@effect/io/internal/opCodes/effect"
import * as Scheduler from "@effect/io/internal/scheduler"
import * as SingleShotGen from "@effect/io/internal/singleShotGen"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as LogSpan from "@effect/io/Logger/Span"
import type * as Scope from "@effect/io/Scope"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import * as Differ from "@fp-ts/data/Differ"
import * as ContextPatch from "@fp-ts/data/Differ/ContextPatch"
import * as HashSetPatch from "@fp-ts/data/Differ/HashSetPatch"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import { identity, pipe } from "@fp-ts/data/Function"
import type * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
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
  readonly op = OpCodes.OP_REVERT_FLAGS
  constructor(readonly patch: RuntimeFlagsPatch.RuntimeFlagsPatch) {}
}

const effectVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export const proto = {
  [EffectTypeId]: effectVariance,
  [Equal.symbolEqual](this: {}, that: unknown) {
    return this === that
  },
  [Equal.symbolHash](this: {}) {
    return Equal.hashRandom(this)
  },
  traced(this: Effect.Effect<never, never, never>, trace: string | undefined): Effect.Effect<never, never, never> {
    if (!runtimeDebug.traceEnabled || trace === this["trace"]) {
      return this
    }
    const fresh = Object.create(proto)
    Object.assign(fresh, this)
    fresh.trace = trace
    return fresh
  },
  [Symbol.iterator]() {
    return new SingleShotGen.SingleShotGen(this)
  }
}

/** @internal */
export type Op<OpCode extends number, Body = {}> = Effect.Effect<never, never, never> & Body & {
  readonly op: OpCode
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

export interface Commit extends Op<OpCodes.OP_COMMIT, { readonly commit: Effect.Effect<unknown, unknown, unknown> }> {}

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
    readonly evaluate: () => unknown
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
export interface Yield extends Op<OpCodes.OP_YIELD> {}

/** @internal */
export const isEffect = (u: unknown): u is Effect.Effect<unknown, unknown, unknown> => {
  return typeof u === "object" && u != null && EffectTypeId in u
}

/** @internal */
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
              foldCauseEffect(
                (cause) => {
                  switch (exit.op) {
                    case OpCodes.OP_FAILURE: {
                      return failCause(Cause.parallel(exit.cause, cause))
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

/** @internal */
export const as = <B>(value: B) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, B> => {
    return pipe(self, flatMap(() => succeed(value))).traced(trace)
  }
}

/** @internal */
export const asUnit = <R, E, A>(self: Effect.Effect<R, E, A>) => {
  const trace = getCallTrace()
  return pipe(self, as<void>(void 0)).traced(trace)
}

/** @internal */
export const async = <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => void,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_ASYNC
  effect.register = register
  effect.blockingOn = blockingOn
  effect.trace = trace
  return effect
}

/** @internal */
export const asyncInterrupt = <R, E, A>(
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

/** @internal */
export const catchAllCause = <E, R2, E2, A2>(
  f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E2, A | A2> => {
    const effect = Object.create(proto)
    effect.op = OpCodes.OP_ON_FAILURE
    effect.first = self
    effect.failK = f
    effect.trace = trace
    return effect
  }
}

/** @internal */
export const die = (defect: unknown): Effect.Effect<never, never, never> => {
  const trace = getCallTrace()
  return failCause(Cause.die(defect)).traced(trace)
}

/** @internal */
export const dieSync = (evaluate: () => unknown): Effect.Effect<never, never, never> => {
  const trace = getCallTrace()
  return failCauseSync(() => Cause.die(evaluate())).traced(trace)
}

/** @internal */
export const done = <E, A>(exit: Exit.Exit<E, A>): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  return exit.op === OpCodes.OP_FAILURE ? failCause(exit.cause).traced(trace) : succeed(exit.value).traced(trace)
}

/** @internal */
export const either = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Either.Either<E, A>> => {
  const trace = getCallTrace()
  return pipe(
    self,
    foldEffect(
      (e) => succeed(Either.left(e)),
      (a) => succeed(Either.right(a))
    )
  ).traced(trace)
}

/** @internal */
export const environment = <R>(): Effect.Effect<R, never, Context.Context<R>> => {
  const trace = getCallTrace()
  return suspendSucceed(
    () => getFiberRef(currentEnvironment) as Effect.Effect<never, never, Context.Context<R>>
  ).traced(trace)
}

/** @internal */
export const environmentWithEffect = <R, R0, E, A>(
  f: (context: Context.Context<R0>) => Effect.Effect<R, E, A>
): Effect.Effect<R | R0, E, A> => {
  const trace = getCallTrace()
  return pipe(environment<R0>(), flatMap(f)).traced(trace)
}

/** @internal */
export const exit = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Exit.Exit<E, A>> => {
  const trace = getCallTrace()
  return pipe(self, foldCause(failCause, succeed)).traced(trace) as Effect.Effect<R, never, Exit.Exit<E, A>>
}

/** @internal */
export const fail = <E>(error: E): Effect.Effect<never, E, never> => {
  const trace = getCallTrace()
  return failCause(Cause.fail(error)).traced(trace)
}

/** @internal */
export const failSync = <E>(evaluate: () => E): Effect.Effect<never, E, never> => {
  const trace = getCallTrace()
  return failCauseSync(() => Cause.fail(evaluate())).traced(trace)
}

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, E, never> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_FAILURE
  effect.cause = cause
  effect.trace = trace
  return effect
}

/** @internal */
export const failCauseSync = <E>(evaluate: () => Cause.Cause<E>): Effect.Effect<never, E, never> => {
  const trace = getCallTrace()
  return pipe(sync(evaluate), flatMap(failCause)).traced(trace)
}

/** @internal */
export const fiberId = (): Effect.Effect<never, never, FiberId.FiberId> => {
  const trace = getCallTrace()
  return withFiberRuntime<never, never, FiberId.FiberId>(
    (state) => succeed(state.id())
  ).traced(trace)
}

/** @internal */
export const fiberIdWith = <R, E, A>(
  f: (descriptor: FiberId.Runtime) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return withFiberRuntime<R, E, A>(
    (state) => f(state.id())
  ).traced(trace)
}

/** @internal */
export const flatMap = <A, R1, E1, B>(f: (a: A) => Effect.Effect<R1, E1, B>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E | E1, B> => {
    const effect = Object.create(proto)
    effect.op = OpCodes.OP_ON_SUCCESS
    effect.first = self
    effect.successK = f
    effect.trace = trace
    return effect
  }
}

/** @internal */
export const flatten = <R, E, R1, E1, A>(self: Effect.Effect<R, E, Effect.Effect<R1, E1, A>>) => {
  const trace = getCallTrace()
  return pipe(self, flatMap(identity)).traced(trace)
}

/** @internal */
export const flip = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, A, E> => {
  const trace = getCallTrace()
  return pipe(self, foldEffect(succeed, fail)).traced(trace)
}

/** @internal */
export const foldCause = <E, A2, A, A3>(
  onFailure: (cause: Cause.Cause<E>) => A2,
  onSuccess: (a: A) => A3
) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A2 | A3> =>
    pipe(
      self,
      foldCauseEffect(
        (cause) => succeed(onFailure(cause)),
        (a) => succeed(onSuccess(a))
      )
    ).traced(trace)
}

/** @internal */
export const foldCauseEffect = <E, A, R2, E2, A2, R3, E3, A3>(
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
    effect.op = OpCodes.OP_ON_SUCCESS_AND_FAILURE
    effect.first = self
    effect.failK = onFailure
    effect.successK = onSuccess
    effect.trace = trace
    return effect
  }
}

/** @internal */
export const foldEffect = <E, A, R2, E2, A2, R3, E3, A3>(
  onFailure: (e: E) => Effect.Effect<R2, E2, A2>,
  onSuccess: (a: A) => Effect.Effect<R3, E3, A3>
) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2 | R3, E2 | E3, A2 | A3> => {
    return pipe(
      self,
      foldCauseEffect(
        (cause) => {
          const either = Cause.failureOrCause(cause)
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

/** @internal */
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

/** @internal */
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

/** @internal */
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

/** @internal */
export const interrupt = (): Effect.Effect<never, never, never> => {
  const trace = getCallTrace()
  return pipe(fiberId(), flatMap((fiberId) => interruptAs(fiberId))).traced(trace)
}

/** @internal */
export const interruptAs = (fiberId: FiberId.FiberId): Effect.Effect<never, never, never> => {
  const trace = getCallTrace()
  return failCause(Cause.interrupt(fiberId)).traced(trace)
}

/** @internal */
export const interruptible = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_UPDATE_RUNTIME_FLAGS
  effect.update = RuntimeFlagsPatch.enable(RuntimeFlags.Interruption)
  effect.scope = () => self
  effect.trace = trace
  return effect
}

/** @internal */
export const interruptibleMask = <R, E, A>(
  f: (
    restore: <RX, EX, AX>(
      effect: Effect.Effect<RX, EX, AX>
    ) => Effect.Effect<RX, EX, AX>
  ) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_UPDATE_RUNTIME_FLAGS
  effect.update = RuntimeFlagsPatch.enable(RuntimeFlags.Interruption)
  effect.scope = (oldFlags: RuntimeFlags.RuntimeFlags) =>
    RuntimeFlags.interruption(oldFlags)
      ? f(interruptible)
      : f(uninterruptible)
  effect.trace = trace
  return effect
}

/** @internal */
export const intoDeferred = <E, A>(deferred: Deferred.Deferred<E, A>) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, boolean> =>
    uninterruptibleMask((restore) => {
      return pipe(
        restore(self),
        exit,
        flatMap((exit) => pipe(deferred, doneDeferred(exit)))
      )
    }).traced(trace)
}

/** @internal */
export const map = <A, B>(f: (a: A) => B) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, B> => {
    return pipe(self, flatMap((a) => sync(() => f(a)))).traced(trace)
  }
}

/** @internal */
export const never = (): Effect.Effect<never, never, never> => {
  const trace = getCallTrace()
  return asyncInterrupt<never, never, never>(() => {
    const interval = setInterval(() => {
      //
    }, 2 ** 31 - 1)
    return Either.left(sync(() => clearInterval(interval)))
  }).traced(trace)
}

/** @internal */
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

/** @internal */
export const onExit = <E, A, R2, X>(cleanup: (exit: Exit.Exit<E, A>) => Effect.Effect<R2, never, X>) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E, A> =>
    acquireUseRelease(
      unit(),
      () => self,
      (_, exit) => cleanup(exit)
    ).traced(trace)
}

/** @internal */
export const onInterrupt = <R2, X>(
  cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect.Effect<R2, never, X>
) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E, A> =>
    uninterruptibleMask((restore) =>
      pipe(
        restore(self),
        foldCauseEffect(
          (cause) =>
            Cause.isInterrupted(cause)
              ? pipe(cleanup(Cause.interruptors(cause)), zipRight(failCause(cause)))
              : failCause(cause),
          succeed
        )
      )
    ).traced(trace)
}

/** @internal */
export const partitionMap = <A, A1, A2>(
  elements: Iterable<A>,
  f: (a: A) => Either.Either<A1, A2>
): readonly [List.List<A1>, List.List<A2>] => {
  return Array.from(elements).reduceRight(
    ([lefts, rights], current) => {
      const either = f(current)
      switch (either._tag) {
        case "Left": {
          return [pipe(lefts, List.prepend(either.left)), rights] as const
        }
        case "Right": {
          return [lefts, pipe(rights, List.prepend(either.right))] as const
        }
      }
    },
    [List.empty<A1>(), List.empty<A2>()] as const
  )
}

/** @internal */
export const provideEnvironment = <R>(environment: Context.Context<R>) => {
  const trace = getCallTrace()
  return <E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<never, E, A> => {
    return pipe(
      self as Effect.Effect<never, E, A>,
      pipe(currentEnvironment, locallyFiberRef(environment as Context.Context<never>))
    ).traced(trace)
  }
}

/** @internal */
export const provideSomeEnvironment = <R0, R>(f: (context: Context.Context<R0>) => Context.Context<R>) => {
  const trace = getCallTrace()
  return <E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R0, E, A> =>
    environmentWithEffect((context: Context.Context<R0>) => pipe(self, provideEnvironment(f(context)))).traced(trace)
}

/** @internal */
export const service = <T>(tag: Context.Tag<T>): Effect.Effect<T, never, T> => {
  const trace = getCallTrace()
  return serviceWithEffect(tag)(succeed).traced(trace)
}

/** @internal */
export const serviceWith = <T>(tag: Context.Tag<T>) => {
  return <A>(f: (a: T) => A): Effect.Effect<T, never, A> => {
    return serviceWithEffect(tag)((a) => sync(() => f(a)))
  }
}

/** @internal */
export const serviceWithEffect = <T>(tag: Context.Tag<T>) => {
  return <R, E, A>(f: (a: T) => Effect.Effect<R, E, A>): Effect.Effect<R | T, E, A> => {
    const trace = getCallTrace()
    return suspendSucceed(() =>
      pipe(
        getFiberRef(currentEnvironment),
        flatMap((env) => f(pipe(env, Context.unsafeGet(tag))))
      )
    ).traced(trace)
  }
}

/** @internal */
export const succeed = <A>(value: A): Effect.Effect<never, never, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_SUCCESS
  effect.value = value
  effect.trace = trace
  return effect
}

/** @internal */
export const suspendSucceed = <R, E, A>(
  effect: () => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return pipe(sync(effect), flatMap(identity)).traced(trace)
}

/** @internal */
export const sync = <A>(evaluate: () => A): Effect.Effect<never, never, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_SYNC
  effect.evaluate = evaluate
  effect.trace = trace
  return effect
}

/** @internal */
export const tap = <A, R2, E2, X>(f: (a: A) => Effect.Effect<R2, E2, X>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A> => {
    return pipe(self, flatMap((a: A) => pipe(f(a), as(a)))).traced(trace)
  }
}

/** @internal */
export const traced = (trace: string | undefined) => <R, E, A>(self: Effect.Effect<R, E, A>) => self.traced(trace)

/** @internal */
export const transplant = <R, E, A>(
  f: (grafter: <R2, E2, A2>(effect: Effect.Effect<R2, E2, A2>) => Effect.Effect<R2, E2, A2>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return withFiberRuntime<R, E, A>((state) => {
    const scopeOverride = state.getFiberRef(forkScopeOverride)
    const scope = pipe(scopeOverride, Option.getOrElse(state.scope()))
    return f(pipe(forkScopeOverride, locallyFiberRef(Option.some(scope))))
  }).traced(trace)
}

/** @internal */
export const uninterruptible = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_UPDATE_RUNTIME_FLAGS
  effect.update = RuntimeFlagsPatch.disable(RuntimeFlags.Interruption)
  effect.scope = () => self
  effect.trace = trace
  return effect
}

/** @internal */
export const uninterruptibleMask = <R, E, A>(
  f: (
    restore: <RX, EX, AX>(
      effect: Effect.Effect<RX, EX, AX>
    ) => Effect.Effect<RX, EX, AX>
  ) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_UPDATE_RUNTIME_FLAGS
  effect.update = RuntimeFlagsPatch.disable(RuntimeFlags.Interruption)
  effect.scope = (oldFlags: RuntimeFlags.RuntimeFlags) => {
    return RuntimeFlags.interruption(oldFlags)
      ? f(interruptible)
      : f(uninterruptible)
  }
  effect.trace = trace
  return effect
}

/** @internal */
export const unit: () => Effect.Effect<never, never, void> = () => {
  const trace = getCallTrace()
  return succeed(undefined).traced(trace)
}

/** @internal */
export const updateRuntimeFlags = (
  patch: RuntimeFlagsPatch.RuntimeFlagsPatch
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_UPDATE_RUNTIME_FLAGS
  effect.update = patch
  effect.scope = undefined
  effect.trace = trace
  return effect
}

/** @internal */
export const whenEffect = <R, E, R1, E1, A>(
  predicate: Effect.Effect<R, E, boolean>,
  effect: Effect.Effect<R1, E1, A>
): Effect.Effect<R | R1, E | E1, Option.Option<A>> => {
  const trace = getCallTrace()
  return pipe(
    suspendSucceed(() => predicate),
    flatMap((b) => b ? pipe(effect, map(Option.some)) : pipe(effect, map(() => Option.none)))
  ).traced(trace)
}

/** @internal */
export const whileLoop = <R, E, A>(
  check: () => boolean,
  body: () => Effect.Effect<R, E, A>,
  process: (a: A) => void
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_WHILE
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
  effect.op = OpCodes.OP_WITH_RUNTIME
  effect.withRuntime = withRuntime
  effect.trace = trace
  return effect
}

/** @internal */
export const withParallelism = (parallelism: number) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    const trace = getCallTrace()
    return suspendSucceed(
      () => pipe(self, locallyFiberRef(Option.some(parallelism))(currentParallelism))
    ).traced(trace)
  }
}

/** @internal */
export const withParallelismUnbounded = <R, E, A>(self: Effect.Effect<R, E, A>) => {
  const trace = getCallTrace()
  return suspendSucceed(
    () => pipe(self, locallyFiberRef(Option.none as Option.Option<number>)(currentParallelism))
  ).traced(trace)
}

/** @internal */
export const withRuntimeFlags = (
  update: RuntimeFlagsPatch.RuntimeFlagsPatch
) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    const effect = Object.create(proto)
    effect.op = OpCodes.OP_UPDATE_RUNTIME_FLAGS
    effect.update = update
    effect.scope = () => self
    effect.trace = trace
    return effect
  }
}

/** @internal */
export const yieldNow: () => Effect.Effect<never, never, void> = () => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_YIELD
  effect.trace = trace
  return effect
}

/** @internal */
export const zip = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, readonly [A, A2]> => {
    return pipe(self, flatMap((a) => pipe(that, map((b) => [a, b] as const)))).traced(trace)
  }
}

/** @internal */
export const zipLeft = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A> => {
    return pipe(self, flatMap((a) => pipe(that, as(a)))).traced(trace)
  }
}

/** @internal */
export const zipRight = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A2> => {
    return pipe(self, flatMap(() => that)).traced(trace)
  }
}

/** @internal */
export const zipWith = <R2, E2, A2, A, B>(that: Effect.Effect<R2, E2, A2>, f: (a: A, b: A2) => B) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, B> => {
    return pipe(self, flatMap((a) => pipe(that, map((b) => f(a, b))))).traced(trace)
  }
}

// -----------------------------------------------------------------------------
// Fiber
// -----------------------------------------------------------------------------

/** @internal */
export const interruptFiber = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, Exit.Exit<E, A>> => {
  const trace = getCallTrace()
  return pipe(
    fiberId(),
    flatMap((fiberId) => pipe(self, interruptWithFiber(fiberId)))
  ).traced(trace)
}

/** @internal */
export const interruptWithFiber = (fiberId: FiberId.FiberId) => {
  const trace = getCallTrace()
  return <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, Exit.Exit<E, A>> => {
    return pipe(self.interruptWithFork(fiberId), flatMap(() => self.await())).traced(trace)
  }
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

/** @internal */
export const getFiberRef = <A>(self: FiberRef.FiberRef<A>): Effect.Effect<never, never, A> => {
  return pipe(self, modifyFiberRef((a) => [a, a] as const))
}

/** @internal */
export const getAndSetFiberRef = <A>(value: A) => {
  return (self: FiberRef.FiberRef<A>): Effect.Effect<never, never, A> => {
    return pipe(self, modifyFiberRef((v) => [v, value] as const))
  }
}

/** @internal */
export const getAndUpdateFiberRef = <A>(f: (a: A) => A) => {
  return (self: FiberRef.FiberRef<A>): Effect.Effect<never, never, A> => {
    return pipe(self, modifyFiberRef((v) => [v, f(v)] as const))
  }
}

/** @internal */
export const getAndUpdateSomeFiberRef = <A>(pf: (a: A) => Option.Option<A>) => {
  return (self: FiberRef.FiberRef<A>): Effect.Effect<never, never, A> => {
    return pipe(self, modifyFiberRef((v) => [v, pipe(pf(v), Option.getOrElse(v))] as const))
  }
}

/** @internal */
export const getWithFiberRef = <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, B>) => {
  return (self: FiberRef.FiberRef<A>): Effect.Effect<R, E, B> => {
    return pipe(getFiberRef(self), flatMap(f))
  }
}

/** @internal */
export const setFiberRef = <A>(value: A) => {
  return (self: FiberRef.FiberRef<A>): Effect.Effect<never, never, void> => {
    return pipe(self, modifyFiberRef(() => [undefined, value] as const))
  }
}

/** @internal */
export const deleteFiberRef = <A>(self: FiberRef.FiberRef<A>): Effect.Effect<never, never, void> => {
  return withFiberRuntime((state) => {
    state.unsafeDeleteFiberRef(self)
    return unit()
  })
}

/** @internal */
export const resetFiberRef = <A>(self: FiberRef.FiberRef<A>): Effect.Effect<never, never, void> => {
  return pipe(self, setFiberRef(self.initial))
}

/** @internal */
export const modifyFiberRef = <A, B>(f: (a: A) => readonly [B, A]) => {
  return (self: FiberRef.FiberRef<A>): Effect.Effect<never, never, B> => {
    return withFiberRuntime((state) => {
      const [b, a] = f(state.getFiberRef(self) as A)
      state.setFiberRef(self, a)
      return succeed(b)
    })
  }
}

/** @internal */
export const modifySomeFiberRef = <B, A>(def: B, f: (a: A) => Option.Option<readonly [B, A]>) => {
  return (self: FiberRef.FiberRef<A>): Effect.Effect<never, never, B> => {
    return pipe(self, modifyFiberRef((v) => pipe(f(v), Option.getOrElse([def, v] as const))))
  }
}

/** @internal */
export const updateFiberRef = <A>(f: (a: A) => A) => {
  return (self: FiberRef.FiberRef<A>): Effect.Effect<never, never, void> => {
    return pipe(self, modifyFiberRef((v) => [undefined, f(v)] as const))
  }
}

/** @internal */
export const updateSomeFiberRef = <A>(
  pf: (a: A) => Option.Option<A>
): (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, void> => {
  return modifyFiberRef((v) => [undefined, pipe(pf(v), Option.getOrElse(v))] as const)
}

/** @internal */
export const updateAndGetFiberRef = <A>(
  f: (a: A) => A
): (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, A> => {
  return modifyFiberRef((v) => {
    const result = f(v)
    return [result, result] as const
  })
}

/** @internal */
export const updateSomeAndGetFiberRef = <A>(
  pf: (a: A) => Option.Option<A>
): (self: FiberRef.FiberRef<A>) => Effect.Effect<never, never, A> => {
  return modifyFiberRef((v) => {
    const result = pipe(pf(v), Option.getOrElse(v))
    return [result, result] as const
  })
}

/** @internal */
export const locallyFiberRef = <A>(value: A) => {
  return (self: FiberRef.FiberRef<A>) => {
    return <R, E, B>(use: Effect.Effect<R, E, B>): Effect.Effect<R, E, B> => {
      return acquireUseRelease(
        pipe(getFiberRef(self), zipLeft(pipe(self, setFiberRef(value)))),
        () => use,
        (oldValue) => pipe(self, setFiberRef(oldValue))
      )
    }
  }
}

/** @internal */
export const locallyWithFiberRef = <A>(f: (a: A) => A) => {
  return (self: FiberRef.FiberRef<A>) => {
    return <R, E, B>(use: Effect.Effect<R, E, B>): Effect.Effect<R, E, B> => {
      return pipe(self, getWithFiberRef((a) => pipe(use, pipe(self, locallyFiberRef(f(a))))))
    }
  }
}

/** @internal */
export const unsafeMakeFiberRef = <Value>(
  initial: Value,
  fork: (a: Value) => Value = identity,
  join: (left: Value, right: Value) => Value = (_, a) => a
): FiberRef.FiberRef<Value> => {
  return unsafeMakePatchFiberRef(
    initial,
    Differ.update(),
    fork,
    join
  )
}

/** @internal */
export const unsafeMakeHashSetFiberRef = <A>(
  initial: HashSet.HashSet<A>
): FiberRef.FiberRef<HashSet.HashSet<A>> => {
  return unsafeMakePatchFiberRef(
    initial,
    Differ.hashSet(),
    HashSetPatch.empty()
  )
}

/** @internal */
export const unsafeMakeEnvironmentFiberRef = <A>(
  initial: Context.Context<A>
): FiberRef.FiberRef<Context.Context<A>> => {
  return unsafeMakePatchFiberRef(
    initial,
    Differ.environment(),
    ContextPatch.empty()
  )
}

/** @internal */
export const unsafeMakePatchFiberRef = <Value, Patch>(
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
export const currentEnvironment: FiberRef.FiberRef<Context.Context<never>> = unsafeMakeFiberRef(
  Context.empty()
)

/** @internal */
export const currentLogAnnotations: FiberRef.FiberRef<ReadonlyMap<string, string>> = unsafeMakeFiberRef(
  new Map() as ReadonlyMap<string, string>
)

/** @internal */
export const currentLogLevel: FiberRef.FiberRef<LogLevel.LogLevel> = unsafeMakeFiberRef<LogLevel.LogLevel>({
  _tag: "Info",
  syslog: 6,
  label: "INFO",
  ordinal: 20000
})

/** @internal */
export const currentLogSpan: FiberRef.FiberRef<List.List<LogSpan.LogSpan>> = unsafeMakeFiberRef(
  List.empty<LogSpan.LogSpan>()
)

/** @internal */
export const currentScheduler: FiberRef.FiberRef<Scheduler.Scheduler> = unsafeMakeFiberRef(Scheduler.defaultScheduler)

/** @internal */
export const currentParallelism: FiberRef.FiberRef<Option.Option<number>> = unsafeMakeFiberRef<Option.Option<number>>(
  Option.none
)

/** @internal */
export const forkScopeOverride: FiberRef.FiberRef<Option.Option<FiberScope.FiberScope>> = unsafeMakeFiberRef(
  Option.none,
  () => Option.none as Option.Option<FiberScope.FiberScope>
)

/** @internal */
export const interruptedCause: FiberRef.FiberRef<Cause.Cause<never>> = unsafeMakeFiberRef(
  Cause.empty,
  () => Cause.empty,
  (parent) => parent
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

/** @internal */
export const scopeAddFinalizer = (finalizer: Effect.Effect<never, never, unknown>) =>
  (self: Scope.Scope): Effect.Effect<never, never, void> => self.addFinalizer(() => asUnit(finalizer))

/** @internal */
export const scopeAddFinalizerExit = (finalizer: Scope.Scope.Finalizer) =>
  (self: Scope.Scope): Effect.Effect<never, never, void> => self.addFinalizer(finalizer)

/** @internal */
export const scopeClose = (exit: Exit.Exit<unknown, unknown>) =>
  (self: Scope.Scope.Closeable): Effect.Effect<never, never, void> => self.close(exit)

/** @internal */
export const scopeFork = (strategy: ExecutionStrategy.ExecutionStrategy) =>
  (self: Scope.Scope): Effect.Effect<never, never, Scope.Scope.Closeable> => self.fork(strategy)

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

/** @internal */
export const releaseMapAdd = (finalizer: Scope.Scope.Finalizer) =>
  (self: ReleaseMap) =>
    pipe(
      self,
      releaseMapAddIfOpen(finalizer),
      map(Option.match(
        (): Scope.Scope.Finalizer => () => unit(),
        (key): Scope.Scope.Finalizer => (exit) => releaseMapRelease(key, exit)(self)
      ))
    )

/** @internal */
export const releaseMapRelease = (key: number, exit: Exit.Exit<unknown, unknown>) =>
  (self: ReleaseMap) =>
    suspendSucceed(() => {
      switch (self.state._tag) {
        case "Exited": {
          return unit()
        }
        case "Running": {
          const finalizer = self.state.finalizers.get(key)
          self.state.finalizers.delete(key)
          if (finalizer) {
            return self.state.update(finalizer)(exit)
          }
          return unit()
        }
      }
    })

/** @internal */
export const releaseMapAddIfOpen = (finalizer: Scope.Scope.Finalizer) =>
  (self: ReleaseMap) =>
    suspendSucceed(() => {
      switch (self.state._tag) {
        case "Exited": {
          self.state.nextKey += 1
          return as(Option.none)(finalizer(self.state.exit))
        }
        case "Running": {
          const key = self.state.nextKey
          self.state.finalizers.set(key, finalizer)
          self.state.nextKey += 1
          return succeed(Option.some(key))
        }
      }
    })

/** @internal */
export const releaseMapGet = (key: number) =>
  (self: ReleaseMap) =>
    sync((): Option.Option<Scope.Scope.Finalizer> =>
      self.state._tag === "Running" ? Option.fromNullable(self.state.finalizers.get(key)) : Option.none
    )

/** @internal */
export const releaseMapReplace = (key: number, finalizer: Scope.Scope.Finalizer) =>
  (self: ReleaseMap) =>
    suspendSucceed(() => {
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
    })

/** @internal */
export const releaseMapRemove = (key: number) =>
  (self: ReleaseMap): Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>> =>
    sync(() => {
      if (self.state._tag === "Exited") {
        return Option.none
      }
      const fin = Option.fromNullable(self.state.finalizers.get(key))
      self.state.finalizers.delete(key)
      return fin
    })

/** @internal */
export const releaseMapMake = () =>
  sync((): ReleaseMap => ({
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
export const exitIsExit = (u: unknown): u is Exit.Exit<unknown, unknown> => {
  return isEffect(u) && "_tag" in u &&
    (u["_tag"] === "Success" || u["_tag"] === "Failure")
}

/** @internal */
export const exitIsFailure = <E, A>(self: Exit.Exit<E, A>): self is Exit.Failure<E> => {
  return self.op === OpCodes.OP_FAILURE
}

/** @internal */
export const exitIsSuccess = <E, A>(self: Exit.Exit<E, A>): self is Exit.Success<A> => {
  return self.op === OpCodes.OP_SUCCESS
}

/** @internal */
export const exitSucceed = <A>(value: A): Exit.Exit<never, A> => {
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_SUCCESS
  effect.value = value
  return effect
}

/** @internal */
export const exitFail = <E>(error: E): Exit.Exit<E, never> => {
  return exitFailCause(Cause.fail(error))
}

/** @internal */
export const exitFailCause = <E>(cause: Cause.Cause<E>): Exit.Exit<E, never> => {
  const effect = Object.create(proto)
  effect.op = OpCodes.OP_FAILURE
  effect.cause = cause
  return effect
}

/** @internal */
export const exitDie = (defect: unknown): Exit.Exit<never, never> => {
  return exitFailCause(Cause.die(defect))
}

/** @internal */
export const exitInterrupt = (fiberId: FiberId.FiberId): Exit.Exit<never, never> => {
  return exitFailCause(Cause.interrupt(fiberId))
}

/** @internal */
export const exitFromEither = <E, A>(either: Either.Either<E, A>): Exit.Exit<E, A> => {
  switch (either._tag) {
    case "Left": {
      return exitFail(either.left)
    }
    case "Right": {
      return exitSucceed(either.right)
    }
  }
}

/** @internal */
export const exitFromOption = <A>(option: Option.Option<A>): Exit.Exit<void, A> => {
  switch (option._tag) {
    case "None": {
      return exitFail(undefined)
    }
    case "Some": {
      return exitSucceed(option.value)
    }
  }
}

/** @internal */
export const exitIsInterrupted = <E, A>(self: Exit.Exit<E, A>): boolean => {
  switch (self.op) {
    case OpCodes.OP_FAILURE: {
      return Cause.isInterrupted(self.cause)
    }
    case OpCodes.OP_SUCCESS: {
      return false
    }
  }
}

/** @internal */
export const exitCauseOption = <E, A>(self: Exit.Exit<E, A>): Option.Option<Cause.Cause<E>> => {
  switch (self.op) {
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
    switch (self.op) {
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
    switch (self.op) {
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
export const exitAs = <A1>(value: A1) =>
  <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E, A1> => {
    switch (self.op) {
      case OpCodes.OP_FAILURE: {
        return self
      }
      case OpCodes.OP_SUCCESS: {
        return exitSucceed(value)
      }
    }
  }

/** @internal */
export const exitAsUnit = <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E, void> => exitAs(void 0)(self)

/** @internal */
export const exitMap = <A, B>(f: (a: A) => B) => {
  return <E>(self: Exit.Exit<E, A>): Exit.Exit<E, B> => {
    switch (self.op) {
      case OpCodes.OP_FAILURE: {
        return self
      }
      case OpCodes.OP_SUCCESS: {
        return exitSucceed(f(self.value))
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
    switch (self.op) {
      case OpCodes.OP_FAILURE: {
        return exitFailCause(pipe(self.cause, Cause.map(onFailure)))
      }
      case OpCodes.OP_SUCCESS: {
        return exitSucceed(onSuccess(self.value))
      }
    }
  }
}

/** @internal */
export const exitMapError = <E, E1>(f: (e: E) => E1) => {
  return <A>(self: Exit.Exit<E, A>): Exit.Exit<E1, A> => {
    switch (self.op) {
      case OpCodes.OP_FAILURE: {
        return exitFailCause(pipe(self.cause, Cause.map(f)))
      }
      case OpCodes.OP_SUCCESS: {
        return self
      }
    }
  }
}

/** @internal */
export const exitMapErrorCause = <E, E1>(f: (cause: Cause.Cause<E>) => Cause.Cause<E1>) => {
  return <A>(self: Exit.Exit<E, A>): Exit.Exit<E1, A> => {
    switch (self.op) {
      case OpCodes.OP_FAILURE: {
        return exitFailCause(f(self.cause))
      }
      case OpCodes.OP_SUCCESS: {
        return self
      }
    }
  }
}

/** @internal */
export const exitFlatMap = <A, E1, A1>(f: (a: A) => Exit.Exit<E1, A1>) => {
  return <E>(self: Exit.Exit<E, A>): Exit.Exit<E | E1, A1> => {
    switch (self.op) {
      case OpCodes.OP_FAILURE: {
        return self
      }
      case OpCodes.OP_SUCCESS: {
        return f(self.value)
      }
    }
  }
}

/** @internal */
export const exitFlatMapEffect = <E, A, R, E1, A1>(
  f: (a: A) => Effect.Effect<R, E1, Exit.Exit<E, A1>>
) => {
  return (self: Exit.Exit<E, A>): Effect.Effect<R, E1, Exit.Exit<E, A1>> => {
    switch (self.op) {
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
  return pipe(self, exitFlatMap(identity))
}

/** @internal */
export const exitMatch = <E, A, Z>(
  onFailure: (cause: Cause.Cause<E>) => Z,
  onSuccess: (a: A) => Z
) => {
  return (self: Exit.Exit<E, A>): Z => {
    switch (self.op) {
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
    switch (self.op) {
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
    switch (self.op) {
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
export const exitZip = <E2, A2>(that: Exit.Exit<E2, A2>): <E, A>(
  self: Exit.Exit<E, A>
) => Exit.Exit<E | E2, readonly [A, A2]> => {
  return exitZipWith(that, (a, a2) => [a, a2] as const, Cause.sequential)
}

/** @internal */
export const exitZipLeft = <E2, A2>(that: Exit.Exit<E2, A2>): <E, A>(
  self: Exit.Exit<E, A>
) => Exit.Exit<E | E2, A> => {
  return exitZipWith(that, (a, _) => a, Cause.sequential)
}

/** @internal */
export const exitZipRight = <E2, A2>(that: Exit.Exit<E2, A2>): <E, A>(
  self: Exit.Exit<E, A>
) => Exit.Exit<E | E2, A2> => {
  return exitZipWith(that, (_, a2) => a2, Cause.sequential)
}

/** @internal */
export const exitZipPar = <E2, A2>(that: Exit.Exit<E2, A2>): <E, A>(
  self: Exit.Exit<E, A>
) => Exit.Exit<E | E2, readonly [A, A2]> => {
  return exitZipWith(that, (a, a2) => [a, a2] as const, Cause.parallel)
}

/** @internal */
export const exitZipParLeft = <E2, A2>(that: Exit.Exit<E2, A2>): <E, A>(
  self: Exit.Exit<E, A>
) => Exit.Exit<E | E2, A> => {
  return exitZipWith(that, (a, _) => a, Cause.parallel)
}

/** @internal */
export const exitZipParRight = <E2, A2>(that: Exit.Exit<E2, A2>): <E, A>(
  self: Exit.Exit<E, A>
) => Exit.Exit<E | E2, A2> => {
  return exitZipWith(that, (_, a2) => a2, Cause.parallel)
}

/** @internal */
export const exitZipWith = <E, E1, A, B, C>(
  that: Exit.Exit<E1, B>,
  f: (a: A, b: B) => C,
  g: (c: Cause.Cause<E>, c1: Cause.Cause<E1>) => Cause.Cause<E | E1>
) => {
  return (self: Exit.Exit<E, A>): Exit.Exit<E | E1, C> => {
    switch (self.op) {
      case OpCodes.OP_FAILURE: {
        switch (that.op) {
          case OpCodes.OP_SUCCESS: {
            return self
          }
          case OpCodes.OP_FAILURE: {
            return exitFailCause(g(self.cause, that.cause))
          }
        }
      }
      case OpCodes.OP_SUCCESS: {
        switch (that.op) {
          case OpCodes.OP_SUCCESS: {
            return exitSucceed(f(self.value, that.value))
          }
          case OpCodes.OP_FAILURE: {
            return that
          }
        }
      }
    }
  }
}

/** @internal */
export const exitCollectAll = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>
): Option.Option<Exit.Exit<E, List.List<A>>> => {
  return exitCollectAllInternal(exits, Cause.sequential)
}

/** @internal */
export const exitCollectAllPar = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>
): Option.Option<Exit.Exit<E, List.List<A>>> => {
  return exitCollectAllInternal(exits, Cause.parallel)
}

/** @internal */
export const exitUnit: () => Exit.Exit<never, void> = unit as any

/** @internal */
const exitCollectAllInternal = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>,
  combineCauses: (causeA: Cause.Cause<E>, causeB: Cause.Cause<E>) => Cause.Cause<E>
): Option.Option<Exit.Exit<E, List.List<A>>> => {
  const list = List.fromIterable(exits)
  if (List.isNil(list)) {
    return Option.none
  }
  return pipe(
    list.tail,
    List.reduce(pipe(list.head, exitMap(List.of)), (accumulator, current) =>
      pipe(
        accumulator,
        exitZipWith(
          current,
          (list, value) => pipe(list, List.prepend(value)),
          combineCauses
        )
      )),
    exitMap(List.reverse),
    Option.some
  )
}

// -----------------------------------------------------------------------------
// Deferred
// -----------------------------------------------------------------------------

/** @internal */
export const unsafeMakeDeferred = <E, A>(fiberId: FiberId.FiberId): Deferred.Deferred<E, A> => {
  return {
    [deferred.DeferredTypeId]: deferred.deferredVariance,
    state: MutableRef.make(deferred.pending([])),
    blockingOn: fiberId
  }
}

/** @internal */
export const makeDeferred = <E, A>(): Effect.Effect<never, never, Deferred.Deferred<E, A>> => {
  return pipe(fiberId(), flatMap((id) => makeAsDeferred(id)))
}

/** @internal */
export const makeAsDeferred = <E, A>(
  fiberId: FiberId.FiberId
): Effect.Effect<never, never, Deferred.Deferred<E, A>> => {
  return sync(() => unsafeMakeDeferred(fiberId))
}

/** @internal */
export const succeedDeferred = <A>(value: A) => {
  return <E>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
    return pipe(self, completeWithDeferred(succeed(value) as Effect.Effect<never, E, A>))
  }
}

/** @internal */
export const syncDeferred = <A>(evaluate: () => A) => {
  return <E>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
    return pipe(self, completeWithDeferred(sync(evaluate) as Effect.Effect<never, E, A>))
  }
}

/** @internal */
export const failDeferred = <E>(error: E) => {
  return <A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
    return pipe(self, completeWithDeferred(fail(error) as Effect.Effect<never, E, A>))
  }
}

/** @internal */
export const failSyncDeferred = <E>(evaluate: () => E) => {
  return <A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
    return pipe(self, completeWithDeferred(failSync(evaluate) as Effect.Effect<never, E, A>))
  }
}

/** @internal */
export const failCauseDeferred = <E>(cause: Cause.Cause<E>) => {
  return <A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
    return pipe(self, completeWithDeferred(failCause(cause) as Effect.Effect<never, E, A>))
  }
}

/** @internal */
export const failCauseSyncDeferred = <E>(evaluate: () => Cause.Cause<E>) => {
  return <A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
    return pipe(self, completeWithDeferred(failCauseSync(evaluate) as Effect.Effect<never, E, A>))
  }
}

/** @internal */
export const dieDeferred = (defect: unknown) => {
  return <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
    return pipe(self, completeWithDeferred(die(defect) as Effect.Effect<never, E, A>))
  }
}

/** @internal */
export const dieSyncDeferred = (evaluate: () => unknown) => {
  return <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
    return pipe(self, completeWithDeferred(dieSync(evaluate) as Effect.Effect<never, E, A>))
  }
}

/** @internal */
export const doneDeferred = <E, A>(exit: Exit.Exit<E, A>) => {
  return (self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
    return pipe(self, completeWithDeferred(done(exit)))
  }
}

/** @internal */
export const unsafeDoneDeferred = <E, A>(effect: Effect.Effect<never, E, A>) => {
  return (self: Deferred.Deferred<E, A>): void => {
    const state = MutableRef.get(self.state)
    if (state.op === deferred.OP_STATE_PENDING) {
      pipe(self.state, MutableRef.set(deferred.done(effect)))
      for (let i = state.joiners.length - 1; i >= 0; i--) {
        state.joiners[i](effect)
      }
    }
  }
}

/** @internal */
export const interruptDeferred = <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
  return pipe(
    fiberId(),
    flatMap((fiberId) => pipe(self, completeWithDeferred(interruptAs(fiberId) as Effect.Effect<never, E, A>)))
  )
}

/** @internal */
export const interruptAsDeferred = (fiberId: FiberId.FiberId) => {
  return <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
    return pipe(self, completeWithDeferred(interruptAs(fiberId) as Effect.Effect<never, E, A>))
  }
}

/** @internal */
export const awaitDeferred = <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, E, A> => {
  return asyncInterrupt((k) => {
    const state = MutableRef.get(self.state)
    switch (state.op) {
      case deferred.OP_STATE_DONE: {
        return Either.right(state.effect)
      }
      case deferred.OP_STATE_PENDING: {
        pipe(
          self.state,
          MutableRef.set(deferred.pending([k, ...state.joiners]))
        )
        return Either.left(interruptDeferredJoiner(self, k))
      }
    }
  }, self.blockingOn)
}

/** @internal */
export const completeDeferred = <E, A>(effect: Effect.Effect<never, E, A>) => {
  return (self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
    return pipe(effect, intoDeferred(self))
  }
}

/** @internal */
export const completeWithDeferred = <E, A>(effect: Effect.Effect<never, E, A>) => {
  return (self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
    return sync(() => {
      const state = MutableRef.get(self.state)
      switch (state.op) {
        case deferred.OP_STATE_DONE: {
          return false
        }
        case deferred.OP_STATE_PENDING: {
          pipe(self.state, MutableRef.set(deferred.done(effect)))
          for (let i = 0; i < state.joiners.length; i++) {
            state.joiners[i](effect)
          }
          return true
        }
      }
    })
  }
}

/** @internal */
export const isDoneDeferred = <E, A>(self: Deferred.Deferred<E, A>): Effect.Effect<never, never, boolean> => {
  return sync(() => MutableRef.get(self.state).op === deferred.OP_STATE_DONE)
}

/** @internal */
export const pollDeferred = <E, A>(
  self: Deferred.Deferred<E, A>
): Effect.Effect<never, never, Option.Option<Effect.Effect<never, E, A>>> => {
  return sync(() => {
    const state = MutableRef.get(self.state)
    switch (state.op) {
      case deferred.OP_STATE_DONE: {
        return Option.some(state.effect)
      }
      case deferred.OP_STATE_PENDING: {
        return Option.none
      }
    }
  })
}

/** @internal */
const interruptDeferredJoiner = <E, A>(
  self: Deferred.Deferred<E, A>,
  joiner: (effect: Effect.Effect<never, E, A>) => void
): Effect.Effect<never, never, void> => {
  return sync(() => {
    const state = MutableRef.get(self.state)
    if (state.op === deferred.OP_STATE_PENDING) {
      pipe(
        self.state,
        MutableRef.set(deferred.pending(state.joiners.filter((j) => j !== joiner)))
      )
    }
  })
}
