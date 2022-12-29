import * as E from "@effect/io/Effect"
import * as D from "@fp-ts/data/Duration"

const program = E.gen(function*($) {
  const withPermits = yield* $(E.makeSemaphore(4))

  yield* $(
    E.collectAllPar([0, 1, 2, 3].map((n) => withPermits(2)(E.delay(D.seconds(2))(E.log(`process: ${n}`)))))
  )

  yield* $(
    E.collectAllPar([0, 1, 2, 3].map((n) => withPermits(2)(E.delay(D.seconds(2))(E.log(`process: ${n}`)))))
  )
})

E.unsafeRun(program, (ex) => {
  console.log(ex)
})
