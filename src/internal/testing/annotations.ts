import * as Context from "@effect/data/Context"
import * as Equal from "@effect/data/Equal"
import { pipe } from "@effect/data/Function"
import * as MutableRef from "@effect/data/MutableRef"
import * as RA from "@effect/data/ReadonlyArray"
import * as SortedSet from "@effect/data/SortedSet"
import type * as Effect from "@effect/io/Effect"
import type * as Fiber from "@effect/io/Fiber"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as fiber from "@effect/io/internal/fiber"
import * as TestAnnotation from "@effect/io/internal/testing/testAnnotation"
import * as TestAnnotationMap from "@effect/io/internal/testing/testAnnotationMap"
import * as Ref from "@effect/io/Ref"

/** @internal */
export const AnnotationsTypeId = Symbol.for("@effect/test/Annotations")

/** @internal */
export type AnnotationsTypeId = typeof AnnotationsTypeId

/**
 * The `Annotations` trait provides access to an annotation map that tests can
 * add arbitrary annotations to. Each annotation consists of a string
 * identifier, an initial value, and a function for combining two values.
 * Annotations form monoids and you can think of `Annotations` as a more
 * structured logging service or as a super polymorphic version of the writer
 * monad effect.
 *
 * @internal
 */
export interface Annotations {
  readonly [AnnotationsTypeId]: AnnotationsTypeId

  /** @internal */
  readonly ref: Ref.Ref<TestAnnotationMap.TestAnnotationMap>

  /**
   * Accesses an `Annotations` instance in the context and retrieves the
   * annotation of the specified type, or its default value if there is none.
   */
  get<A>(key: TestAnnotation.TestAnnotation<A>): Effect.Effect<never, never, A>

  /**
   * Accesses an `Annotations` instance in the context and appends the
   * specified annotation to the annotation map.
   */
  annotate<A>(key: TestAnnotation.TestAnnotation<A>, value: A): Effect.Effect<never, never, void>

  /**
   * Returns the set of all fibers in this test.
   */
  supervisedFibers(): Effect.Effect<never, never, SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>>
}

/** @internal */
class AnnotationsImpl implements Annotations {
  readonly [AnnotationsTypeId]: AnnotationsTypeId = AnnotationsTypeId
  constructor(readonly ref: Ref.Ref<TestAnnotationMap.TestAnnotationMap>) {
  }
  get<A>(key: TestAnnotation.TestAnnotation<A>): Effect.Effect<never, never, A> {
    return core.map(Ref.get(this.ref), TestAnnotationMap.get(key))
  }
  annotate<A>(key: TestAnnotation.TestAnnotation<A>, value: A): Effect.Effect<never, never, void> {
    return Ref.update(this.ref, TestAnnotationMap.annotate(key, value))
  }
  supervisedFibers(): Effect.Effect<never, never, SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>> {
    return effect.descriptorWith((descriptor) =>
      core.flatMap(this.get(TestAnnotation.fibers), (either) => {
        switch (either._tag) {
          case "Left": {
            return core.succeed(SortedSet.empty(fiber.Order))
          }
          case "Right": {
            return pipe(
              either.right,
              core.forEachSequential((ref) => core.sync(() => MutableRef.get(ref))),
              core.map(RA.reduce(SortedSet.empty(fiber.Order), (a, b) => SortedSet.union(a, b))),
              core.map(SortedSet.filter((fiber) => !Equal.equals(fiber.id(), descriptor.id)))
            )
          }
        }
      })
    )
  }
}

/** @internal */
export const Annotations: Context.Tag<Annotations, Annotations> = Context.Tag<Annotations>(
  Symbol.for("@effect/test/Annotations")
)

/** @internal */
export const isAnnotations = (u: unknown): u is Annotations => {
  return typeof u === "object" && u != null && AnnotationsTypeId in u
}

/** @internal */
export const make = (
  ref: Ref.Ref<TestAnnotationMap.TestAnnotationMap>
): Annotations => new AnnotationsImpl(ref)
