import * as Chunk from "@effect/data/Chunk"
import type * as Context from "@effect/data/Context"
import * as Debug from "@effect/data/Debug"
import * as Either from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as RA from "@effect/data/ReadonlyArray"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as completedRequestMap from "@effect/io/internal_effect_untraced/completedRequestMap"
import * as core from "@effect/io/internal_effect_untraced/core"
import type * as Request from "@effect/io/Request"
import type * as RequestCompletionMap from "@effect/io/RequestCompletionMap"
import type * as RequestResolver from "@effect/io/RequestResolver"

/** @internal */
export const make = Debug.untracedMethod((restore) =>
  <R, A>(
    runAll: (requests: Array<Array<A>>) => Effect.Effect<R, never, void>
  ): RequestResolver.RequestResolver<Exclude<R, RequestCompletionMap.RequestCompletionMap>, A> =>
    new core.RequestResolverImpl((requests) =>
      Effect.suspend(() => {
        const map = completedRequestMap.empty()
        return Effect.as(
          Effect.provideService(completedRequestMap.RequestCompletionMap, map)(
            restore(runAll)(requests.map((_) => _.map((_) => _.request)))
          ),
          map
        )
      })
    )
)

/** @internal */
export const makeWithEntry = Debug.untracedMethod((restore) =>
  <R, A>(
    runAll: (requests: Array<Array<Request.Entry<A>>>) => Effect.Effect<R, never, void>
  ): RequestResolver.RequestResolver<Exclude<R, RequestCompletionMap.RequestCompletionMap>, A> =>
    new core.RequestResolverImpl((requests) =>
      Effect.suspend(() => {
        const map = completedRequestMap.empty()
        return Effect.as(
          Effect.provideService(completedRequestMap.RequestCompletionMap, map)(
            restore(runAll)(requests)
          ),
          map
        )
      })
    )
)

/** @internal */
export const makeBatched = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    run: (requests: Array<A>) => Effect.Effect<R, never, void>
  ): RequestResolver.RequestResolver<Exclude<R, RequestCompletionMap.RequestCompletionMap>, A> =>
    new core.RequestResolverImpl<Exclude<R, RequestCompletionMap.RequestCompletionMap>, A>(
      (requests) =>
        Effect.suspend(() =>
          Effect.reduce(requests, completedRequestMap.empty(), (outerMap, requests) => {
            const newRequests = RA.filter(requests, (entry) => !completedRequestMap.has(outerMap, entry.request))
            if (newRequests.length === 0) {
              return Effect.succeed(outerMap)
            }
            const innerMap = completedRequestMap.empty()
            return pipe(
              restore(run)(newRequests.map((_) => _.request)),
              Effect.provideService(completedRequestMap.RequestCompletionMap, innerMap),
              Effect.map(() => completedRequestMap.combine(outerMap, innerMap))
            )
          })
        )
    )
)

/** @internal */
export const around = Debug.untracedDual<
  <R2, A2, R3, _>(
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ) => <R, A>(
    self: RequestResolver.RequestResolver<R, A>
  ) => RequestResolver.RequestResolver<R | R2 | R3, A>,
  <R, A, R2, A2, R3, _>(
    self: RequestResolver.RequestResolver<R, A>,
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ) => RequestResolver.RequestResolver<R | R2 | R3, A>
>(
  3,
  (restore) =>
    (self, before, after) =>
      new core.RequestResolverImpl(
        (requests) => Effect.acquireUseRelease(before, () => restore(self.runAll)(requests), after),
        Chunk.make("Around", self, before, after)
      )
)

/** @internal */
export const batchN = Debug.untracedDual<
  (n: number) => <R, A>(
    self: RequestResolver.RequestResolver<R, A>
  ) => RequestResolver.RequestResolver<R, A>,
  <R, A>(
    self: RequestResolver.RequestResolver<R, A>,
    n: number
  ) => RequestResolver.RequestResolver<R, A>
>(2, (restore) =>
  <R, A>(
    self: RequestResolver.RequestResolver<R, A>,
    n: number
  ): RequestResolver.RequestResolver<R, A> =>
    new core.RequestResolverImpl(
      (requests) => {
        return n < 1
          ? Effect.die(Cause.IllegalArgumentException("RequestResolver.batchN: n must be at least 1"))
          : restore(self.runAll)(
            Array.from(Chunk.map(
              Chunk.reduce(
                Chunk.unsafeFromArray(requests),
                Chunk.empty<Chunk.Chunk<Request.Entry<A>>>(),
                (acc, chunk) => Chunk.concat(acc, Chunk.chunksOf(Chunk.unsafeFromArray(chunk), n))
              ),
              (chunk) => Array.from(chunk)
            ))
          )
      },
      Chunk.make("BatchN", self, n)
    ))

