import { getCallTrace } from "@effect/io/Debug"
import * as internal from "@effect/io/internal/stm"
import type * as STM from "@effect/io/internal/stm"
import * as Entry from "@effect/io/internal/stm/entry"
import type * as Journal from "@effect/io/internal/stm/journal"
import type * as TxnId from "@effect/io/internal/stm/txnId"
import * as Versioned from "@effect/io/internal/stm/versioned"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

export const RefTypeId = Symbol.for("@effect/stm/Ref")

export type RefTypeId = typeof RefTypeId

export interface Ref<A> extends Ref.Variance<A> {
  /**
   * Note: the method is unbound, exposed only for potential extensions.
   */
  modify<B>(f: (a: A) => readonly [B, A]): STM.STM<never, never, B>
  /** @internal */
  todos: Map<TxnId.TxnId, Journal.Todo>
  /** @internal */
  versioned: Versioned.Versioned<A>
}

export namespace Ref {
  export interface Variance<A> {
    readonly [RefTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}

const refVariance = {
  _A: (_: never) => _
}

export class RefImpl<A> implements Ref<A> {
  readonly [RefTypeId] = refVariance
  /** @internal */
  todos: Map<TxnId.TxnId, Journal.Todo>
  /** @internal */
  versioned: Versioned.Versioned<A>
  constructor(value: A) {
    this.versioned = new Versioned.Versioned(value)
    this.todos = new Map()
  }
  modify<B>(f: (a: A) => readonly [B, A]): STM.STM<never, never, B> {
    return internal.withSTMRuntime((_) => {
      const entry = getOrMakeEntry(this, _.journal)
      const [retValue, newValue] = f(Entry.unsafeGet(entry) as A)
      Entry.unsafeSet(entry, newValue)
      return internal.succeed(retValue)
    })
  }
}

/**
 * @macro traced
 */
export const make = <A>(value: A): STM.STM<never, never, Ref<A>> => {
  const trace = getCallTrace()
  return internal.withSTMRuntime((_) => {
    const ref = new RefImpl(value)
    _.journal.set(ref, Entry.make(ref, true))
    return internal.succeed(ref)
  }).traced(trace)
}

/**
 * @macro traced
 */
export const get = <A>(self: Ref<A>) => {
  const trace = getCallTrace()
  return self.modify((a) => [a, a]).traced(trace)
}

/**
 * @macro traced
 */
export const set = <A>(value: A) =>
  (self: Ref<A>) => {
    const trace = getCallTrace()
    return self.modify((): [void, A] => [void 0, value]).traced(trace)
  }

/**
 * @macro traced
 */
export const getAndSet = <A>(value: A) =>
  (self: Ref<A>) => {
    const trace = getCallTrace()
    return self.modify((a): [A, A] => [a, value]).traced(trace)
  }

/**
 * @macro traced
 */
export const getAndUpdate = <A>(f: (a: A) => A) =>
  (self: Ref<A>) => {
    const trace = getCallTrace()
    return self.modify((a): [A, A] => [a, f(a)]).traced(trace)
  }

/**
 * @macro traced
 */
export const getAndUpdateSome = <A>(f: (a: A) => Option.Option<A>) => {
  const trace = getCallTrace()
  return (self: Ref<A>) =>
    self.modify((a): [A, A] =>
      pipe(
        f(a),
        Option.match(() => [a, a], (b) => [a, b])
      )
    ).traced(trace)
}

/**
 * @macro traced
 */
export const setAndGet = <A>(value: A) =>
  (self: Ref<A>) => {
    const trace = getCallTrace()
    return self.modify((): [A, A] => [value, value]).traced(trace)
  }

/**
 * @macro traced
 */
export const modify = <A, B>(f: (a: A) => readonly [B, A]) => {
  const trace = getCallTrace()
  return (self: Ref<A>) => self.modify(f).traced(trace)
}

/**
 * @macro traced
 */
export const modifySome = <A, B>(fallback: B, f: (a: A) => Option.Option<readonly [B, A]>) => {
  const trace = getCallTrace()
  return (self: Ref<A>) =>
    self.modify((a) =>
      pipe(
        f(a),
        Option.match(
          () => [fallback, a],
          (b) => b
        )
      )
    ).traced(trace)
}

/**
 * @macro traced
 */
export const update = <A>(f: (a: A) => A) => {
  const trace = getCallTrace()
  return (self: Ref<A>) => self.modify((a): [void, A] => [void 0, f(a)]).traced(trace)
}

/**
 * @macro traced
 */
export const updateAndGet = <A>(f: (a: A) => A) => {
  const trace = getCallTrace()
  return (self: Ref<A>) =>
    self.modify((a): [A, A] => {
      const b = f(a)
      return [b, b]
    }).traced(trace)
}

/**
 * @macro traced
 */
export const updateSome = <A>(f: (a: A) => Option.Option<A>) => {
  const trace = getCallTrace()
  return (self: Ref<A>) =>
    self.modify((a): [void, A] => [void 0, pipe(f(a), Option.match(() => a, (b) => b))]).traced(trace)
}

/**
 * @macro traced
 */
export const updateSomeAndGet = <A>(f: (a: A) => Option.Option<A>) => {
  const trace = getCallTrace()
  return (self: Ref<A>) =>
    self.modify((a): [A, A] => pipe(f(a), Option.match(() => [a, a], (b) => [b, b]))).traced(trace)
}

const getOrMakeEntry = <A>(self: Ref<A>, journal: Journal.Journal): Entry.Entry => {
  if (journal.has(self)) {
    return journal.get(self)!
  }
  const entry = Entry.make(self, false)
  journal.set(self, entry)
  return entry
}

export const unsafeGet = (journal: Journal.Journal) => {
  return <A>(self: Ref<A>): A => {
    return Entry.unsafeGet(getOrMakeEntry(self, journal)) as A
  }
}

export const unsafeSet = <A>(value: A, journal: Journal.Journal) => {
  return (self: Ref<A>): void => {
    const entry = getOrMakeEntry(self, journal)
    Entry.unsafeSet(entry, value)
    return undefined
  }
}
