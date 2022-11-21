import * as Interval from "@effect/io/Schedule/Interval"
import type * as Intervals from "@effect/io/Schedule/Intervals"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/** @internal */
const IntervalsSymbolKey = "@effect/io/Schedule/Intervals"

/** @internal */
export const IntervalsTypeId: Intervals.IntervalsTypeId = Symbol.for(
  IntervalsSymbolKey
) as Intervals.IntervalsTypeId

/** @internal */
export const make = (intervals: List.List<Interval.Interval>): Intervals.Intervals => {
  return {
    [IntervalsTypeId]: IntervalsTypeId,
    intervals
  }
}
/** @internal */
export const empty: Intervals.Intervals = make(List.empty())

/** @internal */
export const fromIterable = (intervals: Iterable<Interval.Interval>): Intervals.Intervals => {
  return Array.from(intervals).reduce(
    (intervals, interval) => pipe(intervals, union(make(List.of(interval)))),
    empty
  )
}

/** @internal */
export const union = (that: Intervals.Intervals) => {
  return (self: Intervals.Intervals): Intervals.Intervals => {
    if (List.isNil(that.intervals)) {
      return self
    }
    if (List.isNil(self.intervals)) {
      return that
    }
    if (self.intervals.head.startMillis < that.intervals.head.startMillis) {
      return unionLoop(self.intervals.tail, that.intervals, self.intervals.head, List.nil())
    }
    return unionLoop(self.intervals, that.intervals.tail, that.intervals.head, List.nil())
  }
}

/** @internal */
const unionLoop = (
  _self: List.List<Interval.Interval>,
  _that: List.List<Interval.Interval>,
  _interval: Interval.Interval,
  _acc: List.List<Interval.Interval>
): Intervals.Intervals => {
  let self = _self
  let that = _that
  let interval = _interval
  let acc = _acc
  while (List.isCons(self) || List.isCons(that)) {
    if (List.isNil(self) && List.isCons(that)) {
      if (interval.endMillis < that.head.startMillis) {
        acc = pipe(acc, List.prepend(interval))
        interval = that.head
        that = that.tail
        self = List.nil()
      } else {
        interval = Interval.make(interval.startMillis, that.head.endMillis)
        that = that.tail
        self = List.nil()
      }
    } else if (List.isCons(self) && List.isNil(that)) {
      if (interval.endMillis < self.head.startMillis) {
        acc = pipe(acc, List.prepend(interval))
        interval = self.head
        that = List.nil()
        self = self.tail
      } else {
        interval = Interval.make(interval.startMillis, self.head.endMillis)
        that = List.nil()
        self = self.tail
      }
    } else if (List.isCons(self) && List.isCons(that)) {
      if (self.head.startMillis < that.head.startMillis) {
        if (interval.endMillis < self.head.startMillis) {
          acc = pipe(acc, List.prepend(interval))
          interval = self.head
          self = self.tail
        } else {
          interval = Interval.make(interval.startMillis, self.head.endMillis)
          self = self.tail
        }
      } else if (interval.endMillis < that.head.startMillis) {
        acc = pipe(acc, List.prepend(interval))
        interval = that.head
        that = that.tail
      } else {
        interval = Interval.make(interval.startMillis, that.head.endMillis)
        that = that.tail
      }
    } else {
      throw new Error("BUG: Intervals.unionLoop - please report an issue at https://github.com/Effect-TS/io/issues")
    }
  }
  return make(pipe(acc, List.prepend(interval), List.reverse))
}

/** @internal */
export const intersect = (that: Intervals.Intervals) => {
  return (self: Intervals.Intervals): Intervals.Intervals => intersectLoop(self.intervals, that.intervals, List.nil())
}

/** @internal */
const intersectLoop = (
  _left: List.List<Interval.Interval>,
  _right: List.List<Interval.Interval>,
  _acc: List.List<Interval.Interval>
): Intervals.Intervals => {
  let left = _left
  let right = _right
  let acc = _acc
  while (List.isCons(left) && List.isCons(right)) {
    const interval = pipe(left.head, Interval.intersect(right.head))
    const intervals = Interval.isEmpty(interval) ? acc : pipe(acc, List.prepend(interval))
    if (pipe(left.head, Interval.lessThan(right.head))) {
      left = left.tail
    } else {
      right = right.tail
    }
    acc = intervals
  }
  return make(List.reverse(acc))
}

/** @internal */
export const start = (self: Intervals.Intervals): number => {
  return pipe(
    self.intervals,
    List.head,
    Option.getOrElse(() => Interval.empty)
  ).startMillis
}

/** @internal */
export const end = (self: Intervals.Intervals): number => {
  return pipe(
    self.intervals,
    List.head,
    Option.getOrElse(() => Interval.empty)
  ).endMillis
}

/** @internal */
export const lessThan = (that: Intervals.Intervals) => {
  return (self: Intervals.Intervals): boolean => {
    return start(self) < start(that)
  }
}

/** @internal */
export const isNonEmpty = (self: Intervals.Intervals): boolean => {
  return List.isCons(self.intervals)
}

/** @internal */
export const max = (that: Intervals.Intervals) => {
  return (self: Intervals.Intervals): Intervals.Intervals => {
    return lessThan(that)(self) ? that : self
  }
}
