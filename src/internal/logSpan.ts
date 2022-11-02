import type * as LogSpan from "@effect/io/Logger/Span"

/** @internal */
export const make = (label: string, startTime: number): LogSpan.LogSpan => ({
  label,
  startTime
})
