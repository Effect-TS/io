import * as Cause from "@effect/io/Cause"
import * as FiberId from "@effect/io/Fiber/Id"
import * as FiberRefs from "@effect/io/FiberRefs"
import { logLevelInfo } from "@effect/io/internal/core"
import * as LogSpan from "@effect/io/Logger/Span"
import * as Runtime from "@effect/io/Runtime"

import * as Logger from "@effect/io/Logger"
import * as Chunk from "@fp-ts/data/Chunk"

import { vi } from "vitest"

describe("stringLogger", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test("keys with special chars", () => {
    const date = new Date()
    vi.setSystemTime(date)
    const spans = Chunk.make(LogSpan.make("imma span=\"", date.getTime() - 7))
    const annotations = new Map<string, string>([
      ["I am bad key name", JSON.stringify({ coolValue: "cool value" })],
      ["imma_good_key", "I am a good value"]
    ])

    const result = Logger.stringLogger.log(
      FiberId.none,
      logLevelInfo,
      "My message",
      Cause.empty,
      FiberRefs.unsafeMake(new Map()),
      spans,
      annotations,
      Runtime.defaultRuntime
    )

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message="My message" imma_span__=7ms I_am_bad_key_name="{\\"coolValue\\":\\"cool value\\"}" imma_good_key="I am a good value"`
    )
  })

  test("with linebreaks", () => {
    const date = new Date()
    vi.setSystemTime(date)
    const spans = Chunk.make(LogSpan.make("imma\nspan=\"", date.getTime() - 7))
    const annotations = new Map<string, string>([
      ["I am also\na bad key name", JSON.stringify({ valueWithReturn: "cool\nvalue" })],
      ["imma_good_key2", "I am a good value\nwith line breaks"]
    ])

    const result = Logger.stringLogger.log(
      FiberId.none,
      logLevelInfo,
      "My\nmessage",
      Cause.empty,
      FiberRefs.unsafeMake(new Map()),
      spans,
      annotations,
      Runtime.defaultRuntime
    )

    expect(result).toEqual(
      `timestamp=${date.toJSON()} level=INFO fiber= message="My\\nmessage" imma_span__=7ms I_am_also_a_bad_key_name="{\\"valueWithReturn\\":\\"cool\\\\nvalue\\"}" imma_good_key2="I am a good value\\nwith line breaks"`
    )
  })
})
