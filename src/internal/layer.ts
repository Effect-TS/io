import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import * as OpCodes from "@effect/io/internal/opCodes/layer"
import type * as Layer from "@effect/io/Layer"
import type * as Context from "@fp-ts/data/Context"

/** @internal */
const LayerSymbolKey = "@effect/io/Layer"

/** @internal */
export const LayerTypeId: Layer.LayerTypeId = Symbol.for(
  LayerSymbolKey
) as Layer.LayerTypeId

/** @internal */
const layerVariance = {
  _RIn: (_: never) => _,
  _E: (_: never) => _,
  _ROut: (_: unknown) => _
}

/** @internal */
const proto = {
  [LayerTypeId]: layerVariance
}

/** @internal */
export type Primitive =
  | ExtendScope
  | Fold
  | Fresh
  | FromEffect
  | Scoped
  | Suspend
  | ProvideTo
  | ZipWithPar

/** @internal */
export type Op<OpCode extends number, Body = {}> = Layer.Layer<unknown, unknown, unknown> & Body & {
  readonly op: OpCode
}

/** @internal */
export interface ExtendScope extends
  Op<OpCodes.OP_EXTEND_SCOPE, {
    readonly layer: Layer.Layer<unknown, unknown, unknown>
  }>
{}

/** @internal */
export interface Fold extends
  Op<OpCodes.OP_FOLD, {
    readonly layer: Layer.Layer<unknown, unknown, unknown>
    readonly failureK: (cause: Cause.Cause<unknown>) => Layer.Layer<unknown, unknown, unknown>
    readonly successK: (context: Context.Context<unknown>) => Layer.Layer<unknown, unknown, unknown>
  }>
{}

/** @internal */
export interface Fresh extends
  Op<OpCodes.OP_FRESH, {
    readonly layer: Layer.Layer<unknown, unknown, unknown>
  }>
{}

/** @internal */
export interface FromEffect extends
  Op<OpCodes.OP_FROM_EFFECT, {
    readonly effect: Effect.Effect<unknown, unknown, Context.Context<unknown>>
  }>
{}

/** @internal */
export interface Scoped extends
  Op<OpCodes.OP_SCOPED, {
    readonly effect: Effect.Effect<unknown, unknown, Context.Context<unknown>>
  }>
{}

/** @internal */
export interface Suspend extends
  Op<OpCodes.OP_SUSPEND, {
    readonly evaluate: () => Layer.Layer<unknown, unknown, unknown>
  }>
{}

/** @internal */
export interface ProvideTo extends
  Op<OpCodes.OP_PROVIDE_TO, {
    readonly first: Layer.Layer<unknown, unknown, unknown>
    readonly second: Layer.Layer<unknown, unknown, unknown>
  }>
{}

/** @internal */
export interface ZipWithPar extends
  Op<OpCodes.OP_ZIP_WITH_PAR, {
    readonly first: Layer.Layer<unknown, unknown, unknown>
    readonly second: Layer.Layer<unknown, unknown, unknown>
    readonly zipK: (
      left: Context.Context<unknown>,
      right: Context.Context<unknown>
    ) => Context.Context<unknown>
  }>
{}

/** @internal */
export const isLayer = (u: unknown): u is Layer.Layer<unknown, unknown, unknown> => {
  return typeof u === "object" && u != null && LayerTypeId in u
}

/** @internal */
export function fromEffectEnvironment<R, E, A>(
  effect: Effect.Effect<R, E, Context.Context<A>>
): Layer.Layer<R, E, A> {
  const suspend = Object.create(proto)
  suspend.op = OpCodes.OP_SUSPEND
  suspend.evaluate = () => {
    const fromEffect = Object.create(proto)
    fromEffect.op = OpCodes.OP_FROM_EFFECT
    fromEffect.effect = effect
  }
  return suspend
}
