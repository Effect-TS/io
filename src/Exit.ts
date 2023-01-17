/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import type * as FiberId from "@effect/io/Fiber/Id"
import * as core from "@effect/io/internal/core"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Either from "@fp-ts/data/Either"
import type * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * An `Exit<E, A>` describes the result of a executing an `Effect` workflow.
 *
 * There are two possible values for an `Exit<E, A>`:
 *   - `Exit.Success` contain a success value of type `A`
 *   - `Exit.Failure` contains a failure `Cause` of type `E`
 *
 * @since 1.0.0
 * @category models
 */
export type Exit<E, A> = Failure<E> | Success<A>

/**
 * Represents a failed `Effect` workflow containing the `Cause` of the failure
 * of type `E`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Failure<E> extends Effect.Effect<never, E, never> {
  readonly _tag: "Failure"
  readonly cause: Cause.Cause<E>
}

/**
 * Represents a successful `Effect` workflow and containing the returned value
 * of type `A`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Success<A> extends Effect.Effect<never, never, A> {
  readonly _tag: "Success"
  readonly value: A
}

/**
 * Returns `true` if the specified value is an `Exit`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isExit: (u: unknown) => u is Exit<unknown, unknown> = core.exitIsExit

/**
 * Returns `true` if the specified `Exit` is a `Failure`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isFailure: <E, A>(self: Exit<E, A>) => self is Failure<E> = core.exitIsFailure

/**
 * Returns `true` if the specified `Exit` is a `Success`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isSuccess: <E, A>(self: Exit<E, A>) => self is Success<A> = core.exitIsSuccess

/**
 * Constructs a new `Exit.Success` containing the specified value of type `A`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Exit<never, A> = core.exitSucceed

/**
 * Constructs a new `Exit.Failure` from the specified recoverable error of type
 * `E`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Exit<E, never> = core.exitFail

/**
 * Constructs a new `Exit.Failure` from the specified `Cause` of type `E`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Exit<E, never> = core.exitFailCause

/**
 * Constructs a new `Exit.Failure` from the specified unrecoverable defect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Exit<never, never> = core.exitDie

/**
 * Constructs a new `Exit.Failure` from the specified `FiberId` indicating that
 * the `Fiber` running an `Effect` workflow was terminated due to interruption.
 *
 * @since 1.0.0
 * @category constructors
 */
export const interrupt: (fiberId: FiberId.FiberId) => Exit<never, never> = core.exitInterrupt

/**
 * Collects all of the specified exit values into a `Some<Exit<E, List<A>>>`. If
 * the provided iterable contains no elements, `None` will be returned.
 *
 * **Note**: `Exit.collectAll` combines `Cause` values sequentially.
 *
 * @since 1.0.0
 * @category constructors
 */
export const collectAll: <E, A>(exits: Iterable<Exit<E, A>>) => Option.Option<Exit<E, Chunk.Chunk<A>>> =
  core.exitCollectAll

/**
 * Collects all of the specified exit values into a `Some<Exit<E, List<A>>>`. If
 * the provided iterable contains no elements, `None` will be returned.
 *
 * **Note**: `Exit.collectAll` combines `Cause` values in parallel.
 *
 * @since 1.0.0
 * @category constructors
 */
export const collectAllPar: <E, A>(exits: Iterable<Exit<E, A>>) => Option.Option<Exit<E, Chunk.Chunk<A>>> =
  core.exitCollectAllPar

/**
 * Represents an `Exit` which succeeds with `undefined`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const unit: (_: void) => Exit<never, void> = core.exitUnit

/**
 * Converts an `Either<E, A>` into an `Exit<E, A>`.
 *
 * @since 1.0.0
 * @category conversions
 */
export const fromEither: <E, A>(either: Either.Either<E, A>) => Exit<E, A> = core.exitFromEither

/**
 * Converts an `Option<A>` into an `Exit<void, A>`.
 *
 * @since 1.0.0
 * @category conversions
 */
export const fromOption: <A>(option: Option.Option<A>) => Exit<void, A> = core.exitFromOption

/**
 * Returns `true` if the specified exit is a `Failure` **and** the `Cause` of
 * the failure was due to interruption, `false` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isInterrupted: <E, A>(self: Exit<E, A>) => boolean = core.exitIsInterrupted

/**
 * Returns a `Some<Cause<E>>` if the specified exit is a `Failure`, `None`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const causeOption: <E, A>(self: Exit<E, A>) => Option.Option<Cause.Cause<E>> = core.exitCauseOption

/**
 * Returns the `A` if specified exit is a `Success`, otherwise returns the
 * alternate `A` value computed from the specified function which receives the
 * `Cause<E>` of the exit `Failure`.
 *
 * @since 1.0.0
 * @category getters
 */
export const getOrElse: <E, A>(orElse: (cause: Cause.Cause<E>) => A) => (self: Exit<E, A>) => A = core.exitGetOrElse

