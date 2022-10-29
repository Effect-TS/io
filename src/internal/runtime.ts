import * as Cause from "@effect/io/Cause"
import { getCallTrace, runtimeDebug } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import type * as Exit from "@effect/io/Exit"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRuntime from "@effect/io/Fiber/Runtime"
import * as FiberRuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as FiberRuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"
import type * as FiberStatus from "@effect/io/Fiber/Status"
import type * as FiberRef from "@effect/io/FiberRef"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as Ref from "@effect/io/Ref"
import type * as Scope from "@effect/io/Scope"
import * as Order from "@fp-ts/core/typeclass/Order"
import type * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import * as Differ from "@fp-ts/data/Differ"
import * as ContextPatch from "@fp-ts/data/Differ/ContextPatch"
import * as HashSetPatch from "@fp-ts/data/Differ/HashSetPatch"
import type * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import type { LazyArg } from "@fp-ts/data/Function"
import { identity, pipe } from "@fp-ts/data/Function"
import type * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Number from "@fp-ts/data/Number"
import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"
import * as SortedMap from "@fp-ts/data/SortedMap"

// -----------------------------------------------------------------------------
// Effect
// -----------------------------------------------------------------------------

/** @internal */
export const EffectTypeId: Effect.EffectTypeId = Symbol.for("@effect/io/Effect") as Effect.EffectTypeId

/** @internal */
export type Primitive =
  | Async
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
// TODO
// | RevertFlags

/** @internal */
export type OpCodes = typeof OpCodes

/** @internal */
export const OpCodes = {
  Async: 0,
  Failure: 1,
  OnFailure: 2,
  OnSuccess: 3,
  OnSuccessAndFailure: 4,
  Success: 5,
  Sync: 6,
  UpdateRuntimeFlags: 7,
  While: 8,
  WithRuntime: 9,
  Yield: 10
} as const

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
  }
}

/** @internal */
export type Op<OpCode extends number, Body = {}> = Effect.Effect<never, never, never> & Body & {
  readonly op: OpCode
  readonly trace?: string
}

/** @internal */
export interface Async extends
  Op<OpCodes["Async"], {
    readonly register: (resume: (effect: Primitive) => void) => void
    readonly blockingOn: FiberId.FiberId
  }>
{}

/** @internal */
export interface Failure extends Op<OpCodes["Failure"], { readonly cause: Cause.Cause<unknown> }> {}

/** @internal */
export interface OnFailure extends
  Op<OpCodes["OnFailure"], {
    readonly first: Primitive
    readonly failK: (a: Cause.Cause<unknown>) => Primitive
  }>
{}

/** @internal */
export interface OnSuccess extends
  Op<OpCodes["OnSuccess"], {
    readonly first: Primitive
    readonly successK: (a: unknown) => Primitive
  }>
{}

/** @internal */
export interface OnSuccessAndFailure extends
  Op<OpCodes["OnSuccessAndFailure"], {
    readonly first: Primitive
    readonly failK: (a: Cause.Cause<unknown>) => Primitive
    readonly successK: (a: unknown) => Primitive
  }>
{}

/** @internal */
export interface Success extends Op<OpCodes["Success"], { readonly value: unknown }> {}

/** @internal */
export interface Sync extends
  Op<OpCodes["Sync"], {
    readonly evaluate: () => unknown
  }>
{}

/** @internal */
export interface UpdateRuntimeFlags extends
  Op<OpCodes["UpdateRuntimeFlags"], {
    readonly update: FiberRuntimeFlagsPatch.RuntimeFlagsPatch
    readonly scope?: (oldRuntimeFlags: FiberRuntimeFlags.RuntimeFlags) => Primitive
  }>
{}

/** @internal */
export interface While extends
  Op<OpCodes["While"], {
    readonly check: () => boolean
    readonly body: () => Primitive
    readonly process: (a: unknown) => void
  }>
{}

/** @internal */
export interface WithRuntime extends
  Op<OpCodes["WithRuntime"], {
    readonly withRuntime: (fiber: FiberRuntime.Runtime<unknown, unknown>, status: FiberStatus.Running) => Primitive
  }>
{}

