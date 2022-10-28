import * as Cause from "@effect/io/Cause"
import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRuntime from "@effect/io/Fiber/Runtime"
import * as FiberRuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as FiberRuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"
import type * as FiberStatus from "@effect/io/Fiber/Status"
import type * as FiberRef from "@effect/io/FiberRef"
import type * as LogLevel from "@effect/io/Logger/Level"
import * as Scope from "@effect/io/Scope"
import * as Context from "@fp-ts/data/Context"
import * as Differ from "@fp-ts/data/Differ"
import * as ContextPatch from "@fp-ts/data/Differ/ContextPatch"
import * as HashSetPatch from "@fp-ts/data/Differ/HashSetPatch"
import * as Equal from "@fp-ts/data/Equal"
import type { LazyArg } from "@fp-ts/data/Function"
import { identity, pipe } from "@fp-ts/data/Function"
import type * as HashSet from "@fp-ts/data/HashSet"
import * as Option from "@fp-ts/data/Option"

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
// | RevertFlags

/** @internal */
export const primitive = <Tag extends Primitive["_tag"]>(
  tag: Tag,
  body: Extract<Primitive, { _tag: Tag }>["body"],
  trace: string | undefined
): Effect.Effect<never, never, never> => new Op(tag, body, trace)

const effectVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export class Op<Tag extends string, Body = void> implements Effect.Effect<never, never, never> {
  readonly [EffectTypeId] = effectVariance
  constructor(readonly _tag: Tag, readonly body: Body, readonly trace?: string) {}
  [Equal.symbolEqual](that: unknown) {
    return this === that
  }
  [Equal.symbolHash]() {
    return Equal.hashRandom(this)
  }
  traced(trace: string | undefined): Effect.Effect<never, never, never> {
    return new Op(this._tag, this.body, trace)
  }
}

/** @internal */
export interface Success extends Op<"Success", { readonly value: unknown }> {}

/** @internal */
export interface Failure extends Op<"Failure", { readonly cause: Cause.Cause<unknown> }> {}

/** @internal */
export interface Yield extends Op<"Yield"> {}

/** @internal */
export interface While extends
  Op<"While", {
    readonly check: () => boolean
    readonly body: () => Primitive
    readonly process: (a: unknown) => void
  }>
{}

/** @internal */
export interface WithRuntime extends
  Op<"WithRuntime", {
    readonly withRuntime: (fiber: FiberRuntime.Runtime<unknown, unknown>, status: FiberStatus.Running) => Primitive
  }>
{}

/** @internal */
export interface UpdateRuntimeFlags extends
  Op<"UpdateRuntimeFlags", {
    readonly update: FiberRuntimeFlagsPatch.RuntimeFlagsPatch
    readonly scope?: (oldRuntimeFlags: FiberRuntimeFlags.RuntimeFlags) => Primitive
  }>
{}

/** @internal */
export interface OnFailure extends
  Op<"OnFailure", {
    readonly first: Primitive
    readonly failK: (a: Cause.Cause<unknown>) => Primitive
  }>
{}

/** @internal */
export interface OnSuccess extends
  Op<"OnSuccess", {
    readonly first: Primitive
    readonly successK: (a: unknown) => Primitive
  }>
{}

/** @internal */
export interface OnSuccessAndFailure extends
  Op<"OnSuccessAndFailure", {
    readonly first: Primitive
    readonly failK: (a: Cause.Cause<unknown>) => Primitive
    readonly successK: (a: unknown) => Primitive
  }>
{}

/** @internal */
export interface Async extends
  Op<"Async", {
    readonly register: (resume: (effect: Primitive) => void) => void
    readonly blockingOn: FiberId.FiberId
  }>
{}

/** @internal */
export interface Sync extends
  Op<"Sync", {
    readonly evaluate: () => unknown
  }>
{}

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
  return primitive("Async", {
    /* @ts-expect-error*/
    register,
    blockingOn
  }, trace)
}

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, E, never> => {
  const trace = getCallTrace()
  return primitive("Failure", { cause }, trace)
}

/** @internal */
export const catchAllCause = <E, R2, E2, A2>(
  f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, A2>
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E2, A | A2> => {
    return primitive("OnFailure", {
      /** @ts-expect-error */
      first: self,
      /** @ts-expect-error */
      failK: f
    }, trace)
  }
}

