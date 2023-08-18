import * as Context from "@effect/data/Context"
import { dual } from "@effect/data/Function"
import type * as Console from "@effect/io/Console"
import type * as Effect from "@effect/io/Effect"
import * as core from "@effect/io/internal/core"
import * as defaultServices from "@effect/io/internal/defaultServices"
import * as defaultConsole from "@effect/io/internal/defaultServices/console"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as layer from "@effect/io/internal/layer"
import type * as Layer from "@effect/io/Layer"

/** @internal */
export const console: Effect.Effect<never, never, Console.Console> = core.map(
  core.fiberRefGet(defaultServices.currentServices),
  Context.get(defaultConsole.consoleTag)
)

/** @internal */
export const consoleWith = <R, E, A>(f: (console: Console.Console) => Effect.Effect<R, E, A>) =>
  core.fiberRefGetWith(
    defaultServices.currentServices,
    (services) => f(Context.get(services, defaultConsole.consoleTag))
  )

/** @internal */
export const withConsole = dual<
  <A extends Console.Console>(console: A) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A extends Console.Console>(effect: Effect.Effect<R, E, A>, console: A) => Effect.Effect<R, E, A>
>(2, (effect, value) =>
  core.fiberRefLocallyWith(
    effect,
    defaultServices.currentServices,
    Context.add(defaultConsole.consoleTag, value)
  ))

/** @internal */
export const setConsole = <A extends Console.Console>(console: A): Layer.Layer<never, never, never> =>
  layer.scopedDiscard(
    fiberRuntime.fiberRefLocallyScopedWith(
      defaultServices.currentServices,
      Context.add(defaultConsole.consoleTag, console)
    )
  )

/** @internal */
export const assert = (condition: boolean, ...args: ReadonlyArray<any>) =>
  consoleWith((_) => _.assert(condition, ...args))

/** @internal */
export const clear = consoleWith((_) => _.clear)

/** @internal */
export const count = (label?: string) => consoleWith((_) => _.count(label))

/** @internal */
export const countReset = (label?: string) => consoleWith((_) => _.countReset(label))

/** @internal */
export const debug = (...args: ReadonlyArray<any>) => consoleWith((_) => _.debug(...args))

/** @internal */
export const dir = (...args: ReadonlyArray<any>) => consoleWith((_) => _.dir(...args))

/** @internal */
export const dirxml = (...args: ReadonlyArray<any>) => consoleWith((_) => _.dirxml(...args))

/** @internal */
export const error = (...args: ReadonlyArray<any>) => consoleWith((_) => _.error(...args))

/** @internal */
export const group = (options?: { label?: string; collapsed?: boolean }) =>
  consoleWith((_) =>
    fiberRuntime.acquireRelease(
      _.group(options),
      () => _.groupEnd
    )
  )

/** @internal */
export const info = (...args: ReadonlyArray<any>) => consoleWith((_) => _.info(...args))

/** @internal */
export const log = (...args: ReadonlyArray<any>) => consoleWith((_) => _.log(...args))

/** @internal */
export const table = (tabularData: any, properties?: ReadonlyArray<string>) =>
  consoleWith((_) => _.table(tabularData, properties))

/** @internal */
export const time = (label?: string) =>
  consoleWith((_) =>
    fiberRuntime.acquireRelease(
      _.time(label),
      () => _.timeEnd(label)
    )
  )

/** @internal */
export const timeLog = (label?: string, ...args: ReadonlyArray<any>) => consoleWith((_) => _.timeLog(label, ...args))

/** @internal */
export const trace = (...args: ReadonlyArray<any>) => consoleWith((_) => _.trace(...args))

/** @internal */
export const warn = (...args: ReadonlyArray<any>) => consoleWith((_) => _.warn(...args))

/** @internal */
export const withGroup = dual<
  (
    options?: { readonly label?: string; readonly collapsed?: boolean }
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    options?: { readonly label?: string; readonly collapsed?: boolean }
  ) => Effect.Effect<R, E, A>
>((args) => core.isEffect(args[0]), (self, options) => consoleWith((_) => _.withGroup(self, options)))

/** @internal */
export const withTime = dual<
  (label?: string) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, label?: string) => Effect.Effect<R, E, A>
>((args) => core.isEffect(args[0]), (self, label) => consoleWith((_) => _.withTime(self, label)))
