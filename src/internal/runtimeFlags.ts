import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import type * as RuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"
import * as runtimeFlagsPatch from "@effect/io/internal/runtimeFlagsPatch"

/** @internal */
export const None: RuntimeFlags.RuntimeFlag = 0 as RuntimeFlags.RuntimeFlag

/** @internal */
export const Interruption: RuntimeFlags.RuntimeFlag = 1 << 0 as RuntimeFlags.RuntimeFlag

/** @internal */
export const CurrentFiber: RuntimeFlags.RuntimeFlag = 1 << 1 as RuntimeFlags.RuntimeFlag

/** @internal */
export const OpSupervision: RuntimeFlags.RuntimeFlag = 1 << 2 as RuntimeFlags.RuntimeFlag

/** @internal */
export const RuntimeMetrics: RuntimeFlags.RuntimeFlag = 1 << 3 as RuntimeFlags.RuntimeFlag

/** @internal */
export const FiberRoots: RuntimeFlags.RuntimeFlag = 1 << 4 as RuntimeFlags.RuntimeFlag

/** @internal */
export const WindDown: RuntimeFlags.RuntimeFlag = 1 << 5 as RuntimeFlags.RuntimeFlag

/** @internal */
export const CooperativeYielding: RuntimeFlags.RuntimeFlag = 1 << 6 as RuntimeFlags.RuntimeFlag

/** @internal */
export const allFlags: ReadonlyArray<RuntimeFlags.RuntimeFlag> = [
  None,
  Interruption,
  CurrentFiber,
  OpSupervision,
  RuntimeMetrics,
  FiberRoots,
  WindDown,
  CooperativeYielding
]

/** @internal */
export const isEnabled = (flag: RuntimeFlags.RuntimeFlag) => {
  return (self: RuntimeFlags.RuntimeFlags): boolean => (self & flag) !== 0
}

/** @internal */
export const isDisabled = (flag: RuntimeFlags.RuntimeFlag) => {
  return (self: RuntimeFlags.RuntimeFlags): boolean => !isEnabled(flag)(self)
}

/** @internal */
export const toSet = (self: RuntimeFlags.RuntimeFlags): ReadonlySet<RuntimeFlags.RuntimeFlag> => {
  return new Set(allFlags.filter((flag) => isEnabled(flag)(self)))
}

/** @internal */
export const render = (self: RuntimeFlags.RuntimeFlags): string => {
  const active: Array<string> = []
  allFlags.forEach((flag) => {
    if (isEnabled(flag)(self)) {
      active.push(`${flag}`)
    }
  })
  return `RuntimeFlags(${active.join(", ")})`
}

// circular with RuntimeFlagsPatch

/** @internal */
export const enabledSet = (self: RuntimeFlagsPatch.RuntimeFlagsPatch): ReadonlySet<RuntimeFlags.RuntimeFlag> => {
  return toSet((runtimeFlagsPatch.active(self) & runtimeFlagsPatch.enabled(self)) as RuntimeFlags.RuntimeFlags)
}

/** @internal */
export const disabledSet = (self: RuntimeFlagsPatch.RuntimeFlagsPatch): ReadonlySet<RuntimeFlags.RuntimeFlag> => {
  return toSet((runtimeFlagsPatch.active(self) & ~runtimeFlagsPatch.enabled(self)) as RuntimeFlags.RuntimeFlags)
}

/** @internal */
const renderFlag = (a: RuntimeFlags.RuntimeFlag): string => {
  return `${allFlags.find((b) => a === b)!}`
}

/** @internal */
export const renderPatch = (self: RuntimeFlagsPatch.RuntimeFlagsPatch): string => {
  const enabled = Array.from(enabledSet(self))
    .map((flag) => renderFlag(flag))
    .join(", ")
  const disabled = Array.from(disabledSet(self))
    .map((flag) => renderFlag(flag))
    .join(", ")
  return `RuntimeFlagsPatch(enabled = (${enabled}), disabled = (${disabled}))`
}
