import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Sem from "@effect/io/internal/semaphore"
import * as STM from "@effect/io/internal/stm"
import * as TestClock from "@effect/io/internal/testing/testClock"
import * as it from "@effect/io/test/utils/extend"
import * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"
import * as ROArray from "@fp-ts/data/ReadonlyArray"

describe("STM", () => {
  it.effect("traces failures", () =>
    Effect.gen(function*($) {
      const exit = yield* $(
        pipe(
          STM.succeed(0),
          STM.flatMap(() => STM.fail("ok")),
          Effect.exit
        )
      )
      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        const pretty = Cause.pretty()(exit.cause)
        expect(pretty).toContain("STM.ts:18:33")
      }
    }))

  it.effect("preserves transaction order", () =>
    Effect.gen(function*($) {
      const sem = yield* $(Sem.make(1))
      const inp = ROArray.range(1, 100)
      const out: Array<number> = []
      yield* $(pipe(
        inp,
        Effect.forEachPar((n) =>
          pipe(
            Effect.sync(() => out.push(n)),
            Effect.delay(Duration.seconds(1)),
            Sem.withPermit(sem)
          )
        ),
        Effect.fork
      ))
      yield* $(TestClock.adjust(Duration.seconds(200)))
      expect(inp).toEqual(out)
    }))
})
