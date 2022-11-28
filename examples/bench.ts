import * as E from "@effect/io/Effect"
import * as F from "@effect/io/Fiber"
import { seconds } from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"

pipe(
  E.sync(() => 0),
  E.flatMap(() =>
    E.fork(
      pipe(
        E.sync(() => 1),
        E.zipRight(E.sleep(seconds(3)))
      )
    )
  ),
  E.flatMap((_) => F.join(_)),
  E.unsafeFork
)
