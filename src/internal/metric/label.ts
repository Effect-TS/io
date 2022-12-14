import type * as MetricLabel from "@effect/io/Metric/Label"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
const MetricLabelSymbolKey = "@effect/io/Metric/Label"

/** @internal */
export const MetricLabelTypeId: MetricLabel.MetricLabelTypeId = Symbol.for(
  MetricLabelSymbolKey
) as MetricLabel.MetricLabelTypeId

/** @internal */
class MetricLabelImpl implements MetricLabel.MetricLabel {
  readonly [MetricLabelTypeId]: MetricLabel.MetricLabelTypeId = MetricLabelTypeId
  constructor(readonly key: string, readonly value: string) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(MetricLabelSymbolKey),
      Equal.hashCombine(Equal.hash(this.key)),
      Equal.hashCombine(Equal.hash(this.value))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isMetricLabel(that) &&
      this.key === that.key &&
      this.value === that.value
  }
}

/** @internal */
export const make = (key: string, value: string): MetricLabel.MetricLabel => {
  return new MetricLabelImpl(key, value)
}

/** @internal */
export const isMetricLabel = (u: unknown): u is MetricLabel.MetricLabel => {
  return typeof u === "object" && u != null && MetricLabelTypeId in u
}
