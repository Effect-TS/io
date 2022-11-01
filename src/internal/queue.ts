import type * as Deferred from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import type * as FiberId from "@effect/io/Fiber/Id"
import * as core from "@effect/io/internal/core"
import type * as Queue from "@effect/io/Queue"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import type * as Option from "@fp-ts/data/Option"
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"

/** @internal */
const EnqueueSymbolKey = "@effect/io/Queue/Enqueue"

/** @internal */
export const EnqueueTypeId: Queue.EnqueueTypeId = Symbol.for(EnqueueSymbolKey) as Queue.EnqueueTypeId

/** @internal */
const DequeueSymbolKey = "@effect/io/Queue/Dequeue"

/** @internal */
export const DequeueTypeId: Queue.DequeueTypeId = Symbol.for(DequeueSymbolKey) as Queue.DequeueTypeId

/** @internal */
const QueueStrategySymbolKey = "@effect/io/Queue/Strategy"

/** @internal */
export const QueueStrategyTypeId: Queue.QueueStrategyTypeId = Symbol.for(
  QueueStrategySymbolKey
) as Queue.QueueStrategyTypeId

/** @internal */
const queueStrategyVariance = {
  _A: (_: never) => _
}

/** @internal */
const enqueueVariance = {
  _In: (_: unknown) => _
}

/** @internal */
const dequeueVariance = {
  _Out: (_: never) => _
}

/** @internal */
class QueueImpl<A> implements Queue.Queue<A> {
  readonly [EnqueueTypeId] = enqueueVariance
  readonly [DequeueTypeId] = dequeueVariance
  constructor(
    /** @internal */
    readonly queue: MutableQueue.MutableQueue<A>,
    /** @internal */
    readonly takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
    /** @internal */
    readonly shutdownHook: Deferred.Deferred<never, void>,
    /** @internal */
    readonly shutdownFlag: MutableRef.MutableRef<boolean>,
    /** @internal */
    readonly strategy: Queue.Strategy<A>
  ) {}
  offer(this: QueueImpl<A>, value: A): Effect.Effect<never, never, boolean> {
    return core.suspendSucceed(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return core.interrupt()
      }
      let noRemaining: boolean
      if (MutableQueue.isEmpty(this.queue)) {
        const taker = pipe(
          this.takers,
          MutableQueue.poll(MutableQueue.EmptyMutableQueue)
        )
        if (taker !== MutableQueue.EmptyMutableQueue) {
          unsafeCompleteDeferred(taker, value)
          noRemaining = true
        } else {
          noRemaining = false
        }
      } else {
        noRemaining = false
      }
      if (noRemaining) {
        return core.succeed(true)
      }
      // Not enough takers, offer to the queue
      const succeeded = pipe(this.queue, MutableQueue.offer(value))
      unsafeCompleteTakers(this.strategy, this.queue, this.takers)
      return succeeded
        ? core.succeed(true)
        : this.strategy.handleSurplus([value], this.queue, this.takers, this.shutdownFlag)
    })
  }
  offerAll(this: QueueImpl<A>, iterable: Iterable<A>): Effect.Effect<never, never, boolean> {
    return core.suspendSucceed(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return core.interrupt()
      }
      const values = ReadonlyArray.fromIterable(iterable)
      const pTakers = MutableQueue.isEmpty(this.queue)
        ? ReadonlyArray.fromIterable(unsafePollN(this.takers, values.length))
        : ReadonlyArray.empty
      const [forTakers, remaining] = pipe(values, ReadonlyArray.splitAt(pTakers.length))
      for (let i = 0; i < pTakers.length; i++) {
        const taker = pTakers[i]
        const item = forTakers[i]
        unsafeCompleteDeferred(taker, item)
      }
      if (remaining.length === 0) {
        return core.succeed(true)
      }
      // Not enough takers, offer to the queue
      const surplus = unsafeOfferAll(this.queue, remaining)
      unsafeCompleteTakers(this.strategy, this.queue, this.takers)
      return List.isNil(surplus)
        ? core.succeed(true)
        : this.strategy.handleSurplus(surplus, this.queue, this.takers, this.shutdownFlag)
    })
  }
  take(this: QueueImpl<A>): Effect.Effect<never, never, A> {
    return core.withFiberRuntime((state) => {
      if (MutableRef.get(this.shutdownFlag)) {
        return core.interrupt()
      }
      const item = pipe(this.queue, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
      if (item !== MutableQueue.EmptyMutableQueue) {
        this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
        return core.succeed(item)
      } else {
        // Add the deferred to takers, then:
        // - Try to take again in case a value was added since
        // - Wait for the deferred to be completed
        // - Clean up resources in case of interruption
        const deferred = core.unsafeMakeDeferred<never, A>(state.id)
        return pipe(
          core.suspendSucceed(() => {
            pipe(this.takers, MutableQueue.offer(deferred))
            unsafeCompleteTakers(this.strategy, this.queue, this.takers)
            return MutableRef.get(this.shutdownFlag) ?
              core.interrupt() :
              core.awaitDeferred(deferred)
          }),
          core.onInterrupt(() => {
            return core.sync(() => unsafeRemove(this.takers, deferred))
          })
        )
      }
    })
  }
  takeAll(this: QueueImpl<A>): Effect.Effect<never, never, Chunk.Chunk<A>> {
    return core.suspendSucceed(() =>
      MutableRef.get(this.shutdownFlag)
        ? core.interrupt()
        : core.sync(() => {
          const values = unsafePollAll(this.queue)
          this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
          return Chunk.fromIterable(values)
        })
    )
  }
  takeUpTo(this: QueueImpl<A>, max: number): Effect.Effect<never, never, Chunk.Chunk<A>> {
    return core.suspendSucceed(() =>
      MutableRef.get(this.shutdownFlag)
        ? core.interrupt()
        : core.sync(() => {
          const values = unsafePollN(this.queue, max)
          this.strategy.unsafeOnQueueEmptySpace(this.queue, this.takers)
          return Chunk.fromIterable(values)
        })
    )
  }
  takeBetween(this: QueueImpl<A>, min: number, max: number): Effect.Effect<never, never, Chunk.Chunk<A>> {
    return core.suspendSucceed(() => takeRemainderLoop(this, min, max, Chunk.empty))
  }
}

