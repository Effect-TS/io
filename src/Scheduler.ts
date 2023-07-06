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
 * @category utils
 */
export class PriorityBuckets<T = Task> {
  /**
   * @since 1.0.0
   */
  public buckets: Array<[number, Array<T>]> = []
  /**
   * @since 1.0.0
   */
  scheduleTask(task: T, priority: number) {
    let bucket: [number, Array<T>] | undefined = undefined
    let index: number
    for (index = 0; index < this.buckets.length; index++) {
      if (this.buckets[index][0] <= priority) {
        bucket = this.buckets[index]
      } else {
        break
      }
    }
    if (bucket) {
      bucket[1].push(task)
    } else {
      const newBuckets: Array<[number, Array<T>]> = []
      for (let i = 0; i < index; i++) {
        newBuckets.push(this.buckets[i])
      }
      newBuckets.push([priority, [task]])
      for (let i = index; i < this.buckets.length; i++) {
        newBuckets.push(this.buckets[i])
      }
      this.buckets = newBuckets
    }
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export class MixedScheduler implements Scheduler {
  /**
   * @since 1.0.0
   */
  running = false
  /**
   * @since 1.0.0
   */
  tasks = new PriorityBuckets()

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
    const tasks = this.tasks.buckets
    this.tasks.buckets = []
    for (const [_, toRun] of tasks) {
      for (let i = 0; i < toRun.length; i++) {
        toRun[i]()
      }
    }
    if (this.tasks.buckets.length === 0) {
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
    this.tasks.scheduleTask(task, priority)
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
 * @category constructors
 */
export class SyncScheduler implements Scheduler {
  /**
   * @since 1.0.0
   */
  tasks = new PriorityBuckets()

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
      this.tasks.scheduleTask(task, priority)
    }
  }

  /**
   * @since 1.0.0
   */
  flush() {
    while (this.tasks.buckets.length > 0) {
      const tasks = this.tasks.buckets
      this.tasks.buckets = []
      for (const [_, toRun] of tasks) {
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
 * @category constructors
 */
export class ControlledScheduler implements Scheduler {
  /**
   * @since 1.0.0
   */
  tasks = new PriorityBuckets()

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
      this.tasks.scheduleTask(task, priority)
    }
  }

  /**
   * @since 1.0.0
   */
  step() {
    const tasks = this.tasks.buckets
    this.tasks.buckets = []
    for (const [_, toRun] of tasks) {
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

/**
 * @since 1.0.0
 * @category constructors
 */
export const matrix = (...record: Array<[number, Scheduler]>): Scheduler => {
  const index = record.sort(([p0], [p1]) => p0 < p1 ? -1 : p0 > p1 ? 1 : 0)
  return {
    scheduleTask(task, priority) {
      let scheduler: Scheduler | undefined = undefined
      for (const i of index) {
        if (priority >= i[0]) {
          scheduler = i[1]
        } else {
          return (scheduler ?? defaultScheduler).scheduleTask(task, priority)
        }
      }
      return (scheduler ?? defaultScheduler).scheduleTask(task, priority)
    }
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (scheduleTask: Scheduler["scheduleTask"]): Scheduler => ({ scheduleTask })
