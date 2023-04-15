import * as Chunk from "@effect/data/Chunk"
import type * as Context from "@effect/data/Context"
import * as Debug from "@effect/data/Debug"
import * as Either from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import type * as Option from "@effect/data/Option"
import * as RA from "@effect/data/ReadonlyArray"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
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
          Effect.provideService(completedRequestMap.RequestCompletionMap, map)(restore(runAll)(requests)),
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
    new core.RequestResolverImpl(
      Effect.reduce(completedRequestMap.empty(), (outerMap, requests) => {
        const newRequests = RA.filter(requests, (request) => !completedRequestMap.has(outerMap, request))
        if (newRequests.length === 0) {
          return Effect.succeed(outerMap)
        }
        const innerMap = completedRequestMap.empty()
        return pipe(
          restore(run)(newRequests),
          Effect.provideService(completedRequestMap.RequestCompletionMap, innerMap),
          Effect.map(() => completedRequestMap.combine(outerMap, innerMap))
        )
      })
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
  (
    n: number
  ) => <R, A>(
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
                Chunk.empty<Chunk.Chunk<A>>(),
                (acc, chunk) => Chunk.concat(acc, Chunk.chunksOf(Chunk.unsafeFromArray(chunk), n))
              ),
              (chunk) => Array.from(chunk)
            ))
          )
      },
      Chunk.make("BatchN", self, n)
    ))

/** @internal */
export const contramap = Debug.untracedDual<
  <A extends Request.Request<any, any>, B extends Request.Request<any, any>>(
    f: (_: B) => A
  ) => <R>(self: RequestResolver.RequestResolver<R, A>) => RequestResolver.RequestResolver<R, B>,
  <R, A extends Request.Request<any, any>, B extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<R, A>,
    f: (_: B) => A
  ) => RequestResolver.RequestResolver<R, B>
>(
  2,
  (restore) =>
    (self, f) =>
      new core.RequestResolverImpl(
        (requests) => restore(self.runAll)(pipe(requests, RA.map(RA.map(restore(f))))),
        Chunk.make("Contramap", self, f)
      )
)

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
export const contramapEffect = Debug.untracedDual<
  <A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>>(
    f: (_: B) => Effect.Effect<R2, never, A>
  ) => <R>(
    self: RequestResolver.RequestResolver<R, A>
  ) => RequestResolver.RequestResolver<R | R2, B>,
  <R, A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<R, A>,
    f: (_: B) => Effect.Effect<R2, never, A>
  ) => RequestResolver.RequestResolver<R | R2, B>
>(2, (restore) =>
  (self, f) =>
    new core.RequestResolverImpl(
      (requests) =>
        Effect.flatMap(
          Effect.forEach(requests, Effect.forEachPar(restore(f))),
          (requests) => restore(self.runAll)(requests)
        ),
      Chunk.make("ContramapEffect", self, f)
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
    f: (_: C) => Either.Either<A, B>
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
    f: (_: C) => Either.Either<A, B>
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
      f: (_: C) => Either.Either<A, B>
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
            // @ts-expect-error
            Either.right(restore(f)(request))
          )
        ))
    ).identified("FromFunction", f)
)

/** @internal */
export const fromFunctionBatched = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    f: (chunk: Array<A>) => Array<Request.Request.Success<A>>
  ): RequestResolver.RequestResolver<never, A> =>
    fromFunctionBatchedEffect((as: Array<A>) => Effect.succeed(restore(f)(as)))
      .identified("FromFunctionBatched", f)
)

/** @internal */
export const fromFunctionBatchedEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    f: (chunk: Array<A>) => Effect.Effect<R, Request.Request.Error<A>, Array<Request.Request.Success<A>>>
  ): RequestResolver.RequestResolver<R, A> =>
    makeBatched((requests: Array<A>) =>
      Effect.flatMap(completedRequestMap.RequestCompletionMap, (map) =>
        pipe(
          Effect.match(
            restore(f)(requests),
            (e): Array<readonly [A, Either.Either<Request.Request.Error<A>, Request.Request.Success<A>>]> =>
              pipe(requests, RA.map((k) => [k, Either.left(e)] as const)),
            (bs): Array<readonly [A, Either.Either<Request.Request.Error<A>, Request.Request.Success<A>>]> =>
              pipe(requests, RA.zip(pipe(bs, RA.map(Either.right))))
          ),
          Effect.map((x) =>
            x.forEach(
              ([k, v]) => completedRequestMap.set(map, k, v as any)
            )
          )
        ))
    ).identified("FromFunctionBatchedEffect", f)
)

