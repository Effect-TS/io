import type * as Interval from "@effect/io/Schedule/Interval"
import * as Duration from "@fp-ts/data/Duration"
import * as Option from "@fp-ts/data/Option"

/** @internal */
const IntervalSymbolKey = "@effect/io/Schedule/Interval"

/** @internal */
export const IntervalTypeId: Interval.IntervalTypeId = Symbol.for(
  IntervalSymbolKey
) as Interval.IntervalTypeId

/** @internal */
export const empty: Interval.Interval = {
  [IntervalTypeId]: IntervalTypeId,
  startMillis: 0,
  endMillis: 0
}

/** @internal */
export const make = (startMillis: number, endMillis: number): Interval.Interval => {
  if (startMillis > endMillis) {
    return empty
  }
  return {
    [IntervalTypeId]: IntervalTypeId,
    startMillis,
    endMillis
  }
}

/** @internal */
export const lessThan = (that: Interval.Interval) => {
  return (self: Interval.Interval): boolean => min(that)(self) === self
}

/** @internal */
export const min = (that: Interval.Interval) => {
  return (self: Interval.Interval): Interval.Interval => {
    if (self.endMillis <= that.startMillis) return self
    if (that.endMillis <= self.startMillis) return that
    if (self.startMillis < that.startMillis) return self
    if (that.startMillis < self.startMillis) return that
    if (self.endMillis <= that.endMillis) return self
    return that
  }
}

/** @internal */
export const max = (that: Interval.Interval) => {
  return (self: Interval.Interval): Interval.Interval => {
    return min(that)(self) === self ? that : self
  }
}

/** @internal */
export const isEmpty = (self: Interval.Interval): boolean => {
  return self.startMillis >= self.endMillis
}

/** @internal */
export const isNonEmpty = (self: Interval.Interval): boolean => {
  return !isEmpty(self)
}

/** @internal */
export const intersect = (that: Interval.Interval) => {
  return (self: Interval.Interval): Interval.Interval => {
    const start = Math.max(self.startMillis, that.startMillis)
    const end = Math.min(self.endMillis, that.endMillis)
    return make(start, end)
  }
}

/** @internal */
export const size = (self: Interval.Interval): Duration.Duration => {
  return Duration.millis(self.endMillis - self.startMillis)
}

/** @internal */
export const union = (that: Interval.Interval) => {
  return (self: Interval.Interval): Option.Option<Interval.Interval> => {
    const start = Math.max(self.startMillis, that.startMillis)
    const end = Math.min(self.endMillis, that.endMillis)
    return start < end ? Option.none : Option.some(make(start, end))
  }
}

/** @internal */
export const after = (startMilliseconds: number): Interval.Interval => {
  return make(startMilliseconds, Number.POSITIVE_INFINITY)
}

/** @internal */
export const before = (endMilliseconds: number): Interval.Interval => {
  return make(Number.NEGATIVE_INFINITY, endMilliseconds)
}
