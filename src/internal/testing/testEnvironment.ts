import type * as DefaultServices from "@effect/io/DefaultServices"
import * as defaultServices from "@effect/io/internal/defaultServices"
import * as layer from "@effect/io/internal/layer"
import * as TestClock from "@effect/io/internal/testing/testClock"
import * as TestServices from "@effect/io/internal/testing/testServices"
import type * as Layer from "@effect/io/Layer"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
export const live: Layer.Layer<DefaultServices.DefaultServices, never, TestServices.TestServices> = pipe(
  TestServices.annotationsLayer(),
  layer.merge(TestServices.liveLayer()),
  layer.merge(TestServices.sizedLayer(100)),
  layer.merge(pipe(
    TestServices.liveLayer(),
    layer.merge(TestServices.annotationsLayer()),
    layer.provideToAndMerge(TestClock.defaultTestClock)
  )),
  layer.merge(TestServices.testConfigLayer({ repeats: 100, retries: 100, samples: 200, shrinks: 1000 }))
)

/** @internal */
export const liveEnvironment = (): Layer.Layer<never, never, DefaultServices.DefaultServices> =>
  layer.syncEnvironment(() => defaultServices.liveServices)

/** @internal */
export const testEnvironment = (): Layer.Layer<never, never, TestServices.TestServices> =>
  pipe(
    liveEnvironment(),
    layer.provideToAndMerge(live)
  )
