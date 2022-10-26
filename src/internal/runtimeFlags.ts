import type { RuntimeFlag, RuntimeFlags } from "@effect/io/Fiber/Runtime/Flags"
import type { RuntimeFlagsPatch } from "@effect/io/Fiber/Runtime/Flags/Patch"

// -----------------------------------------------------------------------------
// RuntimeFlags
// -----------------------------------------------------------------------------

/** @internal */
export const None: RuntimeFlag = 0 as RuntimeFlag

/** @internal */
export const Interruption: RuntimeFlag = 1 << 0 as RuntimeFlag

/** @internal */
export const CurrentFiber: RuntimeFlag = 1 << 1 as RuntimeFlag

/** @internal */
export const OpSupervision: RuntimeFlag = 1 << 2 as RuntimeFlag

/** @internal */
export const RuntimeMetrics: RuntimeFlag = 1 << 3 as RuntimeFlag

/** @internal */
export const FiberRoots: RuntimeFlag = 1 << 4 as RuntimeFlag

/** @internal */
export const WindDown: RuntimeFlag = 1 << 5 as RuntimeFlag

/** @internal */
export const CooperativeYielding: RuntimeFlag = 1 << 6 as RuntimeFlag

/** @internal */
export const allFlags: ReadonlyArray<RuntimeFlag> = [
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
export const isEnabled = (flag: RuntimeFlag) => {
  return (self: RuntimeFlags): boolean => (self & flag) !== 0
}

/** @internal */
export const isDisabled = (flag: RuntimeFlag) => {
  return (self: RuntimeFlags): boolean => !isEnabled(flag)(self)
}

/** @internal */
export const toSet = (self: RuntimeFlags): ReadonlySet<RuntimeFlag> => {
  return new Set(allFlags.filter((flag) => isEnabled(flag)(self)))
}

/** @internal */
export const render = (self: RuntimeFlags): string => {
  const active: Array<string> = []
  Object.entries(allFlags).forEach(([s, f]) => {
    if (isEnabled(f)(self)) {
      active.push(s)
    }
  })
  return `(${active.join(",")})`
}

// -----------------------------------------------------------------------------
// RuntimeFlagsPatch
// -----------------------------------------------------------------------------

/** @internal */
const base = (0xffffffff | 0)

/** @internal */
export const active = (self: RuntimeFlagsPatch): number => {
  return (self >> 0) & base
}

/** @internal */
export const enabled = (self: RuntimeFlagsPatch): number => {
  return (self >> 16) & base
}

/**
 * Returns a `ReadonlySet<number>` containing the `RuntimeFlags` described as
 * enabled by the specified `RuntimeFlagsPatch`.
 *
 * @category getters
 * @since 1.0.0
 */
export const enabledSet = (self: RuntimeFlagsPatch): ReadonlySet<RuntimeFlag> => {
  return toSet((active(self) & enabled(self)) as RuntimeFlags)
}

/**
 * Returns a `ReadonlySet<number>` containing the `RuntimeFlags` described as
 * disabled by the specified `RuntimeFlagsPatch`.
 *
 * @since 1.0.0
 * @category getters
 */
export const disabledSet = (self: RuntimeFlagsPatch): ReadonlySet<RuntimeFlag> => {
  return toSet((active(self) & ~enabled(self)) as RuntimeFlags)
}

const renderFlag = (a: RuntimeFlag): string => {
  return allFlags.find((b) => a === b)![0]
}

/** @internal */
export const renderPatch = (self: RuntimeFlagsPatch): string => {
  const enabledS = `(${Array.from(enabledSet(self)).map(renderFlag).join(", ")})`
  const disabledS = `(${Array.from(disabledSet(self)).map(renderFlag).join(", ")})`
  return `RuntimeFlags.Patch(enabled = ${enabledS}, disabled = ${disabledS})`
}
