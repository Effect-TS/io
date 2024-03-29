import * as Context from "@effect/data/Context"
import { dual, pipe } from "@effect/data/Function"
import type * as SortedSet from "@effect/data/SortedSet"
import type * as DefaultServices from "@effect/io/DefaultServices"
import * as Effect from "@effect/io/Effect"
import type * as Fiber from "@effect/io/Fiber"
import type * as FiberRef from "@effect/io/FiberRef"
import * as core from "@effect/io/internal/core"
import * as defaultServices from "@effect/io/internal/defaultServices"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as layer from "@effect/io/internal/layer"
import * as ref from "@effect/io/internal/ref"
import * as Annotations from "@effect/io/internal/testing/annotations"
import * as Live from "@effect/io/internal/testing/live"
import * as Sized from "@effect/io/internal/testing/sized"
import type * as TestAnnotation from "@effect/io/internal/testing/testAnnotation"
import * as TestAnnotationMap from "@effect/io/internal/testing/testAnnotationMap"
import * as TestConfig from "@effect/io/internal/testing/testConfig"
import type * as Layer from "@effect/io/Layer"
import type * as Scope from "@effect/io/Scope"

/** @internal */
export type TestServices =
  | Annotations.Annotations
  | Live.Live
  | Sized.Sized
  | TestConfig.TestConfig

/**
 * The default Effect test services.
 *
 * @internal
 */
export const liveServices: Context.Context<TestServices> = pipe(
  Context.make(Annotations.Annotations, Annotations.make(ref.unsafeMake(TestAnnotationMap.empty()))),
  Context.add(Live.Live, Live.make(defaultServices.liveServices)),
  Context.add(Sized.Sized, Sized.make(100)),
  Context.add(TestConfig.TestConfig, TestConfig.make({ repeats: 100, retries: 100, samples: 200, shrinks: 1000 }))
)

/** @internal */
export const currentServices: FiberRef.FiberRef<Context.Context<TestServices>> = core.fiberRefUnsafeMakeContext(
  liveServices
)

/**
 * Retrieves the `Annotations` service for this test.
 *
 * @internal
 */
export const annotations = (): Effect.Effect<never, never, Annotations.Annotations> => annotationsWith(core.succeed)

/**
 * Retrieves the `Annotations` service for this test and uses it to run the
 * specified workflow.
 *
 * @internal
 */
export const annotationsWith = <R, E, A>(
  f: (annotations: Annotations.Annotations) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  core.fiberRefGetWith(
    currentServices,
    (services) => f(Context.get(services, Annotations.Annotations))
  )

/**
 * Executes the specified workflow with the specified implementation of the
 * annotations service.
 *
 * @internal
 */
export const withAnnotations = dual<
  (annotations: Annotations.Annotations) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, annotations: Annotations.Annotations) => Effect.Effect<R, E, A>
>(2, (effect, annotations) =>
  core.fiberRefLocallyWith(
    currentServices,
    Context.add(Annotations.Annotations, annotations)
  )(effect))

/**
 * Sets the implementation of the annotations service to the specified value
 * and restores it to its original value when the scope is closed.
 *
 * @internal
 */
export const withAnnotationsScoped = (annotations: Annotations.Annotations): Effect.Effect<Scope.Scope, never, void> =>
  fiberRuntime.fiberRefLocallyScopedWith(
    currentServices,
    Context.add(Annotations.Annotations, annotations)
  )

/**
 * Constructs a new `Annotations` service wrapped in a layer.
 *
 * @internal
 */
export const annotationsLayer = (): Layer.Layer<never, never, Annotations.Annotations> =>
  layer.scoped(
    Annotations.Annotations,
    pipe(
      core.sync(() => ref.unsafeMake(TestAnnotationMap.empty())),
      core.map(Annotations.make),
      core.tap(withAnnotationsScoped)
    )
  )

/**
 * Accesses an `Annotations` instance in the context and retrieves the
 * annotation of the specified type, or its default value if there is none.
 *
 * @internal
 */
export const get = <A>(key: TestAnnotation.TestAnnotation<A>): Effect.Effect<never, never, A> =>
  annotationsWith((annotations) => annotations.get(key))

/**
 * Accesses an `Annotations` instance in the context and appends the
 * specified annotation to the annotation map.
 *
 * @internal
 */
export const annotate = <A>(key: TestAnnotation.TestAnnotation<A>, value: A): Effect.Effect<never, never, void> =>
  annotationsWith((annotations) => annotations.annotate(key, value))

/**
 * Returns the set of all fibers in this test.
 *
 * @internal
 */
export const supervisedFibers = (): Effect.Effect<
  never,
  never,
  SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>
> => annotationsWith((annotations) => annotations.supervisedFibers())

/**
 * Retrieves the `Live` service for this test.
 *
 * @internal
 */
export const live = (): Effect.Effect<never, never, Live.Live> => liveWith(core.succeed)

/**
 * Retrieves the `Live` service for this test and uses it to run the specified
 * workflow.
 *
 * @internal
 */
export const liveWith = <R, E, A>(f: (live: Live.Live) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  core.fiberRefGetWith(currentServices, (services) => f(Context.get(services, Live.Live)))

/**
 * Executes the specified workflow with the specified implementation of the
 * live service.
 *
 * @internal
 */
export const withLive = dual<
  (live: Live.Live) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, live: Live.Live) => Effect.Effect<R, E, A>
>(2, (effect, live) =>
  core.fiberRefLocallyWith(
    currentServices,
    Context.add(Live.Live, live)
  )(effect))

/**
 * Sets the implementation of the live service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @internal
 */
export const withLiveScoped = (live: Live.Live): Effect.Effect<Scope.Scope, never, void> =>
  fiberRuntime.fiberRefLocallyScopedWith(currentServices, Context.add(Live.Live, live))

