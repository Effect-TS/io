import * as FiberId from "@effect/io/Fiber/Id"
import * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import type * as FiberScope from "@effect/io/Fiber/Scope"
import * as FiberMessage from "@effect/io/internal/fiberMessage"
import type * as FiberRuntime from "@effect/io/internal/fiberRuntime"

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
  add(runtimeFlags: RuntimeFlags.RuntimeFlags, child: FiberRuntime.FiberRuntime<any, any>): void {
    if (RuntimeFlags.isEnabled(RuntimeFlags.FiberRoots)(runtimeFlags)) {
      _roots.add(child)
      child.unsafeAddObserver(() => {
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
    readonly parent: FiberRuntime.FiberRuntime<any, any>
  ) {}
  add(_runtimeFlags: RuntimeFlags.RuntimeFlags, child: FiberRuntime.FiberRuntime<any, any>): void {
    this.parent.tell(
      FiberMessage.stateful((parentFiber) => {
        parentFiber.addChild(child)
        child.unsafeAddObserver(() => {
          parentFiber.removeChild(child)
        })
      })
    )
  }
}

/** @internal */
export const unsafeMake = (fiber: FiberRuntime.FiberRuntime<any, any>): FiberScope.FiberScope => {
  return new Local(fiber.id(), fiber)
}

/** @internal */
export const globalScope: FiberScope.FiberScope = new Global()

/** @internal */
export const _roots = new Set<FiberRuntime.FiberRuntime<any, any>>()