/** @internal */
export const flatMap = <A, R1, E1, B>(f: (a: A) => Effect.Effect<R1, E1, B>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E | E1, B> => {
    return primitive("OnSuccess", {
      /** @ts-expect-error */
      first: self,
      /** @ts-expect-error */
      successK: f
    }, trace)
  }
}

/** @internal */
export const foldCause = <E, A2, A, A3>(
  onFailure: (cause: Cause.Cause<E>) => A2,
  onSuccess: (a: A) => A3
): <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, A2 | A3> => {
  return foldCauseEffect(
    (cause) => succeed(onFailure(cause)),
    (a) => succeed(onSuccess(a))
  )
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
    return primitive("OnSuccessAndFailure", {
      /** @ts-expect-error */
      first: self,
      /** @ts-expect-error */
      failK: onFailure,
      /** @ts-expect-error */
      successK: onSuccess
    }, trace)
  }
}

/** @internal */
export const succeed = <A>(value: A): Effect.Effect<never, never, A> => {
  const trace = getCallTrace()
  return primitive("Success", { value }, trace)
}

/** @internal */
export const sync = <A>(evaluate: () => A): Effect.Effect<never, never, A> => {
  const trace = getCallTrace()
  return primitive("Sync", { evaluate }, trace)
}

/** @internal */
export const suspendSucceed = <R, E, A>(
  effect: () => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  return pipe(sync(effect), flatMap(identity))
}

/** @internal */
export const updateRuntimeFlags = (
  patch: FiberRuntimeFlagsPatch.RuntimeFlagsPatch
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return primitive("UpdateRuntimeFlags", { update: patch }, trace)
}

/** @internal */
export const interruptible = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return primitive("UpdateRuntimeFlags", {
    update: FiberRuntimeFlagsPatch.enable(FiberRuntimeFlags.Interruption),
    /** @ts-expect-errord */
    scope: () => self
  }, trace)
}

/** @internal */
export const uninterruptible = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return primitive("UpdateRuntimeFlags", {
    update: FiberRuntimeFlagsPatch.disable(FiberRuntimeFlags.Interruption),
    /** @ts-expect-errord */
    scope: () => self
  }, trace)
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
  return primitive("UpdateRuntimeFlags", {
    update: FiberRuntimeFlagsPatch.disable(FiberRuntimeFlags.Interruption),
    /** @ts-expect-error */
    scope: (oldFlags) =>
      FiberRuntimeFlags.interruption(oldFlags)
        ? f(interruptible)
        : f(uninterruptible)
  }, trace)
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
  return primitive("UpdateRuntimeFlags", {
    update: FiberRuntimeFlagsPatch.enable(FiberRuntimeFlags.Interruption),
    /** @ts-expect-error */
    scope: (oldFlags) =>
      FiberRuntimeFlags.interruption(oldFlags)
        ? f(interruptible)
        : f(uninterruptible)
  }, trace)
}

/** @internal */
export const withRuntimeFlags = (
  update: FiberRuntimeFlagsPatch.RuntimeFlagsPatch
) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return primitive("UpdateRuntimeFlags", {
      update,
      /** @ts-expect-error */
      scope: () => self
    }, trace)
  }
}

/** @internal */
export const whileLoop = <R, E, A>(
  check: LazyArg<boolean>,
  body: LazyArg<Effect.Effect<R, E, A>>,
  process: (a: A) => void
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  return primitive("While", {
    check,
    /* @ts-expect-error*/
    body,
    /* @ts-expect-error*/
    process
  }, trace)
}

/** @internal */
export const withFiberRuntime = <R, E, A>(
  withRuntime: (
    fiber: FiberRuntime.Runtime<E, A>,
    status: FiberStatus.Running
  ) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return primitive("WithRuntime", {
    /** @ts-expect-error */
    withRuntime
  }, trace)
}

/** @internal */
export const yieldNow: () => Effect.Effect<never, never, void> = () => {
  const trace = getCallTrace()
  return primitive("Yield", void 0, trace)
}

/** @internal */
export const unit: () => Effect.Effect<never, never, void> = () => succeed(undefined)

/** @internal */
export const traced = (trace: string | undefined) => <R, E, A>(self: Effect.Effect<R, E, A>) => self.traced(trace)

/** @internal */
export const exit = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Exit.Exit<E, A>> => {
  return pipe(self, foldCause(failCause, succeed)) as Effect.Effect<R, never, Exit.Exit<E, A>>
}

/** @internal */
export const scope = () => service(Scope.Tag)

/** @internal */
export const environment = <R>(): Effect.Effect<R, never, Context.Context<R>> => {
  return suspendSucceed(() => getFiberRef(currentEnvironment) as Effect.Effect<never, never, Context.Context<R>>)
}