/** @internal */
export const fromFunctionBatchedOption = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    f: (chunk: Array<A>) => Array<Option.Option<Request.Request.Success<A>>>
  ): RequestResolver.RequestResolver<never, A> =>
    fromFunctionBatchedOptionEffect((as: Array<A>) => Effect.succeed(restore(f)(as)))
      .identified("FromFunctionBatchedOption", f)
)

/** @internal */
export const fromFunctionBatchedOptionEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    f: (
      chunk: Array<A>
    ) => Effect.Effect<R, Request.Request.Error<A>, Array<Option.Option<Request.Request.Success<A>>>>
  ): RequestResolver.RequestResolver<R, A> =>
    makeBatched(
      (requests: Array<A>) =>
        Effect.flatMap(completedRequestMap.RequestCompletionMap, (map) =>
          Effect.map(
            Effect.match(
              restore(f)(requests),
              (e): Array<
                readonly [
                  A,
                  Either.Either<Request.Request.Error<A>, Option.Option<Request.Request.Success<A>>>
                ]
              > => pipe(requests, RA.map((k) => [k, Either.left(e)] as const)),
              (bs): Array<
                readonly [
                  A,
                  Either.Either<Request.Request.Error<A>, Option.Option<Request.Request.Success<A>>>
                ]
              > => pipe(requests, RA.zip(pipe(bs, RA.map(Either.right))))
            ),
            (x) => x.forEach(([k, v]) => completedRequestMap.setOption(map, k, v as any))
          ))
    ).identified("FromFunctionBatchedOptionEffect", f)
)

/** @internal */
export const fromFunctionBatchedWith = Debug.untracedMethod((restore) =>
  <A extends Request.Request<any, any>>(
    f: (chunk: Array<A>) => Array<Request.Request.Success<A>>,
    g: (value: Request.Request.Success<A>) => Request.Request<never, Request.Request.Success<A>>
  ): RequestResolver.RequestResolver<never, A> =>
    fromFunctionBatchedWithEffect(
      (as) => Effect.succeed(restore(f)(as)),
      restore(g)
    ).identified("FromFunctionBatchedWith", f, g)
)

/** @internal */
export const fromFunctionBatchedWithEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    f: (chunk: Array<A>) => Effect.Effect<R, Request.Request.Error<A>, Array<Request.Request.Success<A>>>,
    g: (b: Request.Request.Success<A>) => Request.Request<Request.Request.Error<A>, Request.Request.Success<A>>
  ): RequestResolver.RequestResolver<R, A> =>
    makeBatched((requests: Array<A>) =>
      Effect.flatMap(completedRequestMap.RequestCompletionMap, (map) =>
        Effect.map(
          Effect.matchCause(
            restore(f)(requests),
            (e): Array<
              readonly [
                Request.Request<Request.Request.Error<A>, Request.Request.Success<A>>,
                Exit.Exit<Request.Request.Error<A>, Request.Request.Success<A>>
              ]
            > => pipe(requests, RA.map((k) => [k, core.exitFailCause(e)] as const)),
            (bs): Array<
              readonly [
                Request.Request<Request.Request.Error<A>, Request.Request.Success<A>>,
                Exit.Exit<Request.Request.Error<A>, Request.Request.Success<A>>
              ]
            > => pipe(bs, RA.map((b) => [restore(g)(b), core.exitSucceed(b)] as const))
          ),
          (x) => x.forEach(([k, v]) => completedRequestMap.set(map, k, v))
        ))
    ).identified("FromFunctionBatchedWithEffect", f, g)
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
export const fromFunctionOption = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    f: (a: A) => Option.Option<Request.Request.Success<A>>
  ): RequestResolver.RequestResolver<never, A> =>
    fromFunctionOptionEffect((a: A) => Effect.succeed(restore(f)(a)))
      .identified("FromFunctionOption", f)
)

/** @internal */
export const fromFunctionOptionEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Option.Option<Request.Request.Success<A>>>
  ): RequestResolver.RequestResolver<R, A> =>
    makeBatched((requests: Array<A>) =>
      Effect.flatMap(completedRequestMap.RequestCompletionMap, (map) =>
        Effect.map(
          Effect.forEachPar(
            requests,
            (a) => Effect.map(Effect.either(restore(f)(a)), (e) => [a, e] as const)
          ),
          (x) => x.forEach(([k, v]) => completedRequestMap.setOption(map, k, v as any))
        ))
    ).identified("FromFunctionOptionEffect", f)
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
          restore(self.runAll)(requests as Array<Array<A>>),
          restore(that.runAll)(requests as Array<Array<A2>>)
        )
      ).identified("Race", self, that)
)
