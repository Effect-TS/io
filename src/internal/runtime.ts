import * as Cause from "@effect/io/Cause"
import { getCallTrace, runtimeDebug } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import type * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import type * as Exit from "@effect/io/Exit"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRuntime from "@effect/io/Fiber/Runtime"
import * as FiberRuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as FiberRuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"
import type * as FiberStatus from "@effect/io/Fiber/Status"
import type * as FiberRef from "@effect/io/FiberRef"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as Scope from "@effect/io/Scope"
import * as Context from "@fp-ts/data/Context"
import * as Differ from "@fp-ts/data/Differ"
import * as ContextPatch from "@fp-ts/data/Differ/ContextPatch"
import * as HashSetPatch from "@fp-ts/data/Differ/HashSetPatch"
import * as Equal from "@fp-ts/data/Equal"
import type { LazyArg } from "@fp-ts/data/Function"
import { identity, pipe } from "@fp-ts/data/Function"
import type * as HashSet from "@fp-ts/data/HashSet"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"

// -----------------------------------------------------------------------------
// Ref
// -----------------------------------------------------------------------------
import type * as Ref from "@effect/io/Ref"

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
export const scopeFork = (self: Scope.Scope): Effect.Effect<never, never, Scope.Scope.Closeable> => self.fork

/** @internal */
export const scopeUse = <R, E, A>(effect: Effect.Effect<R, E, A>) =>
  (self: Scope.Scope.Closeable): Effect.Effect<Exclude<R, Scope.Scope>, E, A> =>
    pipe(
      self,
      scopeExtend(effect),
      onExit((exit) => self.close(exit))
    )

/** @internal */
export declare const scopeMake: (
  executionStrategy?: ExecutionStrategy.ExecutionStrategy
) => Effect.Effect<never, never, Scope.Scope.Closeable>

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
