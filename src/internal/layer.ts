import * as Cause from "@effect/io/Cause"
import * as Clock from "@effect/io/Clock"
import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import type * as FiberRefsPatch from "@effect/io/FiberRefs/Patch"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as circular from "@effect/io/internal/effect/circular"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as EffectOpCodes from "@effect/io/internal/opCodes/effect"
import * as OpCodes from "@effect/io/internal/opCodes/layer"
import * as ref from "@effect/io/internal/ref"
import * as runtime from "@effect/io/internal/runtime"
import * as synchronized from "@effect/io/internal/synchronizedRef"
import type * as Layer from "@effect/io/Layer"
import type * as Synchronized from "@effect/io/Ref/Synchronized"
import type * as Runtime from "@effect/io/Runtime"
import type * as Schedule from "@effect/io/Schedule"
import * as ScheduleDecision from "@effect/io/Schedule/Decision"
import * as Intervals from "@effect/io/Schedule/Intervals"
import * as Scope from "@effect/io/Scope"
import * as Context from "@fp-ts/data/Context"
import * as Duration from "@fp-ts/data/Duration"
import type { LazyArg } from "@fp-ts/data/Function"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
const LayerSymbolKey = "@effect/io/Layer"

/** @internal */
export const LayerTypeId: Layer.LayerTypeId = Symbol.for(
  LayerSymbolKey
) as Layer.LayerTypeId

/** @internal */
const layerVariance = {
  _RIn: (_: never) => _,
  _E: (_: never) => _,
  _ROut: (_: unknown) => _
}

/** @internal */
const proto = {
  [LayerTypeId]: layerVariance
}

/** @internal */
export type Primitive =
  | ExtendScope
  | Fold
  | Fresh
  | FromEffect
  | Scoped
  | Suspend
  | ProvideTo
  | ZipWith
  | ZipWithPar

/** @internal */
export type Op<Tag extends string, Body = {}> = Layer.Layer<unknown, unknown, unknown> & Body & {
  readonly _tag: Tag
}

/** @internal */
export interface ExtendScope extends
  Op<OpCodes.OP_EXTEND_SCOPE, {
    readonly layer: Layer.Layer<never, never, unknown>
  }>
{}

/** @internal */
export interface Fold extends
  Op<OpCodes.OP_FOLD, {
    readonly layer: Layer.Layer<never, never, unknown>
    readonly failureK: (cause: Cause.Cause<unknown>) => Layer.Layer<never, never, unknown>
    readonly successK: (context: Context.Context<unknown>) => Layer.Layer<never, never, unknown>
  }>
{}

/** @internal */
export interface Fresh extends
  Op<OpCodes.OP_FRESH, {
    readonly layer: Layer.Layer<never, never, unknown>
  }>
{}

/** @internal */
export interface FromEffect extends
  Op<OpCodes.OP_FROM_EFFECT, {
    readonly effect: Effect.Effect<unknown, unknown, Context.Context<unknown>>
  }>
{}

/** @internal */
export interface Scoped extends
  Op<OpCodes.OP_SCOPED, {
    readonly effect: Effect.Effect<unknown, unknown, Context.Context<unknown>>
  }>
{}

/** @internal */
export interface Suspend extends
  Op<OpCodes.OP_SUSPEND, {
    readonly evaluate: LazyArg<Layer.Layer<never, never, unknown>>
  }>
{}

/** @internal */
export interface ProvideTo extends
  Op<OpCodes.OP_PROVIDE_TO, {
    readonly first: Layer.Layer<never, never, unknown>
    readonly second: Layer.Layer<never, never, unknown>
  }>
{}

/** @internal */
export interface ZipWith extends
  Op<OpCodes.OP_ZIP_WITH, {
    readonly first: Layer.Layer<never, never, unknown>
    readonly second: Layer.Layer<never, never, unknown>
    readonly zipK: (
      left: Context.Context<unknown>,
      right: Context.Context<unknown>
    ) => Context.Context<unknown>
  }>
{}

/** @internal */
export interface ZipWithPar extends
  Op<OpCodes.OP_ZIP_WITH_PAR, {
    readonly first: Layer.Layer<never, never, unknown>
    readonly second: Layer.Layer<never, never, unknown>
    readonly zipK: (
      left: Context.Context<unknown>,
      right: Context.Context<unknown>
    ) => Context.Context<unknown>
  }>
{}

