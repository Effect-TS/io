import type * as TestAnnotation from "@effect/io/internal/testing/testAnnotation"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
export const TestAnnotationMapTypeId = Symbol.for("@effect/test/TestAnnotationMap")

/** @internal */
export type TestAnnotationMapTypeId = typeof TestAnnotationMapTypeId

/**
 * An annotation map keeps track of annotations of different types.
 *
 * @internal
 */
export interface TestAnnotationMap {
  readonly [TestAnnotationMapTypeId]: TestAnnotationMapTypeId
  /** @internal */
  readonly map: ReadonlyMap<TestAnnotation.TestAnnotation<unknown>, unknown>
}

/** @internal */
class TestAnnotationMapImpl implements TestAnnotationMap {
  readonly [TestAnnotationMapTypeId]: TestAnnotationMapTypeId = TestAnnotationMapTypeId
  constructor(readonly map: ReadonlyMap<TestAnnotation.TestAnnotation<unknown>, unknown>) {
  }
}

/** @internal */
export const isTestAnnotationMap = (u: unknown): u is TestAnnotationMap => {
  return typeof u === "object" && u != null && TestAnnotationMapTypeId in u
}

/** @internal */
export const empty: (_: void) => TestAnnotationMap = () => new TestAnnotationMapImpl(new Map())

/** @internal */
export const make = (map: ReadonlyMap<TestAnnotation.TestAnnotation<unknown>, unknown>): TestAnnotationMap => {
  return new TestAnnotationMapImpl(map)
}

/** @internal */
export const overwrite = <A>(key: TestAnnotation.TestAnnotation<A>, value: A) => {
  return (self: TestAnnotationMap): TestAnnotationMap => {
    return make(
      (self.map as Map<TestAnnotation.TestAnnotation<unknown>, unknown>)
        .set(key as TestAnnotation.TestAnnotation<unknown>, value)
    )
  }
}

/** @internal */
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
 *
 * @internal
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
 *
 * @internal
 */
export const annotate = <A>(key: TestAnnotation.TestAnnotation<A>, value: A) => {
  return (self: TestAnnotationMap): TestAnnotationMap => {
    return pipe(self, update(key, (_) => key.combine(_, value)))
  }
}

/** @internal */
export const combine = (that: TestAnnotationMap) => {
  return (self: TestAnnotationMap): TestAnnotationMap => {
    const result = new Map<TestAnnotation.TestAnnotation<unknown>, unknown>(self.map)
    for (const entry of that.map) {
      if (result.has(entry[0])) {
        const value = result.get(entry[0])!
        result.set(entry[0], entry[0].combine(value, entry[1]))
      } else {
        result.set(entry[0], entry[1])
      }
    }
    return make(result)
  }
}
