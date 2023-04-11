import * as Debug from "@effect/data/Debug"
import * as Either from "@effect/data/Either"
import { constVoid, pipe } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as Option from "@effect/data/Option"
import type * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal_effect_untraced/core"
import * as _effect from "@effect/io/internal_effect_untraced/effect"
import * as Ref from "@effect/io/Ref"
import type * as Request from "@effect/io/Request"
import type * as Cache from "@effect/io/RequestCache"

/** @internal */
const CacheSymbolKey = "@effect/query/Cache"

/** @internal */
export const CacheTypeId: Cache.RequestCacheTypeId = Symbol.for(
  CacheSymbolKey
) as Cache.RequestCacheTypeId

class CacheImpl implements Cache.RequestCache {
  readonly [CacheTypeId]: Cache.RequestCacheTypeId = CacheTypeId
  constructor(readonly state: Ref.Ref<HashMap.HashMap<unknown, unknown>>) {}
  get<E, A>(request: Request.Request<E, A>): Effect.Effect<never, void, Deferred.Deferred<E, A>> {
    return Debug.bodyWithTrace((trace) =>
      pipe(
        core.map(
          Ref.get(this.state),
          (state) => HashMap.get(state, request) as Option.Option<Deferred.Deferred<E, A>>
        ),
        some,
        _effect.orElseFail(constVoid)
      ).traced(trace)
    )
  }
  lookup<E, A>(
    request: Request.Request<E, A>
  ): Effect.Effect<
    never,
    never,
    Either.Either<
      Deferred.Deferred<E, A>,
      Deferred.Deferred<E, A>
    >
  > {
    type ReturnValue = Either.Either<
      Deferred.Deferred<E, A>,
      Deferred.Deferred<E, A>
    >
    return Debug.bodyWithTrace((trace) =>
      core.fiberIdWith((id) =>
        Ref.modify(
          this.state,
          (state) =>
            Option.match(
              HashMap.get(state, request),
              () => {
                const ref = core.deferredUnsafeMake<E, A>(id)
                return [
                  Either.left(ref) as ReturnValue,
                  HashMap.set(state, request as unknown, ref as unknown)
                ]
              },
              (ref) => [Either.right(ref) as ReturnValue, state]
            )
        )
      ).traced(trace)
    )
  }
  set<E, A>(
    request: Request.Request<E, A>,
    result: Deferred.Deferred<E, A>
  ): Effect.Effect<never, never, void> {
    return Debug.bodyWithTrace((trace) =>
      Ref.update(
        this.state,
        HashMap.set(request as unknown, result as unknown)
      ).traced(trace)
    )
  }
  remove<E, A>(request: Request.Request<E, A>): Effect.Effect<never, never, void> {
    return Debug.bodyWithTrace((trace) =>
      Ref.update(
        this.state,
        HashMap.remove(request as unknown)
      ).traced(trace)
    )
  }
}

/** @internal */
export const unsafeMake = (): Cache.RequestCache => new CacheImpl(Ref.unsafeMake(HashMap.empty()))

/** @internal */
export const empty = Debug.methodWithTrace((trace) =>
  (): Effect.Effect<never, never, Cache.RequestCache> => core.sync(unsafeMake).traced(trace)
)

/** @internal */
export const get = Debug.dualWithTrace<
  <E, A>(
    request: Request.Request<E, A>
  ) => (
    self: Cache.RequestCache
  ) => Effect.Effect<never, void, Deferred.Deferred<E, A>>,
  <E, A>(
    self: Cache.RequestCache,
    request: Request.Request<E, A>
  ) => Effect.Effect<never, void, Deferred.Deferred<E, A>>
>(2, (trace) => (self, request) => self.get(request).traced(trace))

/** @internal */
export const lookup = Debug.dualWithTrace<
  <E, A>(
    request: Request.Request<E, A>
  ) => (
    self: Cache.RequestCache
  ) => Effect.Effect<
    never,
    never,
    Either.Either<
      Deferred.Deferred<E, A>,
      Deferred.Deferred<E, A>
    >
  >,
  <E, A>(
    self: Cache.RequestCache,
    request: Request.Request<E, A>
  ) => Effect.Effect<
    never,
    never,
    Either.Either<
      Deferred.Deferred<E, A>,
      Deferred.Deferred<E, A>
    >
  >
>(2, (trace) => (self, request) => self.lookup(request).traced(trace))

/** @internal */
export const set = Debug.dualWithTrace<
  <E, A>(
    request: Request.Request<E, A>,
    result: Deferred.Deferred<E, A>
  ) => (
    self: Cache.RequestCache
  ) => Effect.Effect<never, never, void>,
  <E, A>(
    self: Cache.RequestCache,
    request: Request.Request<E, A>,
    result: Deferred.Deferred<E, A>
  ) => Effect.Effect<never, never, void>
>(3, (trace) => (self, request, result) => self.set(request, result).traced(trace))

/** @internal */
export const remove = Debug.dualWithTrace<
  <E, A>(
    request: Request.Request<E, A>
  ) => (
    self: Cache.RequestCache
  ) => Effect.Effect<never, never, void>,
  <E, A>(
    self: Cache.RequestCache,
    request: Request.Request<E, A>
  ) => Effect.Effect<never, never, void>
>(2, (trace) => (self, request) => self.remove(request).traced(trace))

/* @internal */
export const some = Debug.methodWithTrace((trace) =>
  <R, E, A>(self: Effect.Effect<R, E, Option.Option<A>>): Effect.Effect<R, Option.Option<E>, A> =>
    core.matchEffect(
      self,
      (e) => core.fail(Option.some(e)),
      (option) => {
        switch (option._tag) {
          case "None": {
            return core.fail(Option.none())
          }
          case "Some": {
            return core.succeed(option.value)
          }
        }
      }
    ).traced(trace)
)
