import * as Context from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import * as Debug from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal_effect_untraced/core"
import * as effect from "@effect/io/internal_effect_untraced/effect"
import * as fiberRuntime from "@effect/io/internal_effect_untraced/fiberRuntime"
import * as _layer from "@effect/io/internal_effect_untraced/layer"
import * as _schedule from "@effect/io/internal_effect_untraced/schedule"
import * as scopedRef from "@effect/io/internal_effect_untraced/scopedRef"
import type * as Layer from "@effect/io/Layer"
import type * as Reloadable from "@effect/io/Reloadable"
import type * as Schedule from "@effect/io/Schedule"

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
export const auto = <Out extends Context.Tag<any>, In, E, R, Out2>(
  tag: Out,
  layer: Layer.Layer<In, E, Context.Tag.Service<Out>>,
  policy: Schedule.Schedule<R, In, Out2>
): Layer.Layer<R | In, E, Reloadable.Reloadable<Context.Tag.Service<Out>>> =>
  _layer.scoped(
    reloadableTag(tag),
    pipe(
      _layer.build(manual(tag, layer)),
      core.map(Context.unsafeGet(reloadableTag(tag))),
      core.tap((reloadable) =>
        fiberRuntime.acquireRelease(
          fiberRuntime.forkDaemon(
            _schedule.schedule_Effect(
              effect.ignoreLogged(reloadable.reload()),
              policy
            )
          ),
          core.interruptFiber()
        )
      )
    )
  )

/** @internal */
export const autoFromConfig = <Out extends Context.Tag<any>, In, E, R, Out2>(
  tag: Out,
  layer: Layer.Layer<In, E, Context.Tag.Service<Out>>,
  scheduleFromConfig: (context: Context.Context<In>) => Schedule.Schedule<R, In, Out2>
): Layer.Layer<R | In, E, Reloadable.Reloadable<Context.Tag.Service<Out>>> =>
  _layer.scoped(
    reloadableTag(tag),
    pipe(
      core.context<In>(),
      core.flatMap((env) =>
        pipe(
          _layer.build(auto(tag, layer, scheduleFromConfig(env))),
          core.map(Context.unsafeGet(reloadableTag(tag)))
        )
      )
    )
  )

/** @internal */
export const get = Debug.zeroArgsDualWithTrace((trace) =>
  <A>(tag: Context.Tag<A>): Effect.Effect<Reloadable.Reloadable<A>, never, A> =>
    core.serviceWithEffect(
      reloadableTag(tag),
      (reloadable) => scopedRef.get(reloadable.scopedRef)
    ).traced(trace)
)

/** @internal */
export const manual = <Out extends Context.Tag<any>, In, E>(
  tag: Out,
  layer: Layer.Layer<In, E, Context.Tag.Service<Out>>
): Layer.Layer<In, E, Reloadable.Reloadable<Context.Tag.Service<Out>>> =>
  _layer.scoped(
    reloadableTag(tag),
    pipe(
      core.context<In>(),
      core.flatMap((env) =>
        pipe(
          scopedRef.fromAcquire(pipe(_layer.build(layer), core.map(Context.unsafeGet(tag)))),
          core.map((ref) => ({
            [ReloadableTypeId]: reloadableVariance,
            scopedRef: ref,
            reload: () =>
              Debug.bodyWithTrace((trace) =>
                pipe(
                  scopedRef.set(ref, pipe(_layer.build(layer), core.map(Context.unsafeGet(tag)))),
                  core.provideContext(env)
                ).traced(trace)
              )
          }))
        )
      )
    )
  )

/** @internal */
const tagMap = new Map<unknown, Context.Tag<any>>([])

/** @internal */
export const reloadableTag = <A>(tag: Context.Tag<A>): Context.Tag<Reloadable.Reloadable<A>> => {
  if (tagMap.has(tag.key)) {
    return tagMap.get(tag.key)!
  }
  const newTag = Context.Tag<Reloadable.Reloadable<A>>()
  tagMap.set(tag.key, newTag)
  return newTag
}

/** @internal */
export const reload = Debug.zeroArgsDualWithTrace((trace) =>
  <A>(tag: Context.Tag<A>): Effect.Effect<Reloadable.Reloadable<A>, unknown, void> =>
    core.serviceWithEffect(
      reloadableTag(tag),
      (reloadable) => reloadable.reload()
    ).traced(trace)
)

/** @internal */
export const reloadFork = Debug.zeroArgsDualWithTrace((trace) =>
  <A>(tag: Context.Tag<A>): Effect.Effect<Reloadable.Reloadable<A>, unknown, void> =>
    core.serviceWithEffect(
      reloadableTag(tag),
      (reloadable) =>
        core.asUnit(
          fiberRuntime.forkDaemon(
            effect.ignoreLogged(reloadable.reload())
          )
        ).traced(trace)
    )
)