/**
 * Constructs a new `Live` service wrapped in a layer.
 *
 * @internal
 */
export const liveLayer = (): Layer.Layer<DefaultServices.DefaultServices, never, Live.Live> =>
  layer.scoped(
    Live.Live,
    pipe(
      core.context<DefaultServices.DefaultServices>(),
      core.map(Live.make),
      core.tap(withLiveScoped)
    )
  )

/**
 * Provides a workflow with the "live" default Effect services.
 *
 * @internal
 */
export const provideLive = <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  liveWith((live) => live.provide(effect))

/**
 * Runs a transformation function with the live default Effect services while
 * ensuring that the workflow itself is run with the test services.
 *
 * @internal
 */
export const provideWithLive = dual<
  <R, E, A, R2, E2, A2>(
    f: (effect: Effect.Effect<R, E, A>) => Effect.Effect<R2, E2, A2>
  ) => (self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    f: (effect: Effect.Effect<R, E, A>) => Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, A2>
>(2, (self, f) =>
  core.fiberRefGetWith(
    defaultServices.currentServices,
    (services) => provideLive(f(core.fiberRefLocally(defaultServices.currentServices, services)(self)))
  ))

/**
 * Retrieves the `Sized` service for this test.
 *
 * @internal
 */
export const sized = (): Effect.Effect<never, never, Sized.Sized> => sizedWith(core.succeed)

/**
 * Retrieves the `Sized` service for this test and uses it to run the
 * specified workflow.
 *
 * @internal
 */
export const sizedWith = <R, E, A>(f: (sized: Sized.Sized) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  core.fiberRefGetWith(
    currentServices,
    (services) => f(Context.get(services, Sized.Sized))
  )

/**
 * Executes the specified workflow with the specified implementation of the
 * sized service.
 *
 * @internal
 */
export const withSized = dual<
  (sized: Sized.Sized) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, sized: Sized.Sized) => Effect.Effect<R, E, A>
>(2, (effect, sized) =>
  core.fiberRefLocallyWith(
    currentServices,
    Context.add(Sized.Sized, sized)
  )(effect))

/**
 * Sets the implementation of the sized service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @internal
 */
export const withSizedScoped = (sized: Sized.Sized): Effect.Effect<Scope.Scope, never, void> =>
  fiberRuntime.fiberRefLocallyScopedWith(currentServices, Context.add(Sized.Sized, sized))

/** @internal */
export const sizedLayer = (size: number): Layer.Layer<never, never, Sized.Sized> =>
  layer.scoped(
    Sized.Sized,
    pipe(
      fiberRuntime.fiberRefMake(size),
      core.map(Sized.fromFiberRef),
      core.tap(withSizedScoped)
    )
  )

/** @internal */
export const size = (): Effect.Effect<never, never, number> => sizedWith((sized) => sized.size())

/** @internal */
export const withSize = dual<
  (size: number) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, size: number) => Effect.Effect<R, E, A>
>(2, (effect, size) => sizedWith((sized) => sized.withSize(size)(effect)))

/**
 * Retrieves the `TestConfig` service for this test.
 *
 * @internal
 */
export const testConfig = (): Effect.Effect<never, never, TestConfig.TestConfig> => testConfigWith(core.succeed)

/**
 * Retrieves the `TestConfig` service for this test and uses it to run the
 * specified workflow.
 *
 * @internal
 */
export const testConfigWith = <R, E, A>(
  f: (config: TestConfig.TestConfig) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  core.fiberRefGetWith(
    currentServices,
    (services) => f(Context.get(services, TestConfig.TestConfig))
  )

/**
 * Executes the specified workflow with the specified implementation of the
 * config service.
 *
 * @internal
 */
export const withTestConfig = dual<
  (config: TestConfig.TestConfig) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, config: TestConfig.TestConfig) => Effect.Effect<R, E, A>
>(2, (effect, config) =>
  core.fiberRefLocallyWith(
    currentServices,
    Context.add(TestConfig.TestConfig, config)
  )(effect))

/**
 * Sets the implementation of the config service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @internal
 */
export const withTestConfigScoped = (config: TestConfig.TestConfig): Effect.Effect<Scope.Scope, never, void> =>
  fiberRuntime.fiberRefLocallyScopedWith(currentServices, Context.add(TestConfig.TestConfig, config))

/**
 * Constructs a new `TestConfig` service with the specified settings.
 *
 * @internal
 */
export const testConfigLayer = (params: {
  readonly repeats: number
  readonly retries: number
  readonly samples: number
  readonly shrinks: number
}): Layer.Layer<never, never, TestConfig.TestConfig> =>
  layer.scoped(
    TestConfig.TestConfig,
    Effect.suspend(() => {
      const testConfig = TestConfig.make(params)
      return pipe(
        withTestConfigScoped(testConfig),
        core.as(testConfig)
      )
    })
  )

/**
 * The number of times to repeat tests to ensure they are stable.
 *
 * @internal
 */
export const repeats = (): Effect.Effect<never, never, number> =>
  testConfigWith((config) => core.succeed(config.repeats))

/**
 * The number of times to retry flaky tests.
 *
 * @internal
 */
export const retries = (): Effect.Effect<never, never, number> =>
  testConfigWith((config) => core.succeed(config.retries))

/**
 * The number of sufficient samples to check for a random variable.
 *
 * @internal
 */
export const samples = (): Effect.Effect<never, never, number> =>
  testConfigWith((config) => core.succeed(config.samples))

/**
 * The maximum number of shrinkings to minimize large failures.
 *
 * @internal
 */
export const shrinks = (): Effect.Effect<never, never, number> =>
  testConfigWith((config) => core.succeed(config.shrinks))
