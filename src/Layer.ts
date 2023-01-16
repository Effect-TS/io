/**
 * A `Layer<RIn, E, ROut>` describes how to build one or more services in your
 * application. Services can be injected into effects via
 * `Effect.provideService`. Effects can require services via `Effect.service`.
 *
 * Layer can be thought of as recipes for producing bundles of services, given
 * their dependencies (other services).
 *
 * Construction of services can be effectful and utilize resources that must be
 * acquired and safely released when the services are done being utilized.
 *
 * By default layers are shared, meaning that if the same layer is used twice
 * the layer will only be allocated a single time.
 *
 * Because of their excellent composition properties, layers are the idiomatic
 * way in Effect-TS to create services that depend on other services.
 *
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/layer"
import type * as Runtime from "@effect/io/Runtime"
import type * as Schedule from "@effect/io/Schedule"
import type * as Scope from "@effect/io/Scope"
import type * as Context from "@fp-ts/data/Context"
import type { LazyArg } from "@fp-ts/data/Function"

/**
 * @since 1.0.0
 * @category symbols
 */
export const LayerTypeId: unique symbol = internal.LayerTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type LayerTypeId = typeof LayerTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Layer<RIn, E, ROut> extends Layer.Variance<RIn, E, ROut> {}

/**
 * @since 1.0.0
 */
export declare namespace Layer {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<RIn, E, ROut> {
    readonly [LayerTypeId]: {
      readonly _RIn: (_: never) => RIn
      readonly _E: (_: never) => E
      readonly _ROut: (_: ROut) => void
    }
  }
  /**
   * @since 1.0.0
   * @category type-level
   */
  export type Context<T extends Layer<any, any, any>> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _R : never
  /**
   * @since 1.0.0
   * @category type-level
   */
  export type Error<T extends Layer<any, any, any>> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _E : never
  /**
   * @since 1.0.0
   * @category type-level
   */
  export type Success<T extends Layer<any, any, any>> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _A : never
}

/**
 * Returns `true` if the specified value is a `Layer`, `false` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isLayer: (u: unknown) => u is Layer<unknown, unknown, unknown> = internal.isLayer

/**
 * Returns `true` if the specified `Layer` is a fresh version that will not be
 * shared, `false` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isFresh: <R, E, A>(self: Layer<R, E, A>) => boolean = internal.isFresh

/**
 * Replaces the layer's output with `void` and includes the layer only for its
 * side-effects.
 *
 * @since 1.0.0
 * @category mapping
 */
export const discard: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn, E, never> = internal.discard

/**
 * Builds a layer into a scoped value.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const build: <RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
) => Effect.Effect<Scope.Scope | RIn, E, Context.Context<ROut>> = internal.build

/**
 * Builds a layer into an `Effect` value. Any resources associated with this
 * layer will be released when the specified scope is closed unless their scope
 * has been extended. This allows building layers where the lifetime of some of
 * the services output by the layer exceed the lifetime of the effect the
 * layer is provided to.
 *
 * @macro traced
 * @since 1.0.0
 * @category destructors
 */
export const buildWithScope: (
  scope: Scope.Scope
) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect.Effect<RIn, E, Context.Context<ROut>> = internal.buildWithScope

/**
 * Recovers from all errors.
 *
 * @since 1.0.0
 * @category error handling
 */
export const catchAll: <E, R2, E2, A2>(
  onError: (error: E) => Layer<R2, E2, A2>
) => <R, A>(self: Layer<R, E, A>) => Layer<R2 | R, E2, A & A2> = internal.catchAll

/**
 * Recovers from all errors.
 *
 * @since 1.0.0
 * @category error handling
 */
export const catchAllCause: <E, R2, E2, A2>(
  onError: (cause: Cause.Cause<E>) => Layer<R2, E2, A2>
) => <R, A>(self: Layer<R, E, A>) => Layer<R2 | R, E2, A & A2> = internal.catchAllCause

/**
 * Constructs a layer that dies with the specified defect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Layer<never, never, unknown> = internal.die

/**
 * Constructs a layer that dies with the specified defect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const dieSync: (evaluate: LazyArg<unknown>) => Layer<never, never, unknown> = internal.dieSync

/**
 * Constructs a `Layer` that passes along the specified environment as an
 * output.
 *
 * @since 1.0.0
 * @category constructors
 */
