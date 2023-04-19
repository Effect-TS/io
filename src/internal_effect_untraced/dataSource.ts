import * as Chunk from "@effect/data/Chunk"
import type * as Context from "@effect/data/Context"
import * as Debug from "@effect/data/Debug"
import type * as Either from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as RA from "@effect/data/ReadonlyArray"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal_effect_untraced/core"
import { forEachWithIndex } from "@effect/io/internal_effect_untraced/effect"
import { complete } from "@effect/io/internal_effect_untraced/request"
import type * as Request from "@effect/io/Request"
import type * as RequestResolver from "@effect/io/RequestResolver"

/** @internal */
export const make = Debug.untracedMethod((restore) =>
  <R, A>(
    runAll: (requests: Array<Array<A>>) => Effect.Effect<R, never, void>
  ): RequestResolver.RequestResolver<A, R> =>
    new core.RequestResolverImpl((requests) => restore(runAll)(requests.map((_) => _.map((_) => _.request))))
)

/** @internal */
export const makeWithEntry = Debug.untracedMethod((restore) =>
  <R, A>(
    runAll: (requests: Array<Array<Request.Entry<A>>>) => Effect.Effect<R, never, void>
  ): RequestResolver.RequestResolver<A, R> => new core.RequestResolverImpl((requests) => restore(runAll)(requests))
)

/** @internal */
export const makeBatched = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    run: (requests: Array<A>) => Effect.Effect<R, never, void>
  ): RequestResolver.RequestResolver<A, R> =>
    new core.RequestResolverImpl<R, A>(
      (requests) =>
        Effect.forEachDiscard(requests, (block) =>
          restore(run)(
            block
              .filter((_) => !_.state.completed)
              .map((_) => _.request)
          ))
    )
)

/** @internal */
export const around = Debug.untracedDual<
  <R2, A2, R3, _>(
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ) => <R, A>(
    self: RequestResolver.RequestResolver<A, R>
  ) => RequestResolver.RequestResolver<A, R | R2 | R3>,
  <R, A, R2, A2, R3, _>(
    self: RequestResolver.RequestResolver<A, R>,
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ) => RequestResolver.RequestResolver<A, R | R2 | R3>
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
    self: RequestResolver.RequestResolver<A, R>
  ) => RequestResolver.RequestResolver<A, R>,
  <R, A>(
    self: RequestResolver.RequestResolver<A, R>,
    n: number
  ) => RequestResolver.RequestResolver<A, R>
>(2, (restore) =>
  <R, A>(
    self: RequestResolver.RequestResolver<A, R>,
    n: number
  ): RequestResolver.RequestResolver<A, R> =>
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
    self: RequestResolver.RequestResolver<A, R>
  ) => RequestResolver.RequestResolver<A, R0>,
  <R, A extends Request.Request<any, any>, R0>(
    self: RequestResolver.RequestResolver<A, R>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => RequestResolver.RequestResolver<A, R0>
>(2, (restore) =>
  <R, A extends Request.Request<any, any>, R0>(
    self: RequestResolver.RequestResolver<A, R>,
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
    that: RequestResolver.RequestResolver<B, R2>,
    f: (_: Request.Entry<C>) => Either.Either<Request.Entry<A>, Request.Entry<B>>
  ) => <R>(
    self: RequestResolver.RequestResolver<A, R>
  ) => RequestResolver.RequestResolver<C, R | R2>,
  <
    R,
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    self: RequestResolver.RequestResolver<A, R>,
    that: RequestResolver.RequestResolver<B, R2>,
    f: (_: Request.Entry<C>) => Either.Either<Request.Entry<A>, Request.Entry<B>>
  ) => RequestResolver.RequestResolver<C, R | R2>
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
      self: RequestResolver.RequestResolver<A, R>,
      that: RequestResolver.RequestResolver<B, R2>,
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
                () => void 0
              )
            })
          ),
        Chunk.make("EitherWith", self, that, f)
      )
)

/** @internal */
export const fromFunction = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    f: (request: A) => Request.Request.Success<A>
  ): RequestResolver.RequestResolver<A> =>
    makeBatched((requests: Array<A>) =>
      Effect.forEachDiscard(
        requests,
        (request) => complete(request, core.exitSucceed(restore(f)(request)) as any)
      )
    ).identified("FromFunction", f)
)

/** @internal */
export const fromFunctionBatched = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    f: (chunk: Array<A>) => Array<Request.Request.Success<A>>
  ): RequestResolver.RequestResolver<A> =>
    makeBatched((as: Array<A>) =>
      forEachWithIndex(restore(f)(as), (res, i) => complete(as[i], core.exitSucceed(res) as any))
    )
      .identified("FromFunctionBatched", f)
)

/** @internal */
export const fromFunctionEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
  ): RequestResolver.RequestResolver<A, R> =>
    makeBatched((requests: Array<A>) =>
      Effect.forEachParDiscard(
        requests,
        (a) => Effect.flatMap(Effect.exit(restore(f)(a)), (e) => complete(a, e as any))
      )
    ).identified("FromFunctionEffect", f)
)

/** @internal */
export const never = Debug.untracedMethod(() =>
  (_: void): RequestResolver.RequestResolver<never> =>
    make(() => Effect.never())
      .identified("Never")
)

/** @internal */
export const provideContext = Debug.untracedDual<
  <R>(
    context: Context.Context<R>
  ) => <A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, R>
  ) => RequestResolver.RequestResolver<A>,
  <R, A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, R>,
    context: Context.Context<R>
  ) => RequestResolver.RequestResolver<A>
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
    that: RequestResolver.RequestResolver<A2, R2>
  ) => <R, A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, R>
  ) => RequestResolver.RequestResolver<A | A2, R | R2>,
  <R, A extends Request.Request<any, any>, R2, A2 extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, R>,
    that: RequestResolver.RequestResolver<A2, R2>
  ) => RequestResolver.RequestResolver<A | A2, R | R2>
>(
  2,
  (restore) =>
    <R, A, R2, A2>(
      self: RequestResolver.RequestResolver<A, R>,
      that: RequestResolver.RequestResolver<A2, R2>
    ) =>
      new core.RequestResolverImpl((requests) =>
        Effect.race(
          restore(self.runAll)(requests as Array<Array<Request.Entry<A>>>),
          restore(that.runAll)(requests as Array<Array<Request.Entry<A2>>>)
        )
      ).identified("Race", self, that)
)
