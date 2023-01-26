import * as Debug from "@effect/io/Debug"
import type * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import type * as RuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"

/** @internal */
const BIT_MASK = 0xff

/** @internal */
const BIT_SHIFT = 0x08

/** @internal */
export const active = (patch: RuntimeFlagsPatch.RuntimeFlagsPatch): number => patch & BIT_MASK

/** @internal */
export const enabled = (patch: RuntimeFlagsPatch.RuntimeFlagsPatch): number => (patch >> BIT_SHIFT) & BIT_MASK

/** @internal */
export const make = (active: number, enabled: number): RuntimeFlagsPatch.RuntimeFlagsPatch =>
  (((active) & BIT_MASK) + (((enabled & active) & BIT_MASK) << BIT_SHIFT)) as RuntimeFlagsPatch.RuntimeFlagsPatch

/** @internal */
export const empty = make(0, 0)

/** @internal */
export const enable = (flag: RuntimeFlags.RuntimeFlag): RuntimeFlagsPatch.RuntimeFlagsPatch => make(flag, flag)

/** @internal */
export const disable = (flag: RuntimeFlags.RuntimeFlag): RuntimeFlagsPatch.RuntimeFlagsPatch => make(flag, 0)

/** @internal */
export const isEmpty = (patch: RuntimeFlagsPatch.RuntimeFlagsPatch): boolean => patch === 0

/** @internal */
export const isActive = Debug.dual<
  (self: RuntimeFlagsPatch.RuntimeFlagsPatch, flag: RuntimeFlagsPatch.RuntimeFlagsPatch) => boolean,
  (flag: RuntimeFlagsPatch.RuntimeFlagsPatch) => (self: RuntimeFlagsPatch.RuntimeFlagsPatch) => boolean
>(2, (self, flag) => (active(self) & flag) !== 0)

/** @internal */
export const isEnabled = Debug.dual<
  (self: RuntimeFlagsPatch.RuntimeFlagsPatch, flag: RuntimeFlags.RuntimeFlag) => boolean,
  (flag: RuntimeFlags.RuntimeFlag) => (self: RuntimeFlagsPatch.RuntimeFlagsPatch) => boolean
>(2, (self, flag) => (enabled(self) & flag) !== 0)

/** @internal */
export const isDisabled = Debug.dual<
  (self: RuntimeFlagsPatch.RuntimeFlagsPatch, flag: RuntimeFlags.RuntimeFlag) => boolean,
  (flag: RuntimeFlags.RuntimeFlag) => (self: RuntimeFlagsPatch.RuntimeFlagsPatch) => boolean
>(2, (self, flag) => ((active(self) & flag) !== 0) && ((enabled(self) & flag) === 0))

/** @internal */
export const exclude = Debug.dual<
  (self: RuntimeFlagsPatch.RuntimeFlagsPatch, flag: RuntimeFlags.RuntimeFlag) => RuntimeFlagsPatch.RuntimeFlagsPatch,
  (flag: RuntimeFlags.RuntimeFlag) => (self: RuntimeFlagsPatch.RuntimeFlagsPatch) => RuntimeFlagsPatch.RuntimeFlagsPatch
>(2, (self, flag) => make(active(self) & ~flag, enabled(self)))

/** @internal */
export const both = Debug.dual<
  (
    self: RuntimeFlagsPatch.RuntimeFlagsPatch,
    that: RuntimeFlagsPatch.RuntimeFlagsPatch
  ) => RuntimeFlagsPatch.RuntimeFlagsPatch,
  (
    that: RuntimeFlagsPatch.RuntimeFlagsPatch
  ) => (
    self: RuntimeFlagsPatch.RuntimeFlagsPatch
  ) => RuntimeFlagsPatch.RuntimeFlagsPatch
>(2, (self, that) => make(active(self) | active(that), enabled(self) & enabled(that)))

/** @internal */
export const either = Debug.dual<
  (
    self: RuntimeFlagsPatch.RuntimeFlagsPatch,
    that: RuntimeFlagsPatch.RuntimeFlagsPatch
  ) => RuntimeFlagsPatch.RuntimeFlagsPatch,
  (
    that: RuntimeFlagsPatch.RuntimeFlagsPatch
  ) => (
    self: RuntimeFlagsPatch.RuntimeFlagsPatch
  ) => RuntimeFlagsPatch.RuntimeFlagsPatch
>(2, (self, that) => make(active(self) | active(that), enabled(self) | enabled(that)))

/** @internal */
export const andThen = Debug.dual<
  (
    self: RuntimeFlagsPatch.RuntimeFlagsPatch,
    that: RuntimeFlagsPatch.RuntimeFlagsPatch
  ) => RuntimeFlagsPatch.RuntimeFlagsPatch,
  (
    that: RuntimeFlagsPatch.RuntimeFlagsPatch
  ) => (
    self: RuntimeFlagsPatch.RuntimeFlagsPatch
  ) => RuntimeFlagsPatch.RuntimeFlagsPatch
>(2, (self, that) => (self | that) as RuntimeFlagsPatch.RuntimeFlagsPatch)

/** @internal */
export const inverse = (patch: RuntimeFlagsPatch.RuntimeFlagsPatch): RuntimeFlagsPatch.RuntimeFlagsPatch =>
  make(enabled(patch), invert(active(patch)))

/** @internal */
export const invert = (n: number): number => (~n >>> 0) & BIT_MASK
