import * as EC from "@effect/core/io/Effect"
import * as E from "@effect/io/Effect"
import { pipe } from "@fp-ts/data/Function"

const newProgram = () =>
  pipe(
    E.succeed(0),
    E.flatMap((n) => E.succeed(n + 1)),
    E.repeatN(100_000),
    E.unsafeRunPromise
  )

const oldProgram = () =>
  pipe(
    EC.succeed(0),
    EC.flatMap((n) => EC.succeed(n + 1)),
    EC.repeatN(100_000),
    EC.unsafeRunPromise
  )

async function main() {
  console.time("old")
  await oldProgram()
  console.timeEnd("old")
  console.time("new")
  await newProgram()
  console.timeEnd("new")
}

main()
