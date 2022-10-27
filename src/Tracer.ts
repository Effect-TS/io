/**
 * @since 1.0.0
 */
import type { Option } from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 * @category symbols
 */
export const SpanTypeId = Symbol.for("@effect/io/Tracer/Span")

/**
 * @since 1.0.0
 * @category symbols
 */
export type SpanTypeId = typeof SpanTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Span {
  readonly [SpanTypeId]: SpanTypeId
  readonly parent: Option<Span>
  readonly name: string
  readonly trace?: string
}

/**
 * Returns `true` if the specified value is a `Span`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isSpan = (u: unknown): u is Span => {
  return typeof u === "object" && u != null && SpanTypeId in u
}
