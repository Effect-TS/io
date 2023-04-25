import * as Context from "@effect/data/Context"
import { seconds } from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Request from "@effect/io/Request"
import * as Resolver from "@effect/io/RequestResolver"
import * as it from "@effect/io/test/utils/extend"

interface Counter {
  readonly _: unique symbol
}
const Counter = Context.Tag<Counter, { count: number }>()
interface Requests {
  readonly _: unique symbol
}
const Requests = Context.Tag<Requests, { count: number }>()

interface Parent {
  readonly id: number
}

interface Child {
  readonly id: number
  readonly parentId: number
}

interface ChildInfo {
  readonly id: number
  readonly childId: number
  readonly name: string
}

interface ChildExtra {
  readonly id: number
  readonly childId: number
  readonly extra: string
}

export interface GetAllParents extends Request.Request<never, ReadonlyArray<Parent>> {
  readonly _tag: "GetAllParents"
}

export const GetAllParents = Request.tagged<GetAllParents>("GetAllParents")

export interface GetParentChildren extends Request.Request<never, ReadonlyArray<Child>> {
  readonly _tag: "GetParentChildren"
  readonly id: number
}

export const GetParentChildren = Request.tagged<GetParentChildren>("GetParentChildren")

export interface GetChildInfo extends Request.Request<never, ChildInfo> {
  readonly _tag: "GetChildInfo"
  readonly id: number
}

export const GetChildInfo = Request.tagged<GetChildInfo>("GetChildInfo")

export interface GetChildExtra extends Request.Request<never, ChildExtra> {
  readonly _tag: "GetChildExtra"
  readonly id: number
}

export const GetChildExtra = Request.tagged<GetChildExtra>("GetChildExtra")

export const parents = ReadonlyArray.range(1, 2).map<Parent>((id) => ({ id }))

export const children: ReadonlyMap<number, ReadonlyArray<Child>> = new Map(
  ReadonlyArray.map(parents, (p) => [
    p.id,
    ReadonlyArray.of({ id: p.id * 10, parentId: p.id })
  ])
)

const counted = <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.tap(self, () => Effect.map(Counter, (c) => c.count++))

const AllResolver = pipe(
  Resolver.makeBatched((requests: Array<GetParentChildren | GetAllParents | GetChildExtra | GetChildInfo>) =>
    Effect.flatMap(Requests, (r) => {
      r.count += requests.length
      return counted(Effect.all(
        Effect.forEach(
          requests.filter((_): _ is GetParentChildren => _._tag === "GetParentChildren"),
          (request) => Request.succeed(request, children.get(request.id)!)
        ),
        Effect.forEach(
          requests.filter((_): _ is GetChildExtra => _._tag === "GetChildExtra"),
          (request) =>
            Request.succeed(request, {
              id: request.id * 10,
              childId: request.id,
              extra: "more stuff"
            })
        ),
        Effect.forEach(
          requests.filter((_): _ is GetChildInfo => _._tag === "GetChildInfo"),
          (request) =>
            Request.succeed(request, {
              id: request.id * 10,
              childId: request.id,
              name: "Mike"
            })
        ),
        Effect.forEach(
          requests.filter((_): _ is GetAllParents => _._tag === "GetAllParents"),
          (request) => Request.succeed(request, parents)
        )
      ))
    })
  ),
  Resolver.batchN(15),
  Resolver.contextFromServices(Counter, Requests)
)

export const getAllParents = Effect.request(GetAllParents({}), AllResolver)
export const getChildren = (id: number) => Effect.request(GetParentChildren({ id }), AllResolver)
export const getChildInfo = (id: number) => Effect.request(GetChildInfo({ id }), AllResolver)
export const getChildExtra = (id: number) => Effect.request(GetChildExtra({ id }), AllResolver)

const EnvLive = Layer.provideMerge(
  Layer.mergeAll(
    Effect.setRequestCache(Request.makeCache(100, seconds(60))),
    Effect.setRequestCaching("on"),
    Effect.setRequestBatching("on")
  ),
  Layer.mergeAll(
    Layer.sync(Counter, () => ({ count: 0 })),
    Layer.sync(Requests, () => ({ count: 0 }))
  )
)

describe.concurrent("Effect", () => {
  it.effect("nested queries are batched", () =>
    pipe(
      Effect.gen(function*($) {
        const parents = yield* $(getAllParents)

        yield* $(Effect.forEachPar(parents, (parent) =>
          Effect.flatMap(getChildren(parent.id), (children) =>
            Effect.forEachPar(children, (child) =>
              Effect.zipPar(getChildInfo(child.id), getChildExtra(child.id))))))

        const count = yield* $(Counter)
        const requests = yield* $(Requests)

        expect(count.count).toBe(3)
        expect(requests.count).toBe(7)
      }),
      Effect.provideSomeLayer(EnvLive)
    ))
  it.effect("nested queries are batched when parallelism is set to 1", () =>
    pipe(
      Effect.gen(function*($) {
        const parents = yield* $(getAllParents)

        yield* $(Effect.forEachPar(parents, (parent) =>
          Effect.flatMap(getChildren(parent.id), (children) =>
            Effect.forEachPar(children, (child) =>
              Effect.zipPar(getChildInfo(child.id), getChildExtra(child.id))))))

        const count = yield* $(Counter)
        const requests = yield* $(Requests)

        expect(count.count).toBe(3)
        expect(requests.count).toBe(7)
      }),
      Effect.withParallelism(1),
      Effect.provideSomeLayer(EnvLive)
    ))
})
