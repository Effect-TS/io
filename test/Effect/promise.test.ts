import * as Effect from "@effect/io/Effect"
import * as timeout from "@effect/io/internal/timeout"
import { describe, expect, it } from "bun:test"

describe("Effect", () => {
  it("promise - success with AbortSignal", async () => {
    let aborted = false
    const effect = Effect.promise<void>((signal) => {
      signal.addEventListener("abort", () => {
        aborted = true
      })
      return new Promise((resolve) => {
        timeout.set(() => {
          resolve()
        }, 100)
      })
    })
    const program = effect.pipe(
      Effect.timeout("10 millis")
    )
    const exit = await Effect.runPromiseExit(program)
    expect(exit._tag).toBe("Success")
    expect(aborted).toBe(true)
  })
})
