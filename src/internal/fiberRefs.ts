import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRef from "@effect/io/FiberRef"
import type * as ext from "@effect/io/FiberRefs"
import * as core from "@effect/io/internal/core"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/** @internal */
export function unsafeMake(
  fiberRefLocals: Map<FiberRef.FiberRef<any>, List.Cons<readonly [FiberId.Runtime, any]>>
): ext.FiberRefs {
  return new FiberRefs(fiberRefLocals)
}

/** @internal */
export const FiberRefsSym: ext.FiberRefsSym = Symbol.for("@effect/core/io/FiberRefs") as ext.FiberRefsSym

/** @internal */
export class FiberRefs implements ext.FiberRefs {
  readonly [FiberRefsSym]: ext.FiberRefsSym = FiberRefsSym

  constructor(
    readonly locals: Map<
      FiberRef.FiberRef<any>,
      List.Cons<readonly [FiberId.Runtime, any]>
    >
  ) {}
}

/** @internal */
function findAnchestor(
  _ref: FiberRef.FiberRef<any>,
  _parentStack: List.List<readonly [FiberId.Runtime, unknown]>,
  _childStack: List.List<readonly [FiberId.Runtime, unknown]>,
  _childModified = false
): readonly [unknown, boolean] {
  const ref = _ref
  let parentStack = _parentStack
  let childStack = _childStack
  let childModified = _childModified
  let ret: readonly [unknown, boolean] | undefined = undefined
  while (!ret) {
    if (List.isCons(parentStack) && List.isCons(childStack)) {
      const [parentFiberId] = parentStack.head
      const parentAncestors = parentStack.tail
      const [childFiberId, childRefValue] = childStack.head
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
export const joinAs = (fiberId: FiberId.Runtime, that: FiberRefs) =>
  (self: ext.FiberRefs): ext.FiberRefs => {
    const parentFiberRefs = new Map(self.locals)

    that.locals.forEach((childStack, fiberRef) => {
      const ref = fiberRef
      const childValue = childStack.head[1]
      if (!(childStack.head[0] == fiberId)) {
        if (!parentFiberRefs.has(ref)) {
          if (Equal.equals(childValue, ref.initial)) {
            return
          } else {
            parentFiberRefs.set(
              fiberRef,
              List.cons([fiberId, ref.join(ref.initial, childValue)] as const, List.nil())
            )
            return
          }
        }
        const parentStack = parentFiberRefs.get(ref)!
        const [ancestor, wasModified] = findAnchestor(
          fiberRef,
          parentStack,
          childStack
        )
        if (wasModified) {
          const patch = ref.diff(ancestor, childValue)
          const oldValue = parentStack.head[1]
          const newValue = ref.join(oldValue, ref.patch(patch)(oldValue))
          if (!Equal.equals(oldValue, newValue)) {
            let newStack: List.Cons<readonly [FiberId.Runtime, unknown]>
            const [parentFiberId] = parentStack.head
            if (parentFiberId == fiberId) {
              newStack = List.cons([parentFiberId, newValue] as const, parentStack.tail)
            } else {
              newStack = List.cons([fiberId, newValue] as const, parentStack)
            }
            parentFiberRefs.set(ref, newStack)
          }
        }
      }
    })

    return new FiberRefs(new Map(parentFiberRefs))
  }

/** @internal */
export const forkAs = (childId: FiberId.Runtime) =>
  (self: ext.FiberRefs) => {
    const map = new Map<FiberRef.FiberRef<any>, List.Cons<readonly [FiberId.Runtime, unknown]>>()
    self.locals.forEach((stack, fiberRef) => {
      const oldValue = stack.head[1]
      const newValue = fiberRef.patch(fiberRef.fork)(oldValue)
      if (Equal.equals(oldValue, newValue)) {
        map.set(fiberRef, stack)
      } else {
        map.set(fiberRef, List.cons([childId, newValue] as const, stack))
      }
    })
    return new FiberRefs(new Map(map))
  }

/** @internal */
export const fiberRefs = (self: ext.FiberRefs) => HashSet.from(self.locals.keys())

/** @internal */
export const setAll = (self: ext.FiberRefs) =>
  pipe(
    self,
    fiberRefs,
    core.forEachDiscard(
      (fiberRef) => pipe(fiberRef, core.setFiberRef(getOrDefault(fiberRef)(self)))
    )
  )

const delete_ = <A>(fiberRef: FiberRef.FiberRef<A>) =>
  (self: ext.FiberRefs): ext.FiberRefs => {
    const locals = new Map(self.locals)
    locals.delete(fiberRef)
    return new FiberRefs(locals)
  }

export {
  /** @internal */
  delete_ as delete
}

/** @internal */
export const get = <A>(fiberRef: FiberRef.FiberRef<A>) =>
  (self: ext.FiberRefs): Option.Option<A> => {
    if (!self.locals.has(fiberRef)) {
      return Option.none
    }
    return Option.some(self.locals.get(fiberRef)!.head[1])
  }

/** @internal */
export const getOrDefault = <A>(fiberRef: FiberRef.FiberRef<A>) =>
  (self: ext.FiberRefs): A => pipe(self, get(fiberRef), Option.getOrElse(fiberRef.initial))

/** @internal */
export const updateAs = <A>(fiberId: FiberId.Runtime, fiberRef: FiberRef.FiberRef<A>, value: A) =>
  (self: ext.FiberRefs): ext.FiberRefs => {
    const oldStack = self.locals.has(fiberRef) ?
      self.locals.get(fiberRef)! :
      List.empty<readonly [FiberId.Runtime, any]>()

    const newStack = List.isNil(oldStack)
      ? List.cons([fiberId, value] as const, List.nil())
      : Equal.equals(oldStack.head[0], fiberId)
      ? List.cons([fiberId, value] as const, oldStack.tail)
      : List.cons([fiberId, value] as const, oldStack)

    return new FiberRefs(self.locals.set(fiberRef, newStack))
  }
