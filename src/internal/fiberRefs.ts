import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRef from "@effect/io/FiberRef"
import type * as FiberRefs from "@effect/io/FiberRefs"
import * as core from "@effect/io/internal/core"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/** @internal */
export function unsafeMake(
  fiberRefLocals: Map<FiberRef.FiberRef<any>, List.Cons<readonly [FiberId.Runtime, any]>>
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
      List.Cons<readonly [FiberId.Runtime, any]>
    >
  ) {}
}

/** @internal */
const findAncestor = (
  _ref: FiberRef.FiberRef<any>,
  _parentStack: List.List<readonly [FiberId.Runtime, unknown]>,
  _childStack: List.List<readonly [FiberId.Runtime, unknown]>,
  _childModified = false
): readonly [unknown, boolean] => {
  const ref = _ref
  let parentStack = _parentStack
  let childStack = _childStack
  let childModified = _childModified
  let ret: readonly [unknown, boolean] | undefined = undefined
  while (ret === undefined) {
    if (List.isCons(parentStack) && List.isCons(childStack)) {
      const parentFiberId = parentStack.head[0]
      const parentAncestors = parentStack.tail
      const childFiberId = childStack.head[0]
      const childRefValue = childStack.head[1]
      const childAncestors = childStack.tail
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
      const childValue = childStack.head[1]
      if (!Equal.equals(childStack.head[0], fiberId)) {
        if (!parentFiberRefs.has(fiberRef)) {
          if (Equal.equals(childValue, fiberRef.initial)) {
            continue
          }
          parentFiberRefs.set(
            fiberRef,
            List.cons([fiberId, fiberRef.join(fiberRef.initial, childValue)] as const, List.nil())
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
          const oldValue = parentStack.head[1]
          const newValue = fiberRef.join(oldValue, fiberRef.patch(patch)(oldValue))
          if (!Equal.equals(oldValue, newValue)) {
            let newStack: List.Cons<readonly [FiberId.Runtime, unknown]>
            const parentFiberId = parentStack.head[0]
            if (Equal.equals(parentFiberId, fiberId)) {
              newStack = List.cons([parentFiberId, newValue] as const, parentStack.tail)
            } else {
              newStack = List.cons([fiberId, newValue] as const, parentStack)
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
  (self: FiberRefs.FiberRefs) => {
    const map = new Map<FiberRef.FiberRef<any>, List.Cons<readonly [FiberId.Runtime, unknown]>>()
    for (const [fiberRef, stack] of self.locals.entries()) {
      const oldValue = stack.head[1]
      const newValue = fiberRef.patch(fiberRef.fork)(oldValue)
      if (Equal.equals(oldValue, newValue)) {
        map.set(fiberRef, stack)
      } else {
        map.set(fiberRef, List.cons([childId, newValue] as const, stack))
      }
    }
    return new FiberRefsImpl(map)
  }

/** @internal */
export const fiberRefs = (self: FiberRefs.FiberRefs) => HashSet.from(self.locals.keys())

/** @internal */
export const setAll = (self: FiberRefs.FiberRefs) =>
  pipe(
    self,
    fiberRefs,
    core.forEachDiscard(
      (fiberRef) => pipe(fiberRef, core.setFiberRef(getOrDefault(fiberRef)(self)))
    )
  )

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
    return Option.some(self.locals.get(fiberRef)!.head[1])
  }

/** @internal */
export const getOrDefault = <A>(fiberRef: FiberRef.FiberRef<A>) =>
  (self: FiberRefs.FiberRefs): A => pipe(self, get(fiberRef), Option.getOrElse(fiberRef.initial))

/** @internal */
export const updatedAs = <A>(fiberId: FiberId.Runtime, fiberRef: FiberRef.FiberRef<A>, value: A) =>
  (self: FiberRefs.FiberRefs): FiberRefs.FiberRefs => {
    const oldStack = self.locals.has(fiberRef) ?
      self.locals.get(fiberRef)! :
      List.empty<readonly [FiberId.Runtime, any]>()

    const newStack = List.isNil(oldStack)
      ? List.cons([fiberId, value] as const, List.nil())
      : Equal.equals(oldStack.head[0], fiberId)
      ? List.cons([fiberId, value] as const, oldStack.tail)
      : List.cons([fiberId, value] as const, oldStack)

    const locals = new Map(self.locals)
    return new FiberRefsImpl(locals.set(fiberRef, newStack))
  }
