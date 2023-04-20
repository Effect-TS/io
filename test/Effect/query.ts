import * as Context from "@effect/data/Context"
import { runtimeDebug } from "@effect/data/Debug"
import { seconds } from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as FiberRef from "@effect/io/FiberRef"
import * as TestClock from "@effect/io/internal_effect_untraced/testing/testClock"
import * as Layer from "@effect/io/Layer"
import * as Request from "@effect/io/Request"
import * as Resolver from "@effect/io/RequestResolver"
import * as it from "@effect/io/test/utils/extend"

runtimeDebug.filterStackFrame = () => true

interface Counter {
  readonly _: unique symbol
}
const Counter = Context.Tag<Counter, { count: number }>()

interface UserCache {
  readonly _: unique symbol
}
const UserCache = Context.Tag<UserCache, Request.Cache<UserRequest>>()
const UserCacheLive = Layer.effect(UserCache, Request.makeCache(10_000, seconds(60)))

export const userIds: ReadonlyArray<number> = ReadonlyArray.range(1, 26)

export const userNames: ReadonlyMap<number, string> = new Map(
  ReadonlyArray.zipWith(
    userIds,
    ReadonlyArray.map(ReadonlyArray.range(97, 122), (a) => String.fromCharCode(a)),
    (a, b) => [a, b] as const
  )
)

export type UserRequest = GetAllIds | GetNameById

export interface GetAllIds extends Request.Request<never, ReadonlyArray<number>> {
  readonly _tag: "GetAllIds"
}

export const GetAllIds = Request.tagged<GetAllIds>("GetAllIds")

export interface GetNameById extends Request.Request<string, string> {
  readonly _tag: "GetNameById"
  readonly id: number
}

export const GetNameById = Request.tagged<GetNameById>("GetNameById")

const delay = <R, E, A>(self: Effect.Effect<R, E, A>) =>
  Effect.zipRight(
    Effect.promise(() => new Promise((r) => setTimeout(() => r(0), 0))),
    self
  )

const counted = <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.tap(self, () => Effect.map(Counter, (c) => c.count++))

const UserResolver = pipe(
  Resolver.makeBatched((requests: Array<UserRequest>) =>
    counted(Effect.forEachDiscard(requests, (request) => delay(processRequest(request))))
  ),
  Resolver.batchN(15),
  Resolver.contextFromServices(Counter)
)

export const getAllUserIds = Effect.request(
  GetAllIds({}),
  UserResolver,
  Effect.serviceOption(UserCache)
)

export const interrupts = FiberRef.unsafeMake({ interrupts: 0 })

export const getUserNameById = (id: number) =>
  Effect.acquireUseRelease(
    Effect.unit(),
    () =>
      Effect.request(
        GetNameById({ id }),
        UserResolver,
        Effect.serviceOption(UserCache)
      ),
    () => Effect.unit()
  )

export const getAllUserNames = pipe(
  getAllUserIds,
  Effect.flatMap(Effect.forEachPar(getUserNameById)),
  Effect.onInterrupt(() => FiberRef.getWith(interrupts, (i) => Effect.sync(() => i.interrupts++)))
)

export const print = (request: UserRequest): string => {
  switch (request._tag) {
    case "GetAllIds": {
      return request._tag
    }
    case "GetNameById": {
      return `${request._tag}(${request.id})`
    }
  }
}

const processRequest = (request: UserRequest): Effect.Effect<never, never, void> => {
  switch (request._tag) {
    case "GetAllIds": {
      return Request.complete(request, Exit.succeed(userIds))
    }
    case "GetNameById": {
      if (userNames.has(request.id)) {
        const userName = userNames.get(request.id)!
        return Request.complete(request, Exit.succeed(userName))
      }
      return Request.completeEffect(request, Exit.fail("Not Found"))
    }
  }
}

const CounterLive = Layer.sync(Counter, () => ({ count: 0 }))

const provideEnv = Effect.provideSomeLayer(Layer.mergeAll(CounterLive, UserCacheLive))

