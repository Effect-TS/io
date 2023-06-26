import * as D from "@effect/data/Duration"
import * as Ca from "@effect/io/Cause"
import * as E from "@effect/io/Effect"
import * as Ex from "@effect/io/Exit"

const program = E.gen(function*($) {
  const sem = yield* $(E.makeSemaphore(4))

  yield* $(
    E.all([0, 1, 2, 3].map((n) => sem.withPermits(2)(E.delay(D.seconds(2))(E.log(`process: ${n}`)))), {
      concurrency: "inherit"
    })
  )

  yield* $(
    E.all([0, 1, 2, 3].map((n) => sem.withPermits(2)(E.delay(D.seconds(2))(E.log(`process: ${n}`)))), {
      concurrency: "inherit"
    })
  )
})

E.runCallback(program, (ex) => {
  if (Ex.isFailure(ex)) {
    console.log(Ca.pretty(ex.cause))
  }
})
