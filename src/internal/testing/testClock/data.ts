import type * as Deferred from "@effect/io/Deferred"
import type * as List from "@fp-ts/data/List"

/**
 * `Data` represents the state of the `TestClock`, including the clock time.
 */
export interface Data {
  readonly instant: number
  readonly sleeps: List.List<readonly [number, Deferred.Deferred<never, void>]>
}

export const make = (
  instant: number,
  sleeps: List.List<readonly [number, Deferred.Deferred<never, void>]>
): Data => ({
  instant,
  sleeps
})
