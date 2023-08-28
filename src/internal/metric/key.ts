import type * as Chunk from "@effect/data/Chunk"
import type * as Duration from "@effect/data/Duration"
import * as Equal from "@effect/data/Equal"
import { dual, pipe } from "@effect/data/Function"
import * as Hash from "@effect/data/Hash"
import * as HashSet from "@effect/data/HashSet"
import * as Option from "@effect/data/Option"
import { pipeArguments } from "@effect/data/Pipeable"
import * as metricKeyType from "@effect/io/internal/metric/keyType"
import * as metricLabel from "@effect/io/internal/metric/label"
import type * as MetricBoundaries from "@effect/io/MetricBoundaries"
import type * as MetricKey from "@effect/io/MetricKey"
import type * as MetricKeyType from "@effect/io/MetricKeyType"
import type * as MetricLabel from "@effect/io/MetricLabel"

/** @internal */
const MetricKeySymbolKey = "@effect/io/MetricKey"

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
    readonly description: Option.Option<string>,
    readonly tags: HashSet.HashSet<MetricLabel.MetricLabel> = HashSet.empty()
  ) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(this.name),
      Hash.combine(Hash.hash(this.keyType)),
      Hash.combine(Hash.hash(this.description)),
      Hash.combine(Hash.hash(this.tags))
    )
  }
  [Equal.symbol](u: unknown): boolean {
    return isMetricKey(u) &&
      this.name === u.name &&
      Equal.equals(this.keyType, u.keyType) &&
      Equal.equals(this.description, u.description) &&
      Equal.equals(this.tags, u.tags)
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const isMetricKey = (u: unknown): u is MetricKey.MetricKey<MetricKeyType.MetricKeyType<unknown, unknown>> =>
  typeof u === "object" && u != null && MetricKeyTypeId in u

/** @internal */
export const counter = (name: string, description?: string): MetricKey.MetricKey.Counter =>
  new MetricKeyImpl(name, metricKeyType.counter, Option.fromNullable(description))

/** @internal */
export const frequency = (name: string, description?: string): MetricKey.MetricKey.Frequency =>
  new MetricKeyImpl(name, metricKeyType.frequency, Option.fromNullable(description))

/** @internal */
export const gauge = (name: string, description?: string): MetricKey.MetricKey.Gauge =>
  new MetricKeyImpl(name, metricKeyType.gauge, Option.fromNullable(description))

/** @internal */
export const histogram = (
  name: string,
  boundaries: MetricBoundaries.MetricBoundaries,
  description?: string
): MetricKey.MetricKey.Histogram =>
  new MetricKeyImpl(
    name,
    metricKeyType.histogram(boundaries),
    Option.fromNullable(description)
  )

/** @internal */
export const summary = (
  options: {
    readonly name: string
    readonly maxAge: Duration.DurationInput
    readonly maxSize: number
    readonly error: number
    readonly quantiles: Chunk.Chunk<number>
    readonly description?: string
  }
): MetricKey.MetricKey.Summary =>
  new MetricKeyImpl(
    options.name,
    metricKeyType.summary(options),
    Option.fromNullable(options.description)
  )

/** @internal */
export const tagged = dual<
  (
    key: string,
    value: string
  ) => <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey.MetricKey<Type>
  ) => MetricKey.MetricKey<Type>,
  <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey.MetricKey<Type>,
    key: string,
    value: string
  ) => MetricKey.MetricKey<Type>
>(3, (self, key, value) => taggedWithLabelSet(self, HashSet.make(metricLabel.make(key, value))))

/** @internal */
export const taggedWithLabels = dual<
  (
    extraTags: Iterable<MetricLabel.MetricLabel>
  ) => <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey.MetricKey<Type>
  ) => MetricKey.MetricKey<Type>,
  <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey.MetricKey<Type>,
    extraTags: Iterable<MetricLabel.MetricLabel>
  ) => MetricKey.MetricKey<Type>
>(2, (self, extraTags) => taggedWithLabelSet(self, HashSet.fromIterable(extraTags)))

/** @internal */
export const taggedWithLabelSet = dual<
  (
    extraTags: HashSet.HashSet<MetricLabel.MetricLabel>
  ) => <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey.MetricKey<Type>
  ) => MetricKey.MetricKey<Type>,
  <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey.MetricKey<Type>,
    extraTags: HashSet.HashSet<MetricLabel.MetricLabel>
  ) => MetricKey.MetricKey<Type>
>(2, (self, extraTags) =>
  HashSet.size(extraTags) === 0
    ? self
    : new MetricKeyImpl(self.name, self.keyType, self.description, pipe(self.tags, HashSet.union(extraTags))))
