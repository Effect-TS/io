import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as _ref from "@effect/io/internal/ref"
import type * as Synchronized from "@effect/io/Ref/Synchronized"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/** @internal */
export const get: <A>(
  self: Synchronized.Synchronized<A>
) => Effect.Effect<never, never, A> = _ref.get

/** @internal */
export const set: <A>(
  self: Synchronized.Synchronized<A>,
  value: A
) => Effect.Effect<never, never, void> = _ref.set

/** @internal */
export const getAndSet: <A>(
  self: Synchronized.Synchronized<A>,
  value: A
) => Effect.Effect<never, never, A> = _ref.getAndSet

/** @internal */
export const getAndUpdate: <A>(
  self: Synchronized.Synchronized<A>,
  f: (a: A) => A
) => Effect.Effect<never, never, A> = _ref.getAndUpdate

/** @internal */
export const getAndUpdateEffect = <A, R, E>(
  self: Synchronized.Synchronized<A>,
  f: (a: A) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return self.modifyEffect(
    (value) => pipe(f(value), core.map((result) => [value, result] as const))
  ).traced(trace)
}

/** @internal */
export const getAndUpdateSome: <A>(
  self: Synchronized.Synchronized<A>,
  f: (a: A) => Option.Option<A>
) => Effect.Effect<never, never, A> = _ref.getAndUpdateSome

/** @internal */
export const getAndUpdateSomeEffect = <A, R, E>(
  self: Synchronized.Synchronized<A>,
  pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return self.modifyEffect((value) => {
    const result = pf(value)
    switch (result._tag) {
      case "None": {
        return core.succeed([value, value] as const)
      }
      case "Some": {
        return pipe(result.value, core.map((newValue) => [value, newValue] as const))
      }
    }
  }).traced(trace)
}

/** @internal */
export const setAndGet: <A>(
  self: Synchronized.Synchronized<A>,
  value: A
) => Effect.Effect<never, never, A> = _ref.setAndGet

/** @internal */
export const modify = <A, B>(
  self: Synchronized.Synchronized<A>,
  f: (a: A) => readonly [B, A]
): Effect.Effect<never, never, B> => {
  const trace = getCallTrace()
  return self.modify(f).traced(trace)
}

/** @internal */
export const modifyEffect = <A, R, E, B>(
  self: Synchronized.Synchronized<A>,
  f: (a: A) => Effect.Effect<R, E, readonly [B, A]>
): Effect.Effect<R, E, B> => {
  const trace = getCallTrace()
  return self.modifyEffect(f).traced(trace)
}

/** @internal */
export const modifySome: <A, B>(
  self: Synchronized.Synchronized<A>,
  fallback: B,
  f: (a: A) => Option.Option<readonly [B, A]>
) => Effect.Effect<never, never, B> = _ref.modifySome

/** @internal */
export const modifySomeEffect = <A, B, R, E>(
  self: Synchronized.Synchronized<A>,
  fallback: B,
  pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>
): Effect.Effect<R, E, B> => {
  const trace = getCallTrace()
  return self.modifyEffect(
    (value) => pipe(pf(value), Option.getOrElse(() => core.succeed([fallback, value] as const)))
  ).traced(trace)
}

/** @internal */
export const update: <A>(
  self: Synchronized.Synchronized<A>,
  f: (a: A) => A
) => Effect.Effect<never, never, void> = _ref.update

/** @internal */
export const updateEffect = <A, R, E>(
  self: Synchronized.Synchronized<A>,
  f: (a: A) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  return self.modifyEffect((value) =>
    pipe(
      f(value),
      core.map((result) => [undefined as void, result] as const)
    )
  )
    .traced(trace)
}

/** @internal */
export const updateAndGetEffect = <A, R, E>(
  self: Synchronized.Synchronized<A>,
  f: (a: A) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return self.modifyEffect(
    (value) => pipe(f(value), core.map((result) => [result, result] as const))
  ).traced(trace)
}

/** @internal */
export const updateSome: <A>(
  self: Synchronized.Synchronized<A>,
  f: (a: A) => Option.Option<A>
) => Effect.Effect<never, never, void> = _ref.updateSome

/** @internal */
export const updateSomeEffect = <A, R, E>(
  self: Synchronized.Synchronized<A>,
  pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  return self.modifyEffect((value) => {
    const result = pf(value)
    switch (result._tag) {
      case "None": {
        return core.succeed([undefined, value] as const)
      }
      case "Some": {
        return pipe(result.value, core.map((a) => [undefined, a] as const))
      }
    }
  }).traced(trace)
}

/** @internal */
export const updateSomeAndGet: <A>(
  self: Synchronized.Synchronized<A>,
  f: (a: A) => Option.Option<A>
) => Effect.Effect<never, never, A> = _ref.updateSomeAndGet