/** @internal */
export interface Yield extends Op<OpCodes["Yield"]> {}

/** @internal */
export const isEffect = (u: unknown): u is Effect.Effect<unknown, unknown, unknown> => {
  return typeof u === "object" && u != null && EffectTypeId in u
}

/** @internal */
export const async = <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => void,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.Async
  effect.register = register
  effect.blockingOn = blockingOn
  effect.trace = trace
  return effect
}

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, E, never> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.Failure
  effect.cause = cause
  effect.trace = trace
  return effect
}

/** @internal */
export const fail = <E>(error: E): Effect.Effect<never, E, never> => {
  const trace = getCallTrace()
  return failCause(Cause.fail(error)).traced(trace)
}

/** @internal */
export const catchAllCause = <E, R2, E2, A2>(
  f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E2, A | A2> => {
    const effect = Object.create(proto)
    effect.op = OpCodes.OnFailure
    effect.first = self
    effect.failK = f
    effect.trace = trace
    return effect
  }
}

/** @internal */
export const flatMap = <A, R1, E1, B>(f: (a: A) => Effect.Effect<R1, E1, B>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E | E1, B> => {
    const effect = Object.create(proto)
    effect.op = OpCodes.Success
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

// TODO(Mike): do.
/** @interface */
export declare const forEach: <A, R, E, B>(
  f: (a: A) => Effect.Effect<R, E, B>
) => (self: Iterable<A>) => Effect.Effect<R, E, Chunk.Chunk<B>>

// TODO(Mike): do.
/** @interface */
export declare const forEachPar: <A, R, E, B>(
  f: (a: A) => Effect.Effect<R, E, B>
) => (self: Iterable<A>) => Effect.Effect<R, E, Chunk.Chunk<B>>

// TODO(Mike): do.
/** @interface */
export declare const withParallelism: (
  fibers: number
) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>

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
    effect.op = OpCodes.OnSuccessAndFailure
    effect.first = self
    effect.failK = onFailure
    effect.successK = onSuccess
    effect.trace = trace
    return effect
  }
}

/** @internal */
export const succeed = <A>(value: A): Effect.Effect<never, never, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.Success
  effect.success = value
  effect.trace = trace
  return effect
}

/** @internal */
export const sync = <A>(evaluate: () => A): Effect.Effect<never, never, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.Sync
  effect.evaluate = evaluate
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
export const updateRuntimeFlags = (
  patch: FiberRuntimeFlagsPatch.RuntimeFlagsPatch
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.UpdateRuntimeFlags
  effect.update = patch
  effect.trace = trace
  return effect
}

/** @internal */
export const interruptible = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.UpdateRuntimeFlags
  effect.update = FiberRuntimeFlagsPatch.enable(FiberRuntimeFlags.Interruption)
  effect.scope = () => self
  effect.trace = trace
  return effect
}

/** @internal */
export const uninterruptible = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.UpdateRuntimeFlags
  effect.update = FiberRuntimeFlagsPatch.disable(FiberRuntimeFlags.Interruption)
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
  effect.op = OpCodes.UpdateRuntimeFlags
  effect.update = FiberRuntimeFlagsPatch.disable(FiberRuntimeFlags.Interruption)
  effect.scope = (oldFlags: FiberRuntimeFlags.RuntimeFlags) =>
    FiberRuntimeFlags.interruption(oldFlags)
      ? f(interruptible)
      : f(uninterruptible)
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
  effect.op = OpCodes.UpdateRuntimeFlags
  effect.update = FiberRuntimeFlagsPatch.enable(FiberRuntimeFlags.Interruption)
  effect.scope = (oldFlags: FiberRuntimeFlags.RuntimeFlags) =>
    FiberRuntimeFlags.interruption(oldFlags)
      ? f(interruptible)
      : f(uninterruptible)
  effect.trace = trace
  return effect
}

/** @internal */
export const withRuntimeFlags = (
  update: FiberRuntimeFlagsPatch.RuntimeFlagsPatch
) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    const effect = Object.create(proto)
    effect.op = OpCodes.UpdateRuntimeFlags
    effect.update = update
    effect.scope = () => self
    effect.trace = trace
    return effect
  }
}

