import { pipe } from "@fp-ts/data/Function"
import * as MutableList from "@fp-ts/data/mutable/MutableList"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"

/** @internal */
export type Task = () => void

/** @internal */
export interface Scheduler {
  scheduleTask(task: Task): void
}

/** @internal */
export class DefaultScheduler {
  readonly running = MutableRef.make(false)
  readonly tasks = MutableRef.make(MutableList.make<Task>())
  readonly promise = Promise.resolve(void 0)

  starveInternal(depth: number) {
    const toRun = MutableRef.get(this.tasks)
    pipe(this.tasks, MutableRef.set(MutableList.make()))
    pipe(
      toRun,
      MutableList.forEach((task) => {
        task()
      })
    )
    if (MutableList.isEmpty(MutableRef.get(this.tasks))) {
      pipe(this.running, MutableRef.set(false))
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
    pipe(MutableRef.get(this.tasks), MutableList.append(task))
    if (!MutableRef.get(this.running)) {
      pipe(this.running, MutableRef.set(true))
      this.starve()
    }
  }
}

/** @internal */
export const defaultScheduler: Scheduler = new DefaultScheduler()

/** @internal */
export class StagedScheduler {
  readonly tasks = MutableList.make<Task>()
  readonly deferred = MutableRef.make(false)

  scheduleTask(task: Task) {
    if (MutableRef.get(this.deferred)) {
      defaultScheduler.scheduleTask(task)
    } else {
      pipe(this.tasks, MutableList.append(task))
    }
  }

  flush() {
    while (!MutableList.isEmpty(this.tasks)) {
      MutableList.shift(this.tasks)!()
    }
    pipe(this.deferred, MutableRef.set(true))
  }
}
