import * as Equal from "@fp-ts/data/Equal"

/** @internal */
export class SingleShotGen<T, A> implements Generator<T, A> {
  called = false

  constructor(readonly self: T) {
    Equal.considerByRef(this)
  }

  next(a: A): IteratorResult<T, A> {
    return this.called ?
      ({
        value: a,
        done: true
      }) :
      (this.called = true,
        ({
          value: this.self,
          done: false
        }))
  }

  return(a: A): IteratorResult<T, A> {
    return ({
      value: a,
      done: true
    })
  }

  throw(e: unknown): IteratorResult<T, A> {
    throw e
  }

  [Symbol.iterator](): Generator<T, A> {
    return new SingleShotGen<T, A>(this.self)
  }
}
