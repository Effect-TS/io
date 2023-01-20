import * as Effect from "@effect/io/Effect"
import * as FiberRef from "@effect/io/FiberRef"
import * as FiberRefs from "@effect/io/FiberRefs"
import * as Logger from "@effect/io/Logger"
import { pipe } from "@fp-ts/data/Function"

type LogMeta = Record<string, string>

const logMeta = FiberRef.unsafeMake<LogMeta>({})

const logInfoWithMeta = (message: string, data: LogMeta) => FiberRef.locally(logMeta, data)(Effect.logInfo(message))

const customLogger = Logger.make<string, void>(
  (fiberId, logLevel, message, cause, context, spans, annotations, runtime) => {
    const meta = FiberRefs.getOrDefault(context, logMeta)
    const formatted = Logger.stringLogger.log(fiberId, logLevel, message, cause, context, spans, annotations, runtime)
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

Effect.unsafeFork(main)
