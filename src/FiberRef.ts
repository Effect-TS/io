/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as core from "@effect/io/internal/core"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as logger from "@effect/io/internal/logger"
import type * as Logger from "@effect/io/Logger"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as LogSpan from "@effect/io/Logger/Span"
import type * as Scope from "@effect/io/Scope"
import type * as Supervisor from "@effect/io/Supervisor"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Context from "@fp-ts/data/Context"
import type * as Differ from "@fp-ts/data/Differ"
import type * as HashSet from "@fp-ts/data/HashSet"
import type * as Option from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 * @category symbols
 */
export const FiberRefTypeId: unique symbol = core.FiberRefTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type FiberRefTypeId = typeof FiberRefTypeId

/**
 * @since 1.0.0
 * @category model
 */
export interface FiberRef<A> extends Variance<A> {
  /** @internal */
  readonly initial: A
  /** @internal */
  readonly diff: (oldValue: A, newValue: A) => unknown
  /** @internal */
  readonly combine: (first: unknown, second: unknown) => unknown
  /** @internal */
  readonly patch: (patch: unknown) => (oldValue: A) => A
  /** @internal */
  readonly fork: unknown
  /** @internal */
  readonly join: (oldValue: A, newValue: A) => A
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Variance<A> {
  readonly [FiberRefTypeId]: {
    readonly _A: (_: never) => A
  }
}

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const make: <A>(
  initial: A,
  fork?: (a: A) => A,
  join?: (left: A, right: A) => A
) => Effect.Effect<Scope.Scope, never, FiberRef<A>> = fiberRuntime.fiberRefMake

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const makeWith: <Value>(ref: () => FiberRef<Value>) => Effect.Effect<Scope.Scope, never, FiberRef<Value>> =
  fiberRuntime.fiberRefMakeWith

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const makeEnvironment: <A>(
  initial: Context.Context<A>
) => Effect.Effect<Scope.Scope, never, FiberRef<Context.Context<A>>> = fiberRuntime.fiberRefMakeEnvironment

/**
 * @macro traced
 * @since 1.0.0
 * @category constructors
 */
export const makeRuntimeFlags: (
  initial: RuntimeFlags.RuntimeFlags
) => Effect.Effect<Scope.Scope, never, FiberRef<RuntimeFlags.RuntimeFlags>> = fiberRuntime.fiberRefMakeRuntimeFlags

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMake: <Value>(
  initial: Value,
  fork?: (a: Value) => Value,
  join?: (left: Value, right: Value) => Value
) => FiberRef<Value> = core.fiberRefUnsafeMake

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeHashSet: <A>(initial: HashSet.HashSet<A>) => FiberRef<HashSet.HashSet<A>> =
  core.fiberRefUnsafeMakeHashSet

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeEnvironment: <A>(initial: Context.Context<A>) => FiberRef<Context.Context<A>> =
  core.fiberRefUnsafeMakeEnvironment

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeSupervisor: (initial: Supervisor.Supervisor<any>) => FiberRef<Supervisor.Supervisor<any>> =
  fiberRuntime.fiberRefUnsafeMakeSupervisor

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakePatch: <Value, Patch>(
  initial: Value,
  differ: Differ.Differ<Value, Patch>,
  fork: Patch,
  join?: (oldV: Value, newV: Value) => Value
) => FiberRef<Value> = core.fiberRefUnsafeMakePatch

/**
 * @macro traced
 * @since 1.0.0
 * @category getters
 */
export const get: <A>(self: FiberRef<A>) => Effect.Effect<never, never, A> = core.fiberRefGet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndSet: <A>(value: A) => (self: FiberRef<A>) => Effect.Effect<never, never, A> = core.fiberRefGetAndSet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdate: <A>(f: (a: A) => A) => (self: FiberRef<A>) => Effect.Effect<never, never, A> =
  core.fiberRefgetAndUpdate

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getAndUpdateSome: <A>(
  pf: (a: A) => Option.Option<A>
) => (self: FiberRef<A>) => Effect.Effect<never, never, A> = core.fiberRefGetAndUpdateSome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const getWith: <R, E, A, B>(
  f: (a: A) => Effect.Effect<R, E, B>
) => (self: FiberRef<A>) => Effect.Effect<R, E, B> = core.fiberRefGetWith

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const set: <A>(value: A) => (self: FiberRef<A>) => Effect.Effect<never, never, void> = core.fiberRefSet

const _delete: <A>(self: FiberRef<A>) => Effect.Effect<never, never, void> = core.fiberRefDelete

export {
  /**
   * @macro traced
   * @since 1.0.0
   * @category mutations
   */
  _delete as delete
}

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const reset: <A>(self: FiberRef<A>) => Effect.Effect<never, never, void> = core.fiberRefReset

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modify: <A, B>(f: (a: A) => readonly [B, A]) => (self: FiberRef<A>) => Effect.Effect<never, never, B> =
  core.fiberRefModify

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const modifySome: <B, A>(
  def: B,
  f: (a: A) => Option.Option<readonly [B, A]>
) => (self: FiberRef<A>) => Effect.Effect<never, never, B> = core.fiberRefModifySome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const update: <A>(f: (a: A) => A) => (self: FiberRef<A>) => Effect.Effect<never, never, void> =
  core.fiberRefUpdate

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSome: <A>(
  pf: (a: A) => Option.Option<A>
) => (self: FiberRef<A>) => Effect.Effect<never, never, void> = core.fiberRefUpdateSome

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateAndGet: <A>(f: (a: A) => A) => (self: FiberRef<A>) => Effect.Effect<never, never, A> =
  core.fiberRefUpdateAndGet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const updateSomeAndGet: <A>(
  pf: (a: A) => Option.Option<A>
) => (self: FiberRef<A>) => Effect.Effect<never, never, A> = core.fiberRefUpdateSomeAndGet

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const locally: <A>(
  value: A
) => (self: FiberRef<A>) => <R, E, B>(use: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B> = core.fiberRefLocally

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const locallyWith: <A>(
  f: (a: A) => A
) => (self: FiberRef<A>) => <R, E, B>(use: Effect.Effect<R, E, B>) => Effect.Effect<R, E, B> = core.fiberRefLocallyWith

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const locallyScoped: <A>(value: A) => (self: FiberRef<A>) => Effect.Effect<Scope.Scope, never, void> =
  fiberRuntime.fiberRefLocallyScoped

/**
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const locallyScopedWith: <A>(value: A) => (self: FiberRef<A>) => Effect.Effect<Scope.Scope, never, void> =
  fiberRuntime.fiberRefLocallyScoped

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentEnvironment: FiberRef<Context.Context<never>> = core.currentEnvironment

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLogAnnotations: FiberRef<ReadonlyMap<string, string>> = core.currentLogAnnotations

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLoggers: FiberRef<HashSet.HashSet<Logger.Logger<string, any>>> = logger.currentLoggers

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLogLevel: FiberRef<LogLevel.LogLevel> = core.currentLogLevel

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLogSpan: FiberRef<Chunk.Chunk<LogSpan.LogSpan>> = core.currentLogSpan

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentRuntimeFlags: FiberRef<RuntimeFlags.RuntimeFlags> = fiberRuntime.currentRuntimeFlags

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentParallelism: FiberRef<Option.Option<number>> = core.currentParallelism

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentSupervisor: FiberRef<Supervisor.Supervisor<any>> = fiberRuntime.currentSupervisor

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const interruptedCause: FiberRef<Cause.Cause<never>> = core.interruptedCause
