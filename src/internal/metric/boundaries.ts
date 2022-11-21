import type * as MetricBoundaries from "@effect/io/Metric/Boundaries"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
const MetricBoundariesSymbolKey = "@effect/io/Metric/Boundaries"

/** @internal */
export const MetricBoundariesTypeId: MetricBoundaries.MetricBoundariesTypeId = Symbol.for(
  MetricBoundariesSymbolKey
) as MetricBoundaries.MetricBoundariesTypeId

/** @internal */
class MetricBoundariesImpl implements MetricBoundaries.MetricBoundaries {
  readonly [MetricBoundariesTypeId]: MetricBoundaries.MetricBoundariesTypeId = MetricBoundariesTypeId
  constructor(readonly values: Chunk.Chunk<number>) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(MetricBoundariesSymbolKey),
      Equal.hashCombine(Equal.hash(this.values))
    )
  }
  [Equal.symbolEqual](u: unknown): boolean {
    return isMetricBoundaries(u) && Equal.equals(this.values, u.values)
  }
}

/** @internal */
export const isMetricBoundaries = (u: unknown): u is MetricBoundaries.MetricBoundaries => {
  return typeof u === "object" && u != null && MetricBoundariesTypeId in u
}

/** @internal */
export const fromChunk = (chunk: Chunk.Chunk<number>): MetricBoundaries.MetricBoundaries => {
  const values = pipe(
    chunk,
    Chunk.concat(Chunk.singleton(Number.POSITIVE_INFINITY)),
    Chunk.dedupe
  )
  return new MetricBoundariesImpl(values)
}

/** @internal */
export const linear = (start: number, width: number, count: number): MetricBoundaries.MetricBoundaries => {
  return pipe(
    Chunk.range(0, count - 1),
    Chunk.map((i) => start + i * width),
    fromChunk
  )
}

/** @internal */
export const exponential = (start: number, factor: number, count: number): MetricBoundaries.MetricBoundaries => {
  return pipe(
    Chunk.range(0, count - 1),
    Chunk.map((i) => start * Math.pow(factor, i)),
    fromChunk
  )
}
