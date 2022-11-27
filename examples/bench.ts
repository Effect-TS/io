import * as E from "@effect/io/Effect"
import { pipe } from "@fp-ts/data/Function"

pipe(
  E.succeed(0),
  E.fold(() => E.die("error"), (n) => E.succeed(n + 1)),
  E.repeatN(5),
  E.timed,
  E.flatMap(([{ millis }]) => E.log(`timed: ${millis} ms`)),
  E.unsafeFork
)
