import * as core from "@effect/io/internal/core"
import type * as Ref from "@effect/io/Ref"
import { pipe } from "@fp-ts/data/Function"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Option from "@fp-ts/data/Option"

/** @internal */
export const RefTypeId: Ref.RefTypeId = Symbol.for("@effect/io/Ref") as Ref.RefTypeId

/** @internal */
const refVariance = {
  _A: (_: never) => _
}
/** @internal */
export const refUnsafeMake = <A>(value: A): Ref.Ref<A> => {
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
export const refMake = <A>(value: A) => core.sync(() => refUnsafeMake(value))

/** @internal */
export const refGet = <A>(self: Ref.Ref<A>) => self.modify((a) => [a, a])

/** @internal */
export const refSet = <A>(value: A) => (self: Ref.Ref<A>) => self.modify((): [void, A] => [void 0, value])

/** @internal */
export const refGetAndSet = <A>(value: A) => (self: Ref.Ref<A>) => self.modify((a): [A, A] => [a, value])

/** @internal */
export const refGetAndUpdate = <A>(f: (a: A) => A) => (self: Ref.Ref<A>) => self.modify((a): [A, A] => [a, f(a)])

/** @internal */
export const refGetAndUpdateSome = <A>(f: (a: A) => Option.Option<A>) =>
  (self: Ref.Ref<A>) =>
    self.modify((a): [A, A] =>
      pipe(
        f(a),
        Option.match(() => [a, a], (b) => [a, b])
      )
    )

/** @internal */
export const refSetAndGet = <A>(value: A) => (self: Ref.Ref<A>) => self.modify((): [A, A] => [value, value])

/** @internal */
export const refModify = <A, B>(f: (a: A) => readonly [B, A]) => (self: Ref.Ref<A>) => self.modify(f)

/** @internal */
export const refModifySome = <A, B>(fallback: B, f: (a: A) => Option.Option<readonly [B, A]>) =>
  (self: Ref.Ref<A>) =>
    self.modify((a) =>
      pipe(
        f(a),
        Option.match(
          () => [fallback, a],
          (b) => b
        )
      )
    )

/** @internal */
export const refUpdate = <A>(f: (a: A) => A) => (self: Ref.Ref<A>) => self.modify((a): [void, A] => [void 0, f(a)])

/** @internal */
export const refUpdateSome = <A>(f: (a: A) => Option.Option<A>) =>
  (self: Ref.Ref<A>) => self.modify((a): [void, A] => [void 0, pipe(f(a), Option.match(() => a, (b) => b))])

/** @internal */
export const refUpdateSomeAndGet = <A>(f: (a: A) => Option.Option<A>) =>
  (self: Ref.Ref<A>) => self.modify((a): [A, A] => pipe(f(a), Option.match(() => [a, a], (b) => [b, b])))
