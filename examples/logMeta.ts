import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as FiberRef from "@effect/io/FiberRef"
import * as FiberRefs from "@effect/io/FiberRefs"
import * as Logger from "@effect/io/Logger"

type LogMeta = Record<string, string>

const logMeta = FiberRef.unsafeMake<LogMeta>({})

const logInfoWithMeta = (message: unknown, data: LogMeta) => Effect.locally(logMeta, data)(Effect.logInfo(message))

const customLogger = Logger.make<unknown, void>((options) => {
  const meta = FiberRefs.getOrDefault(options.context, logMeta)
  const formatted = Logger.stringLogger.log(options)
  console.log(formatted, { meta })
})

const program = Effect.gen(function*($) {
  yield* $(logInfoWithMeta({ msg: "message1" }, { foo: "bar" }))
})

const main = pipe(
  program,
  Effect.provide(Logger.replace(Logger.defaultLogger, customLogger))
)

Effect.runFork(main)
