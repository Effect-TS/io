/**
 * @since 1.0.0
 */
import type * as Chunk from "@effect/data/Chunk"
import type * as Context from "@effect/data/Context"
import type * as Differ from "@effect/data/Differ"
import type { LazyArg } from "@effect/data/Function"
import type * as HashMap from "@effect/data/HashMap"
import type * as HashSet from "@effect/data/HashSet"
import type * as List from "@effect/data/List"
import type * as Option from "@effect/data/Option"
import type { Pipeable } from "@effect/data/Pipeable"
import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as core from "@effect/io/internal/core"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as query from "@effect/io/internal/query"
import type * as Logger from "@effect/io/Logger"
import type * as LogLevel from "@effect/io/Logger/Level"
import type * as LogSpan from "@effect/io/Logger/Span"
import type * as MetricLabel from "@effect/io/Metric/Label"
import type * as Request from "@effect/io/Request"
import type * as Scheduler from "@effect/io/Scheduler"
import type * as Scope from "@effect/io/Scope"
import type * as Supervisor from "@effect/io/Supervisor"
import type * as Tracer from "@effect/io/Tracer"

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
export interface FiberRef<A> extends Variance<A>, Pipeable {
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
 * @since 1.0.0
 * @category constructors
 */
export const make: <A>(
  initial: A,
  options?: {
    readonly fork?: (a: A) => A
    readonly join?: (left: A, right: A) => A
  }
) => Effect.Effect<Scope.Scope, never, FiberRef<A>> = fiberRuntime.fiberRefMake

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWith: <Value>(ref: LazyArg<FiberRef<Value>>) => Effect.Effect<Scope.Scope, never, FiberRef<Value>> =
  fiberRuntime.fiberRefMakeWith

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeContext: <A>(
  initial: Context.Context<A>
) => Effect.Effect<Scope.Scope, never, FiberRef<Context.Context<A>>> = fiberRuntime.fiberRefMakeContext

/**
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
  options?: {
    readonly fork?: (a: Value) => Value
    readonly join?: (left: Value, right: Value) => Value
  }
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
export const unsafeMakeContext: <A>(initial: Context.Context<A>) => FiberRef<Context.Context<A>> =
  core.fiberRefUnsafeMakeContext

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
  options: {
    readonly differ: Differ.Differ<Value, Patch>
    readonly fork: Patch
    readonly join?: (oldV: Value, newV: Value) => Value
  }
) => FiberRef<Value> = core.fiberRefUnsafeMakePatch

/**
 * @since 1.0.0
 * @category getters
 */
export const get: <A>(self: FiberRef<A>) => Effect.Effect<never, never, A> = core.fiberRefGet

/**
 * @since 1.0.0
 * @category utils
 */
export const getAndSet: {
  <A>(value: A): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, value: A): Effect.Effect<never, never, A>
} = core.fiberRefGetAndSet

/**
 * @since 1.0.0
 * @category utils
 */
export const getAndUpdate: {
  <A>(f: (a: A) => A): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, f: (a: A) => A): Effect.Effect<never, never, A>
} = core.fiberRefGetAndUpdate

/**
 * @since 1.0.0
 * @category utils
 */
export const getAndUpdateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
} = core.fiberRefGetAndUpdateSome

/**
 * @since 1.0.0
 * @category utils
 */
export const getWith: {
  <A, R, E, B>(f: (a: A) => Effect.Effect<R, E, B>): (self: FiberRef<A>) => Effect.Effect<R, E, B>
  <A, R, E, B>(self: FiberRef<A>, f: (a: A) => Effect.Effect<R, E, B>): Effect.Effect<R, E, B>
} = core.fiberRefGetWith

/**
 * @since 1.0.0
 * @category utils
 */
export const set: {
  <A>(value: A): (self: FiberRef<A>) => Effect.Effect<never, never, void>
  <A>(self: FiberRef<A>, value: A): Effect.Effect<never, never, void>
} = core.fiberRefSet

const _delete: <A>(self: FiberRef<A>) => Effect.Effect<never, never, void> = core.fiberRefDelete

