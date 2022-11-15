import * as metricKeyType from "@effect/io/internal/metric/keyType"
import * as metricLabel from "@effect/io/internal/metric/label"
import type * as MetricBoundaries from "@effect/io/Metric/Boundaries"
import type * as MetricKey from "@effect/io/Metric/Key"
import type * as MetricKeyType from "@effect/io/Metric/KeyType"
import type * as MetricLabel from "@effect/io/Metric/Label"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Duration from "@fp-ts/data/Duration"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/** @internal */
const MetricKeySymbolKey = "@effect/io/Metric/Key"

/** @internal */
export const MetricKeyTypeId: MetricKey.MetricKeyTypeId = Symbol.for(
  MetricKeySymbolKey
) as MetricKey.MetricKeyTypeId

/** @internal */
const metricKeyVariance = {
  _Type: (_: never) => _
}

/** @internal */
class MetricKeyImpl<Type extends MetricKeyType.MetricKeyType<any, any>> implements MetricKey.MetricKey<Type> {
  readonly [MetricKeyTypeId] = metricKeyVariance
  constructor(
    readonly name: string,
    readonly keyType: Type,
    readonly tags: HashSet.HashSet<MetricLabel.MetricLabel> = HashSet.empty()
  ) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(this.name),
      Equal.hashCombine(Equal.hash(this.keyType)),
      Equal.hashCombine(Equal.hash(this.tags))
    )
  }
  [Equal.symbolEqual](u: unknown): boolean {
    return isMetricKey(u) &&
      this.name === u.name &&
      Equal.equals(this.keyType, u.keyType) &&
      Equal.equals(this.tags, u.tags)
  }
}

/** @internal */
export const isMetricKey = (u: unknown): u is MetricKey.MetricKey<MetricKeyType.MetricKeyType<unknown, unknown>> => {
  return typeof u === "object" && u != null && MetricKeyTypeId in u
}

/** @internal */
export const counter = (name: string): MetricKey.MetricKey.Counter => {
  return new MetricKeyImpl(name, metricKeyType.counter)
}

/** @internal */
export const frequency = (name: string): MetricKey.MetricKey.Frequency => {
  return new MetricKeyImpl(name, metricKeyType.frequency)
}

/** @internal */
export const gauge = (name: string): MetricKey.MetricKey.Gauge => {
  return new MetricKeyImpl(name, metricKeyType.gauge)
}

/** @internal */
export const histogram = (
  name: string,
  boundaries: MetricBoundaries.MetricBoundaries
): MetricKey.MetricKey.Histogram => {
  return new MetricKeyImpl(name, metricKeyType.histogram(boundaries))
}

/** @internal */
export const summary = (
  name: string,
  maxAge: Duration.Duration,
  maxSize: number,
  error: number,
  quantiles: Chunk.Chunk<number>
): MetricKey.MetricKey.Summary => {
  return new MetricKeyImpl(name, metricKeyType.summary(maxAge, maxSize, error, quantiles))
}

/** @internal */
export const tagged = (key: string, value: string) => {
  return <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey.MetricKey<Type>
  ): MetricKey.MetricKey<Type> => {
    return pipe(self, taggedWithLabelSet(HashSet.make(metricLabel.make(key, value))))
  }
}

/** @internal */
export const taggedWithLabels = (extraTags: Iterable<MetricLabel.MetricLabel>) => {
  return <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey.MetricKey<Type>
  ): MetricKey.MetricKey<Type> => {
    return pipe(self, taggedWithLabelSet(HashSet.from(extraTags)))
  }
}

/** @internal */
export const taggedWithLabelSet = (extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => {
  return <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey.MetricKey<Type>
  ): MetricKey.MetricKey<Type> => {
    if (HashSet.size(extraTags) === 0) {
      return self
    }
    return new MetricKeyImpl(self.name, self.keyType, pipe(self.tags, HashSet.union(extraTags)))
  }
}
