import type * as Deferred from "@effect/io/Deferred"
import type * as Chunk from "@fp-ts/data/Chunk"

/**
 * `Data` represents the state of the `TestClock`, including the clock time.
 */
export interface Data {
  readonly instant: number
  readonly sleeps: Chunk.Chunk<readonly [number, Deferred.Deferred<never, void>]>
}

export const make = (
  instant: number,
  sleeps: Chunk.Chunk<readonly [number, Deferred.Deferred<never, void>]>
): Data => ({
  instant,
  sleeps
})
