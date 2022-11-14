import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as circular from "@effect/io/internal/effect/circular"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as synchronized from "@effect/io/internal/synchronizedRef"
import type * as Scope from "@effect/io/Scope"
import type * as ScopedRef from "@effect/io/ScopedRef"
import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
const ScopedRefSymbolKey = "@effect/io/ScopedRef"

/** @internal */
export const ScopedRefTypeId: ScopedRef.ScopedRefTypeId = Symbol.for(
  ScopedRefSymbolKey
) as ScopedRef.ScopedRefTypeId

/** @internal */
const scopedRefVariance = {
  _A: (_: never) => _
}

/** @internal  */
const close = <A>(self: ScopedRef.ScopedRef<A>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return pipe(
    synchronized.get(self.ref),
    core.flatMap((tuple) => tuple[0].close(core.exitUnit()))
  ).traced(trace)
}

/** @internal */
export const fromAcquire = <R, E, A>(
  acquire: Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, E, ScopedRef.ScopedRef<A>> => {
  const trace = getCallTrace()
  return core.uninterruptibleMask((restore) =>
    pipe(
      fiberRuntime.scopeMake(),
      core.flatMap((newScope) =>
        pipe(
          restore(
            pipe(
              acquire,
              core.provideSomeEnvironment<R, Scope.Scope | R>(Context.add(fiberRuntime.scopeTag)(newScope))
            )
          ),
          core.onError((cause) => newScope.close(core.exitFail(cause))),
          core.flatMap((value) =>
            pipe(
              circular.makeSynchronized([newScope, value] as const),
              core.flatMap((ref) => {
                const scopedRef: ScopedRef.ScopedRef<A> = {
                  [ScopedRefTypeId]: scopedRefVariance,
                  ref
                }
                return pipe(
                  fiberRuntime.addFinalizer<R | Scope.Scope, void>(() => close(scopedRef)),
                  core.as(scopedRef)
                )
              })
            )
          )
        )
      )
    )
  ).traced(trace)
}

/** @internal */
export const get = <A>(self: ScopedRef.ScopedRef<A>): Effect.Effect<never, never, A> => {
  return pipe(synchronized.get(self.ref), core.map((tuple) => tuple[1]))
}

/** @internal */
export const make = <A>(
  evaluate: () => A
): Effect.Effect<Scope.Scope, never, ScopedRef.ScopedRef<A>> => {
  const trace = getCallTrace()
  return fromAcquire(core.sync(evaluate)).traced(trace)
}

/** @internal */
export const set = <R, E, A>(acquire: Effect.Effect<R | Scope.Scope, E, A>) => {
  const trace = getCallTrace()
  return (self: ScopedRef.ScopedRef<A>): Effect.Effect<R, E, void> => {
    return pipe(
      self.ref,
      synchronized.modifyEffect(([oldScope, value]) =>
        core.uninterruptibleMask((restore) =>
          pipe(
            fiberRuntime.scopeMake(),
            core.flatMap((newScope) =>
              pipe(
                restore(
                  pipe(
                    acquire,
                    core.provideSomeEnvironment<R, R | Scope.Scope>(Context.add(fiberRuntime.scopeTag)(newScope))
                  )
                ),
                core.exit,
                core.flatMap(
                  core.exitMatch(
                    (cause) =>
                      pipe(
                        newScope.close(core.exitUnit()),
                        effect.ignore,
                        core.as(
                          [
                            core.failCause(cause) as unknown as Effect.Effect<never, never, void>,
                            [oldScope, value] as const
                          ] as const
                        )
                      ),
                    (value) =>
                      pipe(
                        oldScope.close(core.exitUnit()),
                        effect.ignore,
                        core.as([core.unit(), [newScope, value] as const] as const)
                      )
                  )
                )
              )
            )
          )
        )
      ),
      core.flatten
    ).traced(trace)
  }
}