describe.concurrent("Effect", () => {
  it.effect("requests are executed correctly", () =>
    provideEnv(
      Effect.gen(function*($) {
        const names = yield* $(getAllUserNames)
        const count = yield* $(Counter)
        expect(count.count).toEqual(3)
        expect(names.length).toBeGreaterThan(2)
        expect(names).toEqual(userIds.map((id) => userNames.get(id)))
      })
    ))
  it.effect("batching composes", () =>
    provideEnv(
      Effect.gen(function*($) {
        const names = yield* $(
          Effect.zipPar(getAllUserNames, getAllUserNames),
          Effect.withRequestBatching("on")
        )
        const count = yield* $(Counter)
        expect(count.count).toEqual(3)
        expect(names[0].length).toBeGreaterThan(2)
        expect(names[0]).toEqual(userIds.map((id) => userNames.get(id)))
        expect(names[0]).toEqual(names[1])
      })
    ))
  it.effect("batching is independent from parallelism", () =>
    provideEnv(
      Effect.gen(function*($) {
        const names = yield* $(getAllUserNames, Effect.withParallelism(5))
        const count = yield* $(Counter)
        expect(count.count).toEqual(3)
        expect(names.length).toBeGreaterThan(2)
        expect(names).toEqual(userIds.map((id) => userNames.get(id)))
      })
    ))
  it.effect("batching doesn't break interruption", () =>
    Effect.locally(interrupts, { interrupts: 0 })(
      provideEnv(
        Effect.gen(function*($) {
          const exit = yield* $(getAllUserNames, Effect.zipParLeft(Effect.interrupt()), Effect.exit)
          expect(exit._tag).toEqual("Failure")
          if (exit._tag === "Failure") {
            expect(Cause.isInterruptedOnly(exit.cause)).toEqual(true)
          }
          expect(yield* $(Counter)).toEqual({ count: 0 })
          expect(yield* $(FiberRef.get(interrupts))).toEqual({ interrupts: 1 })
        })
      )
    ))
  it.effect("batching doesn't break interruption when limited", () =>
    Effect.locally(interrupts, { interrupts: 0 })(
      provideEnv(
        Effect.gen(function*($) {
          const exit = yield* $(
            getAllUserNames,
            Effect.zipParLeft(Effect.interrupt()),
            Effect.withParallelism(2),
            Effect.exit
          )
          expect(exit._tag).toEqual("Failure")
          if (exit._tag === "Failure") {
            expect(Cause.isInterruptedOnly(exit.cause)).toEqual(true)
          }
          expect(yield* $(Counter)).toEqual({ count: 0 })
          expect(yield* $(FiberRef.get(interrupts))).toEqual({ interrupts: 1 })
        })
      )
    ))
  it.effect("zipPar is not batched when specified", () =>
    provideEnv(
      Effect.gen(function*($) {
        const [a, b] = yield* $(
          Effect.zipPar(
            getUserNameById(userIds[0]),
            getUserNameById(userIds[1])
          ),
          Effect.withRequestBatching("off")
        )
        const count = yield* $(Counter)
        expect(count.count).toEqual(2)
        expect(a).toEqual(userNames.get(userIds[0]))
        expect(b).toEqual(userNames.get(userIds[1]))
      })
    ))
  it.effect("zipPar is batched by default", () =>
    provideEnv(
      Effect.gen(function*($) {
        const [a, b] = yield* $(
          Effect.zipPar(
            getUserNameById(userIds[0]),
            getUserNameById(userIds[1])
          )
        )
        const count = yield* $(Counter)
        expect(count.count).toEqual(1)
        expect(a).toEqual(userNames.get(userIds[0]))
        expect(b).toEqual(userNames.get(userIds[1]))
      })
    ))
  it.effect("requests are cached when possible", () =>
    provideEnv(
      Effect.gen(function*($) {
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        yield* $(UserCache, Effect.flatMap((_) => _.invalidateAll()))
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        const requests = yield* $(UserCache, Effect.flatMap((_) => _.keys()))
        expect(requests.map((_) => _._tag)).toEqual(["GetAllIds"])
        expect(yield* $(Counter)).toEqual({ count: 2 })
      })
    ))
  it.effect("cache respects ttl", () =>
    provideEnv(
      Effect.gen(function*($) {
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        expect(yield* $(Counter)).toEqual({ count: 1 })
        yield* $(TestClock.adjust(seconds(10)))
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        expect(yield* $(Counter)).toEqual({ count: 1 })
        yield* $(TestClock.adjust(seconds(60)))
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        expect(yield* $(Counter)).toEqual({ count: 2 })
      })
    ))
})
