// import * as Effect from "@effect/io/Effect"
// import * as Layer from "@effect/io/Layer"
// import * as Logger from "@effect/io/Logger"
// import { Tag } from "@fp-ts/data/Context"
// import { pipe } from "@fp-ts/data/Function"

// interface Config {
//   message: string
// }
// const Config = Tag<Config>()

// const env = pipe(
//   Logger.console(),
//   Layer.merge(Layer.fromEffect(Config)(Effect.succeed({ message: "hello world" })))
// )

// const program = pipe(
//   Effect.log("message"),
//   Effect.provideSomeLayer(env)
// )

// Effect.unsafeFork(program)
