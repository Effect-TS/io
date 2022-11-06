import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Logger from "@effect/io/Logger"
import { Tag } from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

declare const gen: <Eff extends Effect.Effect.Variance<any, any, any>, AEff>(
  f: () => Generator<Eff, AEff, any>
) => Effect.Effect<
  [Eff] extends [never] ? never : [Eff] extends [Effect.Effect.Variance<infer R, any, any>] ? R : never,
  [Eff] extends [never] ? never : [Eff] extends [Effect.Effect.Variance<any, infer E, any>] ? E : never,
  AEff
>

interface Config {
  message: string
}
const Config = Tag<Config>()

const program = pipe(
  gen(function*() {
    const { message } = yield* Effect.service(Config)

    yield* Effect.log(message)
  }),
  Effect.provideSomeLayer(pipe(
    Logger.console(),
    Layer.merge(Layer.fromEffect(Config)(Effect.succeed({ message: "hello world" })))
  ))
)

Effect.unsafeFork(program)
