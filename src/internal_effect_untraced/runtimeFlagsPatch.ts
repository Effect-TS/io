import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import type * as RuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"

/** @internal */
const BIT_MASK = 0xff

/** @internal */
const BIT_SHIFT = 0x08

/** @internal */
export const active = (patch: RuntimeFlagsPatch.RuntimeFlagsPatch): number => {
  return patch & BIT_MASK
}

/** @internal */
export const enabled = (patch: RuntimeFlagsPatch.RuntimeFlagsPatch): number => {
  return (patch >> BIT_SHIFT) & BIT_MASK
}

/** @internal */
export const make = (active: number, enabled: number): RuntimeFlagsPatch.RuntimeFlagsPatch => {
  return (((active) & BIT_MASK) + (((enabled & active) & BIT_MASK) << BIT_SHIFT)) as RuntimeFlagsPatch.RuntimeFlagsPatch
}

/** @internal */
export const empty = make(0, 0)

/** @internal */
export const enable = (flag: RuntimeFlags.RuntimeFlag): RuntimeFlagsPatch.RuntimeFlagsPatch => {
  return make(flag, flag)
}

/** @internal */
export const disable = (flag: RuntimeFlags.RuntimeFlag): RuntimeFlagsPatch.RuntimeFlagsPatch => {
  return make(flag, 0)
}

/** @internal */
export const isEmpty = (patch: RuntimeFlagsPatch.RuntimeFlagsPatch): boolean => {
  return patch === 0
}

/** @internal */
export const isActive = (flag: RuntimeFlagsPatch.RuntimeFlagsPatch) => {
  return (self: RuntimeFlagsPatch.RuntimeFlagsPatch): boolean => {
    return (active(self) & flag) !== 0
  }
}

/** @internal */
export const isEnabled = (flag: RuntimeFlags.RuntimeFlag) => {
  return (self: RuntimeFlagsPatch.RuntimeFlagsPatch): boolean => {
    return (enabled(self) & flag) !== 0
  }
}

/** @internal */
export const isDisabled = (flag: RuntimeFlags.RuntimeFlag) => {
  return (self: RuntimeFlagsPatch.RuntimeFlagsPatch): boolean => {
    return ((active(self) & flag) !== 0) && ((enabled(self) & flag) === 0)
  }
}

/** @internal */
export const exclude = (flag: RuntimeFlags.RuntimeFlag) => {
  return (self: RuntimeFlagsPatch.RuntimeFlagsPatch): RuntimeFlagsPatch.RuntimeFlagsPatch => {
    return make(active(self) & ~flag, enabled(self))
  }
}

/** @internal */
export const both = (that: RuntimeFlagsPatch.RuntimeFlagsPatch) => {
  return (self: RuntimeFlagsPatch.RuntimeFlagsPatch): RuntimeFlagsPatch.RuntimeFlagsPatch => {
    return make(active(self) | active(that), enabled(self) & enabled(that))
  }
}

/** @internal */
export const either = (that: RuntimeFlagsPatch.RuntimeFlagsPatch) => {
  return (self: RuntimeFlagsPatch.RuntimeFlagsPatch): RuntimeFlagsPatch.RuntimeFlagsPatch => {
    return make(active(self) | active(that), enabled(self) | enabled(that))
  }
}

/** @internal */
export const andThen = (that: RuntimeFlagsPatch.RuntimeFlagsPatch) => {
  return (self: RuntimeFlagsPatch.RuntimeFlagsPatch): RuntimeFlagsPatch.RuntimeFlagsPatch => {
    return (self | that) as RuntimeFlagsPatch.RuntimeFlagsPatch
  }
}

/** @internal */
export const inverse = (patch: RuntimeFlagsPatch.RuntimeFlagsPatch): RuntimeFlagsPatch.RuntimeFlagsPatch => {
  return make(enabled(patch), invert(active(patch)))
}

/** @internal */
export const invert = (n: number): number => {
  return (~n >>> 0) & BIT_MASK
}
