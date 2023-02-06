import * as Cause from "@effect/io/Cause"
import * as FiberId from "@effect/io/Fiber/Id"
import * as FiberRefs from "@effect/io/FiberRefs"
import { logLevelInfo } from "@effect/io/internal_effect_untraced/core"
import * as LogSpan from "@effect/io/Logger/Span"
import * as Runtime from "@effect/io/Runtime"

import * as Chunk from "@effect/data/Chunk"
import * as HashMap from "@effect/data/HashMap"
import * as Logger from "@effect/io/Logger"

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
    const annotations = HashMap.make(
      ["just_a_key", "just_a_value"],
      ["I am bad key name", JSON.stringify({ coolValue: "cool value" })],
      ["good_key", "I am a good value"]
    )

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
      `timestamp=${date.toJSON()} level=INFO fiber= message="My message" imma_span__=7ms just_a_key=just_a_value good_key="I am a good value" I_am_bad_key_name="{\\"coolValue\\":\\"cool value\\"}"`
    )
  })

  test("with linebreaks", () => {
    const date = new Date()
    vi.setSystemTime(date)
    const spans = Chunk.make(LogSpan.make("imma\nspan=\"", date.getTime() - 7))
    const annotations = HashMap.make(
      ["I am also\na bad key name", JSON.stringify({ return: "cool\nvalue" })],
      ["good_key", JSON.stringify({ returnWithSpace: "cool\nvalue or not" })],
      ["good_key2", "I am a good value\nwith line breaks"],
      ["good_key3", "I_have=a"]
    )

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
      `timestamp=${date.toJSON()} level=INFO fiber= message="My
message" imma_span__=7ms I_am_also_a_bad_key_name="{\\"return\\":\\"cool\\nvalue\\"}" good_key="{\\"returnWithSpace\\":\\"cool\\nvalue or not\\"}" good_key2="I am a good value
with line breaks" good_key3="I_have=a"`
    )
  })
})

describe("logfmtLogger", () => {
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
    const annotations = HashMap.make(
      ["just_a_key", "just_a_value"],
      ["I am bad key name", JSON.stringify({ coolValue: "cool value" })],
      ["good_key", "I am a good value"]
    )

    const result = Logger.logfmtLogger.log(
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
      `timestamp=${date.toJSON()} level=INFO fiber= message="My message" imma_span__=7ms just_a_key=just_a_value good_key="I am a good value" I_am_bad_key_name="{\\"coolValue\\":\\"cool value\\"}"`
    )
  })

  test("with linebreaks", () => {
    const date = new Date()
    vi.setSystemTime(date)
    const spans = Chunk.make(LogSpan.make("imma\nspan=\"", date.getTime() - 7))
    const annotations = HashMap.make(
      ["I am also\na bad key name", JSON.stringify({ return: "cool\nvalue" })],
      ["good_key", JSON.stringify({ returnWithSpace: "cool\nvalue or not" })],
      ["good_key2", "I am a good value\nwith line breaks"],
      ["good_key3", "I_have=a"]
    )

    const result = Logger.logfmtLogger.log(
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
      `timestamp=${date.toJSON()} level=INFO fiber= message="My\\nmessage" imma_span__=7ms I_am_also_a_bad_key_name="{\\"return\\":\\"cool\\\\nvalue\\"}" good_key="{\\"returnWithSpace\\":\\"cool\\\\nvalue or not\\"}" good_key2="I am a good value\\nwith line breaks" good_key3="I_have=a"`
    )
  })
})
