/**
 * @since 1.0.0
 */

import { globalValue } from "@effect/data/Global"

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
  scheduleTask(task: Task, priority: number): void
}

/**
 * @since 1.0.0
 * @category schedulers
 */
export class MixedScheduler implements Scheduler {
  /**
   * @since 1.0.0
   */
  running = false
  /**
   * @since 1.0.0
   */
  tasks: Array<Array<Task>> = []

  constructor(
    /**
     * @since 1.0.0
     */
    readonly maxNextTickBeforeTimer: number
  ) {}

  /**
   * @since 1.0.0
   */
  private starveInternal(depth: number) {
    const tasks = this.tasks
    this.tasks = []
    for (const toRun of tasks) {
      for (let i = 0; i < toRun.length; i++) {
        toRun[i]()
      }
    }
    if (this.tasks.length === 0) {
      this.running = false
    } else {
      this.starve(depth)
    }
  }

  /**
   * @since 1.0.0
   */
  private starve(depth = 0) {
    if (depth >= this.maxNextTickBeforeTimer) {
      setTimeout(() => this.starveInternal(0), 0)
    } else {
      Promise.resolve(void 0).then(() => this.starveInternal(depth + 1))
    }
  }

  /**
   * @since 1.0.0
   */
  scheduleTask(task: Task, priority: number) {
    if (!this.tasks[priority]) {
      this.tasks[priority] = []
    }
    this.tasks[priority].push(task)
    if (!this.running) {
      this.running = true
      this.starve()
    }
  }
}

/**
 * @since 1.0.0
 * @category schedulers
 */
export const defaultScheduler: Scheduler = globalValue(
  Symbol.for("@effect/io/Scheduler/defaultScheduler"),
  () => new MixedScheduler(2048)
)

/**
 * @since 1.0.0
 * @category schedulers
 */
export class SyncScheduler implements Scheduler {
  /**
   * @since 1.0.0
   */
  tasks: Array<Array<Task>> = []

  /**
   * @since 1.0.0
   */
  deferred = false

  /**
   * @since 1.0.0
   */
  scheduleTask(task: Task, priority: number) {
    if (this.deferred) {
      defaultScheduler.scheduleTask(task, priority)
    } else {
      if (!this.tasks[priority]) {
        this.tasks[priority] = []
      }
      this.tasks[priority].push(task)
    }
  }

  /**
   * @since 1.0.0
   */
  flush() {
    while (this.tasks.length > 0) {
      const tasks = this.tasks
      this.tasks = []
      for (const toRun of tasks) {
        for (let i = 0; i < toRun.length; i++) {
          toRun[i]()
        }
      }
    }
    this.deferred = true
  }
}

/**
 * @since 1.0.0
 * @category schedulers
 */
export class ControlledScheduler implements Scheduler {
  /**
   * @since 1.0.0
   */
  tasks: Array<Array<Task>> = []

  /**
   * @since 1.0.0
   */
  deferred = false

  /**
   * @since 1.0.0
   */
  scheduleTask(task: Task, priority: number) {
    if (this.deferred) {
      defaultScheduler.scheduleTask(task, priority)
    } else {
      if (!this.tasks[priority]) {
        this.tasks[priority] = []
      }
      this.tasks[priority].push(task)
    }
  }

  /**
   * @since 1.0.0
   */
  step() {
    const tasks = this.tasks
    this.tasks = []
    for (const toRun of tasks) {
      for (let i = 0; i < toRun.length; i++) {
        toRun[i]()
      }
    }
  }
}

/**
 * @since 1.0.0
 * @category schedulers
 */
export const timeBased: Scheduler = {
  scheduleTask(task) {
    setTimeout(() => {
      task()
    }, 0)
  }
}