/** @internal */
export const whileLoop = <R, E, A>(
  check: LazyArg<boolean>,
  body: LazyArg<Effect.Effect<R, E, A>>,
  process: (a: A) => void
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.While
  effect.check = check
  effect.body = body
  effect.process = process
  effect.trace = trace
  return effect
}

/** @internal */
export const withFiberRuntime = <R, E, A>(
  withRuntime: (
    fiber: FiberRuntime.Runtime<E, A>,
    status: FiberStatus.Running
  ) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.WithRuntime
  effect.withRuntime = withRuntime
  effect.trace = trace
  return effect
}

/** @internal */
export const yieldNow: () => Effect.Effect<never, never, void> = () => {
  const trace = getCallTrace()
  const effect = Object.create(proto)
  effect.op = OpCodes.Yield
  effect.trace = trace
  return effect
}

/** @internal */
export const unit: () => Effect.Effect<never, never, void> = () => {
  const trace = getCallTrace()
  return succeed(undefined).traced(trace)
}

/** @internal */
export const traced = (trace: string | undefined) => <R, E, A>(self: Effect.Effect<R, E, A>) => self.traced(trace)

/** @internal */
export const exit = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Exit.Exit<E, A>> => {
  const trace = getCallTrace()
  return pipe(self, foldCause(failCause, succeed)).traced(trace) as Effect.Effect<R, never, Exit.Exit<E, A>>
}

/** @internal */
export const done = <E, A>(exit: Exit.Exit<E, A>): Effect.Effect<never, E, A> =>
  exit.op === OpCodes.Failure ? failCause(exit.body.cause) : succeed(exit.body.value)

/** @internal */
export const onExit = <E, A, R2, X>(cleanup: (exit: Exit.Exit<E, A>) => Effect.Effect<R2, never, X>) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E, A> =>
    acquireUseReleaseExit(
      unit(),
      () => self,
      (_, exit) => cleanup(exit)
    ).traced(trace)
}

/** @internal */
export const scope = () => {
  const trace = getCallTrace()
  return service(scopeTag).traced(trace)
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
  return serviceWithEffect(tag, succeed).traced(trace)
}