/** @internal */
export const provideEnvironment = <R>(environment: Context.Context<R>) => {
  return <E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<never, E, A> => {
    return pipe(
      self as Effect.Effect<never, E, A>,
      pipe(currentEnvironment, locallyFiberRef(environment as Context.Context<never>))
    )
  }
}

/** @internal */
export const service = <T>(tag: Context.Tag<T>): Effect.Effect<T, never, T> => {
  return serviceWithEffect(tag, succeed)
}

/** @internal */
export const serviceWithEffect = <T, R, E, A>(
  tag: Context.Tag<T>,
  f: (a: T) => Effect.Effect<R, E, A>
): Effect.Effect<R | T, E, A> => {
  return suspendSucceed(() =>
    pipe(
      getFiberRef(currentEnvironment),
      flatMap((env) => f(pipe(env, Context.unsafeGet(tag))))
    )
  )
}

/** @internal */
export const as = <B>(value: B) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, B> => {
    return pipe(self, flatMap(() => succeed(value)))
  }
}

/** @internal */
export const map = <A, B>(f: (a: A) => B) => {
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, B> => {
    return pipe(self, flatMap((a) => sync(() => f(a))))
  }
}

/** @internal */
export const tap = <A, R2, E2, X>(f: (a: A) => Effect.Effect<R2, E2, X>) => {
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A> => {
    return pipe(self, flatMap((a: A) => pipe(f(a), as(a))))
  }
}

/** @internal */
export const addFinalizerExit = <R, X>(
  finalizer: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R, never, X>
): Effect.Effect<R | Scope.Scope, never, void> => {
  return pipe(
    environment<R | Scope.Scope>(),
    flatMap((environment) =>
      pipe(
        scope(),
        flatMap(Scope.addFinalizerExit((exit) => pipe(finalizer(exit), provideEnvironment(environment))))
      )
    )
  )
}

/** @internal */
export const acquireRelease = <R, E, A, R2, X>(
  acquire: Effect.Effect<R, E, A>,
  release: (a: A) => Effect.Effect<R2, never, X>
): Effect.Effect<R | R2 | Scope.Scope, E, A> => {
  return acquireReleaseExit(acquire, (a, _) => release(a))
}

/** @internal */
export const acquireReleaseExit = <R, E, A, R2, X>(
  acquire: Effect.Effect<R, E, A>,
  release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, X>
): Effect.Effect<R | R2 | Scope.Scope, E, A> => {
  return pipe(acquire, tap((a) => addFinalizerExit((exit) => release(a, exit))), uninterruptible)
}

/** @internal */
export const acquireUseRelease = <R, E, A, R2, E2, A2, R3, X>(
  acquire: Effect.Effect<R, E, A>,
  use: (a: A) => Effect.Effect<R2, E2, A2>,
  release: (a: A) => Effect.Effect<R3, never, X>
): Effect.Effect<R | R2 | R3, E | E2, A2> => {
  return acquireUseReleaseExit(acquire, use, (a, _) => release(a))
}

/** @internal */
export const acquireUseReleaseExit = <R, E, A, R2, E2, A2, R3, X>(
  acquire: Effect.Effect<R, E, A>,
  use: (a: A) => Effect.Effect<R2, E2, A2>,
  release: (a: A, exit: Exit.Exit<E2, A2>) => Effect.Effect<R3, never, X>
): Effect.Effect<R | R2 | R3, E | E2, A2> => {
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
                  switch (exit._tag) {
                    case "Failure": {
                      return failCause(Cause.parallel(exit.body.cause, cause))
                    }
                    case "Success": {
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
  )
}

/** @internal */
export const zip = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, readonly [A, A2]> => {
    return pipe(self, flatMap((a) => pipe(that, map((b) => [a, b] as const))))
  }
}

/** @internal */
export const zipLeft = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A> => {
    return pipe(self, flatMap((a) => pipe(that, as(a))))
  }
}

/** @internal */
export const zipRight = <R2, E2, A2>(that: Effect.Effect<R2, E2, A2>) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A2> => {
    return pipe(self, flatMap(() => that))
  }
}

/** @internal */
export const zipWith = <R2, E2, A2, A, B>(that: Effect.Effect<R2, E2, A2>, f: (a: A, b: A2) => B) => {
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, B> => {
    return pipe(self, flatMap((a) => pipe(that, map((b) => f(a, b)))))
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