/** @internal */
const takeRemainderLoop = <A>(
  self: Queue.Dequeue<A>,
  min: number,
  max: number,
  acc: Chunk.Chunk<A>
): Effect.Effect<never, never, Chunk.Chunk<A>> => {
  if (max < min) {
    return core.succeed(acc)
  }
  return pipe(
    self,
    takeUpTo(max),
    core.flatMap((bs) => {
      const remaining = min - bs.length
      if (remaining === 1) {
        return pipe(take(self), core.map((b) => pipe(acc, Chunk.concat(bs), Chunk.append(b))))
      }
      if (remaining > 1) {
        return pipe(
          take(self),
          core.flatMap((b) =>
            takeRemainderLoop(
              self,
              remaining - 1,
              max - bs.length - 1,
              pipe(acc, Chunk.concat(bs), Chunk.append(b))
            )
          )
        )
      }
      return core.succeed(pipe(acc, Chunk.concat(bs)))
    })
  )
}

/** @internal */
export const isQueue = (u: unknown): u is Queue.Queue<unknown> => {
  return isEnqueue(u) && isDequeue(u)
}

/** @internal */
export const isEnqueue = (u: unknown): u is Queue.Enqueue<unknown> => {
  return typeof u === "object" && u != null && EnqueueTypeId in u
}

/** @internal */
export const isDequeue = (u: unknown): u is Queue.Dequeue<unknown> => {
  return typeof u === "object" && u != null && DequeueTypeId in u
}

/** @internal */
export const bounded = <A>(
  requestedCapacity: number
): Effect.Effect<never, never, Queue.Queue<A>> => {
  return pipe(
    core.sync(() => MutableQueue.bounded<A>(requestedCapacity)),
    core.flatMap((queue) => make(queue, backPressureStrategy()))
  )
}