/** @internal */
export const contramapContext = Debug.untracedDual<
  <R0, R>(
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => <A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<R, A>
  ) => RequestResolver.RequestResolver<R0, A>,
  <R, A extends Request.Request<any, any>, R0>(
    self: RequestResolver.RequestResolver<R, A>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => RequestResolver.RequestResolver<R0, A>
>(2, (restore) =>
  <R, A extends Request.Request<any, any>, R0>(
    self: RequestResolver.RequestResolver<R, A>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) =>
    new core.RequestResolverImpl<R0, A>(
      (requests) =>
        Effect.contramapContext(
          restore(self.runAll)(requests),
          (context: Context.Context<R0>) => restore(f)(context)
        ),
      Chunk.make("ContramapContext", self, f)
    ))

/** @internal */
export const eitherWith = Debug.untracedDual<
  <
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    that: RequestResolver.RequestResolver<R2, B>,
    f: (_: Request.Entry<C>) => Either.Either<Request.Entry<A>, Request.Entry<B>>
  ) => <R>(
    self: RequestResolver.RequestResolver<R, A>
  ) => RequestResolver.RequestResolver<R | R2, C>,
  <
    R,
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    self: RequestResolver.RequestResolver<R, A>,
    that: RequestResolver.RequestResolver<R2, B>,
    f: (_: Request.Entry<C>) => Either.Either<Request.Entry<A>, Request.Entry<B>>
  ) => RequestResolver.RequestResolver<R | R2, C>
>(
  3,
  (restore) =>
    <
      R,
      A extends Request.Request<any, any>,
      R2,
      B extends Request.Request<any, any>,
      C extends Request.Request<any, any>
    >(
      self: RequestResolver.RequestResolver<R, A>,
      that: RequestResolver.RequestResolver<R2, B>,
      f: (_: Request.Entry<C>) => Either.Either<Request.Entry<A>, Request.Entry<B>>
    ) =>
      new core.RequestResolverImpl<R | R2, C>(
        (batch) =>
          pipe(
            Effect.forEach(batch, (requests) => {
              const [as, bs] = pipe(
                requests,
                RA.partitionMap(restore(f))
              )
              return Effect.zipWithPar(
                restore(self.runAll)(Array.of(as)),
                restore(that.runAll)(Array.of(bs)),
                (self, that) => completedRequestMap.combine(self, that)
              )
            }),
            Effect.map(RA.reduce(
              completedRequestMap.empty(),
              (acc, curr) => completedRequestMap.combine(acc, curr)
            ))
          ),
        Chunk.make("EitherWith", self, that, f)
      )
)

/** @internal */
export const fromFunction = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    f: (request: A) => Request.Request.Success<A>
  ): RequestResolver.RequestResolver<never, A> =>
    makeBatched((requests: Array<A>) =>
      Effect.map(completedRequestMap.RequestCompletionMap, (map) =>
        requests.forEach((request) =>
          completedRequestMap.set(
            map,
            request,
            Either.right(restore(f)(request)) as any
          )
        ))
    ).identified("FromFunction", f)
)

/** @internal */
export const fromFunctionBatched = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    f: (chunk: Array<A>) => Array<Request.Request.Success<A>>
  ): RequestResolver.RequestResolver<never, A> =>
    makeBatched((as: Array<A>) =>
      core.flatMap(
        completedRequestMap.RequestCompletionMap,
        (map) =>
          Effect.sync(() => {
            restore(f)(as).forEach((value, index) => {
              completedRequestMap.set(map, as[index], core.exitSucceed(value) as any)
            })
          })
      )
    )
      .identified("FromFunctionBatched", f)
)

/** @internal */
export const fromFunctionEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
  ): RequestResolver.RequestResolver<R, A> =>
    makeBatched((requests: Array<A>) =>
      Effect.flatMap(completedRequestMap.RequestCompletionMap, (map) =>
        Effect.map(
          Effect.forEachPar(requests, (a) =>
            Effect.map(
              Effect.either(restore(f)(a)),
              (e) => [a, e] as const
            )),
          (x) => x.forEach(([k, v]) => completedRequestMap.set(map, k, v as any))
        ))
    ).identified("FromFunctionEffect", f)
)

/** @internal */
export const never = Debug.untracedMethod(() =>
  (_: void): RequestResolver.RequestResolver<never, never> =>
    make(() => Effect.never())
      .identified("Never")
)

/** @internal */
export const provideContext = Debug.untracedDual<
  <R>(
    context: Context.Context<R>
  ) => <A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<R, A>
  ) => RequestResolver.RequestResolver<never, A>,
  <R, A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<R, A>,
    context: Context.Context<R>
  ) => RequestResolver.RequestResolver<never, A>
>(
  2,
  () =>
    (self, context) =>
      contramapContext(self, (_: Context.Context<never>) => context)
        .identified("ProvideContext", self, context)
)

/** @internal */
export const race = Debug.untracedDual<
  <R2, A2 extends Request.Request<any, any>>(
    that: RequestResolver.RequestResolver<R2, A2>
  ) => <R, A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<R, A>
  ) => RequestResolver.RequestResolver<R | R2, A | A2>,
  <R, A extends Request.Request<any, any>, R2, A2 extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<R, A>,
    that: RequestResolver.RequestResolver<R2, A2>
  ) => RequestResolver.RequestResolver<R | R2, A | A2>
>(
  2,
  (restore) =>
    <R, A, R2, A2>(
      self: RequestResolver.RequestResolver<R, A>,
      that: RequestResolver.RequestResolver<R2, A2>
    ) =>
      new core.RequestResolverImpl((requests) =>
        Effect.race(
          restore(self.runAll)(requests as Array<Array<Request.Entry<A>>>),
          restore(that.runAll)(requests as Array<Array<Request.Entry<A2>>>)
        )
      ).identified("Race", self, that)
)
