import * as Cause from "@effect/io/Cause"
import * as E from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import { pipe } from "@fp-ts/data/Function"

const program = pipe(
  E.Do(),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.tap(() => E.sync(() => 1)),
  E.flatMap(() => E.tuplePar(E.fail(0), E.unit())),
  E.flatMap((res) => E.sync(() => console.log(`res: ${res}`)))
)

pipe(program, E.unsafeRunPromiseExit).then((exit) => {
  if (Exit.isFailure(exit)) {
    console.log(Cause.pretty(exit.cause))
  }
})