/** @internal */
export const dropping = <A>(
  requestedCapacity: number
): Effect.Effect<never, never, Queue.Queue<A>> => {
  return pipe(
    core.sync(() => MutableQueue.bounded<A>(requestedCapacity)),
    core.flatMap((queue) => make(queue, droppingStrategy()))
  )
}

/** @internal */
export const sliding = <A>(
  requestedCapacity: number
): Effect.Effect<never, never, Queue.Queue<A>> => {
  return pipe(
    core.sync(() => MutableQueue.bounded<A>(requestedCapacity)),
    core.flatMap((queue) => make(queue, slidingStrategy()))
  )
}

/** @internal */
export const unbounded = <A>(): Effect.Effect<never, never, Queue.Queue<A>> => {
  return pipe(
    core.sync(() => MutableQueue.unbounded<A>()),
    core.flatMap((queue) => make(queue, droppingStrategy()))
  )
}

/** @internal */
const unsafeMake = <A>(
  queue: MutableQueue.MutableQueue<A>,
  takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
  shutdownHook: Deferred.Deferred<never, void>,
  shutdownFlag: MutableRef.MutableRef<boolean>,
  strategy: Queue.Strategy<A>
): Queue.Queue<A> => {
  return new QueueImpl(queue, takers, shutdownHook, shutdownFlag, strategy)
}

/** @internal */
const make = <A>(
  queue: MutableQueue.MutableQueue<A>,
  strategy: Queue.Strategy<A>
): Effect.Effect<never, never, Queue.Queue<A>> => {
  return pipe(
    core.makeDeferred<never, void>(),
    core.map((deferred) =>
      unsafeMake(
        queue,
        MutableQueue.unbounded(),
        deferred,
        MutableRef.make(false),
        strategy
      )
    )
  )
}

/** @internal */
export const capacity = <A>(self: Queue.Queue<A>): number => {
  return MutableQueue.capacity(self.queue)
}

/** @internal */
export const size = <A>(self: Queue.Queue<A>): Effect.Effect<never, never, number> => {
  return core.suspendSucceed(() =>
    MutableRef.get(self.shutdownFlag)
      ? core.interrupt()
      : core.succeed(
        MutableQueue.length(self.queue) -
          MutableQueue.length(self.takers) +
          self.strategy.surplusSize
      )
  )
}

/** @internal */
export const isFull = <A>(self: Queue.Queue<A>): Effect.Effect<never, never, boolean> => {
  return pipe(size(self), core.map((size) => size === capacity(self)))
}

/** @internal */
export const isEmpty = <A>(self: Queue.Queue<A>): Effect.Effect<never, never, boolean> => {
  return pipe(size(self), core.map((size) => size === 0))
}

/** @internal */
export const isShutdown = <A>(self: Queue.Queue<A>): Effect.Effect<never, never, boolean> => {
  return core.sync(() => MutableRef.get(self.shutdownFlag))
}

/** @internal */
export const awaitShutdown = <A>(self: Queue.Queue<A>): Effect.Effect<never, never, void> => {
  return core.awaitDeferred(self.shutdownHook)
}

/** @internal */
export const shutdown = <A>(self: Queue.Queue<A>): Effect.Effect<never, never, void> => {
  return pipe(
    core.withFiberRuntime<never, never, void>((state) => {
      pipe(self.shutdownFlag, MutableRef.set(true))
      return pipe(
        core.whenEffect(
          pipe(self.shutdownHook, core.succeedDeferred(undefined as void)),
          pipe(
            unsafePollAll(self.takers),
            core.forEachParDiscard(
              core.interruptAsDeferred(state.id as FiberId.FiberId)
            ),
            core.zipRight(self.strategy.shutdown)
          )
        ),
        core.map(() => undefined as void)
      )
    }),
    core.uninterruptible
  )
}

/** @internal */
export const offer = <A>(value: A) => {
  return (self: Queue.Enqueue<A>): Effect.Effect<never, never, boolean> => self.offer(value)
}

/** @internal */
export const offerAll = <A>(iterable: Iterable<A>) => {
  return (self: Queue.Enqueue<A>): Effect.Effect<never, never, boolean> => self.offerAll(iterable)
}

