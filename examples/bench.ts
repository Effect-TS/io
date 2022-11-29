import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Sem from "@effect/io/internal/semaphore"
import * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"
import * as ROArray from "@fp-ts/data/ReadonlyArray"

const program = Effect.gen(function*($) {
  const sem = yield* $(Sem.make(1))

  yield* $(pipe(
    ROArray.range(1, 20),
    Effect.forEachPar((n) =>
      pipe(Effect.sync(() => console.log(n)), Effect.delay(Duration.millis(200)), Sem.withPermit(sem))
    )
  ))
})

Effect.unsafeRunPromiseExit(program).then((exit) => {
  if (Exit.isFailure(exit)) {
    console.log(Cause.pretty()(exit.cause))
  }
})
