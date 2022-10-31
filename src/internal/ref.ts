import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/stm"
import * as Entry from "@effect/io/internal/stm/entry"
import type * as Journal from "@effect/io/internal/stm/journal"
import type * as TxnId from "@effect/io/internal/stm/txnId"
import * as Versioned from "@effect/io/internal/stm/versioned"
import type * as STM from "@effect/io/STM"
import type * as Ref from "@effect/io/STM/Ref"
import { pipe } from "@fp-ts/data/Function"
import * as HashMap from "@fp-ts/data/HashMap"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import type * as Option from "@fp-ts/data/Option"

/** @internal */
export const RefTypeId: Ref.RefTypeId = Symbol.for("@effect/io/Ref") as Ref.RefTypeId

/** @internal */
const refVariance = {
  _A: (_: never) => _
}

/** @internal */
const emptyTodoMap: HashMap.HashMap<TxnId.TxnId, Journal.Todo> = HashMap.empty()

/** @internal */
export const unsafeMake = <A>(value: A): Ref.Ref<A> => {
  const versioned = Versioned.make(value)
  const todos = MutableRef.MutableRef(emptyTodoMap)
  return {
    [RefTypeId]: refVariance,
    todos,
    versioned
  }
}

/** @internal */
export const unsafeGet = (journal: Journal.Journal) => {
  return <A>(self: Ref.Ref<A>): A => {
    return Entry.unsafeGet(getOrMakeEntry(self, journal)) as A
  }
}

/** @internal */
export const unsafeSet = <A>(value: A, journal: Journal.Journal) => {
  return (self: Ref.Ref<A>): void => {
    Entry.unsafeSet(getOrMakeEntry(self, journal), value)
  }
}

/** @internal */
export const make = <A>(evaluate: () => A): STM.STM<never, never, Ref.Ref<A>> => {
  return internal.effect((journal) => {
    const value = evaluate()
    const versioned = Versioned.make(value)
    const todos = MutableRef.make(emptyTodoMap)
    const ref = {
      [RefTypeId]: refVariance,
      todos,
      versioned
    }
    journal.set(ref, Entry.make(ref, true))
    return ref
  })
}

/** @internal */
export const makeCommit = <A>(evaluate: () => A): Effect.Effect<never, never, Ref.Ref<A>> => {
  return internal.commit(make(evaluate))
}

/** @internal */
export const get = <A>(self: Ref.Ref<A>): STM.STM<never, never, A> => {
  return internal.effect((journal) => Entry.unsafeGet(getOrMakeEntry(self, journal)) as A)
}

/** @internal */
export const getAndSet = <A>(value: A) => {
  return (self: Ref.Ref<A>): STM.STM<never, never, A> => {
    return internal.effect((journal) => {
      const entry = getOrMakeEntry(self, journal)
      const oldValue = Entry.unsafeGet(entry)
      Entry.unsafeSet(entry, value)
      return oldValue as A
    })
  }
}

/** @internal */
export const getAndUpdate = <A>(f: (a: A) => A) => {
  return (self: Ref.Ref<A>): STM.STM<never, never, A> => {
    return internal.effect((journal) => {
      const entry = getOrMakeEntry(self, journal)
      const oldValue = Entry.unsafeGet(entry) as A
      Entry.unsafeSet(entry, f(oldValue))
      return oldValue
    })
  }
}

/** @internal */
export const getAndUpdateSome = <A>(pf: (a: A) => Option.Option<A>) => {
  return (self: Ref.Ref<A>): STM.STM<never, never, A> => {
    return pipe(
      self,
      getAndUpdate((a) => {
        const result = pf(a)
        switch (result._tag) {
          case "None": {
            return a
          }
          case "Some": {
            return result.value
          }
        }
      })
    )
  }
}

/** @internal */
export const modify = <A, B>(f: (a: A) => readonly [B, A]) => {
  return (self: Ref.Ref<A>): STM.STM<never, never, B> => {
    return internal.effect((journal) => {
      const entry = getOrMakeEntry(self, journal)
      const [retValue, newValue] = f(Entry.unsafeGet(entry) as A)
      Entry.unsafeSet(entry, newValue)
      return retValue
    })
  }
}

/** @internal */
export const modifySome = <A, B>(
  def: B,
  pf: (a: A) => Option.Option<readonly [B, A]>
): (self: Ref.Ref<A>) => STM.STM<never, never, B> => {
  return modify((a) => {
    const result = pf(a)
    switch (result._tag) {
      case "None": {
        return [def, a] as const
      }
      case "Some": {
        return result.value
      }
    }
  })
}

/** @internal */
export const set = <A>(value: A) => {
  return (self: Ref.Ref<A>): STM.STM<never, never, void> => {
    return internal.effect((journal) => {
      const entry = getOrMakeEntry(self, journal)
      Entry.unsafeSet(entry, value)
    })
  }
}

/** @internal */
export const update = <A>(f: (a: A) => A) => {
  return (self: Ref.Ref<A>): STM.STM<never, never, void> => {
    return internal.effect((journal) => {
      const entry = getOrMakeEntry(self, journal)
      Entry.unsafeSet(entry, f(Entry.unsafeGet(entry) as A))
    })
  }
}

/** @internal */
export const updateAndGet = <A>(f: (a: A) => A) => {
  return (self: Ref.Ref<A>): STM.STM<never, never, A> => {
    return internal.effect((journal) => {
      const entry = getOrMakeEntry(self, journal)
      const newValue = f(Entry.unsafeGet(entry) as A)
      Entry.unsafeSet(entry, newValue)
      return newValue
    })
  }
}

/** @internal */
export const updateSome = <A>(pf: (a: A) => Option.Option<A>): (self: Ref.Ref<A>) => STM.STM<never, never, void> => {
  return update((a) => {
    const result = pf(a)
    switch (result._tag) {
      case "None": {
        return a
      }
      case "Some": {
        return result.value
      }
    }
  })
}

/** @internal */
export const updateSomeAndGet = <A>(pf: (a: A) => Option.Option<A>): (self: Ref.Ref<A>) => STM.STM<never, never, A> => {
  return updateAndGet((a) => {
    const result = pf(a)
    switch (result._tag) {
      case "None": {
        return a
      }
      case "Some": {
        return result.value
      }
    }
  })
}

/** @internal */
const getOrMakeEntry = <A>(self: Ref.Ref<A>, journal: Journal.Journal): Entry.Entry => {
  if (journal.has(self)) {
    return journal.get(self)!
  }
  const entry = Entry.make(self, false)
  journal.set(self, entry)
  return entry
}
