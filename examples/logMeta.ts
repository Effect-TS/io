import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as FiberRef from "@effect/io/FiberRef"
import * as FiberRefs from "@effect/io/FiberRefs"
import * as Logger from "@effect/io/Logger"

type LogMeta = Record<string, string>

const logMeta = FiberRef.unsafeMake<LogMeta>({})

const logInfoWithMeta = (message: string, data: LogMeta) => Effect.locally(logMeta, data)(Effect.logInfo(message))

const customLogger = Logger.make<string, void>(
  (fiberId, logLevel, message, cause, context, spans, annotations, date) => {
    const meta = FiberRefs.getOrDefault(context, logMeta)
    const formatted = Logger.stringLogger.log(fiberId, logLevel, message, cause, context, spans, annotations, date)
    console.log(formatted, { meta })
  }
)

const program = Effect.gen(function*($) {
  yield* $(logInfoWithMeta("message1", { foo: "bar" }))
})

const main = pipe(
  program,
  Effect.provideSomeLayer(Logger.replace(Logger.defaultLogger, customLogger))
)

Effect.runFork(main)
