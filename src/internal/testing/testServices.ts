import { getCallTrace } from "@effect/io/Debug"
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
import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"
import type * as SortedSet from "@fp-ts/data/SortedSet"

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
  Context.make(Annotations.Tag)(Annotations.make(ref.unsafeMake(TestAnnotationMap.empty()))),
  Context.add(Live.Tag)(Live.make(defaultServices.liveServices)),
  Context.add(Sized.Tag)(Sized.make(100)),
  Context.add(TestConfig.Tag)(TestConfig.make({ repeats: 100, retries: 100, samples: 200, shrinks: 1000 }))
)

/** @internal */
export const currentServices: FiberRef.FiberRef<Context.Context<TestServices>> = core.fiberRefUnsafeMakeContext(
  liveServices
)

/**
 * Retrieves the `Annotations` service for this test.
 *
 * @macro traced
 * @internal
 */
export const annotations = (): Effect.Effect<never, never, Annotations.Annotations> => {
  const trace = getCallTrace()
  return annotationsWith(core.succeed).traced(trace)
}

/**
 * Retrieves the `Annotations` service for this test and uses it to run the
 * specified workflow.
 *
 * @macro traced
 * @internal
 */
export const annotationsWith = <R, E, A>(
  f: (annotations: Annotations.Annotations) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.fiberRefGetWith(currentServices, (services) => f(pipe(services, Context.get(Annotations.Tag)))).traced(
    trace
  )
}

/**
 * Executes the specified workflow with the specified implementation of the
 * annotations service.
 *
 * @macro traced
 * @internal
 */
export const withAnnotations = (annotations: Annotations.Annotations) => {
  const trace = getCallTrace()
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
    core.fiberRefLocallyWith(currentServices, Context.add(Annotations.Tag)(annotations))(effect).traced(trace)
}

/**
 * Sets the implementation of the annotations service to the specified value
 * and restores it to its original value when the scope is closed.
 *
 * @macro traced
 * @internal
 */
export const withAnnotationsScoped = (
  annotations: Annotations.Annotations
): Effect.Effect<Scope.Scope, never, void> => {
  const trace = getCallTrace()
  return fiberRuntime.fiberRefLocallyScopedWith(currentServices)(
    Context.add(Annotations.Tag)(annotations)
  ).traced(trace)
}

/**
 * Constructs a new `Annotations` service wrapped in a layer.
 *
 * @internal
 */
export const annotationsLayer = (): Layer.Layer<never, never, Annotations.Annotations> =>
  layer.scoped(
    Annotations.Tag,
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
 * @macro traced
 * @internal
 */
export const get = <A>(key: TestAnnotation.TestAnnotation<A>): Effect.Effect<never, never, A> => {
  const trace = getCallTrace()
  return annotationsWith((annotations) => annotations.get(key)).traced(trace)
}

/**
 * Accesses an `Annotations` instance in the context and appends the
 * specified annotation to the annotation map.
 *
 * @macro traced
 * @internal
 */
export const annotate = <A>(
  key: TestAnnotation.TestAnnotation<A>,
  value: A
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return annotationsWith((annotations) => annotations.annotate(key, value)).traced(trace)
}

/**
 * Returns the set of all fibers in this test.
 *
 * @macro traced
 * @internal
 */
export const supervisedFibers = (): Effect.Effect<
  never,
  never,
  SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>
> => {
  const trace = getCallTrace()
  return annotationsWith((annotations) => annotations.supervisedFibers()).traced(trace)
}

/**
 * Retrieves the `Live` service for this test.
 *
 * @macro traced
 * @internal
 */
export const live = (): Effect.Effect<never, never, Live.Live> => {
  const trace = getCallTrace()
  return liveWith(core.succeed).traced(trace)
}

/**
 * Retrieves the `Live` service for this test and uses it to run the specified
 * workflow.
 *
 * @macro traced
 * @internal
 */
export const liveWith = <R, E, A>(f: (live: Live.Live) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.fiberRefGetWith(currentServices, (services) => f(pipe(services, Context.get(Live.Tag)))).traced(trace)
}

/**
 * Executes the specified workflow with the specified implementation of the
 * live service.
 *
 * @macro traced
 * @internal
 */
export const withLive = (live: Live.Live) => {
  const trace = getCallTrace()
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
    core.fiberRefLocallyWith(currentServices, Context.add(Live.Tag)(live))(effect).traced(trace)
}

/**
 * Sets the implementation of the live service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @macro traced
 * @internal
 */
export const withLiveScoped = (live: Live.Live): Effect.Effect<Scope.Scope, never, void> => {
  const trace = getCallTrace()
  return fiberRuntime.fiberRefLocallyScopedWith(currentServices)(Context.add(Live.Tag)(live)).traced(trace)
}

/**
 * Constructs a new `Live` service wrapped in a layer.
 *
 * @macro traced
 * @internal
 */
export const liveLayer = (): Layer.Layer<DefaultServices.DefaultServices, never, Live.Live> =>
  layer.scoped(
    Live.Tag,
    pipe(
      core.context<DefaultServices.DefaultServices>(),
      core.map(Live.make),
      core.tap(withLiveScoped)
    )
  )

/**
 * Provides a workflow with the "live" default Effect services.
 *
 * @macro traced
 * @internal
 */
export const provideLive = <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return liveWith((live) => live.provide(effect)).traced(trace)
}

