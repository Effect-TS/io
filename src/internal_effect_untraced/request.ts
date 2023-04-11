import * as Data from "@effect/data/Data"
import * as Debug from "@effect/data/Debug"
import * as Either from "@effect/data/Either"
import * as Effect from "@effect/io/Effect"
import * as completedRequestMap from "@effect/io/internal_effect_untraced/completedRequestMap"
import type * as Request from "@effect/io/Request"
import type * as RequestCompletionMap from "@effect/io/RequestCompletionMap"

/** @internal */
const RequestSymbolKey = "@effect/io/Request"

/** @internal */
export const RequestTypeId: Request.RequestTypeId = Symbol.for(
  RequestSymbolKey
) as Request.RequestTypeId

/** @internal */
const requestVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export const isRequest = (u: unknown): u is Request.Request<unknown, unknown> =>
  typeof u === "object" && u != null && RequestTypeId in u

/** @internal */
export const of = <R extends Request.Request<any, any>>(): Request.Request.Constructor<R> =>
  (args) =>
    // @ts-expect-error
    Data.struct({
      [RequestTypeId]: requestVariance,
      ...args
    })

/** @internal */
export const tagged = <R extends Request.Request<any, any> & { _tag: string }>(
  tag: R["_tag"]
): Request.Request.Constructor<R, "_tag"> =>
  (args) =>
    // @ts-expect-error
    Data.struct({
      [RequestTypeId]: requestVariance,
      _tag: tag,
      ...args
    })

/** @internal */
export const complete = Debug.dualWithTrace<
  <A extends Request.Request<any, any>>(
    result: Request.Request.Result<A>
  ) => (self: A) => Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>,
  <A extends Request.Request<any, any>>(
    self: A,
    result: Request.Request.Result<A>
  ) => Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>
>(2, (trace) =>
  (self, result) =>
    Effect.map(
      completedRequestMap.RequestCompletionMap,
      (map) => completedRequestMap.set(map, self, result)
    ).traced(trace))

/** @internal */
export const completeEffect = Debug.dualWithTrace<
  <A extends Request.Request<any, any>, R>(
    effect: Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
  ) => (self: A) => Effect.Effect<R | RequestCompletionMap.RequestCompletionMap, never, void>,
  <A extends Request.Request<any, any>, R>(
    self: A,
    effect: Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
  ) => Effect.Effect<R | RequestCompletionMap.RequestCompletionMap, never, void>
>(2, (trace) =>
  (self, effect) =>
    Effect.matchEffect(
      effect,
      // @ts-expect-error
      (error) => complete(self, Either.left(error)),
      // @ts-expect-error
      (value) => complete(self, Either.right(value))
    ).traced(trace))

/** @internal */
export const fail = Debug.dualWithTrace<
  <A extends Request.Request<any, any>>(
    error: Request.Request.Error<A>
  ) => (self: A) => Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>,
  <A extends Request.Request<any, any>>(
    self: A,
    error: Request.Request.Error<A>
  ) => Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>
>(2, (trace) =>
  (self, error) =>
    // @ts-expect-error
    complete(self, Either.left(error)).traced(trace))

/** @internal */
export const succeed = Debug.dualWithTrace<
  <A extends Request.Request<any, any>>(
    value: Request.Request.Success<A>
  ) => (self: A) => Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>,
  <A extends Request.Request<any, any>>(
    self: A,
    value: Request.Request.Success<A>
  ) => Effect.Effect<RequestCompletionMap.RequestCompletionMap, never, void>
>(2, (trace) =>
  (self, value) =>
    // @ts-expect-error
    complete(self, Either.right(value)).traced(trace))
