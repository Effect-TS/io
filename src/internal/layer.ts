import * as Cause from "@effect/io/Cause"
import * as Clock from "@effect/io/Clock"
import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import type * as FiberRefs from "@effect/io/FiberRefs"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as circular from "@effect/io/internal/effect/circular"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as EffectOpCodes from "@effect/io/internal/opCodes/effect"
import * as OpCodes from "@effect/io/internal/opCodes/layer"
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
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

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
  | ZipWithPar

/** @internal */
export type Op<OpCode extends number, Body = {}> = Layer.Layer<unknown, unknown, unknown> & Body & {
  readonly op: OpCode
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
    readonly evaluate: () => Layer.Layer<never, never, unknown>
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
  return (self as Primitive).op === OpCodes.OP_FRESH
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
  ) {}

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
      this.ref,
      synchronized.modifyEffect((map) => {
        const inMap = Option.fromNullable(map.get(layer))
        switch (inMap._tag) {
          case "Some": {
            const [acquire, release] = inMap.value
            const cached: Effect.Effect<never, E, Context.Context<ROut>> = pipe(
              acquire as Effect.Effect<never, E, readonly [Context.Context<ROut>, FiberRefs.FiberRefs]>,
              core.flatMap(([b, refs]) => pipe(effect.inheritFiberRefs(refs), core.as(b))),
              core.onExit((exit) => {
                switch (exit.op) {
                  case EffectOpCodes.OP_FAILURE: {
                    return core.unit()
                  }
                  case EffectOpCodes.OP_SUCCESS: {
                    return scope.addFinalizer(release)
                  }
                }
              })
            )
            return core.succeed([cached, map] as const)
          }
          case "None": {
            return pipe(
              circular.makeSynchronized(0),
              core.flatMap((observers) =>
                pipe(
                  core.makeDeferred<E, readonly [Context.Context<ROut>, FiberRefs.FiberRefs]>(),
                  core.flatMap((deferred) =>
                    pipe(
                      circular.makeSynchronized<Scope.Scope.Finalizer>(core.unit),
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
                                    core.flatMap((f) => pipe(f(this), core.zip(effect.getFiberRefs())))
                                  )
                                ),
                                core.exit,
                                core.flatMap((exit) => {
                                  switch (exit.op) {
                                    case EffectOpCodes.OP_FAILURE: {
                                      return pipe(
                                        deferred,
                                        core.failCauseDeferred(exit.cause),
                                        core.zipRight(innerScope.close(exit)),
                                        core.zipRight(core.failCause(exit.cause))
                                      )
                                    }
                                    case EffectOpCodes.OP_SUCCESS: {
                                      return pipe(
                                        finalizerRef,
                                        synchronized.set((exit) =>
                                          pipe(
                                            core.whenEffect(
                                              pipe(
                                                observers,
                                                synchronized.modify((n) => [n === 1, n - 1] as const)
                                              ),
                                              innerScope.close(exit)
                                            ),
                                            core.asUnit
                                          )
                                        ),
                                        core.zipRight(pipe(observers, synchronized.update((n) => n + 1))),
                                        core.zipRight(
                                          scope.addFinalizer((exit) =>
                                            pipe(
                                              synchronized.get(finalizerRef),
                                              core.flatMap((finalizer) => finalizer(exit))
                                            )
                                          )
                                        ),
                                        core.zipRight(pipe(deferred, core.succeedDeferred(exit.value))),
                                        core.as(exit.value[0])
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
                            core.awaitDeferred(deferred),
                            core.onExit((exit) => {
                              switch (exit.op) {
                                case EffectOpCodes.OP_FAILURE: {
                                  return core.unit()
                                }
                                case EffectOpCodes.OP_SUCCESS: {
                                  return pipe(observers, synchronized.update((n) => n + 1))
                                }
                              }
                            })
                          ),
                          (exit: Exit.Exit<unknown, unknown>) =>
                            pipe(
                              synchronized.get(finalizerRef),
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
          }
        }
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
    core.flatMap((ref) => core.sync(() => new MemoMap(ref)))
  )
}

/** @internal */
export const build = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Effect.Effect<RIn | Scope.Scope, E, Context.Context<ROut>> => {
  const trace = getCallTrace()
  return core.serviceWithEffect(Scope.Tag)(
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
    switch (op.op) {
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
              core.foldCauseEffect(
                (cause) => memoMap.getOrElseMemoize(op.failureK(cause), scope),
                (value) => memoMap.getOrElseMemoize(op.successK(value), scope)
              )
            )
        )
      }
      case OpCodes.OP_FRESH: {
        return core.sync(() => (_: MemoMap) => pipe(op.layer, buildWithScope(scope)))
      }
      case OpCodes.OP_FROM_EFFECT: {
        return core.sync(() => (_: MemoMap) => op.effect as Effect.Effect<RIn, E, Context.Context<ROut>>)
      }
      case OpCodes.OP_PROVIDE_TO: {
        return core.sync(() =>
          (memoMap: MemoMap) =>
            pipe(
              memoMap.getOrElseMemoize(op.first, scope),
              core.flatMap((env) =>
                pipe(
                  memoMap.getOrElseMemoize(op.second, scope),
                  core.provideEnvironment(env)
                )
              )
            )
        )
      }
      case OpCodes.OP_SCOPED: {
        return core.sync(() =>
          (_: MemoMap) =>
            pipe(
              scope,
              fiberRuntime.scopeExtend(op.effect as Effect.Effect<RIn, E, Context.Context<ROut>>)
            )
        )
      }
      case OpCodes.OP_SUSPEND: {
        return core.sync(() => (memoMap: MemoMap) => memoMap.getOrElseMemoize(op.evaluate(), scope))
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
        )
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Layer
// -----------------------------------------------------------------------------

/** @internal */
export const catchAll = <E, R2, E2, A2>(onError: (error: E) => Layer.Layer<R2, E2, A2>) => {
  return <R, A>(self: Layer.Layer<R, E, A>): Layer.Layer<R | R2, E2, A & A2> => {
    return pipe(self, foldLayer(onError, succeedEnvironment))
  }
}

/** @internal */
export const die = (defect: unknown): Layer.Layer<never, never, unknown> => {
  return failCause(Cause.die(defect))
}

/** @internal */
export const dieSync = (evaluate: () => unknown): Layer.Layer<never, never, unknown> => {
  return failCauseSync(() => Cause.die(evaluate()))
}

/** @internal */
export const environment = <R>(): Layer.Layer<R, never, R> => {
  return fromEffectEnvironment(core.environment<R>())
}

/** @internal */
export const extendScope = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Layer.Layer<RIn | Scope.Scope, E, ROut> => {
  const extendScope = Object.create(proto)
  extendScope.op = OpCodes.OP_EXTEND_SCOPE
  extendScope.layer = self
  return extendScope
}

/** @internal */
export const fail = <E>(error: E): Layer.Layer<never, E, unknown> => {
  return failCause(Cause.fail(error))
}

/** @internal */
export const failSync = <E>(evaluate: () => E): Layer.Layer<never, E, unknown> => {
  return failCauseSync(() => Cause.fail(evaluate()))
}

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Layer.Layer<never, E, unknown> => {
  return fromEffectEnvironment(core.failCause(cause))
}

/** @internal */
export const failCauseSync = <E>(evaluate: () => Cause.Cause<E>): Layer.Layer<never, E, unknown> => {
  return fromEffectEnvironment(core.failCauseSync(evaluate))
}

/** @internal */
export const flatMap = <A, R2, E2, A2>(f: (context: Context.Context<A>) => Layer.Layer<R2, E2, A2>) => {
  return <R, E>(self: Layer.Layer<R, E, A>): Layer.Layer<R | R2, E | E2, A2> => {
    return pipe(self, foldLayer(fail, f))
  }
}

/** @internal */
export const flatten = <R2, E2, A>(tag: Context.Tag<Layer.Layer<R2, E2, A>>) => {
  return <R, E>(self: Layer.Layer<R, E, Layer.Layer<R2, E2, A>>): Layer.Layer<R | R2, E | E2, A> => {
    return pipe(self, flatMap(Context.get(tag)))
  }
}

/** @internal */
export const foldCauseLayer = <E, A, R2, E2, A2, R3, E3, A3>(
  onFailure: (cause: Cause.Cause<E>) => Layer.Layer<R2, E2, A2>,
  onSuccess: (context: Context.Context<A>) => Layer.Layer<R3, E3, A3>
) => {
  return <R>(self: Layer.Layer<R, E, A>): Layer.Layer<R | R2 | R3, E2 | E3, A2 | A3> => {
    const fold = Object.create(proto)
    fold.op = OpCodes.OP_FOLD
    fold.layer = self
    fold.failureK = onFailure
    fold.successK = onSuccess
    return fold
  }
}

/** @internal */
export const foldLayer = <E, R2, E2, A2, A, R3, E3, A3>(
  onFailure: (error: E) => Layer.Layer<R2, E2, A2>,
  onSuccess: (context: Context.Context<A>) => Layer.Layer<R3, E3, A3>
) => {
  return <R>(self: Layer.Layer<R, E, A>): Layer.Layer<R | R2 | R3, E2 | E3, A2 & A3> => {
    return pipe(
      self,
      foldCauseLayer(
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
  fresh.op = OpCodes.OP_FRESH
  fresh.layer = self
  return fresh
}

/** @internal */
export function fromEffect<T>(tag: Context.Tag<T>) {
  return <R, E>(effect: Effect.Effect<R, E, T>): Layer.Layer<R, E, T> => {
    return fromEffectEnvironment(
      pipe(
        effect,
        core.map((service) => pipe(Context.empty(), Context.add(tag)(service)))
      )
    )
  }
}

/** @internal */
export function fromEffectEnvironment<R, E, A>(
  effect: Effect.Effect<R, E, Context.Context<A>>
): Layer.Layer<R, E, A> {
  const suspend = Object.create(proto)
  suspend.op = OpCodes.OP_SUSPEND
  suspend.evaluate = () => {
    const fromEffect = Object.create(proto)
    fromEffect.op = OpCodes.OP_FROM_EFFECT
    fromEffect.effect = effect
    return fromEffect
  }
  return suspend
}

/** @internal */
export const fromFunction = <A, B>(tagA: Context.Tag<A>, tagB: Context.Tag<B>) => {
  return (f: (a: A) => B): Layer.Layer<A, never, B> => {
    return fromEffectEnvironment(
      core.serviceWith(tagA)((a) => pipe(Context.empty(), Context.add(tagB)(f(a))))
    )
  }
}

/** @internal */
export const fromValue = <T>(tag: Context.Tag<T>) => {
  return <T1 extends T>(evaluate: () => T1): Layer.Layer<never, never, T> => {
    const suspend = Object.create(proto)
    suspend.op = OpCodes.OP_SUSPEND
    suspend.evaluate = () => {
      const fromEffect = Object.create(proto)
      fromEffect.op = OpCodes.OP_SCOPED
      fromEffect.effect = pipe(
        core.sync(evaluate),
        core.map((service) => pipe(Context.empty(), Context.add(tag)(service)))
      )
      return fromEffect
    }
    return suspend
  }
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
    return pipe(self, flatMap((context) => succeedEnvironment(f(context))))
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
  return pipe(
    fiberRuntime.scopeWith((scope) => pipe(self, buildWithScope(scope))),
    effect.memoize,
    core.map((effect) => {
      const scoped = Object.create(proto)
      scoped.op = OpCodes.OP_SCOPED
      scoped.effect = effect
      return scoped
    })
  )
}

/** @internal */
export const merge = <RIn2, E2, ROut2>(that: Layer.Layer<RIn2, E2, ROut2>) => {
  return <RIn, E, ROut>(self: Layer.Layer<RIn, E, ROut>): Layer.Layer<
    RIn | RIn2,
    E | E2,
    ROut | ROut2
  > => {
    const zipWithPar = Object.create(proto)
    zipWithPar.op = OpCodes.OP_ZIP_WITH_PAR
    zipWithPar.first = self
    zipWithPar.second = that
    zipWithPar.zipK = (a: Context.Context<unknown>, b: Context.Context<unknown>) => {
      return pipe(a, Context.merge(b))
    }
    return zipWithPar
  }
}

/** @internal */
export const orDie = <R, E, A>(self: Layer.Layer<R, E, A>): Layer.Layer<R, never, A> => {
  return pipe(self, catchAll((defect) => die(defect)))
}

/** @internal */
export const orElse = <R1, E1, A1>(that: () => Layer.Layer<R1, E1, A1>) => {
  return <R, E, A>(self: Layer.Layer<R, E, A>): Layer.Layer<R | R1, E | E1, A & A1> => {
    return pipe(self, catchAll(() => that()))
  }
}

/** @internal */
export const passthrough = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Layer.Layer<RIn, E, RIn | ROut> => {
  return pipe(environment<RIn>(), merge(self))
}

/** @internal */
export const project = <A, B>(tagA: Context.Tag<A>, tagB: Context.Tag<B>) => {
  return (f: (a: A) => B) => {
    return <RIn, E, ROut>(self: Layer.Layer<RIn, E, ROut | A>): Layer.Layer<RIn, E, B> => {
      return pipe(
        self,
        map((environment) =>
          pipe(
            Context.empty(),
            Context.add(tagB)(f(pipe(environment, Context.unsafeGet(tagA))))
          )
        )
      )
    }
  }
}

/** @internal */
export const provideTo = <RIn2, E2, ROut2>(that: Layer.Layer<RIn2, E2, ROut2>) => {
  return <RIn, E, ROut>(
    self: Layer.Layer<RIn, E, ROut>
  ): Layer.Layer<RIn | Exclude<RIn2, ROut>, E | E2, ROut2> => {
    const provideTo = Object.create(proto)
    provideTo.op = OpCodes.OP_PROVIDE_TO
    provideTo.first = pipe(environment<Exclude<RIn2, ROut>>(), merge(self))
    provideTo.second = that
    return provideTo
  }
}

/** @internal */
export function provideToAndMerge<RIn2, E2, ROut2>(that: Layer.Layer<RIn2, E2, ROut2>) {
  return <RIn, E, ROut>(
    self: Layer.Layer<RIn, E, ROut>
  ): Layer.Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut | ROut2> => {
    return pipe(self, merge(pipe(self, provideTo(that))))
  }
}

/** @internal */
export const retry = <RIn1, E, X>(schedule: Schedule.Schedule<RIn1, E, X>) => {
  return <RIn, ROut>(self: Layer.Layer<RIn, E, ROut>): Layer.Layer<RIn | RIn1, E, ROut> => {
    return suspend(() => {
      const stateTag = Context.Tag<{ state: unknown }>()
      return pipe(
        succeed(stateTag)({ state: schedule.initial }),
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
  return fromEffect(stateTag)(
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
  return scopedEnvironment(
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
export const scoped = <T>(tag: Context.Tag<T>) => {
  return <R, E, T1 extends T>(effect: Effect.Effect<R, E, T1>): Layer.Layer<Exclude<R, Scope.Scope>, E, T> => {
    return scopedEnvironment(
      pipe(
        effect,
        core.map((service) => pipe(Context.empty(), Context.add(tag)(service)))
      )
    )
  }
}

/** @internal */
export const scopedDiscard = <R, E, T>(
  effect: Effect.Effect<R, E, T>
): Layer.Layer<Exclude<R, Scope.Scope>, E, never> => {
  return scopedEnvironment(pipe(effect, core.as(Context.empty())))
}

/** @internal */
export const scopedEnvironment = <R, E, A>(
  effect: Effect.Effect<R, E, Context.Context<A>>
): Layer.Layer<Exclude<R, Scope.Scope>, E, A> => {
  const suspend = Object.create(proto)
  suspend.op = OpCodes.OP_SUSPEND
  suspend.evaluate = () => {
    const scoped = Object.create(proto)
    scoped.op = OpCodes.OP_SCOPED
    scoped.effect = effect
    return scoped
  }
  return suspend
}

/** @internal */
export const service = <T>(tag: Context.Tag<T>): Layer.Layer<T, never, T> => {
  return fromEffect(tag)(core.service(tag))
}

/** @internal */
export const succeed = <T>(tag: Context.Tag<T>) => {
  return (resource: T): Layer.Layer<never, never, T> => {
    return fromEffectEnvironment(core.succeed(pipe(
      Context.empty(),
      Context.add(tag)(resource)
    )))
  }
}

/** @internal */
export const succeedEnvironment = <A>(
  environment: Context.Context<A>
): Layer.Layer<never, never, A> => {
  return fromEffectEnvironment(core.succeed(environment))
}

/** @internal */
export const suspend = <RIn, E, ROut>(
  evaluate: () => Layer.Layer<RIn, E, ROut>
): Layer.Layer<RIn, E, ROut> => {
  const suspend = Object.create(proto)
  suspend.op = OpCodes.OP_SUSPEND
  suspend.evaluate = evaluate
  return suspend
}

/** @internal */
export const sync = <T>(tag: Context.Tag<T>) => {
  return (evaluate: () => T): Layer.Layer<never, never, T> => {
    return fromEffectEnvironment(core.sync(() =>
      pipe(
        Context.empty(),
        Context.add(tag)(evaluate())
      )
    ))
  }
}

/** @internal */
export const syncEnvironment = <A>(evaluate: () => Context.Context<A>): Layer.Layer<never, never, A> => {
  return fromEffectEnvironment(core.sync(evaluate))
}

/** @internal */
export const tap = <ROut, RIn2, E2, X>(f: (context: Context.Context<ROut>) => Effect.Effect<RIn2, E2, X>) => {
  return <RIn, E>(self: Layer.Layer<RIn, E, ROut>): Layer.Layer<RIn | RIn2, E | E2, ROut> => {
    return pipe(
      self,
      flatMap((environment) => fromEffectEnvironment(pipe(f(environment), core.as(environment))))
    )
  }
}

/** @internal */
export const tapError = <E, RIn2, E2, X>(f: (e: E) => Effect.Effect<RIn2, E2, X>) => {
  return <RIn, ROut>(self: Layer.Layer<RIn, E, ROut>): Layer.Layer<RIn | RIn2, E | E2, ROut> => {
    return pipe(
      self,
      catchAll((e) => fromEffectEnvironment(pipe(f(e), core.flatMap(() => core.fail(e)))))
    )
  }
}

/** @internal */
export const toRuntime = <RIn, E, ROut>(
  self: Layer.Layer<RIn, E, ROut>
): Effect.Effect<RIn | Scope.Scope, E, Runtime.Runtime<ROut>> => {
  return pipe(
    fiberRuntime.scopeWith((scope) => pipe(self, buildWithScope(scope))),
    core.flatMap((environment) =>
      pipe(
        runtime.runtime<ROut>(),
        core.provideEnvironment(environment)
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
    const suspend = Object.create(proto)
    suspend.op = OpCodes.OP_SUSPEND
    suspend.evaluate = () => {
      const zipWithPar = Object.create(proto)
      zipWithPar.op = OpCodes.OP_ZIP_WITH_PAR
      zipWithPar.first = self
      zipWithPar.second = that
      zipWithPar.zipK = f
      return zipWithPar
    }
    return suspend
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
          core.flatMap((context) => pipe(self, core.provideEnvironment(context)))
        ),
      (scope, exit) => scope.close(exit)
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
      provideLayer(pipe(environment(), merge(layer)))
    ).traced(trace)
  }
}
