import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import type * as Ref from "@effect/io/Ref"
import { pipe } from "@fp-ts/data/Function"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"

/** @internal */
export const RefTypeId: Ref.RefTypeId = Symbol.for("@effect/io/Ref") as Ref.RefTypeId

/** @internal */
export const refVariance = {
  _A: (_: never) => _
}

/** @internal */
export const unsafeMake = <A>(value: A): Ref.Ref<A> => {
  const ref = MutableRef.make(value)
  return {
    [RefTypeId]: refVariance,
    modify: (f) =>
      core.sync(() => {
        const [b, a] = f(MutableRef.get(ref))
        if ((b as unknown) !== (a as unknown)) {
          MutableRef.set(a)(ref)
        }
        return b
      })
  }
}

/** @internal */
export const make = <A>(value: A) => {
  const trace = getCallTrace()
  return core.sync(() => unsafeMake(value)).traced(trace)
}

/** @internal */
export const get = <A>(self: Ref.Ref<A>) => {
  const trace = getCallTrace()
  return self.modify((a) => [a, a]).traced(trace)
}

/** @internal */
export const set = <A>(value: A) => {
  const trace = getCallTrace()
  return (self: Ref.Ref<A>): Effect.Effect<never, never, void> => {
    return self.modify((): [void, A] => [void 0, value]).traced(trace)
  }
}

/** @internal */
export const getAndSet = <A>(value: A) => {
  const trace = getCallTrace()
  return (self: Ref.Ref<A>): Effect.Effect<never, never, A> => {
    return self.modify((a): [A, A] => [a, value]).traced(trace)
  }
}

/** @internal */
export const getAndUpdate = <A>(f: (a: A) => A) => {
  const trace = getCallTrace()
  return (self: Ref.Ref<A>): Effect.Effect<never, never, A> => {
    return self.modify((a): [A, A] => [a, f(a)]).traced(trace)
  }
}

/** @internal */
export const getAndUpdateSome = <A>(pf: (a: A) => Option.Option<A>) => {
  const trace = getCallTrace()
  return (self: Ref.Ref<A>): Effect.Effect<never, never, A> => {
    return self.modify((value): [A, A] => {
      const option = pf(value)
      switch (option._tag) {
        case "None": {
          return [value, value]
        }
        case "Some": {
          return [value, option.value]
        }
      }
    }).traced(trace)
  }
}

/** @internal */
export const setAndGet = <A>(value: A) => {
  const trace = getCallTrace()
  return (self: Ref.Ref<A>): Effect.Effect<never, never, A> => {
    return self.modify((): [A, A] => [value, value]).traced(trace)
  }
}

/** @internal */
export const modify = <A, B>(f: (a: A) => readonly [B, A]) => {
  const trace = getCallTrace()
  return (self: Ref.Ref<A>): Effect.Effect<never, never, B> => {
    return self.modify(f).traced(trace)
  }
}

/** @internal */
export const modifySome = <A, B>(fallback: B, pf: (a: A) => Option.Option<readonly [B, A]>) => {
  const trace = getCallTrace()
  return (self: Ref.Ref<A>) => {
    return self.modify((value) => {
      const option = pf(value)
      switch (option._tag) {
        case "None": {
          return [fallback, value]
        }
        case "Some": {
          return option.value
        }
      }
    }).traced(trace)
  }
}

/** @internal */
export const update = <A>(f: (a: A) => A) => {
  const trace = getCallTrace()
  return (self: Ref.Ref<A>) => {
    return self.modify((a): [void, A] => [void 0, f(a)]).traced(trace)
  }
}

/** @internal */
export const updateSome = <A>(f: (a: A) => Option.Option<A>) => {
  const trace = getCallTrace()
  return (self: Ref.Ref<A>): Effect.Effect<never, never, void> => {
    return self.modify(
      (a): [void, A] => [void 0, pipe(f(a), Option.match(() => a, (b) => b))]
    ).traced(trace)
  }
}

/** @internal */
export const updateSomeAndGet = <A>(pf: (a: A) => Option.Option<A>) => {
  const trace = getCallTrace()
  return (self: Ref.Ref<A>): Effect.Effect<never, never, A> => {
    return self.modify((value): [A, A] => {
      const option = pf(value)
      switch (option._tag) {
        case "None": {
          return [value, value]
        }
        case "Some": {
          return [option.value, option.value]
        }
      }
    }).traced(trace)
  }
}
