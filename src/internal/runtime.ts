import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import type * as Fiber from "@effect/io/Fiber"
import * as Equal from "@fp-ts/data/Equal"
import type { LazyArg } from "@fp-ts/data/Function"

//
// Symbols
//

/** @internal */
export const EffectTypeId: Effect.EffectTypeId = Symbol.for("@effect/io/Effect") as Effect.EffectTypeId

//
// Primitives
//

/** @internal */
export type Primitive =
  | Success
  | Failure
  | Async
  | Sync
  | Yield
  | While
  | WithRuntime
  | UpdateRuntimeFlags
  | OnSuccess
  | OnFailure
  | OnSuccessAndFailure

/** @internal */
export const primitive = <Tag extends Primitive["_tag"]>(
  tag: Tag,
  body: Extract<Primitive, { _tag: Tag }>["body"],
  trace?: string
): Effect.Effect<never, never, never> => new Op(tag, body, trace)

/** @internal */
export class Op<Tag extends string, Body = void> implements Effect.Effect<unknown, unknown, unknown> {
  readonly [EffectTypeId] = {
    _R: (_: never) => _,
    _E: (_: never) => _,
    _A: (_: never) => _
  }
  constructor(readonly _tag: Tag, readonly body: Body, readonly trace?: string) {}
  [Equal.symbolEqual](that: unknown) {
    return this === that
  }
  [Equal.symbolHash]() {
    return Equal.hashRandom(this)
  }
}

/** @internal */
export interface Success extends Op<"Success", { readonly value: unknown }> {}

/** @internal */
export interface Failure extends Op<"Failure", { readonly error: unknown }> {}

/** @internal */
export interface Yield extends Op<"Yield"> {}

/** @internal */
export interface While extends
  Op<"While", {
    readonly check: () => boolean
    readonly body: () => Primitive
    readonly process: (a: unknown) => void
  }>
{}

/** @internal */
export interface WithRuntime extends
  Op<"WithRuntime", {
    readonly withRuntime: (fiber: Fiber.Runtime<unknown, unknown>, status: Fiber.Status.Running) => Primitive
  }>
{}

/** @internal */
export interface UpdateRuntimeFlags extends
  Op<"UpdateRuntimeFlags", {
    readonly update: Fiber.Runtime.Flags.Patch
    readonly scope?: (oldRuntimeFlags: Fiber.Runtime.Flags) => Primitive
  }>
{}

/** @internal */
export interface OnFailure extends
  Op<"OnFailure", {
    readonly first: Primitive
    readonly failK: (a: Cause.Cause<unknown>) => Primitive
  }>
{}

/** @internal */
export interface OnSuccess extends
  Op<"OnSuccess", {
    readonly first: Primitive
    readonly successK: (a: unknown) => Primitive
  }>
{}

/** @internal */
export interface OnSuccessAndFailure extends
  Op<"OnSuccessAndFailure", {
    readonly first: Primitive
    readonly failK: (a: Cause.Cause<unknown>) => Primitive
    readonly successK: (a: unknown) => Primitive
  }>
{}

/** @internal */
export interface Async extends
  Op<"Async", {
    readonly register: (resume: (effect: Primitive) => void) => void
    readonly blockingOn: Fiber.Id
  }>
{}

/** @internal */
export interface Sync extends
  Op<"Sync", {
    readonly evaluate: () => unknown
  }>
{}

//
// Primitive API
//

/** @internal */
export const succeed = <A>(value: A): Effect.Effect<never, never, A> => primitive("Success", { value })

/** @internal */
export const sync = <A>(evaluate: () => A): Effect.Effect<never, never, A> => primitive("Sync", { evaluate })

/** @internal */
export const async = <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => void,
  blockingOn: Fiber.Id
): Effect.Effect<R, E, A> =>
  /* @ts-expect-error*/
  primitive("Async", { register, blockingOn })

/** @internal */
export const yieldNow: Effect.Effect<never, never, void> = primitive("Yield", void 0)

/** @internal */
export const whileLoop = <R, E, A>(
  check: LazyArg<boolean>,
  body: LazyArg<Effect.Effect<R, E, A>>,
  process: (a: A) => void
): Effect.Effect<R, E, A> =>
  /* @ts-expect-error*/
  primitive("While", { check, body, process })
