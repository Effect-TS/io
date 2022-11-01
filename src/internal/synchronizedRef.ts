import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as _ref from "@effect/io/internal/ref"
import * as Option from "@fp-ts/data/Option"
// import type * as Ref from "@effect/io/Ref"
import type * as Synchronized from "@effect/io/Ref/Synchronized"
import * as Semaphore from "@effect/io/Semaphore"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
const SynchronizedSymbolKey = "@effect/io/Ref/Synchronized"

/** @internal */
export const SynchronizedTypeId: Synchronized.SynchronizedTypeId = Symbol.for(
  SynchronizedSymbolKey
) as Synchronized.SynchronizedTypeId

/** @internal */
const synchronizedVariance = {
  _A: (_: never) => _
}

/** @internal */
export const unsafeMake = <A>(value: A): Synchronized.Synchronized<A> => {
  const ref = _ref.unsafeMake(value)
  const semaphore = Semaphore.unsafeMake(1)
  return {
    [SynchronizedTypeId]: synchronizedVariance,
    [_ref.RefTypeId]: _ref.refVariance,
    modify: <B>(f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B> => {
      return ref.modify(f)
    },
    modifyEffect: <R, E, B>(
      f: (a: A) => Effect.Effect<R, E, readonly [B, A]>
    ): Effect.Effect<R, E, B> => {
      return pipe(
        _ref.get(ref),
        core.flatMap(f),
        core.flatMap(([b, a]) => pipe(ref, _ref.set(a), core.as(b))),
        Semaphore.withPermit(semaphore)
      )
    }
  }
}

/** @internal */
export const make = <A>(value: A): Effect.Effect<never, never, Synchronized.Synchronized<A>> => {
  const trace = getCallTrace()
  return core.sync(() => unsafeMake(value)).traced(trace)
}

/** @internal */
export const get: <A>(self: Synchronized.Synchronized<A>) => Effect.Effect<never, never, A> = _ref.get

/** @internal */
export const set: <A>(value: A) => (self: Synchronized.Synchronized<A>) => Effect.Effect<never, never, void> = _ref.set

/** @internal */
export const getAndSet: <A>(value: A) => (self: Synchronized.Synchronized<A>) => Effect.Effect<never, never, A> =
  _ref.getAndSet

/** @internal */
export const getAndUpdate: <A>(
  f: (a: A) => A
) => (self: Synchronized.Synchronized<A>) => Effect.Effect<never, never, A> = _ref.getAndUpdate

/** @internal */
export const getAndUpdateEffect = <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>) => {
  const trace = getCallTrace()
  return (self: Synchronized.Synchronized<A>): Effect.Effect<R, E, A> => {
    return self.modifyEffect(
      (value) => pipe(f(value), core.map((result) => [value, result] as const))
    ).traced(trace)
  }
}

/** @internal */
export const getAndUpdateSome: <A>(
  f: (a: A) => Option.Option<A>
) => (self: Synchronized.Synchronized<A>) => Effect.Effect<never, never, A> = _ref.getAndUpdateSome

/** @internal */
export const getAndUpdateSomeEffect = <A, R, E>(
  pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
) => {
  const trace = getCallTrace()
  return (self: Synchronized.Synchronized<A>): Effect.Effect<R, E, A> => {
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
}
/** @internal */
export const setAndGet: <A>(value: A) => (self: Synchronized.Synchronized<A>) => Effect.Effect<never, never, A> =
  _ref.setAndGet

/** @internal */
export const modify: <A, B>(
  f: (a: A) => readonly [B, A]
) => (self: Synchronized.Synchronized<A>) => Effect.Effect<never, never, B> = _ref.modify

/** @internal */
export const modifyEffect = <A, R, E, B>(f: (a: A) => Effect.Effect<R, E, readonly [B, A]>) => {
  const trace = getCallTrace()
  return (self: Synchronized.Synchronized<A>): Effect.Effect<R, E, B> => {
    return self.modifyEffect(f).traced(trace)
  }
}

/** @internal */
export const modifySome: <A, B>(
  fallback: B,
  f: (a: A) => Option.Option<readonly [B, A]>
) => (self: Synchronized.Synchronized<A>) => Effect.Effect<never, never, B> = _ref.modifySome

/** @internal */
export const modifySomeEffect = <B, A, R, E>(
  fallback: B,
  pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>
) => {
  const trace = getCallTrace()
  return (self: Synchronized.Synchronized<A>): Effect.Effect<R, E, B> => {
    return self.modifyEffect(
      (value) => pipe(pf(value), Option.getOrElse(core.succeed([fallback, value] as const)))
    ).traced(trace)
  }
}

/** @internal */
export const update: <A>(f: (a: A) => A) => (self: Synchronized.Synchronized<A>) => Effect.Effect<never, never, void> =
  _ref.update

/** @internal */
export const updateEffect = <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>) => {
  const trace = getCallTrace()
  return (self: Synchronized.Synchronized<A>): Effect.Effect<R, E, void> => {
    return self.modifyEffect(
      (value) => pipe(f(value), core.map((result) => [undefined as void, result] as const))
    ).traced(trace)
  }
}

/** @internal */
export const updateAndGetEffect = <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>) => {
  const trace = getCallTrace()
  return (self: Synchronized.Synchronized<A>): Effect.Effect<R, E, A> => {
    return self.modifyEffect(
      (value) => pipe(f(value), core.map((result) => [result, result] as const))
    ).traced(trace)
  }
}

/** @internal */
export const updateSome: <A>(
  f: (a: A) => Option.Option<A>
) => (self: Synchronized.Synchronized<A>) => Effect.Effect<never, never, void> = _ref.updateSome

/** @internal */
export const updateSomeEffect = <A, R, E>(pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>) => {
  const trace = getCallTrace()
  return (self: Synchronized.Synchronized<A>): Effect.Effect<R, E, void> => {
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
}

/** @internal */
export const updateSomeAndGet: <A>(
  f: (a: A) => Option.Option<A>
) => (self: Synchronized.Synchronized<A>) => Effect.Effect<never, never, A> = _ref.updateSomeAndGet

/** @internal */
export const updateSomeAndGetEffect = <A, R, E>(pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>) => {
  const trace = getCallTrace()
  return (self: Synchronized.Synchronized<A>): Effect.Effect<R, E, A> => {
    return self.modifyEffect((value) => {
      const result = pf(value)
      switch (result._tag) {
        case "None": {
          return core.succeed([value, value] as const)
        }
        case "Some": {
          return pipe(result.value, core.map((a) => [a, a] as const))
        }
      }
    }).traced(trace)
  }
}