/** @internal */
export const isLayer = (u: unknown): u is Layer.Layer<unknown, unknown, unknown> => {
  return typeof u === "object" && u != null && LayerTypeId in u
}

/** @internal */
export const isFresh = <R, E, A>(self: Layer.Layer<R, E, A>): boolean => {
  return (self as Primitive)._tag === OpCodes.OP_FRESH
}

// -----------------------------------------------------------------------------
// MemoMap
// -----------------------------------------------------------------------------

/** @internal */
class MemoMap {
  constructor(
    readonly ref: Synchronized.Synchronized<
      Map<
        Layer.Layer<any, any, any>,
        readonly [Effect.Effect<never, any, any>, Scope.Scope.Finalizer]
      >
    >
  ) {
  }

  /**
   * Checks the memo map to see if a layer exists. If it is, immediately
   * returns it. Otherwise, obtains the layer, stores it in the memo map,
   * and adds a finalizer to the `Scope`.
   */
  getOrElseMemoize<RIn, E, ROut>(
    layer: Layer.Layer<RIn, E, ROut>,
    scope: Scope.Scope
  ): Effect.Effect<RIn, E, Context.Context<ROut>> {
    return pipe(
      synchronized.modifyEffect(this.ref, (map) => {
        const inMap = map.get(layer)
        if (inMap !== undefined) {
          const [acquire, release] = inMap
          const cached: Effect.Effect<never, E, Context.Context<ROut>> = pipe(
            acquire as Effect.Effect<never, E, readonly [FiberRefsPatch.FiberRefsPatch, Context.Context<ROut>]>,
            core.flatMap(([patch, b]) => pipe(effect.patchFiberRefs(patch), core.as(b))),
            core.onExit(core.exitMatch(
              () => core.unit(),
              () => core.scopeAddFinalizerExit(scope, release)
            ))
          )
          return core.succeed([cached, map] as const)
        }
        return pipe(
          ref.make(0),
          core.flatMap((observers) =>
            pipe(
              core.deferredMake<E, readonly [FiberRefsPatch.FiberRefsPatch, Context.Context<ROut>]>(),
              core.flatMap((deferred) =>
                pipe(
                  ref.make<Scope.Scope.Finalizer>(() => core.unit()),
                  core.map((finalizerRef) => {
                    const resource = core.uninterruptibleMask((restore) =>
                      pipe(
                        fiberRuntime.scopeMake(),
                        core.flatMap((innerScope) =>
                          pipe(
                            restore(
                              pipe(
                                layer,
                                withScope(innerScope),
                                core.flatMap((f) => effect.diffFiberRefs(f(this)))
                              )
                            ),
                            core.exit,
                            core.flatMap((exit) => {
                              switch (exit._tag) {
                                case EffectOpCodes.OP_FAILURE: {
                                  return pipe(
                                    core.deferredFailCause(deferred, exit.cause),
                                    core.zipRight(core.scopeClose(innerScope, exit)),
                                    core.zipRight(core.failCause(exit.cause))
                                  )
                                }
                                case EffectOpCodes.OP_SUCCESS: {
                                  return pipe(
                                    ref.set(finalizerRef, (exit) =>
                                      pipe(
                                        core.scopeClose(innerScope, exit),
                                        core.whenEffect(
                                          ref.modify(observers, (n) => [n === 1, n - 1] as const)
                                        ),
                                        core.asUnit
                                      )),
                                    core.zipRight(ref.update(observers, (n) => n + 1)),
                                    core.zipRight(
                                      core.scopeAddFinalizerExit(scope, (exit) =>
                                        pipe(
                                          ref.get(finalizerRef),
                                          core.flatMap((finalizer) => finalizer(exit))
                                        ))
                                    ),
                                    core.zipRight(core.deferredSucceed(deferred, exit.value)),
                                    core.as(exit.value[1])
                                  )
                                }
                              }
                            })
                          )
                        )
                      )
                    )
                    const memoized = [
                      pipe(
                        core.deferredAwait(deferred),
                        core.onExit(core.exitMatchEffect(
                          () => core.unit(),
                          () => ref.update(observers, (n) => n + 1)
                        ))
                      ),
                      (exit: Exit.Exit<unknown, unknown>) =>
                        pipe(
                          ref.get(finalizerRef),
                          core.flatMap((finalizer) => finalizer(exit))
                        )
                    ] as const
                    return [
                      resource,
                      isFresh(layer) ? map : map.set(layer, memoized)
                    ] as const
                  })
                )
              )
            )
          )
        )
      }),
      core.flatten
    )
  }
}

