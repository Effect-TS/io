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
export const isQueue = (u: unknown): u is Queue.Queue<unknown> => {
  return isEnqueue(u) || isDequeue(u)
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
    core.flatMap((queue) => make(queue, droppingStrategy))
  )
}

/** @internal */
export const sliding = <A>(
  requestedCapacity: number
): Effect.Effect<never, never, Queue.Queue<A>> => {
  return pipe(
    core.sync(() => MutableQueue.bounded<A>(requestedCapacity)),
    core.flatMap((queue) => make(queue, slidingStrategy))
  )
}

/** @internal */
export const unbounded = <A>(): Effect.Effect<never, never, Queue.Queue<A>> => {
  return pipe(
    core.sync(() => MutableQueue.unbounded<A>()),
    core.flatMap((queue) => make(queue, droppingStrategy))
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
  return {
    [EnqueueTypeId]: enqueueVariance,
    [DequeueTypeId]: dequeueVariance,
    queue,
    takers,
    shutdownHook,
    shutdownFlag,
    strategy
  }
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
          surplusSize(self.strategy as StrategyPrimitive)
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
            core.forEachParDiscard(
              unsafePollAll(self.takers),
              // TODO(Max): remove cast to any
              core.interruptAsDeferred((state as any).id as FiberId.FiberId)
            ),
            core.zipRight(strategyShutdown(self.strategy as StrategyPrimitive))
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
  return (self: Queue.Enqueue<A>): Effect.Effect<never, never, boolean> => {
    return core.suspendSucceed(() => {
      if (MutableRef.get(self.shutdownFlag)) {
        return core.interrupt()
      }
      let noRemaining: boolean
      if (MutableQueue.isEmpty(self.queue)) {
        const taker = pipe(
          self.takers,
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
      const succeeded = pipe(self.queue, MutableQueue.offer(value))
      unsafeCompleteTakers(
        self.strategy as StrategyPrimitive,
        self.queue,
        self.takers as MutableQueue.MutableQueue<Deferred.Deferred<never, unknown>>
      )
      return succeeded
        ? core.succeed(true)
        : handleSurplus(
          self.strategy as StrategyPrimitive,
          [value],
          self.queue,
          self.takers as MutableQueue.MutableQueue<Deferred.Deferred<never, unknown>>,
          self.shutdownFlag
        )
    })
  }
}

/** @internal */
export const offerAll = <A>(as: Iterable<A>) => {
  return (self: Queue.Enqueue<A>): Effect.Effect<never, never, boolean> => {
    return core.suspendSucceed(() => {
      if (MutableRef.get(self.shutdownFlag)) {
        return core.interrupt()
      }
      const values = ReadonlyArray.fromIterable(as)
      const pTakers = MutableQueue.isEmpty(self.queue)
        ? ReadonlyArray.fromIterable(unsafePollN(self.takers, values.length))
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
      const surplus = unsafeOfferAll(self.queue, remaining)
      unsafeCompleteTakers(
        self.strategy as StrategyPrimitive,
        self.queue,
        self.takers as MutableQueue.MutableQueue<Deferred.Deferred<never, unknown>>
      )
      return List.isNil(surplus)
        ? core.succeed(true)
        : handleSurplus(
          self.strategy as StrategyPrimitive,
          surplus,
          self.queue,
          self.takers as MutableQueue.MutableQueue<Deferred.Deferred<never, unknown>>,
          self.shutdownFlag
        )
    })
  }
}

/** @internal */
export const poll = <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, Option.Option<A>> => {
  return pipe(self, takeUpTo(1), core.map(Chunk.head))
}

/** @internal */
export const take = <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, A> => {
  return core.withFiberRuntime((state) => {
    if (MutableRef.get(self.shutdownFlag)) {
      return core.interrupt()
    }
    const item = pipe(self.queue, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
    if (item !== MutableQueue.EmptyMutableQueue) {
      unsafeOnQueueEmptySpace(
        self.strategy as StrategyPrimitive,
        self.queue,
        self.takers as MutableQueue.MutableQueue<Deferred.Deferred<never, unknown>>
      )
      return core.succeed(item)
    } else {
      // Add the deferred to takers, then:
      // - Try to take again in case a value was added since
      // - Wait for the deferred to be completed
      // - Clean up resources in case of interruption
      // TODO(Max): remove cast to any
      const deferred = core.unsafeMakeDeferred<never, A>((state as any).id)
      return pipe(
        core.suspendSucceed(() => {
          pipe(self.takers, MutableQueue.offer(deferred))
          unsafeCompleteTakers(
            self.strategy as StrategyPrimitive,
            self.queue,
            self.takers as MutableQueue.MutableQueue<Deferred.Deferred<never, unknown>>
          )
          return MutableRef.get(self.shutdownFlag) ? core.interrupt() : core.awaitDeferred(deferred)
        }),
        core.onInterrupt(() => {
          return core.sync(() => unsafeRemove(self.takers, deferred))
        })
      )
    }
  })
}

/** @internal */
export const takeAll = <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, Chunk.Chunk<A>> => {
  return core.suspendSucceed(() =>
    MutableRef.get(self.shutdownFlag)
      ? core.interrupt()
      : core.sync(() => {
        const as = unsafePollAll(self.queue)
        unsafeOnQueueEmptySpace(
          self.strategy as StrategyPrimitive,
          self.queue,
          self.takers as MutableQueue.MutableQueue<Deferred.Deferred<never, unknown>>
        )
        return Chunk.fromIterable(as)
      })
  )
}

/** @internal */
export const takeUpTo = (max: number) => {
  return <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, Chunk.Chunk<A>> => {
    return core.suspendSucceed(() =>
      MutableRef.get(self.shutdownFlag)
        ? core.interrupt()
        : core.sync(() => {
          const as = unsafePollN(self.queue, max)
          unsafeOnQueueEmptySpace(
            self.strategy as StrategyPrimitive,
            self.queue,
            self.takers as MutableQueue.MutableQueue<Deferred.Deferred<never, unknown>>
          )
          return Chunk.fromIterable(as)
        })
    )
  }
}

/** @internal */
export const takeBetween = (min: number, max: number) => {
  return <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, Chunk.Chunk<A>> => {
    return core.suspendSucceed(() => takeRemainderLoop(self, min, max, Chunk.empty))
  }
}

/** @internal */
export const takeN = (n: number) => {
  return <A>(self: Queue.Dequeue<A>): Effect.Effect<never, never, Chunk.Chunk<A>> => {
    return takeBetween(n, n)(self)
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

// -----------------------------------------------------------------------------
// Strategy
// -----------------------------------------------------------------------------

/** @internal */
export type StrategyPrimitive = BackPressureStrategy | DroppingStrategy | SlidingStrategy

/** @internal */
export type StrategyOp<OpCode extends number, Body = {}> = Queue.Strategy<never> & Body & {
  readonly op: OpCode
  readonly trace?: string
}

/** @internal */
export const OP_BACKPRESSURE_STRATEGY = 0 as const

/** @internal */
export type OP_BACKPRESSURE_STRATEGY = typeof OP_BACKPRESSURE_STRATEGY

/** @internal */
export const OP_DROPPING_STRATEGY = 1 as const

/** @internal */
export type OP_DROPPING_STRATEGY = typeof OP_DROPPING_STRATEGY

/** @internal */
export const OP_SLIDING_STRATEGY = 2 as const

/** @internal */
export type OP_SLIDING_STRATEGY = typeof OP_SLIDING_STRATEGY

/** @internal */
export interface BackPressureStrategy extends
  StrategyOp<OP_BACKPRESSURE_STRATEGY, {
    /**
     * - `A` is an item to add
     * - `Deferred<never, boolean>` is the deferred completing the whole `offerAll`
     * - `boolean` indicates if it's the last item to offer (deferred should be
     *    completed once this item is added)
     */
    readonly putters: MutableQueue.MutableQueue<readonly [unknown, Deferred.Deferred<never, boolean>, boolean]>
  }>
{}

/** @internal */
export interface DroppingStrategy extends StrategyOp<OP_DROPPING_STRATEGY, {}> {}

/** @internal */
export interface SlidingStrategy extends StrategyOp<OP_SLIDING_STRATEGY, {}> {}

/** @internal */
const backPressureStrategy = (): StrategyPrimitive => {
  return {
    [QueueStrategyTypeId]: queueStrategyVariance,
    op: OP_BACKPRESSURE_STRATEGY,
    putters: MutableQueue.unbounded()
  }
}

/** @internal */
const droppingStrategy: StrategyPrimitive = {
  [QueueStrategyTypeId]: queueStrategyVariance,
  op: OP_DROPPING_STRATEGY
}

/** @internal */
const slidingStrategy: StrategyPrimitive = {
  [QueueStrategyTypeId]: queueStrategyVariance,
  op: OP_SLIDING_STRATEGY
}

/** @internal */
const handleSurplus = (
  strategy: StrategyPrimitive,
  as: Iterable<unknown>,
  queue: MutableQueue.MutableQueue<unknown>,
  takers: MutableQueue.MutableQueue<Deferred.Deferred<never, unknown>>,
  isShutdown: MutableRef.MutableRef<boolean>
): Effect.Effect<never, never, boolean> => {
  switch (strategy.op) {
    case OP_BACKPRESSURE_STRATEGY: {
      return core.withFiberRuntime((state) => {
        // TODO(Max): remove case to any
        const deferred = core.unsafeMakeDeferred<never, boolean>((state as any).id)
        return pipe(
          core.suspendSucceed(() => {
            unsafeBackPressureOffer(strategy, as, deferred)
            unsafeOnBackPressureQueueEmptySpace(strategy, queue, takers)
            unsafeCompleteTakers(strategy, queue, takers)
            return MutableRef.get(isShutdown) ? core.interrupt() : core.awaitDeferred(deferred)
          }),
          core.onInterrupt(() => core.sync(() => unsafeBackPressureRemove(strategy, deferred)))
        )
      })
    }
    case OP_DROPPING_STRATEGY: {
      return core.succeed(false)
    }
    case OP_SLIDING_STRATEGY: {
      return core.sync(() => {
        unsafeSlidingOffer(queue, as)
        unsafeCompleteTakers(strategy, queue, takers)
        return true
      })
    }
  }
}

/** @internal */
const unsafeOnQueueEmptySpace = (
  strategy: StrategyPrimitive,
  queue: MutableQueue.MutableQueue<unknown>,
  takers: MutableQueue.MutableQueue<Deferred.Deferred<never, unknown>>
): void => {
  switch (strategy.op) {
    case OP_BACKPRESSURE_STRATEGY: {
      return unsafeOnBackPressureQueueEmptySpace(strategy, queue, takers)
    }
    case OP_DROPPING_STRATEGY:
    case OP_SLIDING_STRATEGY: {
      return
    }
  }
}

/** @internal */
const surplusSize = (strategy: StrategyPrimitive): number => {
  switch (strategy.op) {
    case OP_BACKPRESSURE_STRATEGY: {
      return MutableQueue.length(strategy.putters)
    }
    case OP_DROPPING_STRATEGY:
    case OP_SLIDING_STRATEGY: {
      return 0
    }
  }
}

/** @internal */
const strategyShutdown = (strategy: StrategyPrimitive): Effect.Effect<never, never, void> => {
  switch (strategy.op) {
    case OP_BACKPRESSURE_STRATEGY: {
      return pipe(
        core.fiberId(),
        core.flatMap((fiberId) =>
          pipe(
            core.sync(() => unsafePollAll(strategy.putters)),
            core.flatMap(core.forEachPar(([_, deferred, isLastItem]) =>
              isLastItem ? pipe(deferred, core.interruptAsDeferred(fiberId)) : core.unit()
            ))
          )
        )
      )
    }
    case OP_DROPPING_STRATEGY:
    case OP_SLIDING_STRATEGY: {
      return core.unit()
    }
  }
}

/** @internal */
const unsafeBackPressureOffer = (
  strategy: BackPressureStrategy,
  as: Iterable<unknown>,
  deferred: Deferred.Deferred<never, boolean>
): void => {
  const iterator = as[Symbol.iterator]()
  let next: IteratorResult<unknown>
  while (!(next = iterator.next()).done) {
    const value = next.value
    next = iterator.next()
    if (next.done) {
      pipe(strategy.putters, MutableQueue.offer([value, deferred, true as boolean] as const))
    } else {
      pipe(strategy.putters, MutableQueue.offer([value, deferred, false as boolean] as const))
    }
  }
}

const unsafeBackPressureRemove = (
  strategy: BackPressureStrategy,
  deferred: Deferred.Deferred<never, boolean>
): void => {
  unsafeOfferAll(
    strategy.putters,
    pipe(unsafePollAll(strategy.putters), List.filter(([, _]) => _ !== deferred))
  )
}

/** @internal */
const unsafeOnBackPressureQueueEmptySpace = (
  strategy: BackPressureStrategy,
  queue: MutableQueue.MutableQueue<unknown>,
  takers: MutableQueue.MutableQueue<Deferred.Deferred<never, unknown>>
): void => {
  let keepPolling = true
  while (keepPolling && !MutableQueue.isFull(queue)) {
    const putter = pipe(strategy.putters, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
    if (putter !== MutableQueue.EmptyMutableQueue) {
      const offered = pipe(queue, MutableQueue.offer(putter[0]))
      if (offered && putter[2]) {
        unsafeCompleteDeferred(putter[1], true)
      } else if (!offered) {
        unsafeOfferAll(strategy.putters, pipe(unsafePollAll(strategy.putters), List.prepend(putter)))
      }
      unsafeCompleteTakers(strategy, queue, takers)
    } else {
      keepPolling = false
    }
  }
}

const unsafeSlidingOffer = <A>(queue: MutableQueue.MutableQueue<A>, as: Iterable<A>) => {
  const iterator = as[Symbol.iterator]()
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
export const unsafeCompleteTakers = (
  strategy: StrategyPrimitive,
  queue: MutableQueue.MutableQueue<unknown>,
  takers: MutableQueue.MutableQueue<Deferred.Deferred<never, unknown>>
): void => {
  // Check both a taker and an item are in the queue, starting with the taker
  let keepPolling = true
  while (keepPolling && !MutableQueue.isEmpty(queue)) {
    const taker = pipe(takers, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
    if (taker !== MutableQueue.EmptyMutableQueue) {
      const element = pipe(queue, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
      if (element !== MutableQueue.EmptyMutableQueue) {
        unsafeCompleteDeferred(taker, element)
        unsafeOnQueueEmptySpace(strategy, queue, takers)
      } else {
        unsafeOfferAll(takers, pipe(unsafePollAll(takers), List.prepend(taker)))
      }
      keepPolling = true
    } else {
      keepPolling = false
    }
  }
}
