/**
 * @since 1.0.0
 */
import type { Exit } from "@effect/io/Exit"
import type { FiberRef } from "@effect/io/FiberRef"
import * as core from "@effect/io/internal/core"
import * as Option from "@fp-ts/data/Option"

/**
 * @category symbols
 * @since 1.0.0
 */
export const TracerTypeId: unique symbol = Symbol.for("@effect/io/Tracer")

/**
 * @category symbols
 * @since 1.0.0
 */
export type TracerTypeId = typeof TracerTypeId

/**
 * The Tracer service is used to provide tracing facilities to Effect.
 *
 * This service is meant to be implemented by exporters such as opentelemetry.
 *
 * @category models
 * @since 1.0.0
 */
export interface Tracer<S> {
  readonly [TracerTypeId]: TracerTypeId
  readonly ref: FiberRef<Option.Option<S>>
  readonly create: (
    name: string,
    attributes: Record<string, string>,
    parent: Option.Option<S>,
    trace: string | undefined
  ) => S
  readonly add: (span: S, key: string, value: string) => void
  readonly status: (span: S, exit: Exit<any, any>) => void
  readonly end: (span: S) => void
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = <S>(
  args: Omit<Tracer<S>, TracerTypeId>
): Tracer<S> => ({ ...args, [TracerTypeId]: TracerTypeId })

/**
 * @category fiberRefs
 * @since 1.0.0
 */
export const currentTracer = core.fiberRefUnsafeMake<Option.Option<Tracer<any>>>(Option.none)
