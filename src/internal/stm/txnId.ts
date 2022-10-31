import { pipe } from "@fp-ts/data/Function"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"

/** @internal */
export type TxnId = number & {
  readonly TransactioId: unique symbol
}

/** @internal */
const txnCounter = MutableRef.make(0)

/** @internal */
export const make = (): TxnId => {
  const newId = MutableRef.get(txnCounter) + 1
  pipe(txnCounter, MutableRef.set(newId))
  return newId as TxnId
}
