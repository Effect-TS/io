import { getCallTrace } from "@effect/io/Debug"
import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRef from "@effect/io/FiberRef"
import type * as FiberRefs from "@effect/io/FiberRefs"
import * as core from "@effect/io/internal/core"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as Option from "@fp-ts/data/Option"
import * as Arr from "@fp-ts/data/ReadonlyArray"

/** @internal */
export function unsafeMake(
  fiberRefLocals: Map<FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>>
): FiberRefs.FiberRefs {
  return new FiberRefsImpl(fiberRefLocals)
}

/** @internal */
export const FiberRefsSym: FiberRefs.FiberRefsSym = Symbol.for("@effect/io/FiberRefs") as FiberRefs.FiberRefsSym

/** @internal */
export class FiberRefsImpl implements FiberRefs.FiberRefs {
  readonly [FiberRefsSym]: FiberRefs.FiberRefsSym = FiberRefsSym
  constructor(
    readonly locals: Map<
      FiberRef.FiberRef<any>,
      Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>
    >
  ) {
    Equal.considerByRef(this)
  }
}

/** @internal */
const findAncestor = (
  _ref: FiberRef.FiberRef<any>,
  _parentStack: ReadonlyArray<readonly [FiberId.Runtime, unknown]>,
  _childStack: ReadonlyArray<readonly [FiberId.Runtime, unknown]>,
  _childModified = false
): readonly [unknown, boolean] => {
  const ref = _ref
  let parentStack = _parentStack
  let childStack = _childStack
  let childModified = _childModified
  let ret: readonly [unknown, boolean] | undefined = undefined
  while (ret === undefined) {
    if (Arr.isNonEmpty(parentStack) && Arr.isNonEmpty(childStack)) {
      const parentFiberId = Arr.headNonEmpty(parentStack)[0]
      const parentAncestors = Arr.tailNonEmpty(parentStack)
      const childFiberId = Arr.headNonEmpty(childStack)[0]
      const childRefValue = Arr.headNonEmpty(childStack)[1]
      const childAncestors = Arr.tailNonEmpty(childStack)
      if (parentFiberId.startTimeMillis < childFiberId.startTimeMillis) {
        childStack = childAncestors
        childModified = true
      } else if (parentFiberId.startTimeMillis > childFiberId.startTimeMillis) {
        parentStack = parentAncestors
      } else {
        if (parentFiberId.id < childFiberId.id) {
          childStack = childAncestors
          childModified = true
        } else if (parentFiberId.id > childFiberId.id) {
          parentStack = parentAncestors
        } else {
          ret = [childRefValue, childModified] as const
        }
      }
    } else {
      ret = [ref.initial, true] as const
    }
  }
  return ret
}

/** @internal */
export const joinAs = (fiberId: FiberId.Runtime, that: FiberRefs.FiberRefs) =>
  (self: FiberRefs.FiberRefs): FiberRefs.FiberRefs => {
    const parentFiberRefs = new Map(self.locals)
    for (const [fiberRef, childStack] of that.locals) {
      const childValue = Arr.headNonEmpty(childStack)[1]
      if (!Equal.equals(Arr.headNonEmpty(childStack)[0], fiberId)) {
        if (!parentFiberRefs.has(fiberRef)) {
          if (Equal.equals(childValue, fiberRef.initial)) {
            continue
          }
          parentFiberRefs.set(
            fiberRef,
            [[fiberId, fiberRef.join(fiberRef.initial, childValue)]]
          )
          continue
        }
        const parentStack = parentFiberRefs.get(fiberRef)!
        const [ancestor, wasModified] = findAncestor(
          fiberRef,
          parentStack,
          childStack
        )
        if (wasModified) {
          const patch = fiberRef.diff(ancestor, childValue)
          const oldValue = Arr.headNonEmpty(parentStack)[1]
          const newValue = fiberRef.join(oldValue, fiberRef.patch(patch)(oldValue))
          if (!Equal.equals(oldValue, newValue)) {
            let newStack: Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, unknown]>
            const parentFiberId = Arr.headNonEmpty(parentStack)[0]
            if (Equal.equals(parentFiberId, fiberId)) {
              newStack = Arr.prepend([parentFiberId, newValue] as const)(
                Arr.tailNonEmpty(parentStack)
              ) as Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, unknown]>
            } else {
              newStack = Arr.prepend([fiberId, newValue] as const)(
                parentStack
              ) as Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, unknown]>
            }
            parentFiberRefs.set(fiberRef, newStack)
          }
        }
      }
    }
    return new FiberRefsImpl(new Map(parentFiberRefs))
  }

/** @internal */
export const forkAs = (childId: FiberId.Runtime) =>
  (self: FiberRefs.FiberRefs): FiberRefs.FiberRefs => {
    const map = new Map<FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, unknown]>>()
    for (const [fiberRef, stack] of self.locals.entries()) {
      const oldValue = Arr.headNonEmpty(stack)[1]
      const newValue = fiberRef.patch(fiberRef.fork)(oldValue)
      if (Equal.equals(oldValue, newValue)) {
        map.set(fiberRef, stack)
      } else {
        map.set(fiberRef, Arr.prepend([childId, newValue] as const)(stack) as typeof stack)
      }
    }
    return new FiberRefsImpl(map)
  }

/** @internal */
export const fiberRefs = (self: FiberRefs.FiberRefs) => HashSet.from(self.locals.keys())

/** @internal */
export const setAll = (self: FiberRefs.FiberRefs) => {
  const trace = getCallTrace()
  return pipe(
    fiberRefs(self),
    core.forEachDiscard((fiberRef) => core.fiberRefSet(fiberRef)(getOrDefault(fiberRef)(self)))
  ).traced(trace)
}

const delete_ = <A>(fiberRef: FiberRef.FiberRef<A>) =>
  (self: FiberRefs.FiberRefs): FiberRefs.FiberRefs => {
    const locals = new Map(self.locals)
    locals.delete(fiberRef)
    return new FiberRefsImpl(locals)
  }

export {
  /** @internal */
  delete_ as delete
}

/** @internal */
export const get = <A>(fiberRef: FiberRef.FiberRef<A>) =>
  (self: FiberRefs.FiberRefs): Option.Option<A> => {
    if (!self.locals.has(fiberRef)) {
      return Option.none
    }
    return Option.some(Arr.headNonEmpty(self.locals.get(fiberRef)!)[1])
  }

/** @internal */
export const getOrDefault = <A>(fiberRef: FiberRef.FiberRef<A>) =>
  (self: FiberRefs.FiberRefs): A => pipe(self, get(fiberRef), Option.getOrElse(() => fiberRef.initial))

/** @internal */
export const updatedAs = <A>(fiberId: FiberId.Runtime, fiberRef: FiberRef.FiberRef<A>, value: A) =>
  (self: FiberRefs.FiberRefs): FiberRefs.FiberRefs => {
    const oldStack = self.locals.has(fiberRef) ?
      self.locals.get(fiberRef)! :
      Arr.empty<readonly [FiberId.Runtime, any]>()

    const newStack = Arr.isEmpty(oldStack)
      ? Arr.of([fiberId, value] as const)
      : Equal.equals(
          Arr.headNonEmpty(oldStack as Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>)[0],
          fiberId
        )
      ? Arr.prepend([fiberId, value] as const)(
        Arr.tailNonEmpty(oldStack as Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>)
      )
      : Arr.prepend([fiberId, value] as const)(oldStack)

    const locals = new Map(self.locals)
    return new FiberRefsImpl(
      locals.set(fiberRef, newStack as Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>)
    )
  }
