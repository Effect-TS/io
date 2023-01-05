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
    const spans = Chunk.make(LogSpan.make("imma span", date.getTime()))
    const annotations = new Map<string, string>([["I am bad key name", JSON.stringify({ coolValue: "cool value" })]])

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
      `timestamp=${date.toJSON()} level=INFO fiber= message="My message" imma_span=0ms I_am_bad_key_name="{\\"coolValue\\":\\"cool value\\"}"`
    )
  })
})