export const environment: <R>() => Layer<R, never, R> = internal.environment

/**
 * Extends the scope of this layer, returning a new layer that when provided
 * to an effect will not immediately release its associated resources when
 * that effect completes execution but instead when the scope the resulting
 * effect depends on is closed.
 *
 * @since 1.0.0
 * @category mutations
 */
export const extendScope: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<Scope.Scope | RIn, E, ROut> =
  internal.extendScope

/**
 * Constructs a layer that fails with the specified error.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Layer<never, E, unknown> = internal.fail

/**
 * Constructs a layer that fails with the specified error.
 *
 * @since 1.0.0
 * @category constructors
 */
export const failSync: <E>(evaluate: LazyArg<E>) => Layer<never, E, unknown> = internal.failSync

/**
 * Constructs a layer that fails with the specified cause.
 *
 * @since 1.0.0
 * @category constructors
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Layer<never, E, unknown> = internal.failCause

/**
 * Constructs a layer that fails with the specified cause.
 *
 * @since 1.0.0
 * @category constructors
 */
export const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Layer<never, E, unknown> = internal.failCauseSync

/**
 * Constructs a layer dynamically based on the output of this layer.
 *
 * @since 1.0.0
 * @category sequencing
 */
export const flatMap: <A, R2, E2, A2>(
  f: (context: Context.Context<A>) => Layer<R2, E2, A2>
) => <R, E>(self: Layer<R, E, A>) => Layer<R2 | R, E2 | E, A2> = internal.flatMap

/**
 * Flattens layers nested in the environment of an effect.
 *
 * @since 1.0.0
 * @category sequencing
 */
export const flatten: <R2, E2, A>(
  tag: Context.Tag<Layer<R2, E2, A>>
) => <R, E>(self: Layer<R, E, Layer<R2, E2, A>>) => Layer<R2 | R, E2 | E, A> = internal.flatten

/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 *
 * @since 1.0.0
 * @category folding
 */
export const matchLayer: <E, R2, E2, A2, A, R3, E3, A3>(
  onFailure: (error: E) => Layer<R2, E2, A2>,
  onSuccess: (context: Context.Context<A>) => Layer<R3, E3, A3>
) => <R>(self: Layer<R, E, A>) => Layer<R2 | R3 | R, E2 | E3, A2 & A3> = internal.matchLayer

/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 *
 * @since 1.0.0
 * @category folding
 */
export const matchCauseLayer: <E, A, R2, E2, A2, R3, E3, A3>(
  onFailure: (cause: Cause.Cause<E>) => Layer<R2, E2, A2>,
  onSuccess: (context: Context.Context<A>) => Layer<R3, E3, A3>
) => <R>(self: Layer<R, E, A>) => Layer<R2 | R3 | R, E2 | E3, A2 & A3> = internal.matchCauseLayer

/**
 * Creates a fresh version of this layer that will not be shared.
 *
 * @since 1.0.0
 * @category mutations
 */
export const fresh: <R, E, A>(self: Layer<R, E, A>) => Layer<R, E, A> = internal.fresh

/**
 * Constructs a layer from the specified effect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const effect: <T>(tag: Context.Tag<T>) => <R, E>(effect: Effect.Effect<R, E, T>) => Layer<R, E, T> =
  internal.fromEffect

/**
 * Constructs a layer from the specified effect discarding it's output.
 *
 * @since 1.0.0
 * @category constructors
 */
export const effectDiscard: <R, E, _>(effect: Effect.Effect<R, E, _>) => Layer<R, E, never> = internal.fromEffectDiscard

/**
 * Constructs a layer from the specified effect, which must return one or more
 * services.
 *
 * @since 1.0.0
 * @category constructors
 */
export const effectEnvironment: <R, E, A>(effect: Effect.Effect<R, E, Context.Context<A>>) => Layer<R, E, A> =
  internal.fromEffectEnvironment

const fromFunction: <A, B>(
  tagA: Context.Tag<A>,
  tagB: Context.Tag<B>
) => (f: (a: A) => B) => Layer<A, never, B> = internal.fromFunction

