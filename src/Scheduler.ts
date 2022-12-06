/**
 * @since 1.0.0
 */
import type { FiberRef } from "@effect/io/FiberRef"
import * as core from "@effect/io/internal/core"
import * as internal from "@effect/io/internal/scheduler"

/**
 * @since 1.0.0
 */
export interface Task {
  (): void
}

/**
 * @since 1.0.0
 */
export interface Scheduler {
  scheduleTask(task: Task): void
}

/**
 * @since 1.0.0
 */
export const defaultScheduler: Scheduler = internal.defaultScheduler

/**
 * @since 1.0.0
 */
export const currentScheduler: FiberRef<Scheduler> = core.currentScheduler
