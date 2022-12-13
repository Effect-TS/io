/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category models
 */
export type Task = () => void

/**
 * @since 1.0.0
 * @category models
 */
export interface Scheduler {
  scheduleTask(task: Task): void
}
