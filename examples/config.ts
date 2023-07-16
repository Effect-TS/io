import * as Context from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import * as Config from "@effect/io/Config"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"

export interface HttpServer {
  readonly host: string
  readonly port: number
}

export const HttpServer = Context.Tag<HttpServer>()

export const HttpServerLive = Layer.effect(
  HttpServer,
  Effect.gen(function*($) {
    const [host, port] = yield* $(Effect.config(
      Config.all(Config.string("HOST"), Config.integer("PORT"))
    ))
    return {
      host,
      port
    }
  })
)

export const program = Effect.gen(function*($) {
  const { host, port } = yield* $(HttpServer)
  yield* $(Effect.log(`Host: ${host}`))
  yield* $(Effect.log(`Port: ${port}`))
})

pipe(
  program,
  Effect.provideSomeLayer(HttpServerLive),
  Effect.catchAllCause(Effect.logCause("Error")),
  Effect.runFork
)
