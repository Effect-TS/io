import * as Chunk from "@fp-ts/data/Chunk"
import { equals } from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as MutableList from "@fp-ts/data/mutable/MutableList"

/** @internal */
export class RingBuffer<T> {
  private values = MutableList.make<T>()
  private ignored = 0

  constructor(readonly size: number) {}

  push(value: T) {
    if (equals(value, MutableList.tail(this.values))) {
      return false
    }
    if (MutableList.length(this.values) - this.ignored >= this.size) {
      MutableList.shift(this.values)
    }
    MutableList.append(value)(this.values)
    return true
  }

  pop() {
    MutableList.pop(this.values)
    return this.values
  }

  toChunk(): Chunk.Chunk<T> {
    const chunk: Array<T> = []
    pipe(
      this.values,
      MutableList.forEach((t) => {
        chunk.push(t)
      })
    )
    return Chunk.unsafeFromArray(chunk)
  }

  toChunkReversed(): Chunk.Chunk<T> {
    return Chunk.fromIterable(Chunk.reverse(this.toChunk()))
  }
}
