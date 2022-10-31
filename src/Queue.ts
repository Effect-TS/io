/**
 * @since 1.0.0
 */
import type * as Deferred from "@effect/io/Deferred"
import * as internal from "@effect/io/internal/queue"
import type * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"
import type * as MutableRef from "@fp-ts/data/mutable/MutableRef"

/**
 * @since 1.0.0
 * @category symbols
 */
export const EnqueueTypeId: unique symbol = internal.EnqueueTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type EnqueueTypeId = typeof EnqueueTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const DequeueTypeId: unique symbol = internal.DequeueTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type DequeueTypeId = typeof DequeueTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const QueueStrategyTypeId: unique symbol = internal.QueueStrategyTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type QueueStrategyTypeId = typeof QueueStrategyTypeId

/** @internal */
interface InternalQueueProperties<A> {
  /** @internal */
  readonly queue: MutableQueue.MutableQueue<A>
  /** @internal */
  readonly takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  /** @internal */
  readonly shutdownHook: Deferred.Deferred<never, void>
  /** @internal */
  readonly shutdownFlag: MutableRef.MutableRef<boolean>
  /** @internal */
  readonly strategy: Strategy<A>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Queue<A> extends Enqueue<A>, Dequeue<A> {}

/**
 * @since 1.0.0
 * @category models
 */
export interface Enqueue<A> extends InternalQueueProperties<A>, Queue.EnqueueVariance<A> {}

/**
 * @since 1.0.0
 * @category models
 */
export interface Dequeue<A> extends InternalQueueProperties<A>, Queue.DequeueVariance<A> {}

/**
 * @since 1.0.0
 * @category models
 */
export interface Strategy<A> extends Queue.StrategyVariance<A> {}

/**
 * @since 1.0.0
 */
export declare namespace Queue {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface EnqueueVariance<A> {
    readonly [EnqueueTypeId]: {
      readonly _In: (_: A) => void
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface DequeueVariance<A> {
    readonly [DequeueTypeId]: {
      readonly _Out: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface StrategyVariance<A> {
    readonly [QueueStrategyTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}

/**
 * Returns `true` if the specified value is a `Queue`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isQueue = internal.isQueue

/**
 * Returns `true` if the specified value is a `Dequeue`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isDequeue = internal.isDequeue

/**
 * Returns `true` if the specified value is a `Enqueue`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isEnqueue = internal.isEnqueue

/**
 * Makes a new bounded `Queue`. When the capacity of the queue is reached, any
 * additional calls to `offer` will be suspended until there is more room in
 * the queue.
 *
 * **Note**: When possible use only power of 2 capacities; this will provide
 * better performance by utilising an optimised version of the underlying
 * `RingBuffer`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const bounded = internal.bounded

/**
 * Makes a new bounded `Queue` with the dropping strategy.
 *
 * When the capacity of the queue is reached, new elements will be added and the
 * old elements will be dropped.
 *
 * **Note**: When possible use only power of 2 capacities; this will provide
 * better performance by utilising an optimised version of the underlying
 * `RingBuffer`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const dropping = internal.dropping

/**
 * Makes a new bounded `Queue` with the sliding strategy.
 *
 * When the capacity of the queue is reached, new elements will be added and the
 * old elements will be dropped.
 *
 * **Note**: When possible use only power of 2 capacities; this will provide
 * better performance by utilising an optimised version of the underlying
 * `RingBuffer`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const sliding = internal.sliding

/**
 * Creates a new unbounded `Queue`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const unbounded = internal.unbounded

/**
 * Returns the number of elements the queue can hold.
 *
 * @since 1.0.0
 * @category getters
 */
export const capacity = internal.capacity

/**
 * Retrieves the size of the queue, which is equal to the number of elements
 * in the queue. This may be negative if fibers are suspended waiting for
 * elements to be added to the queue.
 *
 * @since 1.0.0
 * @category getters
 */
export const size = internal.size

/**
 * Returns `true` if the `Queue` contains zero elements, `false` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isEmpty = internal.isEmpty

/**
 * Returns `true` if the `Queue` contains at least one element, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isFull = internal.isFull

/**
 * Returns `true` if `shutdown` has been called, otherwise returns `false`.
 *
 * @since 1.0.0
 * @category getters
 */
export const isShutdown = internal.isShutdown

/**
 * Waits until the queue is shutdown. The `Effect` returned by this method will
 * not resume until the queue has been shutdown. If the queue is already
 * shutdown, the `Effect` will resume right away.
 *
 * @since 1.0.0
 * @category mutations
 */
export const awaitShutdown = internal.awaitShutdown

/**
 * Interrupts any fibers that are suspended on `offer` or `take`. Future calls
 * to `offer*` and `take*` will be interrupted immediately.
 *
 * @since 1.0.0
 * @category mutations
 */
export const shutdown = internal.shutdown

/**
 * Places one value in the queue.
 *
 * @since 1.0.0
 * @category mutations
 */
export const offer = internal.offer

/**
 * For Bounded Queue: uses the `BackPressure` Strategy, places the values in
 * the queue and always returns true. If the queue has reached capacity, then
 * the fiber performing the `offerAll` will be suspended until there is room
 * in the queue.
 *
 * For Unbounded Queue: Places all values in the queue and returns true.
 *
 * For Sliding Queue: uses `Sliding` Strategy If there is room in the queue,
 * it places the values otherwise it removes the old elements and enqueues the
 * new ones. Always returns true.
 *
 * For Dropping Queue: uses `Dropping` Strategy, It places the values in the
 * queue but if there is no room it will not enqueue them and return false.
 *
 * @since 1.0.0
 * @category mutations
 */
export const offerAll = internal.offerAll

/**
 * Returns the first value in the `Queue` as a `Some<A>`, or `None` if the queue
 * is empty.
 *
 * @since 1.0.0
 * @category mutations
 */
export const poll = internal.poll

/**
 * Removes the oldest value in the queue. If the queue is empty, this will
 * return a computation that resumes when an item has been added to the queue.
 *
 * @since 1.0.0
 * @category mutations
 */
export const take = internal.take

/**
 * Removes all the values in the queue and returns the values. If the queue is
 * empty returns an empty collection.
 *
 * @since 1.0.0
 * @category mutations
 */
export const takeAll = internal.takeAll

/**
 * Takes up to max number of values from the queue.
 *
 * @since 1.0.0
 * @category mutations
 */
export const takeUpTo = internal.takeUpTo

/**
 * Takes a number of elements from the queue between the specified minimum and
 * maximum. If there are fewer than the minimum number of elements available,
 * suspends until at least the minimum number of elements have been collected.
 *
 * @since 1.0.0
 * @category mutations
 */
export const takeBetween = internal.takeBetween

/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it suspends until they
 * become available.
 *
 * @since 1.0.0
 * @category mutations
 */
export const takeN = internal.takeN
