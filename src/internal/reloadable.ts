import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as _layer from "@effect/io/internal/layer"
import * as _schedule from "@effect/io/internal/schedule"
import * as scopedRef from "@effect/io/internal/scopedRef"
import type * as Layer from "@effect/io/Layer"
import type * as Reloadable from "@effect/io/Reloadable"
import type * as Schedule from "@effect/io/Schedule"
import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as WeakIterableMap from "@fp-ts/data/weak/WeakIterableMap"

/** @internal */
const ReloadableSymbolKey = "@effect/io/Reloadable"

/** @internal */
export const ReloadableTypeId: Reloadable.ReloadableTypeId = Symbol.for(
  ReloadableSymbolKey
) as Reloadable.ReloadableTypeId

/** @internal */
const reloadableVariance = {
  _A: (_: never) => _
}

/** @internal */
export const auto = <Out>(tag: Context.Tag<Out>) => {
  return <In, E, R, Out2>(
    layer: Layer.Layer<In, E, Out>,
    policy: Schedule.Schedule<R, In, Out2>
  ): Layer.Layer<R | In, E, Reloadable.Reloadable<Out>> => {
    return _layer.scoped(reloadableTag(tag))(
      pipe(
        _layer.build(manual(tag)(layer)),
        core.map(Context.unsafeGet(reloadableTag(tag))),
        core.tap((reloadable) =>
          fiberRuntime.acquireRelease(
            pipe(
              reloadable.reload,
              effect.ignoreLogged,
              _schedule.schedule_Effect(policy),
              fiberRuntime.forkDaemon
            ),
            core.interruptFiber
          )
        )
      )
    )
  }
}

/** @internal */
export const autoFromConfig = <Out>(tag: Context.Tag<Out>) => {
  return <In, E, R, Out2>(
    layer: Layer.Layer<In, E, Out>,
    scheduleFromConfig: (context: Context.Context<In>) => Schedule.Schedule<R, In, Out2>
  ): Layer.Layer<R | In, E, Reloadable.Reloadable<Out>> => {
    return _layer.scoped(reloadableTag(tag))(
      pipe(
        core.environment<In>(),
        core.flatMap((env) =>
          pipe(
            _layer.build(auto(tag)(layer, scheduleFromConfig(env))),
            core.map(Context.unsafeGet(reloadableTag(tag)))
          )
        )
      )
    )
  }
}

/** @internal */
export const get = <A>(tag: Context.Tag<A>): Effect.Effect<Reloadable.Reloadable<A>, never, A> => {
  const trace = getCallTrace()
  return core.serviceWithEffect(reloadableTag(tag))((reloadable) => scopedRef.get(reloadable.scopedRef)).traced(trace)
}

/** @internal */
export const manual = <Out>(tag: Context.Tag<Out>) => {
  return <In, E>(layer: Layer.Layer<In, E, Out>): Layer.Layer<In, E, Reloadable.Reloadable<Out>> => {
    return _layer.scoped(reloadableTag(tag))(
      pipe(
        core.environment<In>(),
        core.flatMap((env) =>
          pipe(
            scopedRef.fromAcquire(pipe(_layer.build(layer), core.map(Context.unsafeGet(tag)))),
            core.map((ref) => ({
              [ReloadableTypeId]: reloadableVariance,
              scopedRef: ref,
              reload: pipe(
                ref,
                scopedRef.set(
                  pipe(_layer.build(layer), core.map(Context.unsafeGet(tag)))
                ),
                core.provideEnvironment(env)
              )
            }))
          )
        )
      )
    )
  }
}

/** @internal */
const tagMap = WeakIterableMap.make<Context.Tag<any>, Context.Tag<any>>([])

/** @internal */
export const reloadableTag = <A>(tag: Context.Tag<A>): Context.Tag<Reloadable.Reloadable<A>> => {
  const already = pipe(tagMap, WeakIterableMap.get(tag))
  if (Option.isSome(already)) {
    return already.value
  }
  const newTag = Context.Tag<Reloadable.Reloadable<A>>()
  pipe(tagMap, WeakIterableMap.set(tag, newTag))
  return newTag
}

/** @internal */
export const reload = <A>(tag: Context.Tag<A>): Effect.Effect<Reloadable.Reloadable<A>, unknown, void> => {
  const trace = getCallTrace()
  return core.serviceWithEffect(reloadableTag(tag))((reloadable) => reloadable.reload).traced(trace)
}

/** @internal */
export const reloadFork = <A>(tag: Context.Tag<A>): Effect.Effect<Reloadable.Reloadable<A>, unknown, void> => {
  const trace = getCallTrace()
  return core.serviceWithEffect(reloadableTag(tag))((reloadable) =>
    pipe(
      reloadable.reload,
      effect.ignoreLogged,
      fiberRuntime.forkDaemon,
      core.asUnit
    ).traced(trace)
  )
}