/** @internal */
const makeMemoMap = (): Effect.Effect<never, never, MemoMap> => {
  return pipe(
    circular.makeSynchronized<
      Map<
        Layer.Layer<any, any, any>,
        readonly [
          Effect.Effect<never, any, any>,
          Scope.Scope.Finalizer
        ]
      >
    >(new Map()),
    core.map((ref) => new MemoMap(ref))
  )
}

/** @internal */
export const build = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Effect.Effect<RIn | Scope.Scope, E, Context.Context<ROut>> => {
  const trace = getCallTrace()
  return fiberRuntime.scopeWith(
    (scope) => pipe(self, buildWithScope(scope))
  ).traced(trace)
}

/** @internal */
export const buildWithScope = (scope: Scope.Scope) => {
  return <RIn, E, ROut>(self: Layer.Layer<RIn, E, ROut>): Effect.Effect<RIn, E, Context.Context<ROut>> => {
    return pipe(
      makeMemoMap(),
      core.flatMap((memoMap) =>
        pipe(
          self,
          withScope(scope),
          core.flatMap((run) => run(memoMap))
        )
      )
    )
  }
}

/** @internal */
export const withScope = (scope: Scope.Scope) => {
  const trace = getCallTrace()
  return <RIn, E, ROut>(self: Layer.Layer<RIn, E, ROut>): Effect.Effect<
    never,
    never,
    (memoMap: MemoMap) => Effect.Effect<RIn, E, Context.Context<ROut>>
  > => {
    const op = self as Primitive
    switch (op._tag) {
      case OpCodes.OP_EXTEND_SCOPE: {
        return core.sync(() =>
          (memoMap: MemoMap) =>
            fiberRuntime.scopeWith(
              (scope) => memoMap.getOrElseMemoize(op.layer, scope)
            ) as unknown as Effect.Effect<RIn, E, Context.Context<ROut>>
        ).traced(trace)
      }
      case OpCodes.OP_FOLD: {
        return core.sync(() =>
          (memoMap: MemoMap) =>
            pipe(
              memoMap.getOrElseMemoize(op.layer, scope),
              core.matchCauseEffect(
                (cause) => memoMap.getOrElseMemoize(op.failureK(cause), scope),
                (value) => memoMap.getOrElseMemoize(op.successK(value), scope)
              )
            )
        ).traced(trace)
      }
      case OpCodes.OP_FRESH: {
        return core.sync(() => (_: MemoMap) => pipe(op.layer, buildWithScope(scope))).traced(trace)
      }
      case OpCodes.OP_FROM_EFFECT: {
        return core.sync(() => (_: MemoMap) => op.effect as Effect.Effect<RIn, E, Context.Context<ROut>>).traced(trace)
      }
      case OpCodes.OP_PROVIDE_TO: {
        return core.sync(() =>
          (memoMap: MemoMap) =>
            pipe(
              memoMap.getOrElseMemoize(op.first, scope),
              core.flatMap((env) =>
                pipe(
                  memoMap.getOrElseMemoize(op.second, scope),
                  core.provideContext(env)
                )
              )
            )
        ).traced(trace)
      }
      case OpCodes.OP_SCOPED: {
        return core.sync(() =>
          (_: MemoMap) => fiberRuntime.scopeExtend(scope)(op.effect as Effect.Effect<RIn, E, Context.Context<ROut>>)
        ).traced(trace)
      }
      case OpCodes.OP_SUSPEND: {
        return core.sync(() => (memoMap: MemoMap) => memoMap.getOrElseMemoize(op.evaluate(), scope)).traced(trace)
      }
      case OpCodes.OP_ZIP_WITH: {
        return core.sync(() =>
          (memoMap: MemoMap) =>
            pipe(
              memoMap.getOrElseMemoize(op.first, scope),
              core.zipWith(
                memoMap.getOrElseMemoize(op.second, scope),
                op.zipK
              )
            )
        ).traced(trace)
      }
      case OpCodes.OP_ZIP_WITH_PAR: {
        return core.sync(() =>
          (memoMap: MemoMap) =>
            pipe(
              memoMap.getOrElseMemoize(op.first, scope),
              circular.zipWithPar(
                memoMap.getOrElseMemoize(op.second, scope),
                op.zipK
              )
            )
        ).traced(trace)
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Layer
// -----------------------------------------------------------------------------

/** @internal */
export const discard = <RIn, E, ROut>(self: Layer.Layer<RIn, E, ROut>): Layer.Layer<RIn, E, never> =>
  pipe(self, map(() => Context.empty()))

/** @internal */
export const catchAll = <E, R2, E2, A2>(onError: (error: E) => Layer.Layer<R2, E2, A2>) => {
  return <R, A>(self: Layer.Layer<R, E, A>): Layer.Layer<R | R2, E2, A & A2> => {
    return pipe(self, matchLayer(onError, succeedContext))
  }
}

/** @internal */
export const catchAllCause = <E, R2, E2, A2>(onError: (cause: Cause.Cause<E>) => Layer.Layer<R2, E2, A2>) => {
  return <R, A>(self: Layer.Layer<R, E, A>): Layer.Layer<R | R2, E2, A & A2> =>
    pipe(self, matchCauseLayer(onError, succeedContext))
}

/** @internal */
export const die = (defect: unknown): Layer.Layer<never, never, unknown> => {
  return failCause(Cause.die(defect))
}

/** @internal */
export const dieSync = (evaluate: LazyArg<unknown>): Layer.Layer<never, never, unknown> => {
  return failCauseSync(() => Cause.die(evaluate()))
}

/** @internal */
export const context = <R>(): Layer.Layer<R, never, R> => {
  return fromEffectContext(core.context<R>())
}

/** @internal */
export const extendScope = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Layer.Layer<RIn | Scope.Scope, E, ROut> => {
  const extendScope = Object.create(proto)
  extendScope._tag = OpCodes.OP_EXTEND_SCOPE
  extendScope.layer = self
  return extendScope
}

/** @internal */
export const fail = <E>(error: E): Layer.Layer<never, E, unknown> => {
  return failCause(Cause.fail(error))
}

/** @internal */
export const failSync = <E>(evaluate: LazyArg<E>): Layer.Layer<never, E, unknown> => {
  return failCauseSync(() => Cause.fail(evaluate()))
}

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Layer.Layer<never, E, unknown> => {
  return fromEffectContext(core.failCause(cause))
}

/** @internal */
export const failCauseSync = <E>(evaluate: LazyArg<Cause.Cause<E>>): Layer.Layer<never, E, unknown> => {
  return fromEffectContext(core.failCauseSync(evaluate))
}

/** @internal */
export const flatMap = <A, R2, E2, A2>(f: (context: Context.Context<A>) => Layer.Layer<R2, E2, A2>) => {
  return <R, E>(self: Layer.Layer<R, E, A>): Layer.Layer<R | R2, E | E2, A2> => {
    return pipe(self, matchLayer(fail, f))
  }
}

/** @internal */
export const flatten = <R2, E2, A>(tag: Context.Tag<Layer.Layer<R2, E2, A>>) => {
  return <R, E>(self: Layer.Layer<R, E, Layer.Layer<R2, E2, A>>): Layer.Layer<R | R2, E | E2, A> => {
    return pipe(self, flatMap(Context.get(tag)))
  }
}

/** @internal */
export const matchCauseLayer = <E, A, R2, E2, A2, R3, E3, A3>(
  onFailure: (cause: Cause.Cause<E>) => Layer.Layer<R2, E2, A2>,
  onSuccess: (context: Context.Context<A>) => Layer.Layer<R3, E3, A3>
) => {
  return <R>(self: Layer.Layer<R, E, A>): Layer.Layer<R | R2 | R3, E2 | E3, A2 & A3> => {
    const fold = Object.create(proto)
    fold._tag = OpCodes.OP_FOLD
    fold.layer = self
    fold.failureK = onFailure
    fold.successK = onSuccess
    return fold
  }
}

/** @internal */
export const matchLayer = <E, R2, E2, A2, A, R3, E3, A3>(
  onFailure: (error: E) => Layer.Layer<R2, E2, A2>,
  onSuccess: (context: Context.Context<A>) => Layer.Layer<R3, E3, A3>
) => {
  return <R>(self: Layer.Layer<R, E, A>): Layer.Layer<R | R2 | R3, E2 | E3, A2 & A3> => {
    return pipe(
      self,
      matchCauseLayer(
        (cause) => {
          const failureOrCause = Cause.failureOrCause(cause)
          switch (failureOrCause._tag) {
            case "Left": {
              return onFailure(failureOrCause.left)
            }
            case "Right": {
              return failCause(failureOrCause.right)
            }
          }
        },
        onSuccess
      )
    )
  }
}

/** @internal */
export const fresh = <R, E, A>(self: Layer.Layer<R, E, A>): Layer.Layer<R, E, A> => {
  const fresh = Object.create(proto)
  fresh._tag = OpCodes.OP_FRESH
  fresh.layer = self
  return fresh
}

/** @internal */
export function fromEffect<T extends Context.Tag<any>, R, E>(
  tag: T,
  effect: Effect.Effect<R, E, Context.Tag.Service<T>>
): Layer.Layer<R, E, Context.Tag.Service<T>> {
  return fromEffectContext(
    pipe(
      effect,
      core.map((service) => pipe(Context.empty(), Context.add(tag)(service)))
    )
  )
}

/** @internal */
export function fromEffectDiscard<R, E, _>(effect: Effect.Effect<R, E, _>): Layer.Layer<R, E, never> {
  return fromEffectContext(
    pipe(
      effect,
      core.map(() => Context.empty())
    )
  )
}

/** @internal */
export function fromEffectContext<R, E, A>(
  effect: Effect.Effect<R, E, Context.Context<A>>
): Layer.Layer<R, E, A> {
  const fromEffect = Object.create(proto)
  fromEffect._tag = OpCodes.OP_FROM_EFFECT
  fromEffect.effect = effect
  return fromEffect
}

/** @internal */
export const fromFunction = <A extends Context.Tag<any>, B extends Context.Tag<any>>(
  tagA: A,
  tagB: B,
  f: (a: Context.Tag.Service<A>) => Context.Tag.Service<B>
): Layer.Layer<Context.Tag.Service<A>, never, Context.Tag.Service<B>> => {
  return fromEffectContext(core.serviceWith(tagA, (a) => pipe(Context.empty(), Context.add(tagB)(f(a)))))
}

/** @internal */
export const launch = <RIn, E, ROut>(self: Layer.Layer<RIn, E, ROut>): Effect.Effect<RIn, E, never> => {
  return fiberRuntime.scopedEffect(
    pipe(
      fiberRuntime.scopeWith((scope) => pipe(self, buildWithScope(scope))),
      core.zipRight(core.never())
    )
  )
}

/** @internal */
export const map = <A, B>(f: (context: Context.Context<A>) => Context.Context<B>) => {
  return <R, E>(self: Layer.Layer<R, E, A>): Layer.Layer<R, E, B> => {
    return pipe(self, flatMap((context) => succeedContext(f(context))))
  }
}

/** @internal */
export const mapError = <E, E1>(f: (error: E) => E1) => {
  return <R, A>(self: Layer.Layer<R, E, A>): Layer.Layer<R, E1, A> => {
    return pipe(self, catchAll((error) => failSync(() => f(error))))
  }
}

/** @internal */
export const memoize = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Effect.Effect<Scope.Scope, never, Layer.Layer<RIn, E, ROut>> => {
  const trace = getCallTrace()
  return fiberRuntime.scopeWith((scope) =>
    pipe(
      self,
      buildWithScope(scope),
      effect.memoize,
      core.map(fromEffectContext)
    )
  ).traced(trace)
}

/** @internal */
export const merge = <RIn2, E2, ROut2>(that: Layer.Layer<RIn2, E2, ROut2>) => {
  return <RIn, E, ROut>(self: Layer.Layer<RIn, E, ROut>): Layer.Layer<
    RIn | RIn2,
    E | E2,
    ROut | ROut2
  > => {
    return pipe(self, zipWithPar(that, (a, b) => pipe(a, Context.merge(b))))
  }
}

/** @internal */
export const orDie = <R, E, A>(self: Layer.Layer<R, E, A>): Layer.Layer<R, never, A> => {
  return pipe(self, catchAll((defect) => die(defect)))
}

/** @internal */
export const orElse = <R1, E1, A1>(that: LazyArg<Layer.Layer<R1, E1, A1>>) => {
  return <R, E, A>(self: Layer.Layer<R, E, A>): Layer.Layer<R | R1, E | E1, A & A1> => {
    return pipe(self, catchAll(() => that()))
  }
}

/** @internal */
export const passthrough = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Layer.Layer<RIn, E, RIn | ROut> => {
  return pipe(context<RIn>(), merge(self))
}

/** @internal */
export const project = <A extends Context.Tag<any>, B extends Context.Tag<any>>(
  tagA: A,
  tagB: B,
  f: (a: Context.Tag.Service<A>) => Context.Tag.Service<B>
) => {
  return <RIn, E>(
    self: Layer.Layer<RIn, E, Context.Tag.Service<A>>
  ): Layer.Layer<RIn, E, Context.Tag.Service<B>> => {
    return pipe(
      self,
      map((context) =>
        pipe(
          Context.empty(),
          Context.add(tagB)(f(pipe(context, Context.unsafeGet(tagA))))
        )
      )
    )
  }
}

/** @internal */
export const provide = <RIn2, E2, ROut2>(that: Layer.Layer<RIn2, E2, ROut2>) => {
  return <RIn, E, ROut>(
    self: Layer.Layer<RIn, E, ROut>
  ): Layer.Layer<RIn | Exclude<RIn2, ROut>, E | E2, ROut2> => {
    return suspend(() => {
      const provideTo = Object.create(proto)
      provideTo._tag = OpCodes.OP_PROVIDE_TO
      provideTo.first = Object.create(proto, {
        _tag: { value: OpCodes.OP_ZIP_WITH, enumerable: true },
        first: { value: context<Exclude<RIn2, ROut>>(), enumerable: true },
        second: { value: self },
        zipK: { value: (a: Context.Context<ROut>, b: Context.Context<ROut2>) => pipe(a, Context.merge(b)) }
      })
      provideTo.second = that
      return provideTo
    })
  }
}

/** @internal */
export const use = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
) => {
  return <RIn2, E2, ROut2>(
    that: Layer.Layer<RIn2, E2, ROut2>
  ): Layer.Layer<RIn | Exclude<RIn2, ROut>, E | E2, ROut2> => {
    return suspend(() => {
      const provideTo = Object.create(proto)
      provideTo._tag = OpCodes.OP_PROVIDE_TO
      provideTo.first = Object.create(proto, {
        _tag: { value: OpCodes.OP_ZIP_WITH, enumerable: true },
        first: { value: context<Exclude<RIn2, ROut>>(), enumerable: true },
        second: { value: self },
        zipK: { value: (a: Context.Context<ROut>, b: Context.Context<ROut2>) => pipe(a, Context.merge(b)) }
      })
      provideTo.second = that
      return provideTo
    })
  }
}

/** @internal */
export function provideMerge<RIn2, E2, ROut2>(that: Layer.Layer<RIn2, E2, ROut2>) {
  return <RIn, E, ROut>(
    self: Layer.Layer<RIn, E, ROut>
  ): Layer.Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut | ROut2> => {
    const zipWith = Object.create(proto)
    zipWith._tag = OpCodes.OP_ZIP_WITH
    zipWith.first = self
    zipWith.second = pipe(self, provide(that))
    zipWith.zipK = (a: Context.Context<ROut>, b: Context.Context<ROut2>): Context.Context<ROut | ROut2> => {
      return pipe(a, Context.merge(b))
    }
    return zipWith
  }
}

/** @internal */
export function useMerge<RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
) {
  return <RIn2, E2, ROut2>(
    that: Layer.Layer<RIn2, E2, ROut2>
  ): Layer.Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut | ROut2> => {
    const zipWith = Object.create(proto)
    zipWith._tag = OpCodes.OP_ZIP_WITH
    zipWith.first = self
    zipWith.second = pipe(self, provide(that))
    zipWith.zipK = (a: Context.Context<ROut>, b: Context.Context<ROut2>): Context.Context<ROut | ROut2> => {
      return pipe(a, Context.merge(b))
    }
    return zipWith
  }
}

/** @internal */
export const retry = <RIn1, E, X>(schedule: Schedule.Schedule<RIn1, E, X>) => {
  return <RIn, ROut>(self: Layer.Layer<RIn, E, ROut>): Layer.Layer<RIn | RIn1, E, ROut> => {
    return suspend(() => {
      const stateTag = Context.Tag<{ state: unknown }>()
      return pipe(
        succeed(stateTag, { state: schedule.initial }),
        flatMap((env: Context.Context<{ state: unknown }>) =>
          retryLoop(self, schedule, stateTag, pipe(env, Context.get(stateTag)).state)
        )
      )
    })
  }
}

/** @internal */
const retryLoop = <RIn, E, ROut, RIn2, X>(
  self: Layer.Layer<RIn, E, ROut>,
  schedule: Schedule.Schedule<RIn2, E, X>,
  stateTag: Context.Tag<{ state: unknown }>,
  state: unknown
): Layer.Layer<RIn | RIn2, E, ROut> => {
  return pipe(
    self,
    catchAll((error) =>
      pipe(
        retryUpdate(schedule, stateTag, error, state),
        flatMap((env) => fresh(retryLoop(self, schedule, stateTag, pipe(env, Context.get(stateTag)).state)))
      )
    )
  )
}

/** @internal */
const retryUpdate = <RIn, E, X>(
  schedule: Schedule.Schedule<RIn, E, X>,
  stateTag: Context.Tag<{ state: unknown }>,
  error: E,
  state: unknown
): Layer.Layer<RIn, E, { state: unknown }> => {
  return fromEffect(
    stateTag,
    pipe(
      Clock.currentTimeMillis(),
      core.flatMap((now) =>
        pipe(
          schedule.step(now, error, state),
          core.flatMap(([state, _, decision]) =>
            ScheduleDecision.isDone(decision) ?
              core.fail(error) :
              pipe(
                Clock.sleep(Duration.millis(Intervals.start(decision.intervals) - now)),
                core.as({ state })
              )
          )
        )
      )
    )
  )
}

/** @internal */
export const scope = (): Layer.Layer<never, never, Scope.Scope.Closeable> => {
  return scopedContext(
    pipe(
      fiberRuntime.acquireRelease(
        fiberRuntime.scopeMake(),
        (scope, exit) => scope.close(exit)
      ),
      core.map((scope) => pipe(Context.empty(), Context.add(Scope.Tag)(scope)))
    )
  )
}

/** @internal */
export const scoped = <T extends Context.Tag<any>, R, E>(
  tag: T,
  effect: Effect.Effect<R, E, Context.Tag.Service<T>>
): Layer.Layer<Exclude<R, Scope.Scope>, E, Context.Tag.Service<T>> => {
  return scopedContext(pipe(effect, core.map((service) => pipe(Context.empty(), Context.add(tag)(service)))))
}

/** @internal */
export const scopedDiscard = <R, E, _>(
  effect: Effect.Effect<R, E, _>
): Layer.Layer<Exclude<R, Scope.Scope>, E, never> => {
  return scopedContext(pipe(effect, core.as(Context.empty())))
}

/** @internal */
export const scopedContext = <R, E, A>(
  effect: Effect.Effect<R, E, Context.Context<A>>
): Layer.Layer<Exclude<R, Scope.Scope>, E, A> => {
  const scoped = Object.create(proto)
  scoped._tag = OpCodes.OP_SCOPED
  scoped.effect = effect
  return scoped
}

/** @internal */
export const service = <T>(tag: Context.Tag<T>): Layer.Layer<T, never, T> => {
  return fromEffect(tag, core.service(tag))
}

/** @internal */
export const succeed = <T extends Context.Tag<any>>(
  tag: T,
  resource: Context.Tag.Service<T>
): Layer.Layer<never, never, Context.Tag.Service<T>> => {
  return fromEffectContext(core.succeed(pipe(
    Context.empty(),
    Context.add(tag)(resource)
  )))
}

/** @internal */
export const succeedContext = <A>(
  context: Context.Context<A>
): Layer.Layer<never, never, A> => {
  return fromEffectContext(core.succeed(context))
}

/** @internal */
export const suspend = <RIn, E, ROut>(
  evaluate: LazyArg<Layer.Layer<RIn, E, ROut>>
): Layer.Layer<RIn, E, ROut> => {
  const suspend = Object.create(proto)
  suspend._tag = OpCodes.OP_SUSPEND
  suspend.evaluate = evaluate
  return suspend
}

/** @internal */
export const sync = <T extends Context.Tag<any>>(
  tag: T,
  evaluate: LazyArg<Context.Tag.Service<T>>
): Layer.Layer<never, never, Context.Tag.Service<T>> => {
  return fromEffectContext(core.sync(() =>
    pipe(
      Context.empty(),
      Context.add(tag)(evaluate())
    )
  ))
}

/** @internal */
export const syncContext = <A>(evaluate: LazyArg<Context.Context<A>>): Layer.Layer<never, never, A> => {
  return fromEffectContext(core.sync(evaluate))
}

/** @internal */
export const tap = <ROut, RIn2, E2, X>(f: (context: Context.Context<ROut>) => Effect.Effect<RIn2, E2, X>) => {
  return <RIn, E>(self: Layer.Layer<RIn, E, ROut>): Layer.Layer<RIn | RIn2, E | E2, ROut> => {
    return pipe(
      self,
      flatMap((context) => fromEffectContext(pipe(f(context), core.as(context))))
    )
  }
}

/** @internal */
export const tapError = <E, RIn2, E2, X>(f: (e: E) => Effect.Effect<RIn2, E2, X>) => {
  return <RIn, ROut>(self: Layer.Layer<RIn, E, ROut>): Layer.Layer<RIn | RIn2, E | E2, ROut> => {
    return pipe(
      self,
      catchAll((e) => fromEffectContext(pipe(f(e), core.flatMap(() => core.fail(e)))))
    )
  }
}

/** @internal */
export const tapErrorCause = <E, RIn2, E2, X>(f: (cause: Cause.Cause<E>) => Effect.Effect<RIn2, E2, X>) => {
  return <RIn, ROut>(self: Layer.Layer<RIn, E, ROut>): Layer.Layer<RIn | RIn2, E | E2, ROut> =>
    pipe(
      self,
      catchAllCause((cause) => fromEffectContext(pipe(f(cause), core.flatMap(() => core.failCause(cause)))))
    )
}

/** @internal */
export const toRuntime = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Effect.Effect<RIn | Scope.Scope, E, Runtime.Runtime<ROut>> => {
  return pipe(
    fiberRuntime.scopeWith((scope) => pipe(self, buildWithScope(scope))),
    core.flatMap((context) =>
      pipe(
        runtime.runtime<ROut>(),
        core.provideContext(context)
      )
    )
  )
}

/** @internal */
export function zipWithPar<R1, E1, A1, A, A2>(
  that: Layer.Layer<R1, E1, A1>,
  f: (a: Context.Context<A>, b: Context.Context<A1>) => Context.Context<A2>
) {
  return <R, E>(self: Layer.Layer<R, E, A>): Layer.Layer<R | R1, E | E1, A2> => {
    return suspend(() => {
      const zipWithPar = Object.create(proto)
      zipWithPar._tag = OpCodes.OP_ZIP_WITH_PAR
      zipWithPar.first = self
      zipWithPar.second = that
      zipWithPar.zipK = f
      return zipWithPar
    })
  }
}

// circular with Effect

/** @internal */
export const provideLayer = <R, E, A>(layer: Layer.Layer<R, E, A>) => {
  const trace = getCallTrace()
  return <E1, A1>(self: Effect.Effect<A, E1, A1>): Effect.Effect<R, E | E1, A1> => {
    return core.acquireUseRelease(
      fiberRuntime.scopeMake(),
      (scope) =>
        pipe(
          layer,
          buildWithScope(scope),
          core.flatMap((context) => pipe(self, core.provideContext(context)))
        ),
      (scope, exit) => core.scopeClose(scope, exit)
    ).traced(trace)
  }
}

/** @internal */
export const provideSomeLayer = <R2, E2, A2>(layer: Layer.Layer<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R2 | Exclude<R, A2>, E | E2, A> => {
    // @ts-expect-error
    return pipe(
      self,
      provideLayer(pipe(context(), merge(layer)))
    ).traced(trace)
  }
}

/** @internal */
export const toLayer = <A>(tag: Context.Tag<A>) => {
  return <R, E>(self: Effect.Effect<R, E, A>): Layer.Layer<R, E, A> => {
    return fromEffect(tag, self)
  }
}

/** @internal */
export const toLayerScoped = <A>(tag: Context.Tag<A>) => {
  return <R, E>(self: Effect.Effect<R, E, A>): Layer.Layer<Exclude<R, Scope.Scope>, E, A> => {
    return scoped(tag, self)
  }
}

/** @internal */
export const mergeAll = <Layers extends [Layer.Layer<any, any, any>, ...Array<Layer.Layer<any, any, any>>]>(
  ...layers: Layers
): Layer.Layer<
  { [k in keyof Layers]: Layer.Layer.Context<Layers[k]> }[number],
  { [k in keyof Layers]: Layer.Layer.Error<Layers[k]> }[number],
  { [k in keyof Layers]: Layer.Layer.Success<Layers[k]> }[number]
> => {
  let final = layers[0]
  for (let i = 1; i < layers.length; i++) {
    final = merge(layers[i])(final)
  }
  return final
}