/** @internal */
export const poll = <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, Option.Option<A>> => {
  return pipe(self.takeUpTo(1), core.map(Chunk.head))
}

/** @internal */
export const take = <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, A> => {
  return self.take()
}

/** @internal */
export const takeAll = <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, Chunk.Chunk<A>> => {
  return self.takeAll()
}

/** @internal */
export const takeUpTo = (max: number) => {
  return <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, Chunk.Chunk<A>> => {
    return self.takeUpTo(max)
  }
}

/** @internal */
export const takeBetween = (min: number, max: number) => {
  return <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, Chunk.Chunk<A>> => {
    return self.takeBetween(min, max)
  }
}

/** @internal */
export const takeN = (n: number) => {
  return <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, Chunk.Chunk<A>> => {
    return self.takeBetween(n, n)
  }
}

// -----------------------------------------------------------------------------
// Strategy
// -----------------------------------------------------------------------------

/** @internal */
export const backPressureStrategy = <A>(): Queue.Strategy<A> => {
  return new BackPressureStrategy()
}

/** @internal */
export const droppingStrategy = <A>(): Queue.Strategy<A> => {
  return new DroppingStrategy()
}

/** @internal */
export const slidingStrategy = <A>(): Queue.Strategy<A> => {
  return new SlidingStrategy()
}

/** @internal */
class BackPressureStrategy<A> implements Queue.Strategy<A> {
  readonly [QueueStrategyTypeId] = queueStrategyVariance

  readonly putters = MutableQueue.unbounded<readonly [unknown, Deferred.Deferred<never, boolean>, boolean]>()

  get surplusSize(): number {
    return MutableQueue.length(this.putters)
  }

  get shutdown(): Effect.Effect<never, never, void> {
    return pipe(
      core.fiberId(),
      core.flatMap((fiberId) =>
        pipe(
          core.sync(() => unsafePollAll(this.putters)),
          core.flatMap(core.forEachPar(([_, deferred, isLastItem]) =>
            isLastItem ? pipe(deferred, core.interruptAsDeferred(fiberId)) : core.unit()
          ))
        )
      )
    )
  }

