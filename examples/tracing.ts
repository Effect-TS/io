import * as Effect from "@effect/io/Effect"
import * as Schedule from "@effect/io/Schedule"
import * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"

const schedule = pipe(
  Schedule.recurs(1),
  Schedule.addDelay((n) => Duration.millis(n * 100))
)

const message = (n: number) => {
  if (n < 10) {
    throw new Error("well...")
  }
}

const mentioned = (n: number) => {
  if (n < 10) {
    message(n)
  }
}

const program = pipe(
  Effect.gen(function*($) {
    const a = yield* $(Effect.succeed(0))
    const b = yield* $(Effect.succeed(a + 1))
    return yield* $(Effect.sync(() => {
      return mentioned(b)
    }))
  }),
  Effect.schedule(schedule)
)

Effect.unsafeFork(Effect.catchAllCause(program, Effect.logErrorCause))
