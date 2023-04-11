import * as Context from "@effect/data/Context"
import { dual } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import type * as HashSet from "@effect/data/HashSet"
import * as MutableRef from "@effect/data/MutableRef"
import * as Option from "@effect/data/Option"
import type * as Exit from "@effect/io/Exit"
import * as core from "@effect/io/internal_effect_untraced/core"
import type * as Request from "@effect/io/Request"
import type * as CRM from "@effect/io/RequestCompletionMap"

/** @internal */
const RequestCompletionMapSymbolKey = "@effect/io/RequestCompletionMap"

/** @internal */
export const RequestCompletionMapTypeId: CRM.RequestCompletionMapTypeId = Symbol.for(
  RequestCompletionMapSymbolKey
) as CRM.RequestCompletionMapTypeId

/** @internal */
class RequestCompletionMapImpl implements CRM.RequestCompletionMap {
  readonly [RequestCompletionMapTypeId]: CRM.RequestCompletionMapTypeId = RequestCompletionMapTypeId
  constructor(
    readonly map: MutableRef.MutableRef<
      HashMap.HashMap<
        Request.Request<unknown, unknown>,
        Exit.Exit<unknown, unknown>
      >
    >
  ) {}
}

/** @internal */
export const RequestCompletionMap: Context.Tag<CRM.RequestCompletionMap, CRM.RequestCompletionMap> = Context.Tag()

/** @internal */
export const empty = (): CRM.RequestCompletionMap => new RequestCompletionMapImpl(MutableRef.make(HashMap.empty()))

/** @internal */
export const make = <E, A>(
  request: Request.Request<E, A>,
  result: Exit.Exit<E, A>
): CRM.RequestCompletionMap => new RequestCompletionMapImpl(MutableRef.make(HashMap.make([request, result])))

/** @internal */
export const combine = dual<
  (
    that: CRM.RequestCompletionMap
  ) => (
    self: CRM.RequestCompletionMap
  ) => CRM.RequestCompletionMap,
  (
    self: CRM.RequestCompletionMap,
    that: CRM.RequestCompletionMap
  ) => CRM.RequestCompletionMap
>(2, (self, that) => {
  const selfMap = MutableRef.get(self.map)
  const thatMap = MutableRef.get(that.map)
  return new RequestCompletionMapImpl(MutableRef.make(HashMap.union(selfMap, thatMap)))
})

/** @internal */
export const get = dual<
  <A extends Request.Request<any, any>>(
    request: A
  ) => (
    self: CRM.RequestCompletionMap
  ) => Option.Option<Request.Request.Result<A>>,
  <A extends Request.Request<any, any>>(
    self: CRM.RequestCompletionMap,
    request: A
  ) => Option.Option<Request.Request.Result<A>>
>(2, <A extends Request.Request<any, any>>(
  self: CRM.RequestCompletionMap,
  request: A
) => HashMap.get(MutableRef.get(self.map), request) as any)

/** @internal */
export const getOrThrow = dual<
  <A extends Request.Request<any, any>>(
    request: A
  ) => (
    self: CRM.RequestCompletionMap
  ) => Request.Request.Result<A>,
  <A extends Request.Request<any, any>>(
    self: CRM.RequestCompletionMap,
    request: A
  ) => Request.Request.Result<A>
>(2, <A extends Request.Request<any, any>>(
  self: CRM.RequestCompletionMap,
  request: A
) => HashMap.unsafeGet(MutableRef.get(self.map), request) as any)

/** @internal */
export const has = dual<
  <A extends Request.Request<any, any>>(request: A) => (self: CRM.RequestCompletionMap) => boolean,
  <A extends Request.Request<any, any>>(self: CRM.RequestCompletionMap, request: A) => boolean
>(2, (self, request) => HashMap.has(MutableRef.get(self.map), request))

/** @internal */
export const requests = (
  self: CRM.RequestCompletionMap
): HashSet.HashSet<Request.Request<unknown, unknown>> => HashMap.keySet(MutableRef.get(self.map))

/** @internal */
export const set = dual<
  <A extends Request.Request<any, any>>(
    request: A,
    result: Request.Request.Result<A>
  ) => (self: CRM.RequestCompletionMap) => void,
  <A extends Request.Request<any, any>>(
    self: CRM.RequestCompletionMap,
    request: A,
    result: Request.Request.Result<A>
  ) => void
>(
  3,
  (self, request, result) => {
    const map = MutableRef.get(self.map)
    MutableRef.set(
      self.map,
      HashMap.set(
        map,
        request as Request.Request<unknown, unknown>,
        result as Exit.Exit<unknown, unknown>
      )
    )
  }
)

/** @internal */
export const setOption = dual<
  <A extends Request.Request<any, any>>(
    request: A,
    result: Request.Request.OptionalResult<A>
  ) => (self: CRM.RequestCompletionMap) => void,
  <A extends Request.Request<any, any>>(
    self: CRM.RequestCompletionMap,
    request: A,
    result: Request.Request.OptionalResult<A>
  ) => void
>(3, (self, request, result) => {
  core.exitMatch(
    result,
    (e) => set(self, request, core.exitFailCause(e) as any),
    Option.match(
      () => self,
      (a) => set(self, request, core.exitSucceed(a) as any)
    )
  )
})