  handleSurplus(
    iterable: Iterable<A>,
    queue: MutableQueue.MutableQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
    isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean> {
    return core.withFiberRuntime((state) => {
      const deferred = core.unsafeMakeDeferred<never, boolean>(state.id)
      return pipe(
        core.suspendSucceed(() => {
          this.unsafeOffer(iterable, deferred)
          this.unsafeOnQueueEmptySpace(queue, takers)
          unsafeCompleteTakers(this, queue, takers)
          return MutableRef.get(isShutdown) ? core.interrupt() : core.awaitDeferred(deferred)
        }),
        core.onInterrupt(() => core.sync(() => this.unsafeRemove(deferred)))
      )
    })
  }

  unsafeOnQueueEmptySpace(
    queue: MutableQueue.MutableQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void {
    let keepPolling = true
    while (keepPolling && !MutableQueue.isFull(queue)) {
      const putter = pipe(this.putters, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
      if (putter !== MutableQueue.EmptyMutableQueue) {
        const offered = pipe(queue, MutableQueue.offer(putter[0]))
        if (offered && putter[2]) {
          unsafeCompleteDeferred(putter[1], true)
        } else if (!offered) {
          unsafeOfferAll(this.putters, pipe(unsafePollAll(this.putters), List.prepend(putter)))
        }
        unsafeCompleteTakers(this, queue, takers)
      } else {
        keepPolling = false
      }
    }
  }

  unsafeOffer(iterable: Iterable<A>, deferred: Deferred.Deferred<never, boolean>): void {
    const iterator = iterable[Symbol.iterator]()
    let next: IteratorResult<unknown>
    while (!(next = iterator.next()).done) {
      const value = next.value
      next = iterator.next()
      if (next.done) {
        pipe(this.putters, MutableQueue.offer([value, deferred, true as boolean] as const))
      } else {
        pipe(this.putters, MutableQueue.offer([value, deferred, false as boolean] as const))
      }
    }
  }

  unsafeRemove(deferred: Deferred.Deferred<never, boolean>): void {
    unsafeOfferAll(
      this.putters,
      pipe(unsafePollAll(this.putters), List.filter(([, _]) => _ !== deferred))
    )
  }
}

/** @internal */
class DroppingStrategy<A> implements Queue.Strategy<A> {
  readonly [QueueStrategyTypeId] = queueStrategyVariance

  get surplusSize(): number {
    return 0
  }

  get shutdown(): Effect.Effect<never, never, void> {
    return core.unit()
  }

  handleSurplus(
    _iterable: Iterable<A>,
    _queue: MutableQueue.MutableQueue<A>,
    _takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
    _isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean> {
    return core.succeed(false)
  }

  unsafeOnQueueEmptySpace(
    _queue: MutableQueue.MutableQueue<A>,
    _takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void {
    //
  }
}

/** @internal */
class SlidingStrategy<A> implements Queue.Strategy<A> {
  readonly [QueueStrategyTypeId] = queueStrategyVariance

  get surplusSize(): number {
    return 0
  }

  get shutdown(): Effect.Effect<never, never, void> {
    return core.unit()
  }

  handleSurplus(
    iterable: Iterable<A>,
    queue: MutableQueue.MutableQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
    _isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean> {
    return core.sync(() => {
      this.unsafeOffer(queue, iterable)
      unsafeCompleteTakers(this, queue, takers)
      return true
    })
  }

  unsafeOnQueueEmptySpace(
    _queue: MutableQueue.MutableQueue<A>,
    _takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void {
    //
  }

  unsafeOffer(queue: MutableQueue.MutableQueue<A>, iterable: Iterable<A>) {
    const iterator = iterable[Symbol.iterator]()
    let next: IteratorResult<A>
    let offering = true
    while (!(next = iterator.next()).done && offering) {
      if (MutableQueue.capacity(queue) === 0) {
        return
      }
      // Poll 1 and retry
      pipe(queue, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
      offering = pipe(queue, MutableQueue.offer(next.value))
    }
  }
}

/** @internal */
const unsafeCompleteDeferred = <A>(deferred: Deferred.Deferred<never, A>, a: A): void => {
  return pipe(deferred, core.unsafeDoneDeferred(core.succeed(a)))
}

/** @internal */
const unsafeOfferAll = <A>(queue: MutableQueue.MutableQueue<A>, as: Iterable<A>): List.List<A> => {
  return pipe(queue, MutableQueue.offerAll(as))
}

/** @internal */
const unsafePollAll = <A>(queue: MutableQueue.MutableQueue<A>): List.List<A> => {
  return pipe(queue, MutableQueue.pollUpTo(Number.POSITIVE_INFINITY))
}

/** @internal */
const unsafePollN = <A>(queue: MutableQueue.MutableQueue<A>, max: number): List.List<A> => {
  return pipe(queue, MutableQueue.pollUpTo(max))
}

/** @internal */
export const unsafeRemove = <A>(queue: MutableQueue.MutableQueue<A>, a: A): void => {
  unsafeOfferAll(
    queue,
    pipe(unsafePollAll(queue), List.filter((b) => a !== b))
  )
}

/** @internal */
export const unsafeCompleteTakers = <A>(
  strategy: Queue.Strategy<A>,
  queue: MutableQueue.MutableQueue<A>,
  takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
): void => {
  // Check both a taker and an item are in the queue, starting with the taker
  let keepPolling = true
  while (keepPolling && !MutableQueue.isEmpty(queue)) {
    const taker = pipe(takers, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
    if (taker !== MutableQueue.EmptyMutableQueue) {
      const element = pipe(queue, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
      if (element !== MutableQueue.EmptyMutableQueue) {
        unsafeCompleteDeferred(taker, element)
        strategy.unsafeOnQueueEmptySpace(queue, takers)
      } else {
        unsafeOfferAll(takers, pipe(unsafePollAll(takers), List.prepend(taker)))
      }
      keepPolling = true
    } else {
      keepPolling = false
    }
  }
}
