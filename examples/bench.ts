import * as Effect from "@effect/io/Effect"

const promiseBased = async (n: number): Promise<number> => {
  if (n < 2) {
    return 1
  } else {
    return (await promiseBased(n - 1)) + (await promiseBased(n - 2))
  }
}

const effectBased = (n: number): Effect.Effect<never, never, number> =>
  n < 2 ?
    Effect.succeed(1) :
    Effect.zipWith(effectBased(n - 1), effectBased(n - 2), (a, b) => a + b)

const main = async () => {
  console.time("promise")
  for (let i = 0; i < 10_000; i++) {
    await promiseBased(10)
  }
  console.timeEnd("promise")

  console.time("effect")
  await Effect.runPromise(Effect.repeatN(effectBased(10), 10_000))
  console.timeEnd("effect")
}

main()
