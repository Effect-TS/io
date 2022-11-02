import * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRuntime from "@effect/io/Fiber/Runtime"
import * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import type * as FiberScope from "@effect/io/Fiber/Scope"

/** @internal */
const FiberScopeSymbolKey = "@effect/io/Fiber/Scope"

/** @internal */
export const FiberScopeTypeId: FiberScope.FiberScopeTypeId = Symbol.for(
  FiberScopeSymbolKey
) as FiberScope.FiberScopeTypeId

/** @internal */
class Global implements FiberScope.FiberScope {
  readonly [FiberScopeTypeId]: FiberScope.FiberScopeTypeId = FiberScopeTypeId
  readonly fiberId = FiberId.none
  add(runtimeFlags: RuntimeFlags.RuntimeFlags, child: FiberRuntime.Runtime<any, any>): void {
    if (RuntimeFlags.isEnabled(RuntimeFlags.FiberRoots)(runtimeFlags)) {
      _roots.add(child)
      child.addObserver(() => {
        _roots.delete(child)
      })
    }
  }
}

/** @internal */
class Local implements FiberScope.FiberScope {
  readonly [FiberScopeTypeId]: FiberScope.FiberScopeTypeId = FiberScopeTypeId
  constructor(
    readonly fiberId: FiberId.FiberId,
    readonly parent: FiberRuntime.Runtime<any, any>
  ) {}
  add(_runtimeFlags: RuntimeFlags.RuntimeFlags, _child: FiberRuntime.Runtime<any, any>): void {
    // TODO(Max/Mike): implement
    // this.parent.tell(
    //   new Stateful((parentFiber) => {
    //     parentFiber.addChild(child)
    //     child.addObserver(() => {
    //       parentFiber.removeChild(child)
    //     })
    //   })
    // )
  }
}

/** @internal */
export const unsafeMake = (fiber: FiberRuntime.Runtime<any, any>): FiberScope.FiberScope => {
  return new Local(fiber.id, fiber)
}

/** @internal */
export const globalScope: FiberScope.FiberScope = new Global()

/** @internal */
export const _roots = new Set<FiberRuntime.Runtime<any, any>>()
