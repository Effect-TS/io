import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"

/** @internal */
export class RingBuffer<T> {
  private values: Chunk.Chunk<T> = Chunk.empty()
  private ignored = 0

  constructor(readonly size: number) {
    Equal.considerByRef(this)
  }

  push(value: T) {
    if (this.size === 0) {
      return false
    }
    if (this.values.length > 0) {
      if (Equal.equals(value, Chunk.unsafeHead(this.values))) {
        return false
      }
      if (this.values.length - this.ignored >= this.size) {
        this.values = Chunk.take(this.values.length - 1)(this.values)
      }
      this.values = Chunk.prepend(value)(this.values)
    } else {
      this.values = Chunk.prepend(value)(this.values)
    }
    return true
  }

  toChunkReversed(): Chunk.Chunk<T> {
    return this.values
  }
}
