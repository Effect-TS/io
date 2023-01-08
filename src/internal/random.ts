import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import type * as Random from "@effect/io/Random"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as PCGRandom from "@fp-ts/data/Random"

/** @internal */
const RandomSymbolKey = "@effect/io/Random"

/** @internal */
export const RandomTypeId: Random.RandomTypeId = Symbol.for(
  RandomSymbolKey
) as Random.RandomTypeId

/** @internal */
export const randomTag: Context.Tag<Random.Random> = Context.Tag()
/** @internal */
class RandomImpl implements Random.Random {
  readonly [RandomTypeId]: Random.RandomTypeId = RandomTypeId

  readonly PRNG: PCGRandom.PCGRandom

  constructor(readonly seed: number) {
    Equal.considerByRef(this)
    this.PRNG = new PCGRandom.PCGRandom(seed)
  }

  next(): Effect.Effect<never, never, number> {
    const trace = getCallTrace()
    return core.sync(() => this.PRNG.number()).traced(trace)
  }

  nextBoolean(): Effect.Effect<never, never, boolean> {
    const trace = getCallTrace()
    return pipe(this.next(), core.map((n) => n > 0.5)).traced(trace)
  }

  nextInt(): Effect.Effect<never, never, number> {
    const trace = getCallTrace()
    return core.sync(() => this.PRNG.integer(Number.MAX_SAFE_INTEGER)).traced(trace)
  }

  nextRange(min: number, max: number): Effect.Effect<never, never, number> {
    const trace = getCallTrace()
    return pipe(this.next(), core.map((n) => (max - min) * n + min)).traced(trace)
  }

  nextIntBetween(min: number, max: number): Effect.Effect<never, never, number> {
    const trace = getCallTrace()
    return core.sync(() => this.PRNG.integer(1 + max - min) + min).traced(trace)
  }

  shuffle<A>(elements: Iterable<A>): Effect.Effect<never, never, Chunk.Chunk<A>> {
    const trace = getCallTrace()
    return shuffleWith(elements, (n) => this.nextIntBetween(0, n)).traced(trace)
  }
}

/** @internal */
const shuffleWith = <A>(
  elements: Iterable<A>,
  nextIntBounded: (n: number) => Effect.Effect<never, never, number>
): Effect.Effect<never, never, Chunk.Chunk<A>> => {
  return core.suspendSucceed(() =>
    pipe(
      core.sync(() => Array.from(elements)),
      core.flatMap((buffer) => {
        const numbers: Array<number> = []
        for (let i = buffer.length; i >= 2; i = i - 1) {
          numbers.push(i)
        }
        return pipe(
          numbers,
          core.forEachDiscard((n) =>
            pipe(
              nextIntBounded(n),
              core.map((k) => swap(buffer, n - 1, k))
            )
          ),
          core.as(Chunk.fromIterable(buffer))
        )
      })
    )
  )
}

/** @internal */
const swap = <A>(buffer: Array<A>, index1: number, index2: number): Array<A> => {
  const tmp = buffer[index1]!
  buffer[index1] = buffer[index2]!
  buffer[index2] = tmp
  return buffer
}

/** @internal */
export const make = (seed: number): Random.Random => new RandomImpl(seed)
