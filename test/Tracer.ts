import { seconds } from "@effect/data/Duration"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as TestClock from "@effect/io/internal_effect_untraced/testing/testClock"
import * as it from "@effect/io/test/utils/extend"
import * as Tracer from "@effect/io/Tracer"
import { assert, describe } from "vitest"

describe("Tracer", () => {
  describe("withSpan", () => {
    it.effect("no parent", () =>
      Effect.gen(function*($) {
        const span = yield* $(
          Tracer.withSpan("A")(
            Effect.service(Tracer.Span)
          )
        )

        assert.deepEqual(span.name, "A")
        assert.deepEqual(span.parent, Option.none())
      }))

    it.effect("parent", () =>
      Effect.gen(function*($) {
        const span = yield* $(
          Tracer.withSpan("B")(
            Tracer.withSpan("A")(
              Effect.service(Tracer.Span)
            )
          )
        )

        assert.deepEqual(span.name, "A")
        assert.deepEqual(Option.map(span.parent, (span) => span.name), Option.some("B"))
      }))

    it.effect("parent when root is set", () =>
      Effect.gen(function*($) {
        const span = yield* $(
          Tracer.withSpan("B")(
            Tracer.withSpan("A", { root: true })(
              Effect.service(Tracer.Span)
            )
          )
        )

        assert.deepEqual(span.name, "A")
        assert.deepEqual(span.parent, Option.none())
      }))

    it.effect("external parent", () =>
      Effect.gen(function*($) {
        const span = yield* $(
          Tracer.withSpan("A", {
            parent: {
              _tag: "ExternalSpan",
              name: "external",
              spanId: "000",
              traceId: "111"
            }
          })(
            Effect.service(Tracer.Span)
          )
        )

        assert.deepEqual(span.name, "A")
        assert.deepEqual(
          span.parent,
          Option.some<Tracer.ExternalSpan>({
            _tag: "ExternalSpan",
            name: "external",
            spanId: "000",
            traceId: "111"
          })
        )
      }))

    it.effect("correct time", () =>
      Effect.gen(function*($) {
        const spanFiber = yield* $(
          Effect.fork(
            Tracer.withSpan("A")(
              Effect.delay(seconds(1))(
                Effect.service(Tracer.Span)
              )
            )
          )
        )

        yield* $(TestClock.adjust(seconds(2)))

        const span = yield* $(Fiber.join(spanFiber))

        assert.deepEqual(span.name, "A")
        assert.deepEqual(span.status.startTime, 0)
        assert.deepEqual((span.status as any)["endTime"], 1000)
        assert.deepEqual(span.status._tag, "Ended")
      }))
  })
})
