import type * as Scheduler from "@effect/io/Scheduler"

/** @internal */
export class HighPriorityScheduler implements Scheduler.Scheduler {
  running = false
  tasks: Array<Scheduler.Task> = []

  get preferredExecution(): "Sync" | "Async" {
    return "Async"
  }

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
      Promise.resolve(void 0).then(() => this.starveInternal(depth + 1))
    }
  }

  scheduleTask(task: Scheduler.Task) {
    this.tasks.push(task)
    if (!this.running) {
      this.running = true
      this.starve()
    }
  }
}

/** @internal */
export const defaultScheduler: Scheduler.Scheduler = new HighPriorityScheduler()

/** @internal */
export class SyncScheduler implements Scheduler.Scheduler {
  tasks: Array<Scheduler.Task> = []
  deferred = false

  scheduleTask(task: Scheduler.Task) {
    if (this.deferred) {
      defaultScheduler.scheduleTask(task)
    } else {
      this.tasks.push(task)
    }
  }

  get preferredExecution(): "Sync" | "Async" {
    return this.deferred ? "Async" : "Sync"
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
