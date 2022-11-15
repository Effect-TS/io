/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal/metric/state"
import type * as MetricKeyType from "@effect/io/Metric/KeyType"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Equal from "@fp-ts/data/Equal"
import type * as HashMap from "@fp-ts/data/HashMap"
import type * as Option from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 * @category symbols
 */
export const MetricStateTypeId: unique symbol = internal.MetricStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type MetricStateTypeId = typeof MetricStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const CounterStateTypeId: unique symbol = internal.CounterStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type CounterStateTypeId = typeof CounterStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const FrequencyStateTypeId: unique symbol = internal.FrequencyStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type FrequencyStateTypeId = typeof FrequencyStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const GaugeStateTypeId: unique symbol = internal.GaugeStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type GaugeStateTypeId = typeof GaugeStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const HistogramStateTypeId: unique symbol = internal.HistogramStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type HistogramStateTypeId = typeof HistogramStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const SummaryStateTypeId: unique symbol = internal.SummaryStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type SummaryStateTypeId = typeof SummaryStateTypeId

/**
 * A `MetricState` describes the state of a metric. The type parameter of a
 * metric state corresponds to the type of the metric key (`MetricStateType`).
 * This phantom type parameter is used to tie keys to their expected states.
 *
 * @since 1.0.0
 * @category models
 */
export interface MetricState<A> extends MetricState.Variance<A>, Equal.Equal {}

/**
 * @since 1.0.0
 */
export declare namespace MetricState {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Untyped = MetricState<any>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Counter = MetricState<MetricKeyType.MetricKeyType.Counter> & {
    readonly [CounterStateTypeId]: CounterStateTypeId
    readonly count: number
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Frequency = MetricState<MetricKeyType.MetricKeyType.Frequency> & {
    readonly [FrequencyStateTypeId]: FrequencyStateTypeId
    readonly occurrences: HashMap.HashMap<string, number>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Gauge = MetricState<MetricKeyType.MetricKeyType.Gauge> & {
    readonly [GaugeStateTypeId]: GaugeStateTypeId
    readonly value: number
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Histogram = MetricState<MetricKeyType.MetricKeyType.Histogram> & {
    readonly [HistogramStateTypeId]: HistogramStateTypeId
    readonly buckets: Chunk.Chunk<readonly [number, number]>
    readonly count: number
    readonly min: number
    readonly max: number
    readonly sum: number
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Summary = MetricState<MetricKeyType.MetricKeyType.Summary> & {
    readonly [SummaryStateTypeId]: SummaryStateTypeId
    readonly error: number
    readonly quantiles: Chunk.Chunk<readonly [number, Option.Option<number>]>
    readonly count: number
    readonly min: number
    readonly max: number
    readonly sum: number
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [MetricStateTypeId]: {
      readonly _A: (_: A) => void
    }
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const counter = internal.counter

/**
 * @since 1.0.0
 * @category constructors
 */
export const frequency = internal.frequency

/**
 * @since 1.0.0
 * @category constructors
 */
export const gauge = internal.gauge

/**
 * @since 1.0.0
 * @category constructors
 */
export const histogram = internal.histogram

/**
 * @since 1.0.0
 * @category constructors
 */
export const summary = internal.summary

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMetricState = internal.isMetricState

/**
 * @since 1.0.0
 * @category refinements
 */
export const isCounterState = internal.isCounterState

/**
 * @since 1.0.0
 * @category refinements
 */
export const isFrequencyState = internal.isFrequencyState

/**
 * @since 1.0.0
 * @category refinements
 */
export const isGaugeState = internal.isGaugeState

/**
 * @since 1.0.0
 * @category refinements
 */
export const isHistogramState = internal.isHistogramState

/**
 * @since 1.0.0
 * @category refinements
 */
export const isSummaryState = internal.isSummaryState