/**
 * Executes the predicate on the value of the specified exit if it is a
 * `Success`, otherwise returns `false`.
 *
 * @since 1.0.0
 * @category elements
 */
export const exists: <A>(predicate: Predicate<A>) => <E>(self: Exit<E, A>) => boolean = core.exitExists

/**
 * Maps the `Success` value of the specified exit to the provided constant
 * value.
 *
 * @since 1.0.0
 * @category mapping
 */
export const as: <A1>(value: A1) => <E, A>(self: Exit<E, A>) => Exit<E, A1> = core.exitAs

/**
 * Maps the `Success` value of the specified exit to a void.
 *
 * @since 1.0.0
 * @category mapping
 */
export const asUnit: <E, A>(self: Exit<E, A>) => Exit<E, void> = core.exitAsUnit

/**
 * Maps over the `Success` value of the specified exit using the provided
 * function.
 *
 * @since 1.0.0
 * @category mapping
 */
export const map: <A, B>(f: (a: A) => B) => <E>(self: Exit<E, A>) => Exit<E, B> = core.exitMap

/**
 * Maps over the `Success` and `Failure` cases of the specified exit using the
 * provided functions.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapBoth: <E, A, E1, A1>(
  onFailure: (e: E) => E1,
  onSuccess: (a: A) => A1
) => (self: Exit<E, A>) => Exit<E1, A1> = core.exitMapBoth

/**
 * Maps over the error contained in the `Failure` of the specified exit using
 * the provided function.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapError: <E, E1>(f: (e: E) => E1) => <A>(self: Exit<E, A>) => Exit<E1, A> = core.exitMapError

/**
 * Maps over the `Cause` contained in the `Failure` of the specified exit using
 * the provided function.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapErrorCause: <E, E1>(
  f: (cause: Cause.Cause<E>) => Cause.Cause<E1>
) => <A>(self: Exit<E, A>) => Exit<E1, A> = core.exitMapErrorCause

/**
 * @since 1.0.0
 * @category sequencing
 */
export const flatMap: <A, E1, A1>(f: (a: A) => Exit<E1, A1>) => <E>(self: Exit<E, A>) => Exit<E1 | E, A1> =
  core.exitFlatMap

/**
 * @since 1.0.0
 * @category sequencing
 */
export const flatMapEffect: <E, A, R, E1, A1>(
  f: (a: A) => Effect.Effect<R, E1, Exit<E, A1>>
) => (self: Exit<E, A>) => Effect.Effect<R, E1, Exit<E, A1>> = core.exitFlatMapEffect

/**
 * @since 1.0.0
 * @category sequencing
 */
export const flatten: <E, E1, A>(self: Exit<E, Exit<E1, A>>) => Exit<E | E1, A> = core.exitFlatten

/**
 * @since 1.0.0
 * @category folding
 */
export const match: <E, A, Z>(
  onFailure: (cause: Cause.Cause<E>) => Z,
  onSuccess: (a: A) => Z
) => (self: Exit<E, A>) => Z = core.exitMatch

/**
 * @since 1.0.0
 * @category folding
 */
export const matchEffect: <E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R1, E1, A1>,
  onSuccess: (a: A) => Effect.Effect<R2, E2, A2>
) => (self: Exit<E, A>) => Effect.Effect<R1 | R2, E1 | E2, A1 | A2> = core.exitMatchEffect

/**
 * @since 1.0.0
 * @category traversing
 */
export const forEachEffect: <A, R, E1, B>(
  f: (a: A) => Effect.Effect<R, E1, B>
) => <E>(self: Exit<E, A>) => Effect.Effect<R, never, Exit<E1 | E, B>> = core.exitForEachEffect

/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E | E2>`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zip: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, readonly [A, A2]> =
  core.exitZip

/**
 * Sequentially zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipLeft: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, A> = core.exitZipLeft

/**
 * Sequentially zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipRight: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, A2> = core.exitZipRight

/**
 * Parallelly zips the this result with the specified result or else returns
 * the failed `Cause<E | E2>`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipPar: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, readonly [A, A2]> =
  core.exitZipPar

/**
 * Parallelly zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipParLeft: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, A> =
  core.exitZipParLeft

/**
 * Parallelly zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipParRight: <E2, A2>(that: Exit<E2, A2>) => <E, A>(self: Exit<E, A>) => Exit<E2 | E, A2> =
  core.exitZipParRight

/**
 * Zips this exit together with that exit using the specified combination
 * functions.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipWith: <E, E1, A, B, C>(
  that: Exit<E1, B>,
  f: (a: A, b: B) => C,
  g: (c: Cause.Cause<E>, c1: Cause.Cause<E1>) => Cause.Cause<E | E1>
) => (self: Exit<E, A>) => Exit<E | E1, C> = core.exitZipWith

/**
 * Removes any annotation from the failure cause
 *
 * @since 1.0.0
 * @category filtering
 */
export const unannotate: <E, A>(exit: Exit<E, A>) => Exit<E, A> = core.exitUnannotate
