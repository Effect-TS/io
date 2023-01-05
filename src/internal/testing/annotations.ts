import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import type * as Fiber from "@effect/io/Fiber"
import type * as FiberRef from "@effect/io/FiberRef"
import * as core from "@effect/io/internal/core"
import * as effect from "@effect/io/internal/effect"
import * as fiber from "@effect/io/internal/fiber"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as layer from "@effect/io/internal/layer"
import * as TestAnnotation from "@effect/io/internal/testing/testAnnotation"
import * as TestAnnotationMap from "@effect/io/internal/testing/testAnnotationMap"
import type * as Layer from "@effect/io/Layer"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as MutableRef from "@fp-ts/data/MutableRef"
import * as SortedSet from "@fp-ts/data/SortedSet"

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

  /**
   * Accesses an `Annotations` instance in the environment and retrieves the
   * annotation of the specified type, or its default value if there is none.
   *
   * @macro traced
   */
  get<A>(key: TestAnnotation.TestAnnotation<A>): Effect.Effect<never, never, A>

  /**
   * Accesses an `Annotations` instance in the environment and appends the
   * specified annotation to the annotation map.
   *
   * @macro traced
   */
  annotate<A>(key: TestAnnotation.TestAnnotation<A>, value: A): Effect.Effect<never, never, void>

  /**
   * Returns the set of all fibers in this test.
   *
   * @macro traced
   */
  supervisedFibers(): Effect.Effect<never, never, SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>>
}

/** @internal */
class AnnotationsImpl implements Annotations {
  readonly [AnnotationsTypeId]: AnnotationsTypeId = AnnotationsTypeId
  constructor(readonly fiberRef: FiberRef.FiberRef<TestAnnotationMap.TestAnnotationMap>) {
    Equal.considerByRef(this)
  }
  get<A>(key: TestAnnotation.TestAnnotation<A>): Effect.Effect<never, never, A> {
    const trace = getCallTrace()
    return pipe(
      core.fiberRefGet(this.fiberRef),
      core.map(TestAnnotationMap.get(key))
    ).traced(trace)
  }
  annotate<A>(key: TestAnnotation.TestAnnotation<A>, value: A): Effect.Effect<never, never, void> {
    const trace = getCallTrace()
    return core.fiberRefUpdate(this.fiberRef)(TestAnnotationMap.annotate(key, value)).traced(trace)
  }
  supervisedFibers(): Effect.Effect<never, never, SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>> {
    const trace = getCallTrace()
    return effect.descriptorWith((descriptor) =>
      pipe(
        core.fiberRefGet(this.fiberRef),
        core.map(TestAnnotationMap.get(TestAnnotation.fibers)),
        core.flatMap((either) => {
          switch (either._tag) {
            case "Left": {
              return core.succeed(SortedSet.empty(fiber.Order))
            }
            case "Right": {
              return pipe(
                either.right,
                core.forEach((ref) => core.sync(() => MutableRef.get(ref))),
                core.map(Chunk.reduce(
                  SortedSet.empty(fiber.Order),
                  (a, b) => pipe(a, SortedSet.union(b))
                )),
                core.map(SortedSet.filter((fiber) => !Equal.equals(fiber.id(), descriptor.id)))
              )
            }
          }
        })
      )
    ).traced(trace)
  }
}

/** @internal */
export const Tag: Context.Tag<Annotations> = Context.Tag<Annotations>()

/** @internal */
export const isAnnotations = (u: unknown): u is Annotations => {
  return typeof u === "object" && u != null && AnnotationsTypeId in u
}

/**
 * Accesses an `Annotations` instance in the environment and retrieves the
 * annotation of the specified type, or its default value if there is none.
 *
 * @macro traced
 * @internal
 */
export const get = <A>(key: TestAnnotation.TestAnnotation<A>): Effect.Effect<Annotations, never, A> => {
  const trace = getCallTrace()
  return core.serviceWithEffect(Tag)((annotations) => annotations.get(key)).traced(trace)
}

/**
 * Accesses an `Annotations` instance in the environment and appends the
 * specified annotation to the annotation map.
 *
 * @macro traced
 * @internal
 */
export const annotate = <A>(
  key: TestAnnotation.TestAnnotation<A>,
  value: A
): Effect.Effect<Annotations, never, void> => {
  const trace = getCallTrace()
  return core.serviceWithEffect(Tag)((annotations) => annotations.annotate(key, value)).traced(trace)
}

/**
 * Returns the set of all fibers in this test.
 *
 * @macro traced
 * @internal
 */
export const supervisedFibers = (): Effect.Effect<
  Annotations,
  never,
  SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>
> => {
  const trace = getCallTrace()
  return core.serviceWithEffect(Tag)((annotations) => annotations.supervisedFibers()).traced(trace)
}

/**
 * Constructs a new `Annotations` service.
 *
 * @internal
 */
export const live: Layer.Layer<never, never, Annotations> = layer.scoped(Tag)(
  pipe(
    fiberRuntime.fiberRefMake(TestAnnotationMap.empty),
    core.map((fiberRef): Annotations => new AnnotationsImpl(fiberRef))
  )
)
