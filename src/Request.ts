/**
 * @since 1.0.0
 */
import type * as Data from "@effect/data/Data"
import type * as Option from "@effect/data/Option"
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import * as internal from "@effect/io/internal_effect_untraced/request"
import type * as RequestCompletionMap from "@effect/io/RequestCompletionMap"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RequestTypeId: unique symbol = internal.RequestTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type RequestTypeId = typeof RequestTypeId

/**
 * A `Request<E, A>` is a request from a data source for a value of type `A`
 * that may fail with an `E`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Request<E, A> extends Request.Variance<E, A>, Data.Case {}

/**
 * @since 1.0.0
 */
export declare namespace Request {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [RequestTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Constructor<R extends Request<any, any>, T extends keyof R = never> {
    (args: Omit<R, T | keyof (Data.Case & Request.Variance<Request.Error<R>, Request.Success<R>>)>): R
  }

  /**
   * A utility type to extract the error type from a `Request`.
   *
   * @since 1.0.0
   * @category type-level
   */
  export type Error<T extends Request<any, any>> = [T] extends [Request<infer _E, infer _A>] ? _E : never

  /**
   * A utility type to extract the value type from a `Request`.
   *
   * @since 1.0.0
   * @category type-level
   */
  export type Success<T extends Request<any, any>> = [T] extends [Request<infer _E, infer _A>] ? _A : never

  /**
   * A utility type to extract the result type from a `Request`.
   *
   * @since 1.0.0
   * @category type-level
   */
  export type Result<T extends Request<any, any>> = T extends Request<infer E, infer A> ? Exit.Exit<E, A> : never

  /**
   * A utility type to extract the optional result type from a `Request`.
   *
   * @since 1.0.0
   * @category type-level
   */
  export type OptionalResult<T extends Request<any, any>> = T extends Request<infer E, infer A>
    ? Exit.Exit<E, Option.Option<A>>
    : never
}

/**
 * Returns `true` if the specified value is a `Request`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isRequest: (u: unknown) => u is Request<unknown, unknown> = internal.isRequest

/**
 * Constructs a new `Request`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const of: <R extends Request<any, any>>() => Request.Constructor<R> = internal.of

/**
 * Constructs a new `Request`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const tagged: <R extends Request<any, any> & { _tag: string }>(
  tag: R["_tag"]
) => Request.Constructor<R, "_tag"> = internal.tagged

/**
 * Complete a `Request` with the specified result.
 *
 * @since 1.0.0
 * @category request completion
 */
export const complete: {
  <A extends Request<any, any>>(
    result: Request.Result<A>
  ): (self: A) => Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>
  <A extends Request<any, any>>(
    self: A,
    result: Request.Result<A>
  ): Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>
} = internal.complete

/**
 * Complete a `Request` with the specified effectful computation, failing the
 * request with the error from the effect workflow if it fails, and completing
 * the request with the value of the effect workflow if it succeeds.
 *
 * @since 1.0.0
 * @category request completion
 */
export const completeEffect: {
  <A extends Request<any, any>, R>(
    effect: Effect.Effect<R, Request.Error<A>, Request.Success<A>>
  ): (self: A) => Effect.Effect<RequestCompletionMap.RequestCompletionMap | R, never, void>
  <A extends Request<any, any>, R>(
    self: A,
    effect: Effect.Effect<R, Request.Error<A>, Request.Success<A>>
  ): Effect.Effect<RequestCompletionMap.RequestCompletionMap | R, never, void>
} = internal.completeEffect

/**
 * Complete a `Request` with the specified error.
 *
 * @since 1.0.0
 * @category request completion
 */
export const fail: {
  <A extends Request<any, any>>(
    error: Request.Error<A>
  ): (self: A) => Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>
  <A extends Request<any, any>>(
    self: A,
    error: Request.Error<A>
  ): Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>
} = internal.fail

/**
 * Complete a `Request` with the specified value.
 *
 * @since 1.0.0
 * @category request completion
 */
export const succeed: {
  <A extends Request<any, any>>(
    value: Request.Success<A>
  ): (self: A) => Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>
  <A extends Request<any, any>>(
    self: A,
    value: Request.Success<A>
  ): Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>
} = internal.succeed
