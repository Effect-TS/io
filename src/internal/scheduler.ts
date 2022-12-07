/** @internal */
export type Task = () => void

/** @internal */
export interface Scheduler {
  scheduleTask(task: Task): void
}

/** @internal */
export class HighPriorityScheduler {
  running = false
  tasks: Array<Task> = []
  readonly promise = Promise.resolve(void 0)

  starveInternal(depth: number) {
    const toRun = this.tasks
    this.tasks = []
    for (let i = 0; i < toRun.length; i++) {
      toRun[i]()
    }
    if (this.tasks.length === 0) {
      this.running = false
    } else {
      this.starve(depth)
    }
  }

  starve(depth = 0) {
    if (depth >= 2048) {
      setTimeout(() => this.starveInternal(0), 0)
    } else {
      this.promise.then(() => this.starveInternal(depth + 1))
    }
  }

  scheduleTask(task: Task) {
    this.tasks.push(task)
    if (!this.running) {
      this.running = true
      this.starve()
    }
  }
}

/** @internal */
export const defaultScheduler: Scheduler = new HighPriorityScheduler()

/** @internal */
export class SyncScheduler {
  tasks: Array<Task> = []
  deferred = false

  scheduleTask(task: Task) {
    if (this.deferred) {
      defaultScheduler.scheduleTask(task)
    } else {
      this.tasks.push(task)
    }
  }

  flush() {
    while (this.tasks.length > 0) {
      const toRun = this.tasks
      this.tasks = []
      for (let i = 0; i < toRun.length; i++) {
        toRun[i]()
      }
    }
    this.deferred = true
  }
}