export {
  /**
   * Constructs a layer from the environment using the specified function.
   *
   * @since 1.0.0
   * @category constructors
   */
  fromFunction as function
}

/**
 * Builds this layer and uses it until it is interrupted. This is useful when
 * your entire application is a layer, such as an HTTP server.
 *
 * @since 1.0.0
 * @category conversions
 */
export const launch: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect.Effect<RIn, E, never> = internal.launch

/**
 * Returns a new layer whose output is mapped by the specified function.
 *
 * @category mapping
 * @since 1.0.0
 */
export const map: <A, B>(
  f: (context: Context.Context<A>) => Context.Context<B>
) => <R, E>(self: Layer<R, E, A>) => Layer<R, E, B> = internal.map

/**
 * Returns a layer with its error channel mapped using the specified function.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapError: <E, E1>(f: (error: E) => E1) => <R, A>(self: Layer<R, E, A>) => Layer<R, E1, A> =
  internal.mapError

/**
 * Returns a scoped effect that, if evaluated, will return the lazily computed
 * result of this layer.
 *
 * @macro traced
 * @since 1.0.0
 * @category mutations
 */
export const memoize: <RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
) => Effect.Effect<Scope.Scope, never, Layer<RIn, E, ROut>> = internal.memoize

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs and outputs of both.
 *
 * @since 1.0.0
 * @category mutations
 */
export const merge: <RIn2, E2, ROut2>(
  that: Layer<RIn2, E2, ROut2>
) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E2 | E, ROut2 | ROut> = internal.merge

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the layer.
 *
 * @since 1.0.0
 * @category error handling
 */
export const orDie: <R, E, A>(self: Layer<R, E, A>) => Layer<R, never, A> = internal.orDie

/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 *
 * @since 1.0.0
 * @category error handling
 */
export const orElse: <R1, E1, A1>(
  that: LazyArg<Layer<R1, E1, A1>>
) => <R, E, A>(self: Layer<R, E, A>) => Layer<R1 | R, E1 | E, A & A1> = internal.orElse

/**
 * Returns a new layer that produces the outputs of this layer but also
 * passes through the inputs.
 *
 * @since 1.0.0
 * @category mutations
 */
export const passthrough: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn, E, RIn | ROut> = internal.passthrough

/**
 * Projects out part of one of the services output by this layer using the
 * specified function.
 *
 * @since 1.0.0
 * @category mutations
 */
export const project: <A, B>(
  tagA: Context.Tag<A>,
  tagB: Context.Tag<B>
) => (f: (a: A) => B) => <RIn, E, ROut>(self: Layer<RIn, E, A | ROut>) => Layer<RIn, E, B> = internal.project

/**
 * Feeds the output services of this builder into the input of the specified
 * builder, resulting in a new builder with the inputs of this builder as
 * well as any leftover inputs, and the outputs of the specified builder.
 *
 * @since 1.0.0
 * @category mutations
 */
export const provideTo: <RIn2, E2, ROut2>(
  that: Layer<RIn2, E2, ROut2>
) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut2> = internal.provideTo

/**
 * Feeds the output services of this layer into the input of the specified
 * layer, resulting in a new layer with the inputs of this layer, and the
 * outputs of both layers.
 *
 * @since 1.0.0
 * @category mutations
 */
export const provideToAndMerge: <RIn2, E2, ROut2>(
  that: Layer<RIn2, E2, ROut2>
) => <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut2 | ROut> =
  internal.provideToAndMerge

/**
 * Retries constructing this layer according to the specified schedule.
 *
 * @since 1.0.0
 * @category retrying
 */
export const retry: <RIn1, E, X>(
  schedule: Schedule.Schedule<RIn1, E, X>
) => <RIn, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn1 | RIn, E, ROut> = internal.retry

/**
 * A layer that constructs a scope and closes it when the workflow the layer
 * is provided to completes execution, whether by success, failure, or
 * interruption. This can be used to close a scope when providing a layer to a
 * workflow.
 *
 * @since 1.0.0
 * @category constructors
 */