/**
 * Runs a transformation function with the live default Effect services while
 * ensuring that the workflow itself is run with the test services.
 *
 * @macro traced
 * @internal
 */
export const provideWithLive = <R, E, A, R2, E2, A2>(
  f: (effect: Effect.Effect<R, E, A>) => Effect.Effect<R2, E2, A2>
) => {
  const trace = getCallTrace()
  return (self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A2> =>
    core.fiberRefGetWith(
      defaultServices.currentServices,
      (services) => provideLive(f(core.fiberRefLocally(defaultServices.currentServices, services)(self)))
    ).traced(trace)
}

/**
 * Retrieves the `Sized` service for this test.
 *
 * @macro traced
 * @internal
 */
export const sized = (): Effect.Effect<never, never, Sized.Sized> => {
  const trace = getCallTrace()
  return sizedWith(core.succeed).traced(trace)
}

/**
 * Retrieves the `Sized` service for this test and uses it to run the
 * specified workflow.
 *
 * @macro traced
 * @internal
 */
export const sizedWith = <R, E, A>(f: (sized: Sized.Sized) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.fiberRefGetWith(currentServices, (services) => f(pipe(services, Context.get(Sized.Tag)))).traced(trace)
}

/**
 * Executes the specified workflow with the specified implementation of the
 * sized service.
 *
 * @macro traced
 * @internal
 */
export const withSized = (sized: Sized.Sized) => {
  const trace = getCallTrace()
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
    core.fiberRefLocallyWith(currentServices, Context.add(Sized.Tag)(sized))(effect).traced(trace)
}

/**
 * Sets the implementation of the sized service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @macro traced
 * @internal
 */
export const withSizedScoped = (sized: Sized.Sized): Effect.Effect<Scope.Scope, never, void> => {
  const trace = getCallTrace()
  return fiberRuntime.fiberRefLocallyScopedWith(currentServices)(Context.add(Sized.Tag)(sized)).traced(trace)
}

/** @internal */
export const sizedLayer = (size: number): Layer.Layer<never, never, Sized.Sized> =>
  layer.scoped(
    Sized.Tag,
    pipe(
      fiberRuntime.fiberRefMake(size),
      core.map(Sized.fromFiberRef),
      core.tap(withSizedScoped)
    )
  )

/**
 * @macro traced
 * @internal
 */
export const size = (): Effect.Effect<never, never, number> => {
  const trace = getCallTrace()
  return sizedWith((sized) => sized.size()).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const withSize = (size: number) => {
  const trace = getCallTrace()
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
    sizedWith((sized) => sized.withSize(size)(effect)).traced(trace)
}

/**
 * Retrieves the `TestConfig` service for this test.
 *
 * @macro traced
 * @internal
 */
export const testConfig = (): Effect.Effect<never, never, TestConfig.TestConfig> => {
  const trace = getCallTrace()
  return testConfigWith(core.succeed).traced(trace)
}

/**
 * Retrieves the `TestConfig` service for this test and uses it to run the
 * specified workflow.
 *
 * @macro traced
 * @internal
 */
export const testConfigWith = <R, E, A>(
  f: (config: TestConfig.TestConfig) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.fiberRefGetWith(currentServices, (services) => f(pipe(services, Context.get(TestConfig.Tag)))).traced(
    trace
  )
}

/**
 * Executes the specified workflow with the specified implementation of the
 * config service.
 *
 * @macro traced
 * @internal
 */
export const withTestConfig = (config: TestConfig.TestConfig) => {
  const trace = getCallTrace()
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
    core.fiberRefLocallyWith(currentServices, Context.add(TestConfig.Tag)(config))(effect).traced(trace)
}

/**
 * Sets the implementation of the config service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @macro traced
 * @internal
 */
export const withTestConfigScoped = (config: TestConfig.TestConfig): Effect.Effect<Scope.Scope, never, void> => {
  const trace = getCallTrace()
  return fiberRuntime.fiberRefLocallyScopedWith(currentServices)(Context.add(TestConfig.Tag)(config)).traced(trace)
}

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
    TestConfig.Tag,
    Effect.suspendSucceed(() => {
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
 * @macro traced
 * @internal
 */
export const repeats = (): Effect.Effect<never, never, number> => {
  const trace = getCallTrace()
  return testConfigWith((config) => core.succeed(config.repeats)).traced(trace)
}

/**
 * The number of times to retry flaky tests.
 *
 * @macro traced
 * @internal
 */
export const retries = (): Effect.Effect<never, never, number> => {
  const trace = getCallTrace()
  return testConfigWith((config) => core.succeed(config.retries)).traced(trace)
}

/**
 * The number of sufficient samples to check for a random variable.
 *
 * @macro traced
 * @internal
 */
export const samples = (): Effect.Effect<never, never, number> => {
  const trace = getCallTrace()
  return testConfigWith((config) => core.succeed(config.samples)).traced(trace)
}

/**
 * The maximum number of shrinkings to minimize large failures.
 *
 * @macro traced
 * @internal
 */
export const shrinks = (): Effect.Effect<never, never, number> => {
  const trace = getCallTrace()
  return testConfigWith((config) => core.succeed(config.shrinks)).traced(trace)
}
