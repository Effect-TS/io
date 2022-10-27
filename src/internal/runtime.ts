import type * as Cause from "@effect/io/Cause"
import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRuntime from "@effect/io/Fiber/Runtime"
import * as FiberRuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as FiberRuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"
import type * as FiberStatus from "@effect/io/Fiber/Status"
import type * as FiberRef from "@effect/io/FiberRef"
import type * as LogLevel from "@effect/io/Logger/Level"
import * as Equal from "@fp-ts/data/Equal"
import type { LazyArg } from "@fp-ts/data/Function"

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

const variance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export class Op<Tag extends string, Body = void> implements Effect.Effect<never, never, never> {
  readonly [EffectTypeId] = variance
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
export interface Failure extends Op<"Failure", { readonly error: unknown }> {}

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
export const fail = <E>(error: E): Effect.Effect<never, E, never> => {
  const trace = getCallTrace()
  return primitive("Failure", { error }, trace)
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
export const traced = (trace: string | undefined) => <R, E, A>(self: Effect.Effect<R, E, A>) => self.traced(trace)

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLogLevel
 * @category fiberRefs
 * @since 1.0.0
 */
export declare const currentLogLevel: FiberRef.FiberRef<LogLevel.LogLevel> // TODO
