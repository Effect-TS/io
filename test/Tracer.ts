import * as Context from "@effect/data/Context"
import { millis, seconds } from "@effect/data/Duration"
import { identity } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import * as TestClock from "@effect/io/internal/testing/testClock"
import type { NativeSpan } from "@effect/io/internal/tracer"
import * as it from "@effect/io/test/utils/extend"
import type { Span } from "@effect/io/Tracer"
import { assert, describe } from "vitest"

const currentSpan = Effect.flatMap(Effect.currentSpan, identity)

describe("Tracer", () => {
  describe("withSpan", () => {
    it.effect("no parent", () =>
      Effect.gen(function*($) {
        const span = yield* $(
          Effect.withSpan("A")(currentSpan)
        )

        assert.deepEqual(span.name, "A")
        assert.deepEqual(span.parent, Option.none())
      }))

    it.effect("parent", () =>
      Effect.gen(function*($) {
        const span = yield* $(
          Effect.withSpan("B")(
            Effect.withSpan("A")(currentSpan)
          )
        )

        assert.deepEqual(span.name, "A")
        assert.deepEqual(Option.map(span.parent, (span) => (span as Span).name), Option.some("B"))
      }))

    it.effect("parent when root is set", () =>
      Effect.gen(function*($) {
        const span = yield* $(
          Effect.withSpan("B")(Effect.withSpan("A", { root: true })(currentSpan))
        )

        assert.deepEqual(span.name, "A")
        assert.deepEqual(span.parent, Option.none())
      }))

    it.effect("external parent", () =>
      Effect.gen(function*($) {
        const span = yield* $(
          Effect.withSpan("A", {
            parent: {
              _tag: "ExternalSpan",
              spanId: "000",
              traceId: "111",
              context: Context.empty()
            }
          })(currentSpan)
        )
        assert.deepEqual(span.name, "A")
        assert.deepEqual(Option.map(span.parent, (span) => span.spanId), Option.some("000"))
      }))

    it.effect("correct time", () =>
      Effect.gen(function*($) {
        const spanFiber = yield* $(
          Effect.fork(Effect.withSpan("A")(Effect.delay(seconds(1))(currentSpan)))
        )

        yield* $(TestClock.adjust(seconds(2)))

        const span = yield* $(Fiber.join(spanFiber))

        assert.deepEqual(span.name, "A")
        assert.deepEqual(span.status.startTime, 0n)
        assert.deepEqual((span.status as any)["endTime"], 1000000000n)
        assert.deepEqual(span.status._tag, "Ended")
      }))

    it.effect("annotateSpans", () =>
      Effect.gen(function*($) {
        const span = yield* $(
          Effect.annotateSpans(
            Effect.withSpan("A")(currentSpan),
            "key",
            "value"
          )
        )

        assert.deepEqual(span.name, "A")
        assert.deepEqual(span.parent, Option.none())
        assert.deepEqual(span.attributes.get("key"), "value")
      }))

    it.effect("logger", () =>
      Effect.gen(function*($) {
        yield* $(TestClock.adjust(millis(0.01)))

        const [span, fiberId] = yield* $(
          Effect.log("event"),
          Effect.zipRight(Effect.all([currentSpan, Effect.fiberId])),
          Effect.withSpan("A")
        )

        assert.deepEqual(span.name, "A")
        assert.deepEqual(span.parent, Option.none())
        assert.deepEqual((span as NativeSpan).events, [["event", 10000n, {
          "effect.fiberId": FiberId.threadName(fiberId),
          "effect.logLevel": "INFO"
        }]])
      }))

    it.effect("withTracerTiming false", () =>
      Effect.gen(function*($) {
        yield* $(TestClock.adjust(millis(1)))

        const span = yield* $(
          Effect.withSpan("A")(currentSpan),
          Effect.withTracerTiming(false)
        )

        assert.deepEqual(span.status.startTime, 0n)
      }))
  })
})
