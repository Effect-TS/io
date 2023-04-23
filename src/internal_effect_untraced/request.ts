import * as Data from "@effect/data/Data"
import * as Debug from "@effect/data/Debug"
import type * as Effect from "@effect/io/Effect"
import * as completedRequestMap from "@effect/io/internal_effect_untraced/completedRequestMap"
import * as core from "@effect/io/internal_effect_untraced/core"
import type * as Request from "@effect/io/Request"

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
  ) => (self: A) => Effect.Effect<never, never, void>,
  <A extends Request.Request<any, any>>(
    self: A,
    result: Request.Request.Result<A>
  ) => Effect.Effect<never, never, void>
>(2, (trace) =>
  (self, result) =>
    core.fiberRefGetWith(
      completedRequestMap.currentRequestMap,
      (map) =>
        core.sync(() => {
          if (map.has(self)) {
            const entry = map.get(self)!
            if (!entry.state.completed) {
              entry.state.completed = true
              core.deferredUnsafeDone(entry.result, result)
            }
          }
        })
    ).traced(trace))

/** @internal */
export const completeEffect = Debug.dualWithTrace<
  <A extends Request.Request<any, any>, R>(
    effect: Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
  ) => (self: A) => Effect.Effect<R, never, void>,
  <A extends Request.Request<any, any>, R>(
    self: A,
    effect: Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
  ) => Effect.Effect<R, never, void>
>(2, (trace) =>
  (self, effect) =>
    core.matchEffect(
      effect,
      (error) => complete(self, core.exitFail(error) as any),
      (value) => complete(self, core.exitSucceed(value) as any)
    ).traced(trace))

/** @internal */
export const fail = Debug.dualWithTrace<
  <A extends Request.Request<any, any>>(
    error: Request.Request.Error<A>
  ) => (self: A) => Effect.Effect<never, never, void>,
  <A extends Request.Request<any, any>>(
    self: A,
    error: Request.Request.Error<A>
  ) => Effect.Effect<never, never, void>
>(2, (trace) => (self, error) => complete(self, core.exitFail(error) as any).traced(trace))

/** @internal */
export const succeed = Debug.dualWithTrace<
  <A extends Request.Request<any, any>>(
    value: Request.Request.Success<A>
  ) => (self: A) => Effect.Effect<never, never, void>,
  <A extends Request.Request<any, any>>(
    self: A,
    value: Request.Request.Success<A>
  ) => Effect.Effect<never, never, void>
>(2, (trace) => (self, value) => complete(self, core.exitSucceed(value) as any).traced(trace))

/** @internal */
export class Listeners {
  count = 0
  observers: Set<(count: number) => void> = new Set()
  addObserver(f: (count: number) => void): void {
    this.observers.add(f)
  }
  removeObserver(f: (count: number) => void): void {
    this.observers.delete(f)
  }
  increment() {
    this.count++
    this.observers.forEach((f) => f(this.count))
  }
  decrement() {
    this.count--
    this.observers.forEach((f) => f(this.count))
  }
}

/**
 * @internal
 */
export const filterOutCompleted = <A extends Request.Request<any, any>>(requests: Array<A>) =>
  core.fiberRefGetWith(
    completedRequestMap.currentRequestMap,
    (map) =>
      core.succeed(
        requests.filter((request) => !(map.get(request)?.state.completed === true))
      )
  )
