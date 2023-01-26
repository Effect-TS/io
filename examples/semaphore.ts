import * as Ca from "@effect/io/Cause"
import * as E from "@effect/io/Effect"
import * as Ex from "@effect/io/Exit"
import * as D from "@fp-ts/data/Duration"

const program = E.gen(function*($) {
  const sem = yield* $(E.makeSemaphore(4))

  yield* $(
    E.collectAllPar([0, 1, 2, 3].map((n) => sem.withPermits(2)(E.delay(D.seconds(2))(E.log(`process: ${n}`)))))
  )

  yield* $(
    E.collectAllPar([0, 1, 2, 3].map((n) => sem.withPermits(2)(E.delay(D.seconds(2))(E.log(`process: ${n}`)))))
  )
})

E.unsafeRun(program, (ex) => {
  if (Ex.isFailure(ex)) {
    console.log(Ca.pretty(ex.cause))
  }
})
