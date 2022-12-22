import type * as TestAnnotation from "@effect/io/internal/testing/testAnnotation"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

export const TestAnnotationMapTypeId = Symbol.for("@effect/test/TestAnnotationMap")

export type TestAnnotationMapTypeId = typeof TestAnnotationMapTypeId

/**
 * An annotation map keeps track of annotations of different types.
 */
export interface TestAnnotationMap {
  readonly [TestAnnotationMapTypeId]: TestAnnotationMapTypeId
  /** @internal */
  readonly map: ReadonlyMap<TestAnnotation.TestAnnotation<unknown>, unknown>
}

class TestAnnotationMapImpl implements TestAnnotationMap {
  readonly [TestAnnotationMapTypeId]: TestAnnotationMapTypeId = TestAnnotationMapTypeId
  constructor(readonly map: ReadonlyMap<TestAnnotation.TestAnnotation<unknown>, unknown>) {
    Equal.considerByRef(this)
  }
}

export const isTestAnnotationMap = (u: unknown): u is TestAnnotationMap => {
  return typeof u === "object" && u != null && TestAnnotationMapTypeId in u
}

export const empty = new TestAnnotationMapImpl(new Map())

export const make = (map: ReadonlyMap<TestAnnotation.TestAnnotation<unknown>, unknown>): TestAnnotationMap => {
  return new TestAnnotationMapImpl(map)
}

export const overwrite = <A>(key: TestAnnotation.TestAnnotation<A>, value: A) => {
  return (self: TestAnnotationMap): TestAnnotationMap => {
    return make(
      (self.map as Map<TestAnnotation.TestAnnotation<unknown>, unknown>)
        .set(key as TestAnnotation.TestAnnotation<unknown>, value)
    )
  }
}

export const update = <A>(key: TestAnnotation.TestAnnotation<A>, f: (value: A) => A) => {
  return (self: TestAnnotationMap): TestAnnotationMap => {
    let value = self.map.get(key as TestAnnotation.TestAnnotation<unknown>)
    if (value === undefined) {
      value = key.initial
    }
    return pipe(self, overwrite(key, f(value as A)))
  }
}

/**
 * Retrieves the annotation of the specified type, or its default value if
 * there is none.
 */
export const get = <A>(key: TestAnnotation.TestAnnotation<A>) => {
  return (self: TestAnnotationMap): A => {
    const value = self.map.get(key as TestAnnotation.TestAnnotation<unknown>)
    if (value === undefined) {
      return key.initial as A
    }
    return value as A
  }
}

/**
 * Appends the specified annotation to the annotation map.
 */
export const annotate = <A>(key: TestAnnotation.TestAnnotation<A>, value: A) => {
  return (self: TestAnnotationMap): TestAnnotationMap => {
    return pipe(self, update(key, (_) => key.combine(_, value)))
  }
}

export const combine = (that: TestAnnotationMap) => {
  return (self: TestAnnotationMap): TestAnnotationMap => {
    const map = pipe(
      Chunk.fromIterable(self.map),
      Chunk.concat(Chunk.fromIterable(that.map)),
      Chunk.reduce(
        new Map<TestAnnotation.TestAnnotation<unknown>, unknown>(),
        (acc, [key, oldValue]) => {
          let newValue = acc.get(key)
          if (newValue === undefined) {
            newValue = oldValue
          }
          newValue = key.combine(newValue, oldValue)
          return acc.set(key, newValue)
        }
      )
    )
    return make(map)
  }
}
