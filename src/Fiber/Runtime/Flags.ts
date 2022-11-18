/**
 * @since 1.0.0
 */

import * as internal from "@effect/io/internal/runtimeFlags"

/**
 * Represents a set of `RuntimeFlag`s. `RuntimeFlag`s affect the operation of
 * the Effect runtime system. They are exposed to application-level code because
 * they affect the behavior and performance of application code.
 *
 * @since 1.0.0
 * @category models
 */
export type RuntimeFlags = number & {
  readonly RuntimeFlags: unique symbol
}

/**
 * Represents a flag that can be set to enable or disable a particular feature
 * of the Effect runtime.
 *
 * @since 1.0.0
 * @category models
 */
export type RuntimeFlag = number & {
  readonly RuntimeFlag: unique symbol
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (...flags: ReadonlyArray<RuntimeFlag>): RuntimeFlags => {
  return flags.reduce((a, b) => a | b, 0) as RuntimeFlags
}

/**
 * No runtime flags.
 *
 * @since 1.0.0
 * @category constructors
 */
export const None: RuntimeFlag = internal.None

/**
 * The interruption flag determines whether or not the Effect runtime system will
 * interrupt a fiber.
 *
 * @since 1.0.0
 * @category constructors
 */
export const Interruption: RuntimeFlag = internal.Interruption

/**
 * The current fiber flag determines whether or not the Effect runtime system
 * will store the current fiber whenever a fiber begins executing. Use of this
 * flag will negatively impact performance, but is essential when tracking the
 * current fiber is necessary.
 *
 * @since 1.0.0
 * @category constructors
 */
export const CurrentFiber: RuntimeFlag = internal.CurrentFiber

/**
 * The op supervision flag determines whether or not the Effect runtime system
 * will supervise all operations of the Effect runtime. Use of this flag will
 * negatively impact performance, but is required for some operations, such as
 * profiling.
 *
 * @since 1.0.0
 * @category constructors
 */
export const OpSupervision: RuntimeFlag = internal.OpSupervision

/**
 * The runtime metrics flag determines whether or not the Effect runtime system
 * will collect metrics about the Effect runtime. Use of this flag will have a
 * very small negative impact on performance, but generates very helpful
 * operational insight into running Effect applications that can be exported to
 * Prometheus or other tools via Effect Metrics.
 *
 * @since 1.0.0
 * @category constructors
 */
export const RuntimeMetrics: RuntimeFlag = internal.RuntimeMetrics

/**
 * The fiber roots flag determines whether or not the Effect runtime system will
 * keep track of all fiber roots. Use of this flag will negatively impact
 * performance, but is required for the fiber dumps functionality.
 *
 * @since 1.0.0
 * @category constructors
 */
export const FiberRoots: RuntimeFlag = internal.FiberRoots

/**
 * The wind down flag determines whether the Effect runtime system will execute
 * effects in wind-down mode. In wind-down mode, even if interruption is
 * enabled and a fiber has been interrupted, the fiber will continue its
 * execution uninterrupted.
 *
 * @since 1.0.0
 * @category constructors
 */
export const WindDown: RuntimeFlag = internal.WindDown

/**
 * The cooperative yielding flag determines whether the Effect runtime will
 * yield to another fiber.
 *
 * @since 1.0.0
 * @category constructors
 */
export const CooperativeYielding: RuntimeFlag = internal.CooperativeYielding

/**
 * @since 1.0.0
 * @category constructors
 */
export const none = make(None)

/**
 * Enables the specified `RuntimeFlag`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const enable = (flag: RuntimeFlag) => {
  return (self: RuntimeFlags): RuntimeFlags => (self | flag) as RuntimeFlags
}

/**
 * Enables all of the `RuntimeFlag`s in the specified set of `RuntimeFlags`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const enableAll = (flags: RuntimeFlags) => {
  return (self: RuntimeFlags): RuntimeFlags => (self | flags) as RuntimeFlags
}

/**
 * Disables the specified `RuntimeFlag`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const disable = (flag: RuntimeFlag) => {
  return (self: RuntimeFlags): RuntimeFlags => (self & ~flag) as RuntimeFlags
}

/**
 * Disables all of the `RuntimeFlag`s in the specified set of `RuntimeFlags`.
 *
 * @since 1.0.0
 * @category mutations
 */
export const disableAll = (flags: RuntimeFlags) => {
  return (self: RuntimeFlags): RuntimeFlags => (self & ~flags) as RuntimeFlags
}

/**
 * Returns `true` if the specified `RuntimeFlag` is enabled, `false` otherwise.
 *
 * @since 1.0.0
 * @category elements
 */
export const isEnabled = internal.isEnabled

/**
 * Returns `true` if the specified `RuntimeFlag` is disabled, `false` otherwise.
 *
 * @since 1.0.0
 * @category elements
 */
export const isDisabled = internal.isDisabled

/**
 * Returns `true` if the `Interruption` `RuntimeFlag` is enabled, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const interruption = (self: RuntimeFlags): boolean => {
  return isEnabled(Interruption)(self)
}

/**
 * Returns `true` if the `CurrentFiber` `RuntimeFlag` is enabled, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const currentFiber = (self: RuntimeFlags): boolean => {
  return isEnabled(CurrentFiber)(self)
}

/**
 * Returns `true` if the `OpSupervision` `RuntimeFlag` is enabled, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const opSupervision = (self: RuntimeFlags): boolean => {
  return isEnabled(OpSupervision)(self)
}

/**
 * Returns `true` if the `RuntimeMetrics` `RuntimeFlag` is enabled, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const runtimeMetrics = (self: RuntimeFlags): boolean => {
  return isEnabled(RuntimeMetrics)(self)
}

/**
 * Returns `true` if the `FiberRoots` `RuntimeFlag` is enabled, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const fiberRoots = (self: RuntimeFlags): boolean => {
  return isEnabled(FiberRoots)(self)
}

/**
 * Returns `true` if the `WindDown` `RuntimeFlag` is enabled, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const windDown = (self: RuntimeFlags): boolean => {
  return isEnabled(WindDown)(self)
}

/**
 * Returns `true` if the `CooperativeYielding` `RuntimeFlag` is enabled, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const cooperativeYielding = (self: RuntimeFlags): boolean => {
  return isEnabled(CooperativeYielding)(self)
}

/**
 * Returns true only if the `Interruption` flag is **enabled** and the
 * `WindDown` flag is **disabled**.
 *
 * A fiber is said to be interruptible if interruption is enabled and the fiber
 * is not in its wind-down phase, in which it takes care of cleanup activities
 * related to fiber shutdown.
 *
 * @since 1.0.0
 * @category getters
 */
export const interruptible = (self: RuntimeFlags): boolean => {
  return interruption(self) && !windDown(self)
}

/**
 * Creates a `RuntimeFlagsPatch` which describes the difference between `self`
 * and `that`.
 *
 * @since 1.0.0
 * @category diffing
 */
export const diff = internal.diff

/**
 * Constructs a differ that knows how to diff `RuntimeFlags` values.
 *
 * @since 1.0.0
 * @category mutations
 */
export const differ = internal.differ

/**
 * Patches a set of `RuntimeFlag`s with a `RuntimeFlagsPatch`, returning the
 * patched set of `RuntimeFlag`s.
 *
 * @since 1.0.0
 * @category mutations
 */
export const patch = internal.patch

/**
 * Converts the provided `RuntimeFlags` into a `ReadonlySet<number>`.
 *
 * @category conversions
 * @since 1.0.0
 */
export const toSet = internal.toSet

/**
 * Converts the provided `RuntimeFlags` into a `string`.
 *
 * @category conversions
 * @since 1.0.0
 */
export const render = internal.render