export {
  /**
   * @since 1.0.0
   * @category utils
   */
  _delete as delete
}

/**
 * @since 1.0.0
 * @category utils
 */
export const reset: <A>(self: FiberRef<A>) => Effect.Effect<never, never, void> = core.fiberRefReset

/**
 * @since 1.0.0
 * @category utils
 */
export const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: FiberRef<A>) => Effect.Effect<never, never, B>
  <A, B>(self: FiberRef<A>, f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
} = core.fiberRefModify

/**
 * @since 1.0.0
 * @category utils
 */
export const modifySome: <A, B>(
  self: FiberRef<A>,
  def: B,
  f: (a: A) => Option.Option<readonly [B, A]>
) => Effect.Effect<never, never, B> = core.fiberRefModifySome

/**
 * @since 1.0.0
 * @category utils
 */
export const update: {
  <A>(f: (a: A) => A): (self: FiberRef<A>) => Effect.Effect<never, never, void>
  <A>(self: FiberRef<A>, f: (a: A) => A): Effect.Effect<never, never, void>
} = core.fiberRefUpdate

/**
 * @since 1.0.0
 * @category utils
 */
export const updateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: FiberRef<A>) => Effect.Effect<never, never, void>
  <A>(self: FiberRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, void>
} = core.fiberRefUpdateSome

/**
 * @since 1.0.0
 * @category utils
 */
export const updateAndGet: {
  <A>(f: (a: A) => A): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, f: (a: A) => A): Effect.Effect<never, never, A>
} = core.fiberRefUpdateAndGet

/**
 * @since 1.0.0
 * @category utils
 */
export const updateSomeAndGet: {
  <A>(pf: (a: A) => Option.Option<A>): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
} = core.fiberRefUpdateSomeAndGet

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentRequestBatchingEnabled: FiberRef<boolean> = core.currentRequestBatching

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentRequestCache: FiberRef<Request.Cache> = query.currentCache as any

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentRequestCacheEnabled: FiberRef<boolean> = query.currentCacheEnabled

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentContext: FiberRef<Context.Context<never>> = core.currentContext

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentSchedulingPriority: FiberRef<number> = core.currentSchedulingPriority

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentMaxFiberOps: FiberRef<number> = core.currentMaxFiberOps

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const unhandledErrorLogLevel: FiberRef<Option.Option<LogLevel.LogLevel>> = core.currentUnhandledErrorLogLevel

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLogAnnotations: FiberRef<HashMap.HashMap<string, Logger.AnnotationValue>> =
  core.currentLogAnnotations

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLoggers: FiberRef<HashSet.HashSet<Logger.Logger<unknown, any>>> = fiberRuntime.currentLoggers

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLogLevel: FiberRef<LogLevel.LogLevel> = core.currentLogLevel

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentMinimumLogLevel: FiberRef<LogLevel.LogLevel> = fiberRuntime.currentMinimumLogLevel

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentLogSpan: FiberRef<List.List<LogSpan.LogSpan>> = core.currentLogSpan

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentRuntimeFlags: FiberRef<RuntimeFlags.RuntimeFlags> = fiberRuntime.currentRuntimeFlags

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentScheduler: FiberRef<Scheduler.Scheduler> = core.currentScheduler

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentSupervisor: FiberRef<Supervisor.Supervisor<any>> = fiberRuntime.currentSupervisor

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentMetricLabels: FiberRef<HashSet.HashSet<MetricLabel.MetricLabel>> = core.currentMetricLabels

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentTracerSpan: FiberRef<List.List<Tracer.ParentSpan>> = core.currentTracerSpan

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentTracerTimingEnabled: FiberRef<boolean> = core.currentTracerTimingEnabled

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentTracerSpanAnnotations: FiberRef<HashMap.HashMap<string, Tracer.AttributeValue>> =
  core.currentTracerSpanAnnotations

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const currentTracerSpanLinks: FiberRef<Chunk.Chunk<Tracer.SpanLink>> = core.currentTracerSpanLinks

/**
 * @since 1.0.0
 * @category fiberRefs
 */
export const interruptedCause: FiberRef<Cause.Cause<never>> = core.currentInterruptedCause