/** @internal */
export const serviceWithEffect = <T, R, E, A>(
  tag: Context.Tag<T>,
  f: (a: T) => Effect.Effect<R, E, A>
): Effect.Effect<R | T, E, A> => {
  const trace = getCallTrace()
  return suspendSucceed(() =>
    pipe(
      getFiberRef(currentEnvironment),
      flatMap((env) => f(pipe(env, Context.unsafeGet(tag))))
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
export const asUnit = <R, E, A>(self: Effect.Effect<R, E, A>) => as<void>(void 0)(self)

/** @internal */
export const map = <A, B>(f: (a: A) => B) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, B> => {
    return pipe(self, flatMap((a) => sync(() => f(a)))).traced(trace)
  }
}

/** @internal */
export const tap = <A, R2, E2, X>(f: (a: A) => Effect.Effect<R2, E2, X>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A> => {
    return pipe(self, flatMap((a: A) => pipe(f(a), as(a)))).traced(trace)
  }
}

/** @internal */
export const addFinalizerExit = <R, X>(
  finalizer: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R, never, X>
): Effect.Effect<R | Scope.Scope, never, void> => {
  const trace = getCallTrace()
  return pipe(
    environment<R | Scope.Scope>(),
    flatMap((environment) =>
      pipe(
        scope(),
        flatMap(scopeAddFinalizerExit((exit) => pipe(finalizer(exit), provideEnvironment(environment))))
      )
    )
  ).traced(trace)
}

/** @internal */
export const acquireRelease = <R, E, A, R2, X>(
  acquire: Effect.Effect<R, E, A>,
  release: (a: A) => Effect.Effect<R2, never, X>
): Effect.Effect<R | R2 | Scope.Scope, E, A> => {
  const trace = getCallTrace()
  return acquireReleaseExit(acquire, (a, _) => release(a)).traced(trace)
}

/** @internal */
export const acquireReleaseExit = <R, E, A, R2, X>(
  acquire: Effect.Effect<R, E, A>,
  release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
): Effect.Effect<R | R2 | Scope.Scope, E, A> => {
  const trace = getCallTrace()
  return pipe(acquire, tap((a) => addFinalizerExit((exit) => release(a, exit))), uninterruptible).traced(trace)
}

/** @internal */
export const acquireUseRelease = <R, E, A, R2, E2, A2, R3, X>(
  acquire: Effect.Effect<R, E, A>,
  use: (a: A) => Effect.Effect<R2, E2, A2>,
  release: (a: A) => Effect.Effect<R3, never, X>
): Effect.Effect<R | R2 | R3, E | E2, A2> => {
  const trace = getCallTrace()
  return acquireUseReleaseExit(acquire, use, (a, _) => release(a)).traced(trace)
}

/** @internal */
export const acquireUseReleaseExit = <R, E, A, R2, E2, A2, R3, X>(
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
                    case OpCodes.Failure: {
                      return failCause(Cause.parallel(exit.body.cause, cause))
                    }
                    case OpCodes.Success: {
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
  // TODO: PLEASE REMOVE THE CAST HERE TO `any`
  return withFiberRuntime((state: any) => {
    state.deleteFiberRef(self)
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
    // TODO: PLEASE REMOVE THE CAST HERE TO `any`
    return withFiberRuntime((state: any) => {
      const [b, a] = f(state.getFiberRef(self) as A)
      state.setFiberRef(this, a)
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
export const locallyScopedFiberRef = <A>(value: A) => {
  return (self: FiberRef.FiberRef<A>): Effect.Effect<Scope.Scope, never, void> => {
    return pipe(
      acquireRelease(
        pipe(getFiberRef(self), flatMap((oldValue) => pipe(self, setFiberRef(value), as(oldValue)))),
        (oldValue) => pipe(self, setFiberRef(oldValue))
      ),
      as(void 0)
    )
  }
}

/** @internal */
export const locallyScopedWithFiberRef = <A>(f: (a: A) => A) => {
  return (self: FiberRef.FiberRef<A>): Effect.Effect<Scope.Scope, never, void> => {
    return pipe(self, getWithFiberRef((a) => pipe(self, locallyScopedFiberRef(f(a)))))
  }
}

/** @internal */
export const makeFiberRef = <A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (left: A, right: A) => A = (_, a) => a
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<A>> => {
  return makeWithFiberRef(() => unsafeMakeFiberRef(initial, fork, join))
}

/** @internal */
export const makeWithFiberRef = <Value>(
  ref: () => FiberRef.FiberRef<Value>
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<Value>> => {
  return acquireRelease(
    pipe(sync(ref), tap(updateFiberRef(identity))),
    deleteFiberRef
  )
}

/** @internal */
export const makeEnvironmentFiberRef = <A>(
  initial: Context.Context<A>
): Effect.Effect<Scope.Scope, never, FiberRef.FiberRef<Context.Context<A>>> => {
  return makeWithFiberRef(() => unsafeMakeEnvironmentFiberRef(initial))
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
export const currentLogLevel: FiberRef.FiberRef<LogLevel.LogLevel> = unsafeMakeFiberRef<LogLevel.LogLevel>({
  _tag: "Info",
  syslog: 6,
  label: "INFO",
  ordinal: 20000
})

// -----------------------------------------------------------------------------
// Scope
// -----------------------------------------------------------------------------

/** @internal */
export const scopeTag = Context.Tag<Scope.Scope>()

/** @internal */
export const scopeAddFinalizer = (finalizer: Effect.Effect<never, never, unknown>) =>
  (self: Scope.Scope): Effect.Effect<never, never, void> => self.addFinalizerExit(() => finalizer)

/** @internal */
export const scopeAddFinalizerExit = (finalizer: Scope.Scope.Finalizer) =>
  (self: Scope.Scope): Effect.Effect<never, never, void> => self.addFinalizerExit(finalizer)

/** @internal */
export const scopeClose = (exit: Exit.Exit<unknown, unknown>) =>
  (self: Scope.Scope.Closeable): Effect.Effect<never, never, void> => self.close(exit)

/** @internal */
export const scopeExtend = <R, E, A>(effect: Effect.Effect<R, E, A>) =>
  (self: Scope.Scope): Effect.Effect<Exclude<R, Scope.Scope>, E, A> =>
    pipe(
      effect,
      provideSomeEnvironment<Exclude<R, Scope.Scope>, R>(
        // @ts-expect-error
        Context.merge(pipe(
          Context.empty(),
          Context.add(scopeTag)(self)
        ))
      )
    )

/** @internal */
export const scopeFork = (strategy: ExecutionStrategy.ExecutionStrategy) =>
  (self: Scope.Scope): Effect.Effect<never, never, Scope.Scope.Closeable> => self.fork(strategy)

/** @internal */
export const scopeUse = <R, E, A>(effect: Effect.Effect<R, E, A>) =>
  (self: Scope.Scope.Closeable): Effect.Effect<Exclude<R, Scope.Scope>, E, A> =>
    pipe(
      self,
      scopeExtend(effect),
      onExit((exit) => self.close(exit))
    )

/** @internal */
export const scopeMake: (
  executionStrategy?: ExecutionStrategy.ExecutionStrategy
) => Effect.Effect<never, never, Scope.Scope.Closeable> = (strategy = ExecutionStrategy.sequential) =>
  pipe(
    releaseMapMake(),
    map((rm): Scope.Scope.Closeable => ({
      [ScopeTypeId]: ScopeTypeId,
      [CloseableScopeTypeId]: CloseableScopeTypeId,
      fork: (strategy) =>
        uninterruptible(
          pipe(
            scopeMake(strategy),
            flatMap((scope) =>
              pipe(
                rm,
                releaseMapAdd((exit) => scope.close(exit)),
                tap((fin) => scope.addFinalizerExit(fin)),
                map(() => scope)
              )
            )
          )
        ),
      close: (exit) => asUnit(releaseMapReleaseAll(strategy, exit)(rm)),
      addFinalizerExit: (fin) => asUnit(releaseMapAdd(fin)(rm))
    }))
  )

/** @internal */
export const ScopeTypeId: Scope.ScopeTypeId = Symbol.for("@effect/io/Scope") as Scope.ScopeTypeId
/** @internal */
export const CloseableScopeTypeId: Scope.CloseableScopeTypeId = Symbol.for(
  "@effect/io/CloseableScope"
) as Scope.CloseableScopeTypeId

// -----------------------------------------------------------------------------
// Ref
// -----------------------------------------------------------------------------

/** @internal */
export const RefTypeId: Ref.RefTypeId = Symbol.for("@effect/io/Ref") as Ref.RefTypeId

/** @internal */
const refVariance = {
  _A: (_: never) => _
}

/** @internal */
export const refUnsafeMake = <A>(value: A): Ref.Ref<A> => {
  const ref = MutableRef.make(value)
  return {
    [RefTypeId]: refVariance,
    modify: (f) =>
      sync(() => {
        const [b, a] = f(MutableRef.get(ref))
        if ((b as unknown) !== (a as unknown)) {
          MutableRef.set(a)(ref)
        }
        return b
      })
  }
}

/** @internal */
export const refMake = <A>(value: A) => sync(() => refUnsafeMake(value))

/** @internal */
export const refGet = <A>(self: Ref.Ref<A>) => self.modify((a) => [a, a])

/** @internal */
export const refSet = <A>(value: A) => (self: Ref.Ref<A>) => self.modify((): [void, A] => [void 0, value])

/** @internal */
export const refGetAndSet = <A>(value: A) => (self: Ref.Ref<A>) => self.modify((a): [A, A] => [a, value])

/** @internal */
export const refGetAndUpdate = <A>(f: (a: A) => A) => (self: Ref.Ref<A>) => self.modify((a): [A, A] => [a, f(a)])

/** @internal */
export const refGetAndUpdateSome = <A>(f: (a: A) => Option.Option<A>) =>
  (self: Ref.Ref<A>) =>
    self.modify((a): [A, A] =>
      pipe(
        f(a),
        Option.match(() => [a, a], (b) => [a, b])
      )
    )

/** @internal */
export const refSetAndGet = <A>(value: A) => (self: Ref.Ref<A>) => self.modify((): [A, A] => [value, value])

/** @internal */
export const refModify = <A, B>(f: (a: A) => readonly [B, A]) => (self: Ref.Ref<A>) => self.modify(f)

/** @internal */
export const refModifySome = <A, B>(fallback: B, f: (a: A) => Option.Option<readonly [B, A]>) =>
  (self: Ref.Ref<A>) =>
    self.modify((a) =>
      pipe(
        f(a),
        Option.match(
          () => [fallback, a],
          (b) => b
        )
      )
    )

/** @internal */
export const refUpdate = <A>(f: (a: A) => A) => (self: Ref.Ref<A>) => self.modify((a): [void, A] => [void 0, f(a)])

/** @internal */
export const refUpdateSome = <A>(f: (a: A) => Option.Option<A>) =>
  (self: Ref.Ref<A>) => self.modify((a): [void, A] => [void 0, pipe(f(a), Option.match(() => a, (b) => b))])

/** @internal */
export const refUpdateSomeAndGet = <A>(f: (a: A) => Option.Option<A>) =>
  (self: Ref.Ref<A>) => self.modify((a): [A, A] => pipe(f(a), Option.match(() => [a, a], (b) => [b, b])))

// -----------------------------------------------------------------------------
// ReleaseMap
// -----------------------------------------------------------------------------

/** @internal */
export type ReleaseMapState = {
  readonly _tag: "Exited"
  readonly nextKey: number
  readonly exit: Exit.Exit<unknown, unknown>
  readonly update: (finalizer: Scope.Scope.Finalizer) => Scope.Scope.Finalizer
} | {
  readonly _tag: "Running"
  readonly nextKey: number
  readonly finalizers: SortedMap.SortedMap<number, Scope.Scope.Finalizer>
  readonly update: (finalizer: Scope.Scope.Finalizer) => Scope.Scope.Finalizer
}

/** @internal */
export interface ReleaseMap {
  readonly stateRef: Ref.Ref<ReleaseMapState>
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
    pipe(
      self.stateRef,
      refModify((state): [Effect.Effect<never, never, void>, ReleaseMapState] => {
        switch (state._tag) {
          case "Exited": {
            return [unit(), state]
          }
          case "Running": {
            return [
              pipe(
                state.finalizers,
                SortedMap.get(key),
                Option.match(() => unit(), (fin) => state.update(fin)(exit))
              ),
              {
                ...state,
                finalizers: pipe(state.finalizers, SortedMap.remove(key))
              }
            ]
          }
        }
      }),
      flatten
    )

/** @internal */
export const releaseMapReleaseAll = (
  strategy: ExecutionStrategy.ExecutionStrategy,
  exit0: Exit.Exit<unknown, unknown>
) =>
  (self: ReleaseMap) =>
    pipe(
      self.stateRef,
      refModify((state): [Effect.Effect<never, never, void>, ReleaseMapState] => {
        switch (state._tag) {
          case "Exited": {
            return [unit(), state]
          }
          case "Running": {
            return [
              strategy._tag === "Sequential" ?
                pipe(
                  state.finalizers,
                  forEach(([_, fin]) => exit(state.update(fin)(exit0))),
                  flatMap((results) =>
                    pipe(
                      results,
                      exitCollectAll,
                      Option.map(exitAsUnit),
                      Option.getOrElse(exitUnit()),
                      done
                    )
                  )
                ) :
                strategy._tag === "Parallel" ?
                pipe(
                  state.finalizers,
                  forEachPar(([_, fin]) => exit(state.update(fin)(exit0))),
                  flatMap((results) =>
                    pipe(
                      results,
                      exitCollectAllPar,
                      Option.map(exitAsUnit),
                      Option.getOrElse(exitUnit()),
                      done
                    )
                  )
                ) :
                pipe(
                  state.finalizers,
                  forEachPar(([_, fin]) => exit(state.update(fin)(exit0))),
                  flatMap((results) =>
                    pipe(
                      results,
                      exitCollectAllPar,
                      Option.map(exitAsUnit),
                      Option.getOrElse(exitUnit()),
                      done
                    )
                  ),
                  withParallelism(strategy.n)
                ),
              { _tag: "Exited", nextKey: state.nextKey, exit: exit0, update: state.update }
            ]
          }
        }
      }),
      flatten
    )

/** @internal */
export const releaseMapAddIfOpen = (finalizer: Scope.Scope.Finalizer) =>
  (self: ReleaseMap) =>
    pipe(
      self.stateRef,
      refModify((state): [Effect.Effect<never, never, Option.Option<number>>, ReleaseMapState] => {
        switch (state._tag) {
          case "Exited": {
            return [
              as(Option.none)(finalizer(state.exit)),
              {
                _tag: "Exited",
                exit: state.exit,
                nextKey: state.nextKey + 1,
                update: state.update
              }
            ]
          }
          case "Running": {
            return [
              succeed(Option.some(state.nextKey)),
              {
                _tag: "Running",
                finalizers: pipe(state.finalizers, SortedMap.set(state.nextKey, finalizer)),
                nextKey: state.nextKey + 1,
                update: state.update
              }
            ]
          }
        }
      }),
      flatten
    )

/** @internal */
export const releaseMapGet = (key: number) =>
  (self: ReleaseMap) =>
    pipe(
      self.stateRef,
      refGet,
      map((state): Option.Option<Scope.Scope.Finalizer> =>
        state._tag === "Exited" ? Option.none : SortedMap.get(key)(state.finalizers)
      )
    )

/** @internal */
export const releaseMapReplace = (key: number, finalizer: Scope.Scope.Finalizer) =>
  (self: ReleaseMap) =>
    pipe(
      self.stateRef,
      refModify((state): [Effect.Effect<never, never, Option.Option<Scope.Scope.Finalizer>>, ReleaseMapState] => {
        switch (state._tag) {
          case "Exited": {
            return [
              as(Option.none)(finalizer(state.exit)),
              {
                _tag: "Exited",
                exit: state.exit,
                nextKey: state.nextKey,
                update: state.update
              }
            ]
          }
          case "Running": {
            return [
              succeed(SortedMap.get(key)(state.finalizers)),
              {
                _tag: "Running",
                finalizers: pipe(state.finalizers, SortedMap.set(state.nextKey, finalizer)),
                nextKey: state.nextKey,
                update: state.update
              }
            ]
          }
        }
      }),
      flatten
    )

/** @internal */
export const releaseMapRemove = (key: number) =>
  (self: ReleaseMap) =>
    pipe(
      self.stateRef,
      refModify((state): [Option.Option<Scope.Scope.Finalizer>, ReleaseMapState] =>
        state._tag === "Exited" ?
          [Option.none, state] :
          [SortedMap.get(key)(state.finalizers), { ...state, finalizers: SortedMap.remove(key)(state.finalizers) }]
      )
    )

const releaseMapInitialState: ReleaseMapState = {
  _tag: "Running",
  nextKey: 0,
  finalizers: SortedMap.empty(Order.reverse(Number.Order)),
  update: identity
}

export const releaseMapMake = () =>
  pipe(
    refMake<ReleaseMapState>(releaseMapInitialState),
    map((stateRef): ReleaseMap => ({ stateRef }))
  )

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
  return self.op === OpCodes.Failure
}

/** @internal */
export const exitIsSuccess = <E, A>(self: Exit.Exit<E, A>): self is Exit.Success<A> => {
  return self.op === OpCodes.Success
}

/** @internal */
export const exitSucceed = <A>(value: A): Exit.Exit<never, A> => {
  const effect = Object.create(proto)
  effect._tag = "Success"
  effect.success = value
  return effect
}

/** @internal */
export const exitFail = <E>(error: E): Exit.Exit<E, never> => {
  return exitFailCause(Cause.fail(error))
}

/** @internal */
export const exitFailCause = <E>(cause: Cause.Cause<E>): Exit.Exit<E, never> => {
  const effect = Object.create(proto)
  effect._tag = "Failure"
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
    case OpCodes.Failure: {
      return Cause.isInterrupted(self.body.cause)
    }
    case OpCodes.Success: {
      return false
    }
  }
}

/** @internal */
export const exitCauseOption = <E, A>(self: Exit.Exit<E, A>): Option.Option<Cause.Cause<E>> => {
  switch (self.op) {
    case OpCodes.Failure: {
      return Option.some(self.body.cause)
    }
    case OpCodes.Success: {
      return Option.none
    }
  }
}

/** @internal */
export const exitGetOrElse = <E, A>(orElse: (cause: Cause.Cause<E>) => A) => {
  return (self: Exit.Exit<E, A>): A => {
    switch (self.op) {
      case OpCodes.Failure: {
        return orElse(self.body.cause)
      }
      case OpCodes.Success: {
        return self.body.value
      }
    }
  }
}

/** @internal */
export const exitExists = <A>(predicate: Predicate<A>) => {
  return <E>(self: Exit.Exit<E, A>): boolean => {
    switch (self.op) {
      case OpCodes.Failure: {
        return false
      }
      case OpCodes.Success: {
        return predicate(self.body.value)
      }
    }
  }
}

/** @internal */
export const exitAs = <A1>(value: A1) =>
  <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E, A1> => {
    switch (self.op) {
      case OpCodes.Failure: {
        return self
      }
      case OpCodes.Success: {
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
      case OpCodes.Failure: {
        return self
      }
      case OpCodes.Success: {
        return exitSucceed(f(self.body.value))
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
      case OpCodes.Failure: {
        return exitFailCause(pipe(self.body.cause, Cause.map(onFailure)))
      }
      case OpCodes.Success: {
        return exitSucceed(onSuccess(self.body.value))
      }
    }
  }
}

/** @internal */
export const exitMapError = <E, E1>(f: (e: E) => E1) => {
  return <A>(self: Exit.Exit<E, A>): Exit.Exit<E1, A> => {
    switch (self.op) {
      case OpCodes.Failure: {
        return exitFailCause(pipe(self.body.cause, Cause.map(f)))
      }
      case OpCodes.Success: {
        return self
      }
    }
  }
}

/** @internal */
export const exitMapErrorCause = <E, E1>(f: (cause: Cause.Cause<E>) => Cause.Cause<E1>) => {
  return <A>(self: Exit.Exit<E, A>): Exit.Exit<E1, A> => {
    switch (self.op) {
      case OpCodes.Failure: {
        return exitFailCause(f(self.body.cause))
      }
      case OpCodes.Success: {
        return self
      }
    }
  }
}

/** @internal */
export const exitFlatMap = <A, E1, A1>(f: (a: A) => Exit.Exit<E1, A1>) => {
  return <E>(self: Exit.Exit<E, A>): Exit.Exit<E | E1, A1> => {
    switch (self.op) {
      case OpCodes.Failure: {
        return self
      }
      case OpCodes.Success: {
        return f(self.body.value)
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
      case OpCodes.Failure: {
        return succeed(self)
      }
      case OpCodes.Success: {
        return f(self.body.value)
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
      case OpCodes.Failure: {
        return onFailure(self.body.cause)
      }
      case OpCodes.Success: {
        return onSuccess(self.body.value)
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
      case OpCodes.Failure: {
        return onFailure(self.body.cause)
      }
      case OpCodes.Success: {
        return onSuccess(self.body.value)
      }
    }
  }
}

/** @internal */
export const exitForEachEffect = <A, R, E1, B>(f: (a: A) => Effect.Effect<R, E1, B>) => {
  return <E>(self: Exit.Exit<E, A>): Effect.Effect<R, never, Exit.Exit<E | E1, B>> => {
    switch (self.op) {
      case OpCodes.Failure: {
        return succeed(exitFailCause(self.body.cause))
      }
      case OpCodes.Success: {
        return exit(f(self.body.value))
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
      case OpCodes.Failure: {
        switch (that.op) {
          case OpCodes.Success: {
            return self
          }
          case OpCodes.Failure: {
            return exitFailCause(g(self.body.cause, that.body.cause))
          }
        }
      }
      case OpCodes.Success: {
        switch (that.op) {
          case OpCodes.Success: {
            return exitSucceed(f(self.body.value, that.body.value))
          }
          case OpCodes.Failure: {
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
