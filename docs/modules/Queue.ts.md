---
title: Queue.ts
nav_order: 34
parent: Modules
---

## Queue overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [bounded](#bounded)
  - [dropping](#dropping)
  - [sliding](#sliding)
  - [unbounded](#unbounded)
- [getters](#getters)
  - [capacity](#capacity)
  - [isEmpty](#isempty)
  - [isFull](#isfull)
  - [isShutdown](#isshutdown)
  - [size](#size)
- [models](#models)
  - [BaseQueue (interface)](#basequeue-interface)
  - [Dequeue (interface)](#dequeue-interface)
  - [Enqueue (interface)](#enqueue-interface)
  - [Queue (interface)](#queue-interface)
  - [Strategy (interface)](#strategy-interface)
- [mutations](#mutations)
  - [awaitShutdown](#awaitshutdown)
  - [offer](#offer)
  - [offerAll](#offerall)
  - [poll](#poll)
  - [shutdown](#shutdown)
  - [take](#take)
  - [takeAll](#takeall)
  - [takeBetween](#takebetween)
  - [takeN](#taken)
  - [takeUpTo](#takeupto)
- [refinements](#refinements)
  - [isDequeue](#isdequeue)
  - [isEnqueue](#isenqueue)
  - [isQueue](#isqueue)
- [strategies](#strategies)
  - [backPressureStrategy](#backpressurestrategy)
  - [droppingStrategy](#droppingstrategy)
  - [slidingStrategy](#slidingstrategy)
- [symbols](#symbols)
  - [DequeueTypeId](#dequeuetypeid)
  - [DequeueTypeId (type alias)](#dequeuetypeid-type-alias)
  - [EnqueueTypeId](#enqueuetypeid)
  - [EnqueueTypeId (type alias)](#enqueuetypeid-type-alias)
  - [QueueStrategyTypeId](#queuestrategytypeid)
  - [QueueStrategyTypeId (type alias)](#queuestrategytypeid-type-alias)

---

# constructors

## bounded

Makes a new bounded `Queue`. When the capacity of the queue is reached, any
additional calls to `offer` will be suspended until there is more room in
the queue.

**Note**: When possible use only power of 2 capacities; this will provide
better performance by utilising an optimised version of the underlying
`RingBuffer`.

**Signature**

```ts
export declare const bounded: any
```

Added in v1.0.0

## dropping

Makes a new bounded `Queue` with the dropping strategy.

When the capacity of the queue is reached, new elements will be added and the
old elements will be dropped.

**Note**: When possible use only power of 2 capacities; this will provide
better performance by utilising an optimised version of the underlying
`RingBuffer`.

**Signature**

```ts
export declare const dropping: any
```

Added in v1.0.0

## sliding

Makes a new bounded `Queue` with the sliding strategy.

When the capacity of the queue is reached, new elements will be added and the
old elements will be dropped.

**Note**: When possible use only power of 2 capacities; this will provide
better performance by utilising an optimised version of the underlying
`RingBuffer`.

**Signature**

```ts
export declare const sliding: any
```

Added in v1.0.0

## unbounded

Creates a new unbounded `Queue`.

**Signature**

```ts
export declare const unbounded: any
```

Added in v1.0.0

# getters

## capacity

Returns the number of elements the queue can hold.

**Signature**

```ts
export declare const capacity: any
```

Added in v1.0.0

## isEmpty

Returns `true` if the `Queue` contains zero elements, `false` otherwise.

**Signature**

```ts
export declare const isEmpty: any
```

Added in v1.0.0

## isFull

Returns `true` if the `Queue` contains at least one element, `false`
otherwise.

**Signature**

```ts
export declare const isFull: any
```

Added in v1.0.0

## isShutdown

Returns `true` if `shutdown` has been called, otherwise returns `false`.

**Signature**

```ts
export declare const isShutdown: any
```

Added in v1.0.0

## size

Retrieves the size of the queue, which is equal to the number of elements
in the queue. This may be negative if fibers are suspended waiting for
elements to be added to the queue.

**Signature**

```ts
export declare const size: any
```

Added in v1.0.0

# models

## BaseQueue (interface)

The base interface that all `Queue`s must implement.

**Signature**

```ts
export interface BaseQueue {
  /**
   *  Returns the number of elements the queue can hold.
   */
  capacity(): number

  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue.
   *
   * @macro traced
   */
  size(): Effect.Effect<never, never, number>

  /**
   * Returns `true` if the `Queue` contains at least one element, `false`
   * otherwise.
   *
   * @macro traced
   */
  isFull(): Effect.Effect<never, never, boolean>

  /**
   * Returns `true` if the `Queue` contains zero elements, `false` otherwise.
   *
   * @macro traced
   */
  isEmpty(): Effect.Effect<never, never, boolean>

  /**
   * Interrupts any fibers that are suspended on `offer` or `take`. Future calls
   * to `offer*` and `take*` will be interrupted immediately.
   *
   * @macro traced
   */
  shutdown(): Effect.Effect<never, never, void>

  /**
   * Returns `true` if `shutdown` has been called, otherwise returns `false`.
   *
   * @macro traced
   */
  isShutdown(): Effect.Effect<never, never, boolean>

  /**
   * Waits until the queue is shutdown. The `Effect` returned by this method will
   * not resume until the queue has been shutdown. If the queue is already
   * shutdown, the `Effect` will resume right away.
   *
   * @macro traced
   */
  awaitShutdown(): Effect.Effect<never, never, void>
}
```

Added in v1.0.0

## Dequeue (interface)

**Signature**

```ts
export interface Dequeue<A> extends Queue.DequeueVariance<A>, BaseQueue {
  /**
   * Takes the oldest value in the queue. If the queue is empty, this will return
   * a computation that resumes when an item has been added to the queue.
   *
   * @macro traced
   */
  take(): Effect.Effect<never, never, A>

  /**
   * Takes all the values in the queue and returns the values. If the queue is
   * empty returns an empty collection.
   *
   * @macro traced
   */
  takeAll(): Effect.Effect<never, never, Chunk.Chunk<A>>

  /**
   * Takes up to max number of values from the queue.
   *
   * @macro traced
   */
  takeUpTo(max: number): Effect.Effect<never, never, Chunk.Chunk<A>>

  /**
   * Takes a number of elements from the queue between the specified minimum and
   * maximum. If there are fewer than the minimum number of elements available,
   * suspends until at least the minimum number of elements have been collected.
   *
   * @macro traced
   */
  takeBetween(min: number, max: number): Effect.Effect<never, never, Chunk.Chunk<A>>
}
```

Added in v1.0.0

## Enqueue (interface)

**Signature**

```ts
export interface Enqueue<A> extends Queue.EnqueueVariance<A>, BaseQueue {
  /**
   * Places one value in the queue.
   *
   * @macro traced
   */
  offer(value: A): Effect.Effect<never, never, boolean>

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
   * @macro traced
   */
  offerAll(iterable: Iterable<A>): Effect.Effect<never, never, boolean>
}
```

Added in v1.0.0

## Queue (interface)

**Signature**

```ts
export interface Queue<A> extends Enqueue<A>, Dequeue<A> {
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
```

Added in v1.0.0

## Strategy (interface)

**Signature**

```ts
export interface Strategy<A> extends Queue.StrategyVariance<A> {
  /**
   * Returns the number of surplus values that were unable to be added to the
   * `Queue`
   */
  surplusSize(): number

  /**
   * Determines how the `Queue.Strategy` should shut down when the `Queue` is
   * shut down.
   *
   * @macro traced
   */
  shutdown(): Effect.Effect<never, never, void>

  /**
   * Determines the behavior of the `Queue.Strategy` when there are surplus
   * values that could not be added to the `Queue` following an `offer`
   * operation.
   *
   * @macro traced
   */
  handleSurplus(
    iterable: Iterable<A>,
    queue: MutableQueue.MutableQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
    isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean>

  /**
   * Determines the behavior of the `Queue.Strategy` when the `Queue` has empty
   * slots following a `take` operation.
   */
  unsafeOnQueueEmptySpace(
    queue: MutableQueue.MutableQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void
}
```

Added in v1.0.0

# mutations

## awaitShutdown

Waits until the queue is shutdown. The `Effect` returned by this method will
not resume until the queue has been shutdown. If the queue is already
shutdown, the `Effect` will resume right away.

**Signature**

```ts
export declare const awaitShutdown: any
```

Added in v1.0.0

## offer

Places one value in the queue.

**Signature**

```ts
export declare const offer: any
```

Added in v1.0.0

## offerAll

For Bounded Queue: uses the `BackPressure` Strategy, places the values in
the queue and always returns true. If the queue has reached capacity, then
the fiber performing the `offerAll` will be suspended until there is room
in the queue.

For Unbounded Queue: Places all values in the queue and returns true.

For Sliding Queue: uses `Sliding` Strategy If there is room in the queue,
it places the values otherwise it removes the old elements and enqueues the
new ones. Always returns true.

For Dropping Queue: uses `Dropping` Strategy, It places the values in the
queue but if there is no room it will not enqueue them and return false.

**Signature**

```ts
export declare const offerAll: any
```

Added in v1.0.0

## poll

Returns the first value in the `Queue` as a `Some<A>`, or `None` if the queue
is empty.

**Signature**

```ts
export declare const poll: any
```

Added in v1.0.0

## shutdown

Interrupts any fibers that are suspended on `offer` or `take`. Future calls
to `offer*` and `take*` will be interrupted immediately.

**Signature**

```ts
export declare const shutdown: any
```

Added in v1.0.0

## take

Takes the oldest value in the queue. If the queue is empty, this will return
a computation that resumes when an item has been added to the queue.

**Signature**

```ts
export declare const take: any
```

Added in v1.0.0

## takeAll

Takes all the values in the queue and returns the values. If the queue is
empty returns an empty collection.

**Signature**

```ts
export declare const takeAll: any
```

Added in v1.0.0

## takeBetween

Takes a number of elements from the queue between the specified minimum and
maximum. If there are fewer than the minimum number of elements available,
suspends until at least the minimum number of elements have been collected.

**Signature**

```ts
export declare const takeBetween: any
```

Added in v1.0.0

## takeN

Takes the specified number of elements from the queue. If there are fewer
than the specified number of elements available, it suspends until they
become available.

**Signature**

```ts
export declare const takeN: any
```

Added in v1.0.0

## takeUpTo

Takes up to max number of values from the queue.

**Signature**

```ts
export declare const takeUpTo: any
```

Added in v1.0.0

# refinements

## isDequeue

Returns `true` if the specified value is a `Dequeue`, `false` otherwise.

**Signature**

```ts
export declare const isDequeue: any
```

Added in v1.0.0

## isEnqueue

Returns `true` if the specified value is a `Enqueue`, `false` otherwise.

**Signature**

```ts
export declare const isEnqueue: any
```

Added in v1.0.0

## isQueue

Returns `true` if the specified value is a `Queue`, `false` otherwise.

**Signature**

```ts
export declare const isQueue: any
```

Added in v1.0.0

# strategies

## backPressureStrategy

**Signature**

```ts
export declare const backPressureStrategy: any
```

Added in v1.0.0

## droppingStrategy

**Signature**

```ts
export declare const droppingStrategy: any
```

Added in v1.0.0

## slidingStrategy

**Signature**

```ts
export declare const slidingStrategy: any
```

Added in v1.0.0

# symbols

## DequeueTypeId

**Signature**

```ts
export declare const DequeueTypeId: typeof DequeueTypeId
```

Added in v1.0.0

## DequeueTypeId (type alias)

**Signature**

```ts
export type DequeueTypeId = typeof DequeueTypeId
```

Added in v1.0.0

## EnqueueTypeId

**Signature**

```ts
export declare const EnqueueTypeId: typeof EnqueueTypeId
```

Added in v1.0.0

## EnqueueTypeId (type alias)

**Signature**

```ts
export type EnqueueTypeId = typeof EnqueueTypeId
```

Added in v1.0.0

## QueueStrategyTypeId

**Signature**

```ts
export declare const QueueStrategyTypeId: typeof QueueStrategyTypeId
```

Added in v1.0.0

## QueueStrategyTypeId (type alias)

**Signature**

```ts
export type QueueStrategyTypeId = typeof QueueStrategyTypeId
```

Added in v1.0.0
