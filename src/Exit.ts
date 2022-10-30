/**
 * @since 1.0.0
 */
import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/runtime"
import type * as OpCodes from "@effect/io/internal/runtime/opCodes"

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
  readonly body: {
    readonly cause: Cause.Cause<E>
  }
  /** @internal */
  readonly op: OpCodes.OP_FAILURE
}

/**
 * Represents a successful `Effect` workflow and containing the returned value
 * of type `A`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Success<A> extends Effect.Effect<never, never, A> {
  readonly body: {
    readonly value: A
  }
  /** @internal */
  readonly op: OpCodes.OP_SUCCESS
}

/**
 * Returns `true` if the specified value is an `Exit`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isExit = internal.exitIsExit

/**
 * Returns `true` if the specified `Exit` is a `Failure`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isFailure = internal.exitIsFailure

/**
 * Returns `true` if the specified `Exit` is a `Success`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isSuccess = internal.exitIsSuccess

/**
 * Constructs a new `Exit.Success` containing the specified value of type `A`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeed = internal.exitSucceed

/**
 * Constructs a new `Exit.Failure` from the specified recoverable error of type
 * `E`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fail = internal.exitFail

/**
 * Constructs a new `Exit.Failure` from the specified `Cause` of type `E`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const failCause = internal.exitFailCause

/**
 * Constructs a new `Exit.Failure` from the specified unrecoverable defect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const die = internal.exitDie

/**
 * Constructs a new `Exit.Failure` from the specified `FiberId` indicating that
 * the `Fiber` running an `Effect` workflow was terminated due to interruption.
 *
 * @since 1.0.0
 * @category constructors
 */
export const interrupt = internal.exitInterrupt

/**
 * Collects all of the specified exit values into a `Some<Exit<E, List<A>>>`. If
 * the provided iterable contains no elements, `None` will be returned.
 *
 * **Note**: `Exit.collectAll` combines `Cause` values sequentially.
 *
 * @since 1.0.0
 * @category constructors
 */
export const collectAll = internal.exitCollectAll

/**
 * Collects all of the specified exit values into a `Some<Exit<E, List<A>>>`. If
 * the provided iterable contains no elements, `None` will be returned.
 *
 * **Note**: `Exit.collectAll` combines `Cause` values in parallel.
 *
 * @since 1.0.0
 * @category constructors
 */
export const collectAllPar = internal.exitCollectAllPar

/**
 * Represents an `Exit` which succeeds with `undefined`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const unit = internal.exitUnit

/**
 * Converts an `Either<E, A>` into an `Exit<E, A>`.
 *
 * @since 1.0.0
 * @category conversions
 */
export const fromEither = internal.exitFromEither

/**
 * Converts an `Option<A>` into an `Exit<void, A>`.
 *
 * @since 1.0.0
 * @category conversions
 */
export const fromOption = internal.exitFromOption

/**
 * Returns `true` if the specified exit is a `Failure` **and** the `Cause` of
 * the failure was due to interruption, `false` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isInterrupted = internal.exitIsInterrupted

/**
 * Returns a `Some<Cause<E>>` if the specified exit is a `Failure`, `None`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const causeOption = internal.exitCauseOption

/**
 * Returns the `A` if specified exit is a `Success`, otherwise returns the
 * alternate `A` value computed from the specified function which receives the
 * `Cause<E>` of the exit `Failure`.
 *
 * @since 1.0.0
 * @category getters
 */
export const getOrElse = internal.exitGetOrElse

/**
 * Executes the predicate on the value of the specified exit if it is a
 * `Success`, otherwise returns `false`.
 *
 * @since 1.0.0
 * @category elements
 */
export const exists = internal.exitExists

/**
 * Maps the `Success` value of the specified exit to the provided constant
 * value.
 *
 * @since 1.0.0
 * @category mapping
 */
export const as = internal.exitAs

/**
 * Maps the `Success` value of the specified exit to a void.
 *
 * @since 1.0.0
 * @category mapping
 */
export const asUnit = internal.exitAsUnit

/**
 * Maps over the `Success` value of the specified exit using the provided
 * function.
 *
 * @since 1.0.0
 * @category mapping
 */
export const map = internal.exitMap

/**
 * Maps over the `Success` and `Failure` cases of the specified exit using the
 * provided functions.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapBoth = internal.exitMapBoth

/**
 * Maps over the error contained in the `Failure` of the specified exit using
 * the provided function.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapError = internal.exitMapError

/**
 * Maps over the `Cause` contained in the `Failure` of the specified exit using
 * the provided function.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapErrorCause = internal.exitMapErrorCause

/**
 * @since 1.0.0
 * @category sequencing
 */
export const flatMap = internal.exitFlatMap

/**
 * @since 1.0.0
 * @category sequencing
 */
export const flatMapEffect = internal.exitFlatMapEffect

/**
 * @since 1.0.0
 * @category sequencing
 */
export const flatten = internal.exitFlatten

/**
 * @since 1.0.0
 * @category folding
 */
export const match = internal.exitMatch

/**
 * @since 1.0.0
 * @category folding
 */
export const matchEffect = internal.exitMatchEffect

// TODO: implement after `Effect.exit`
// /**
//  * @since 1.0.0
//  * @category traversing
//  */
// export const forEachEffect = internal.forEachEffect

/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E | E2>`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zip = internal.exitZip

/**
 * Sequentially zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipLeft = internal.exitZipLeft

/**
 * Sequentially zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipRight = internal.exitZipRight

/**
 * Parallelly zips the this result with the specified result or else returns
 * the failed `Cause<E | E2>`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipPar = internal.exitZipPar

/**
 * Parallelly zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipParLeft = internal.exitZipParLeft

/**
 * Parallelly zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause<E | E2>`.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipParRight = internal.exitZipParRight

/**
 * Zips this exit together with that exit using the specified combination
 * functions.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipWith = internal.exitZipWith
