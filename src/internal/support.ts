import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"

/** @internal */
export class RingBuffer<T> {
  private values: Map<number, T> = new Map()
  private index = 0
  private length = 0

  constructor(readonly size: number) {
    Equal.considerByRef(this)
  }

  private restore() {
    const newArray: Map<number, T> = new Map()
    let z = 0
    for (let i = this.index - this.length; i < this.index; i++) {
      newArray.set(z++, this.values.get(i)!)
    }
    this.values = newArray
    this.index = this.length
  }

  push(value: T) {
    if (this.size === 0) {
      return false
    }
    if (this.length > 0) {
      if (this.index === Number.MAX_SAFE_INTEGER) {
        this.restore()
      }
      if (Equal.equals(value, this.values.get(this.index - 1))) {
        return false
      }
      if (this.length >= this.size) {
        this.values.delete(this.index - this.length)
        this.values.set(this.index, value)
        this.index++
      } else {
        this.values.set(this.index, value)
        this.index++
        this.length++
      }
    } else {
      this.values.set(this.index, value)
      this.length++
      this.index++
    }
    return true
  }

  toChunkReversed(): Chunk.Chunk<T> {
    const array: Array<T> = new Array(this.length)
    let z = 0
    for (let i = this.index - 1; i >= this.index - this.length; i--) {
      array[z++] = this.values.get(i)!
    }
    return Chunk.unsafeFromArray(array)
  }
}
