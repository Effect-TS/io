/**
 * @since 1.0.0
 */

/**
 * Represents a set of `RuntimeFlag`s. `RuntimeFlag`s affect the operation of
 * the Effect runtime system. They are exposed to application-level code because
 * they affect the behavior and performance of application code.
 *
 * @since 1.0.0
 * @category model
 */
export type RuntimeFlags = number & {
  readonly RuntimeFlags: unique symbol
}

/**
 * Represents a flag that can be set to enable or disable a particular feature
 * of the Effect runtime.
 *
 * @since 1.0.0
 * @category model
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
export const None: RuntimeFlag = 0 as RuntimeFlag

/**
 * The interruption flag determines whether or not the Effect runtime system will
 * interrupt a fiber.
 *
 * @since 1.0.0
 * @category constructors
 */
export const Interruption: RuntimeFlag = 1 << 0 as RuntimeFlag

/**
 * The current fiber flag determines whether or not the Effect runtime system
 * will store the current fiber whenever a fiber begins executing. Use of this
 * flag will negatively impact performance, but is essential when tracking the
 * current fiber is necessary.
 *
 * @since 1.0.0
 * @category constructors
 */
export const CurrentFiber: RuntimeFlag = 1 << 1 as RuntimeFlag

/**
 * The op log flag determines whether or not the Effect runtime system will
 * attempt to log all operations of the Effect runtime. Use of this flag will
 * negatively impact performance and generate massive volumes of ultra-fine
 * debug logs. Only recommended for debugging.
 *
 * @since 1.0.0
 * @category constructors
 */
export const OpLog: RuntimeFlag = 1 << 2 as RuntimeFlag

/**
 * The op supervision flag determines whether or not the Effect runtime system
 * will supervise all operations of the Effect runtime. Use of this flag will
 * negatively impact performance, but is required for some operations, such as
 * profiling.
 *
 * @since 1.0.0
 * @category constructors
 */
export const OpSupervision: RuntimeFlag = 1 << 3 as RuntimeFlag

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
export const RuntimeMetrics: RuntimeFlag = 1 << 4 as RuntimeFlag

/**
 * The fiber roots flag determines whether or not the Effect runtime system will
 * keep track of all fiber roots. Use of this flag will negatively impact
 * performance, but is required for the fiber dumps functionality.
 *
 * @since 1.0.0
 * @category constructors
 */
export const FiberRoots: RuntimeFlag = 1 << 5 as RuntimeFlag

/**
 * The wind down flag determines whether the Effect runtime system will execute
 * effects in wind-down mode. In wind-down mode, even if interruption is
 * enabled and a fiber has been interrupted, the fiber will continue its
 * execution uninterrupted.
 *
 * @since 1.0.0
 * @category constructors
 */
export const WindDown: RuntimeFlag = 1 << 6 as RuntimeFlag

/**
 * The cooperative yielding flag determines whether the Effect runtime will
 * yield to another fiber.
 *
 * @since 1.0.0
 * @category constructors
 */
export const CooperativeYielding: RuntimeFlag = 1 << 7 as RuntimeFlag

/**
 * Returns `true` if the specified `RuntimeFlag` is enabled, `false` otherwise.
 *
 * @since 1.0.0
 * @category elements
 */
export function isEnabled(flag: RuntimeFlag) {
  return (self: RuntimeFlags): boolean => (self & flag) !== 0
}

/**
 * Returns `true` if the `Interruption` `RuntimeFlag` is enabled, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export function interruption(self: RuntimeFlags): boolean {
  return isEnabled(Interruption)(self)
}
