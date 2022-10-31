/** @internal */
export const VersionedTypeId = Symbol.for("@effect/io/STM/Versioned")

/** @internal */
export type VersionedTypeId = typeof VersionedTypeId

/** @internal */
export class Versioned<A> {
  readonly [VersionedTypeId]: VersionedTypeId = VersionedTypeId
  constructor(readonly value: A) {}
}

/** @internal */
export function make<A>(value: A): Versioned<A> {
  return new Versioned(value)
}