export const scope: () => Layer<never, never, Scope.CloseableScope> = internal.scope

/**
 * Constructs a layer from the specified scoped effect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const scoped: <T>(
  tag: Context.Tag<T>
) => <R, E, T1 extends T>(effect: Effect.Effect<R, E, T1>) => Layer<Exclude<R, Scope.Scope>, E, T> = internal.scoped

/**
 * Constructs a layer from the specified scoped effect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const scopedDiscard: <R, E, T>(effect: Effect.Effect<R, E, T>) => Layer<Exclude<R, Scope.Scope>, E, never> =
  internal.scopedDiscard

/**
 * Constructs a layer from the specified scoped effect, which must return one
 * or more services.
 *
 * @since 1.0.0
 * @category constructors
 */
export const scopedEnvironment: <R, E, A>(
  effect: Effect.Effect<R, E, Context.Context<A>>
) => Layer<Exclude<R, Scope.Scope>, E, A> = internal.scopedEnvironment

/**
 * Constructs a layer that accesses and returns the specified service from the
 * environment.
 *
 * @since 1.0.0
 * @category constructors
 */
export const service: <T>(tag: Context.Tag<T>) => Layer<T, never, T> = internal.service

/**
 * Constructs a layer from the specified value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeed: <T>(tag: Context.Tag<T>) => (resource: T) => Layer<never, never, T> = internal.succeed

/**
 * Constructs a layer from the specified value, which must return one or more
 * services.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeedEnvironment: <A>(environment: Context.Context<A>) => Layer<never, never, A> =
  internal.succeedEnvironment

/**
 * Lazily constructs a layer. This is useful to avoid infinite recursion when
 * creating layers that refer to themselves.
 *
 * @since 1.0.0
 * @category constructors
 */
export const suspend: <RIn, E, ROut>(evaluate: LazyArg<Layer<RIn, E, ROut>>) => Layer<RIn, E, ROut> = internal.suspend

/**
 * Lazily constructs a layer from the specified value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const sync: <T>(tag: Context.Tag<T>) => (evaluate: LazyArg<T>) => Layer<never, never, T> = internal.sync

/**
 * Lazily constructs a layer from the specified value, which must return one or more
 * services.
 *
 * @since 1.0.0
 * @category constructors
 */
export const syncEnvironment: <A>(evaluate: LazyArg<Context.Context<A>>) => Layer<never, never, A> =
  internal.syncEnvironment

/**
 * Performs the specified effect if this layer succeeds.
 *
 * @since 1.0.0
 * @category sequencing
 */
export const tap: <ROut, RIn2, E2, X>(
  f: (context: Context.Context<ROut>) => Effect.Effect<RIn2, E2, X>
) => <RIn, E>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E2 | E, ROut> = internal.tap

/**
 * Performs the specified effect if this layer fails.
 *
 * @since 1.0.0
 * @category sequencing
 */
export const tapError: <E, RIn2, E2, X>(
  f: (e: E) => Effect.Effect<RIn2, E2, X>
) => <RIn, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E | E2, ROut> = internal.tapError

/**
 * Performs the specified effect if this layer fails.
 *
 * @since 1.0.0
 * @category sequencing
 */
export const tapErrorCause: <E, RIn2, E2, X>(
  f: (cause: Cause.Cause<E>) => Effect.Effect<RIn2, E2, X>
) => <RIn, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E | E2, ROut> = internal.tapErrorCause

/**
 * Converts a layer that requires no services into a scoped runtime, which can
 * be used to execute effects.
 *
 * @since 1.0.0
 * @category conversions
 */
export const toRuntime: <RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
) => Effect.Effect<Scope.Scope | RIn, E, Runtime.Runtime<ROut>> = internal.toRuntime

/**
 * Combines this layer the specified layer, producing a new layer that has the
 * inputs of both, and the outputs of both combined using the specified
 * function.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipWithPar: <R1, E1, A1, A, A2>(
  that: Layer<R1, E1, A1>,
  f: (a: Context.Context<A>, b: Context.Context<A1>) => Context.Context<A2>
) => <R, E>(self: Layer<R, E, A>) => Layer<R1 | R, E1 | E, A2> = internal.zipWithPar
