import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Ref from "@effect/io/Ref"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

export const acquire1 = "Acquiring Module 1"
export const acquire2 = "Acquiring Module 2"
export const acquire3 = "Acquiring Module 3"
export const release1 = "Releasing Module 1"
export const release2 = "Releasing Module 2"
export const release3 = "Releasing Module 3"

export const makeRef = (): Effect.Effect<never, never, Ref.Ref<Chunk.Chunk<string>>> => {
  return Ref.make(Chunk.empty)
}

export class Service1 {
  one(): Effect.Effect<never, never, number> {
    return Effect.succeed(1)
  }
}

export const Service1Tag = Context.Tag<Service1>()

export const makeLayer1 = (ref: Ref.Ref<Chunk.Chunk<string>>): Layer.Layer<never, never, Service1> => {
  return Layer.scoped(Service1Tag)(
    Effect.acquireRelease(
      pipe(ref, Ref.update(Chunk.append(acquire1)), Effect.as(new Service1())),
      () => pipe(ref, Ref.update(Chunk.append(release1)))
    )
  )
}

export class Service2 {
  two(): Effect.Effect<never, never, number> {
    return Effect.succeed(2)
  }
}

export const Service2Tag = Context.Tag<Service2>()

export const makeLayer2 = (ref: Ref.Ref<Chunk.Chunk<string>>): Layer.Layer<never, never, Service2> => {
  return Layer.scoped(Service2Tag)(
    Effect.acquireRelease(
      pipe(ref, Ref.update(Chunk.append(acquire2)), Effect.as(new Service2())),
      () => pipe(ref, Ref.update(Chunk.append(release2)))
    )
  )
}

export class Service3 {
  three(): Effect.Effect<never, never, number> {
    return Effect.succeed(3)
  }
}

export const Service3Tag = Context.Tag<Service3>()

export const makeLayer3 = (ref: Ref.Ref<Chunk.Chunk<string>>): Layer.Layer<never, never, Service3> => {
  return Layer.scoped(Service3Tag)(
    Effect.acquireRelease(
      pipe(ref, Ref.update(Chunk.append(acquire3)), Effect.as(new Service3())),
      () => pipe(ref, Ref.update(Chunk.append(release3)))
    )
  )
}

const program = Effect.gen(function*() {
  const ref = yield* makeRef()
  const layer1 = makeLayer1(ref)
  const layer2 = makeLayer2(ref)
  const layer3 = makeLayer3(ref)
  const env = pipe(
    layer1,
    Layer.provideTo(layer2),
    Layer.merge(
      pipe(
        layer1,
        Layer.provideTo(layer3)
      )
    ),
    Layer.build
  )
  yield* Effect.scoped(env)
  const result = yield* pipe(Ref.get(ref), Effect.map((chunk) => Array.from(chunk)))
  console.log(result)
})

Effect.unsafeFork(program)
