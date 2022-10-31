import * as Versioned from "@effect/io/internal/stm/versioned"
import type * as Ref from "@effect/io/STM/Ref"

/** @internal */
export interface Entry {
  readonly ref: Ref.Ref<unknown>
  readonly expected: Versioned.Versioned<unknown>
  isChanged: boolean
  readonly isNew: boolean
  newValue: unknown
}

/** @internal */
export const make = (ref: Ref.Ref<unknown>, isNew: boolean): Entry => ({
  ref,
  isNew,
  isChanged: false,
  expected: ref.versioned,
  newValue: ref.versioned.value
})

export const unsafeGet = (self: Entry): unknown => {
  return self.newValue
}

/** @internal */
export const unsafeSet = (self: Entry, value: unknown): void => {
  self.isChanged = true
  self.newValue = value
}

/** @internal */
export const commit = (self: Entry): void => {
  self.ref.versioned = Versioned.make(self.newValue)
}

/** @internal */
export const copy = (self: Entry): Entry => ({
  ref: self.ref,
  isNew: self.isNew,
  isChanged: self.isChanged,
  expected: self.ref.versioned,
  newValue: self.ref.versioned.value
})

/** @internal */
export const isValid = (self: Entry): boolean => {
  return self.ref.versioned === self.expected
}

/** @internal */
export const isInvalid = (self: Entry): boolean => {
  return self.ref.versioned !== self.expected
}

/** @internal */
export const isChanged = (self: Entry): boolean => {
  return self.isChanged
}
