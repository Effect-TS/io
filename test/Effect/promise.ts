import * as Effect from "@effect/io/Effect"

describe.concurrent("Effect", () => {
  it("promise - with AbortSignal", async () => {
    let aborted = false
    const effect = Effect.promise<void>((signal) => {
      signal.addEventListener("abort", () => {
        aborted = true
      })
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve()
        }, 20)
      })
    })
    const program = effect.pipe(
      Effect.timeout("10 millis")
    )
    await Effect.runPromiseExit(program)
    expect(aborted).toBe(true)
  })
})
