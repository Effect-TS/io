/**
 * The `Effect<R, E, A>` type is polymorphic in values of type `E` and we can
 * work with any error type that we want. However, there is a lot of information
 * that is not inside an arbitrary `E` value. So as a result, an `Effect` needs
 * somewhere to store things like unexpected errors or defects, stack and
 * execution traces, causes of fiber interruptions, and so forth.
 *
 * Effect-TS is very strict about preserving the full information related to a
 * failure. It captures all type of errors into the `Cause` data type. `Effect`
 * uses the `Cause<E>` data type to store the full story of failure. So its
 * error model is lossless. It doesn't throw information related to the failure
 * result. So we can figure out exactly what happened during the operation of
 * our effects.
 *
 * It is important to note that `Cause` is an underlying data type representing
 * errors occuring within an `Effect` workflow. Thus, we don't usually deal with
 * `Cause`s directly. Even though it is not a data type that we deal with very
 * often, the `Cause` of a failing `Effect` workflow can be accessed at any
 * time, which gives us total access to all parallel and sequential errors in
 * occurring within our codebase.
 *
 * @since 1.0.0
 */
import type { FiberId } from "@effect/io/Fiber/Id"
import * as internal from "@effect/io/internal/cause"
import type { Continuation } from "@effect/io/internal/core"
import type { Stack } from "@effect/io/internal/stack"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Equal } from "@fp-ts/data/Equal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const CauseTypeId: unique symbol = internal.CauseTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type CauseTypeId = typeof CauseTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const RuntimeExceptionTypeId: unique symbol = internal.RuntimeExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type RuntimeExceptionTypeId = typeof RuntimeExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const InterruptedExceptionTypeId: unique symbol = internal.InterruptedExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type InterruptedExceptionTypeId = typeof InterruptedExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const IllegalArgumentExceptionTypeId: unique symbol = internal.IllegalArgumentExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type IllegalArgumentExceptionTypeId = typeof IllegalArgumentExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const NoSuchElementExceptionTypeId: unique symbol = internal.NoSuchElementExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type NoSuchElementExceptionTypeId = typeof NoSuchElementExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const InvalidHubCapacityExceptionTypeId: unique symbol = internal.InvalidHubCapacityExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type InvalidHubCapacityExceptionTypeId = typeof InvalidHubCapacityExceptionTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const StackAnnotationTypeId: unique symbol = internal.StackAnnotationTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type StackAnnotationTypeId = typeof StackAnnotationTypeId

/**
 * A `Cause` represents the full history of a failure resulting from running an
 * `Effect` workflow.
 *
 * Effect-TS uses a data structure from functional programming called a semiring
 * to represent the `Cause` data type. This allows us to take a base type `E`
 * (which represents the error type of an `Effect`) and capture the sequential
 * and parallel composition of errors in a fully lossless fashion.
 *
 * @since 1.0.0
 * @category models
 */
export type Cause<E> =
  | Empty
  | Fail<E>
  | Die
  | Interrupt
  | Annotated<E>
  | Sequential<E>
  | Parallel<E>

/**
 * @since 1.0.0
 */
