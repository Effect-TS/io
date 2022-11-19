import type * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRefs from "@effect/io/FiberRefs"
import type * as FiberRefsPatch from "@effect/io/FiberRefs/Patch"
import * as _fiberRefs from "@effect/io/internal/fiberRefs"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/** @internal */
export const OP_EMPTY = 0 as const

/** @internal */
export type OP_EMPTY = typeof OP_EMPTY

/** @internal */
export const OP_ADD = 1 as const

/** @internal */
export type OP_ADD = typeof OP_ADD

/** @internal */
export const OP_REMOVE = 2 as const

/** @internal */
export type OP_REMOVE = typeof OP_REMOVE

/** @internal */
export const OP_UPDATE = 3 as const

/** @internal */
export type OP_UPDATE = typeof OP_UPDATE

/** @internal */
export const OP_AND_THEN = 4 as const

/** @internal */
export type OP_AND_THEN = typeof OP_AND_THEN

/** @internal */
export const empty = (): FiberRefsPatch.FiberRefsPatch => ({
  op: OP_EMPTY
})

/** @internal */
export const diff = (
  oldValue: FiberRefs.FiberRefs,
  newValue: FiberRefs.FiberRefs
): FiberRefsPatch.FiberRefsPatch => {
  const missingLocals = new Map(oldValue.locals)
  let patch = empty()
  for (const [fiberRef, pairs] of newValue.locals.entries()) {
    const newValue = pairs.head[1]
    const old = missingLocals.get(fiberRef)
    if (old !== undefined) {
      const oldValue = old.head[1]
      if (oldValue !== newValue) {
        patch = combine({
          op: OP_UPDATE,
          fiberRef,
          patch: fiberRef.diff(oldValue, newValue)
        })(patch)
      }
    } else {
      patch = combine({
        op: OP_ADD,
        fiberRef,
        value: newValue
      })(patch)
    }
    missingLocals.delete(fiberRef)
  }
  for (const [fiberRef] of missingLocals.entries()) {
    patch = combine({
      op: OP_REMOVE,
      fiberRef
    })(patch)
  }
  return patch
}

/** @internal */
export const combine = (that: FiberRefsPatch.FiberRefsPatch) => {
  return (self: FiberRefsPatch.FiberRefsPatch): FiberRefsPatch.FiberRefsPatch => ({
    op: OP_AND_THEN,
    first: self,
    second: that
  })
}

/** @internal */
export const patch = (fiberId: FiberId.Runtime, oldValue: FiberRefs.FiberRefs) => {
  return (self: FiberRefsPatch.FiberRefsPatch): FiberRefs.FiberRefs => {
    let fiberRefs = oldValue
    let patches = List.of(self)
    while (List.isCons(patches)) {
      const head = patches.head
      const tail = patches.tail
      switch (head.op) {
        case OP_EMPTY: {
          patches = tail
          break
        }
        case OP_ADD: {
          fiberRefs = pipe(fiberRefs, _fiberRefs.updatedAs(fiberId, head.fiberRef, head.value))
          patches = tail
          break
        }
        case OP_REMOVE: {
          fiberRefs = pipe(fiberRefs, _fiberRefs.delete(head.fiberRef))
          patches = tail
          break
        }
        case OP_UPDATE: {
          const value = pipe(fiberRefs, _fiberRefs.getOrDefault(head.fiberRef))
          fiberRefs = pipe(
            fiberRefs,
            _fiberRefs.updatedAs(fiberId, head.fiberRef, head.fiberRef.patch(head.patch)(value))
          )
          patches = tail
          break
        }
        case OP_AND_THEN: {
          patches = List.cons(head.first, List.cons(head.second, tail))
          break
        }
      }
    }
    return fiberRefs
  }
}
