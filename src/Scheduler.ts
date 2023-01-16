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
  get preferredExecution(): "Sync" | "Async"
  scheduleTask(task: Task): void
}