export declare namespace Cause {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<E> {
    readonly [CauseTypeId]: {
      readonly _E: (_: never) => E
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface StackAnnotation {
    readonly [StackAnnotationTypeId]: StackAnnotationTypeId
    readonly stack: Stack<Continuation> | undefined
    readonly execution: Chunk<string> | undefined
  }
}

/**
 * Represents a set of methods that can be used to reduce a `Cause<E>` to a
 * specified value of type `Z` with access to a context of type `C`.
 *
 * @since 1.0.0
 * @category models
 */
export interface CauseReducer<C, E, Z> {
  readonly emptyCase: (context: C) => Z
  readonly failCase: (context: C, error: E) => Z
  readonly dieCase: (context: C, defect: unknown) => Z
  readonly interruptCase: (context: C, fiberId: FiberId) => Z
  readonly annotatedCase: (context: C, value: Z, annotation: unknown) => Z
  readonly sequentialCase: (context: C, left: Z, right: Z) => Z
  readonly parallelCase: (context: C, left: Z, right: Z) => Z
}

/**
 * Represents the configuration parameters and methods required to pretty-
 * print a `Cause`.
 *
 * @since 1.0.0
 * @category rendering
 */
export interface CauseRenderer<E = unknown> {
  readonly lineWidth: number
  readonly ribbonFraction: number
  readonly renderSpan: boolean
  readonly renderExecution: boolean
  readonly renderStack: boolean
  readonly renderSpanDepth: number
  readonly renderExecutionDepth: number
  readonly renderStackDepth: number
  readonly renderError: (error: E) => ReadonlyArray<string>
  readonly renderUnknown: (error: unknown) => ReadonlyArray<string>
}

/**
 * Represents a generic checked exception which occurs at runtime.
 *
 * @since 1.0.0
 * @category models
 */
export interface RuntimeException {
  readonly [RuntimeExceptionTypeId]: RuntimeExceptionTypeId
  readonly message?: string
}

/**
 * Represents a checked exception which occurs when a `Fiber` is interrupted.
 *
 * @since 1.0.0
 * @category models
 */
export interface InterruptedException {
  readonly [InterruptedExceptionTypeId]: InterruptedExceptionTypeId
  readonly message?: string
}

/**
 * Represents a checked exception which occurs when an invalid argument is
 * provided to a method.
 *
 * @since 1.0.0
 * @category models
 */
export interface IllegalArgumentException {
  readonly [IllegalArgumentExceptionTypeId]: IllegalArgumentExceptionTypeId
  readonly message?: string
}

/**
 * Represents a checked exception which occurs when an expected element was
 * unable to be found.
 *
 * @since 1.0.0
 * @category models
 */
export interface NoSuchElementException {
  readonly [NoSuchElementExceptionTypeId]: NoSuchElementExceptionTypeId
  readonly message?: string
}

/**
 * Represents a checked exception which occurs when attempting to construct a
 * `Hub` with an invalid capacity.
 *
 * @since 1.0.0
 * @category models
 */
export interface InvalidHubCapacityException {
  readonly [InvalidHubCapacityExceptionTypeId]: InvalidHubCapacityExceptionTypeId
  readonly message?: string
}

/**
 * The `Empty` cause represents a lack of errors.
 *
 * @since 1.0.0
 * @category models
 */
export interface Empty extends Cause.Variance<never>, Equal {
  readonly _tag: "Empty"
}

/**
 * The `Fail` cause represents a `Cause` which failed with an expected error of
 * type `E`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Fail<E> extends Cause.Variance<E>, Equal {
  readonly _tag: "Fail"
  readonly error: E
}

/**
 * The `Die` cause represents a `Cause` which failed as a result of a defect, or
 * in other words, an unexpected error.
 *
 * type `E`.
 * @since 1.0.0
 * @category models
 */
export interface Die extends Cause.Variance<never>, Equal {
  readonly _tag: "Die"
  readonly defect: unknown
}

/**
 * The `Interrupt` cause represents failure due to `Fiber` interruption, which
 * contains the `FiberId` of the interrupted `Fiber`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Interrupt extends Cause.Variance<never>, Equal {
  readonly _tag: "Interrupt"
  readonly fiberId: FiberId
}

/**
 * The `Annotated` cause represents a `Cause` which is annotated with some
 * arbitrary metadata.
 *
 * For example, we can annotate a `Cause` with a trace to assist in debugging.
 *
 * @since 1.0.0
 * @category models
 */
export interface Annotated<E> extends Cause.Variance<E>, Equal {
  readonly _tag: "Annotated"
  readonly cause: Cause<E>
  readonly annotation: unknown
}

/**
 * The `Parallel` cause represents the composition of two causes which occurred
 * in parallel.
 *
 * In Effect-TS programs, it is possible that two operations may be performed in
 * parallel. In these cases, the `Effect` workflow can fail for more than one
 * reason. If both computations fail, then there are actually two errors which
 * occurred in parallel. In these cases, the errors can be represented by the
 * `Parallel` cause.
 *
 * @since 1.0.0
 * @category models
 */
export interface Parallel<E> extends Cause.Variance<E>, Equal {
  readonly _tag: "Parallel"
  readonly left: Cause<E>
  readonly right: Cause<E>
}

/**
 * The `Sequential` cause represents the composition of two causes which occurred
 * sequentially.
 *
 * For example, if we perform Effect-TS's analog of `try-finally` (i.e.
 * `Effect.ensuring`), and both the `try` and `finally` blocks fail, we have two
 * errors which occurred sequentially. In these cases, the errors can be
 * represented by the `Sequential` cause.
 *
 * @since 1.0.0
 * @category models
 */
export interface Sequential<E> extends Cause.Variance<E>, Equal {
  readonly _tag: "Sequential"
  readonly left: Cause<E>
  readonly right: Cause<E>
}

/**
 * Constructs a new `Empty` cause.
 *
 * @since 1.0.0
 * @category constructors
 */
export const empty = internal.empty

/**
 * Constructs a new `Fail` cause from the specified `error`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fail = internal.fail

/**
 * Constructs a new `Die` cause from the specified `defect`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const die = internal.die

/**
 * Constructs a new `Interrupt` cause from the specified `fiberId`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const interrupt = internal.interrupt

/**
 * Constructs a new `Annotated` cause from the specified `annotation`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const annotated = internal.annotated

/**
 * Constructs a new `Parallel` cause from the specified `left` and `right`
 * causes.
 *
 * @since 1.0.0
 * @category constructors
 */
export const parallel = internal.parallel

/**
 * Constructs a new `Sequential` cause from the specified pecified `left` and
 * `right` causes.
 *
 * @since 1.0.0
 * @category constructors
 */
export const sequential = internal.sequential

/**
 * Returns `true` if the specified value is a `Cause`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isCause = internal.isCause

/**
 * Returns `true` if the specified `Cause` is an `Empty` type, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isEmptyType = internal.isEmptyType

/**
 * Returns `true` if the specified `Cause` is a `Fail` type, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isFailType = internal.isFailType

/**
 * Returns `true` if the specified `Cause` is a `Die` type, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isDieType = internal.isDieType

/**
 * Returns `true` if the specified `Cause` is an `Interrupt` type, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isInterruptType = internal.isInterruptType

/**
 * Returns `true` if the specified `Cause` is an `Annotated` type, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isAnnotatedType = internal.isAnnotatedType

/**
 * Returns `true` if the specified `Cause` is a `Sequential` type, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isSequentialType = internal.isSequentialType

/**
 * Returns `true` if the specified `Cause` is a `Parallel` type, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isParallelType = internal.isParallelType

/**
 * Returns the size of the cause, calculated as the number of individual `Cause`
 * nodes found in the `Cause` semiring structure.
 *
 * @since 1.0.0
 * @category getters
 */
export const size = internal.size

/**
 * Returns `true` if the specified cause is empty, `false` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isEmpty = internal.isEmpty

/**
 * Returns `true` if the specified cause contains a failure, `false` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isFailure = internal.isFailure

/**
 * Returns `true` if the specified cause contains a defect, `false` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isDie = internal.isDie

/**
 * Returns `true` if the specified cause contains an interruption, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isInterrupted = internal.isInterrupted

/**
 * Returns `true` if the specified cause contains only interruptions (without
 * any `Die` or `Fail` causes), `false` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isInterruptedOnly = internal.isInterruptedOnly

/**
 * Returns a `List` of all recoverable errors of type `E` in the specified
 * cause.
 *
 * @since 1.0.0
 * @category getters
 */
export const failures = internal.failures

/**
 * Returns a `List` of all unrecoverable defects in the specified cause.
 *
 * @since 1.0.0
 * @category getters
 */
export const defects = internal.defects

/**
 * Returns a `HashSet` of `FiberId`s for all fibers that interrupted the fiber
 * described by the specified cause.
 *
 * @since 1.0.0
 * @category getters
 */
export const interruptors = internal.interruptors

/**
 * Returns the `E` associated with the first `Fail` in this `Cause`, if one
 * exists.
 *
 * @since 1.0.0
 * @category getters
 */
export const failureOption = internal.failureOption

/**
 * Returns the first checked error on the `Left` if available, if there are
 * no checked errors return the rest of the `Cause` that is known to contain
 * only `Die` or `Interrupt` causes.
 *
 * @since 1.0.0
 * @category getters
 */
export const failureOrCause = internal.failureOrCause

/**
 * Returns the defect associated with the first `Die` in this `Cause`, if one
 * exists.
 *
 * @since 1.0.0
 * @category getters
 */
export const dieOption = internal.dieOption

/**
 * Returns the `FiberId` associated with the first `Interrupt` in the specified
 * cause, if one exists.
 *
 * @since 1.0.0
 * @category getters
 */
export const interruptOption = internal.interruptOption

/**
 * Remove all `Fail` and `Interrupt` nodes from the specified cause, and return
 * a cause containing only `Die` cause/finalizer defects.
 *
 * @since 1.0.0
 * @category getters
 */
export const keepDefects = internal.keepDefects

/**
 * Linearizes the specified cause into a `HashSet` of parallel causes where each
 * parallel cause contains a linear sequence of failures.
 *
 * @since 1.0.0
 * @category getters
 */
export const linearize = internal.linearize

/**
 * Remove all `Fail` and `Interrupt` nodes from the specified cause, and return
 * a cause containing only `Die` cause/finalizer defects.
 *
 * @since 1.0.0
 * @category getters
 */
export const stripFailures = internal.stripFailures

/**
 * Remove all `Die` causes that the specified partial function is defined at,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 *
 * @since 1.0.0
 * @category getters
 */
export const stripSomeDefects = internal.stripSomeDefects

/**
 * @since 1.0.0
 * @category mapping
 */
export const as = internal.as

/**
 * @since 1.0.0
 * @category mapping
 */
export const map = internal.map

/**
 * @since 1.0.0
 * @category sequencing
 */
export const flatMap = internal.flatMap

/**
 * @since 1.0.0
 * @category sequencing
 */
export const flatten = internal.flatten

/**
 * Returns `true` if the `self` cause contains or is equal to `that` cause,
 * `false` otherwise.
 *
 * @since 1.0.0
 * @category elements
 */
export const contains = internal.contains

/**
 * Squashes a `Cause` down to a single defect, chosen to be the "most important"
 * defect.
 *
 * @since 1.0.0
 * @category destructors
 */
export const squash = internal.squash

/**
 * Squashes a `Cause` down to a single defect, chosen to be the "most important"
 * defect. If a recoverable error is found, the provided function will be used
 * to map the error a defect, and the resulting value will be returned.
 *
 * @since 1.0.0
 * @category destructors
 */
export const squashWith = internal.squashWith

/**
 * Uses the provided partial function to search the specified cause and attempt
 * to extract information from it.
 *
 * @since 1.0.0
 * @category elements
 */
export const find = internal.find

/**
 * Filters causes which match the provided predicate out of the specified cause.
 *
 * @since 1.0.0
 * @category filtering
 */
export const filter = internal.filter

/**
 * Folds the specified cause into a value of type `Z`.
 *
 * @since 1.0.0
 * @category folding
 */
export const match = internal.match

/**
 * Reduces the specified cause into a value of type `Z`, beginning with the
 * provided `zero` value.
 *
 * @since 1.0.0
 * @category folding
 */
export const reduce = internal.reduce

/**
 * Reduces the specified cause into a value of type `Z` using a `Cause.Reducer`.
 * Also allows for accessing the provided context during reduction.
 *
 * @since 1.0.0
 * @category folding
 */
export const reduceWithContext = internal.reduceWithContext

/**
 * Represents a checked exception which occurs when a `Fiber` is interrupted.
 *
 * @since 1.0.0
 * @category errors
 */
export const InterruptedException = internal.InterruptedException

/**
 * Returns `true` if the specified value is an `InterruptedException`, `false`
 * otherwise.

 * @since 1.0.0
 * @category refinements
 */
export const isInterruptedException = internal.isInterruptedException

/**
 * Represents a checked exception which occurs when an invalid argument is
 * provided to a method.
 *
 * @since 1.0.0
 * @category errors
 */
export const IllegalArgumentException = internal.IllegalArgumentException

/**
 * Returns `true` if the specified value is an `IllegalArgumentException`, `false`
 * otherwise.

 * @since 1.0.0
 * @category refinements
 */
export const isIllegalArgumentException = internal.isIllegalArgumentException

/**
 * Represents a checked exception which occurs when an expected element was
 * unable to be found.
 *
 * @since 1.0.0
 * @category errors
 */
export const NoSuchElementException = internal.NoSuchElementException

/**
  * Returns `true` if the specified value is an `IllegalArgumentException`, `false`
  * otherwise.

  * @since 1.0.0
  * @category refinements
  */
export const isNoSuchElementException = internal.isNoSuchElementException

/**
 * The default `Cause.Renderer`.
 *
 * @since 1.0.0
 * @category rendering
 */
export const defaultRenderer = internal.defaultRenderer

/**
 * Returns the specified `Cause` as a pretty-printed string.
 *
 * @since 1.0.0
 * @category rendering
 */
export const pretty = internal.pretty
