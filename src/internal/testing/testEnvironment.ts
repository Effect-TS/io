import type * as DefaultServices from "@effect/io/DefaultServices"
import * as defaultServices from "@effect/io/internal/defaultServices"
import * as layer from "@effect/io/internal/layer"
import * as Annotations from "@effect/io/internal/testing/annotations"
import * as Live from "@effect/io/internal/testing/live"
import * as TestClock from "@effect/io/internal/testing/testClock"
import * as TestConfig from "@effect/io/internal/testing/testConfig"
import type * as Layer from "@effect/io/Layer"
import { pipe } from "@fp-ts/data/Function"

export type TestEnvironment =
  | Annotations.Annotations
  | Live.Live
  | TestConfig.TestConfig

export const live: Layer.Layer<DefaultServices.DefaultServices, never, TestEnvironment> = pipe(
  Annotations.live,
  layer.merge(Live.defaultLive),
  layer.merge(pipe(
    Live.defaultLive,
    layer.merge(Annotations.live),
    layer.provideToAndMerge(TestClock.defaultTestClock)
  )),
  layer.merge(TestConfig.defaultTestConfig)
)

export const TestEnvironment: Layer.Layer<never, never, TestEnvironment> = pipe(
  layer.syncEnvironment(() => defaultServices.liveServices),
  layer.provideToAndMerge(live)
)
