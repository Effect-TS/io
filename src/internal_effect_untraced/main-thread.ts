/**
 * fork of https://github.com/astoilkov/main-thread-scheduling
 *
 * node compatibility
 * removal of visible priority
 * reversal of task order
 */

/** @internal */
type WhenReady<T> = {
  promise: () => Promise<T>
  resolve: (value: T) => void
}

/** @internal */
function whenReady<T>(): WhenReady<T> {
  const observers: Array<(value: T) => void> = []

  const promise = () => new Promise<T>((resolve) => observers.push(resolve))

  return {
    promise,
    resolve: (value) => observers.forEach((observer) => observer(value))
  }
}

/** @internal */
type State = {
  tasks: Array<Task>
  frameTimeElapsed: boolean
  onIdleCallback: WhenReady<void>
  onAnimationFrame: WhenReady<void>
  frameWorkStartTime: number | undefined
  // @ts-expect-error
  idleDeadline: IdleDeadline | undefined
}

/** @internal */
const state: State = {
  tasks: [],
  idleDeadline: undefined,
  frameTimeElapsed: false,
  onIdleCallback: whenReady(),
  onAnimationFrame: whenReady(),
  frameWorkStartTime: undefined
}

/** @internal */
type Task = {
  ready: () => Promise<void>
  resolve: () => void
}

/** @internal */
function createTask(): Task {
  const wr = whenReady<void>()
  const item = { ready: wr.promise, resolve: wr.resolve }

  state.tasks.push(item)

  if (state.tasks.length === 1) {
    startTracking()
  }

  return item
}

let isTracking = false
let idleCallbackId: number | undefined

/** @internal */
function startTracking(): void {
  if (isTracking) {
    return
  }

  isTracking = true

  const reset = (): void => {
    state.idleDeadline = undefined
    state.frameTimeElapsed = false
    state.frameWorkStartTime = undefined
  }

  const loop = (): void => {
    // @ts-expect-error
    if (typeof requestIdleCallback !== "undefined") {
      // @ts-expect-error
      idleCallbackId = requestIdleCallback((deadline) => {
        reset()

        state.idleDeadline = deadline

        state.onIdleCallback.resolve()

        state.onIdleCallback = whenReady()
      })
    }

    const cb = () => {
      reset()

      state.onAnimationFrame.resolve()

      state.onAnimationFrame = whenReady()

      if (state.tasks.length === 0) {
        isTracking = false

        if (typeof cancelIdleCallback !== "undefined") {
          cancelIdleCallback(idleCallbackId)
        }
      } else {
        loop()
      }
    }

    // @ts-expect-error
    if (typeof requestAnimationFrame !== "undefined") {
      // @ts-expect-error
      requestAnimationFrame(cb)
    } else {
      setTimeout(cb, 16)
    }
  }

  loop()
}

/** @internal */
function removeTask(task: Task): void {
  const index = state.tasks.indexOf(task)
  if (index !== -1) {
    state.tasks.splice(index, 1)
  }
}

/** @internal */
function nextTask(): void {
  if (state.tasks.length > 0) {
    state.tasks[0].resolve()
  }
}

/** @internal */
declare global {
  interface Navigator {
    scheduling:
      | {
        isInputPending: (() => boolean) | undefined
      }
      | undefined
  }
  function cancelAnimationFrame(handle: number | undefined): void
  function cancelIdleCallback(handle: number | undefined): void
}

/** @internal */
let lastCallTime = 0
/** @internal */
let lastResult = false

/** @internal */
function isTimeToYield(): boolean {
  const now = Date.now()

  if (!lastResult && now - lastCallTime === 0) {
    return lastResult
  }

  lastCallTime = now
  lastResult = now >= calculateDeadline() ||
    // @ts-expect-error
    (typeof navigator !== "undefined" && navigator.scheduling?.isInputPending?.() === true)

  if (lastResult) {
    state.frameTimeElapsed = true
  }

  return lastResult
}

/** @internal */
function calculateDeadline(): number {
  if (state.frameWorkStartTime === undefined) {
    return -1
  }

  const idleDeadline = state.idleDeadline === undefined
    ? Number.MAX_SAFE_INTEGER
    : Date.now() + state.idleDeadline.timeRemaining()

  return Math.min(state.frameWorkStartTime + 5, idleDeadline)
}

let globalId = 0

const running = new Set<number>()

/** @internal */
function requestPromiseEscape(callback: () => void): number {
  const id = globalId

  running.add(id)

  Promise.resolve().then(() => {
    Promise.resolve().then(() => {
      if (running.has(id)) {
        callback()
        running.delete(id)
      }
    })
  })

  globalId += 1

  return id
}

/** @internal */
function cancelPromiseEscape(id: number | undefined): void {
  if (id !== undefined) {
    running.delete(id)
  }
}

/** @internal */
let callbacks: Array<() => void> = []

/** @internal */
function requestNextTask(callback: () => void): void {
  if (callbacks.length === 0) {
    const channel = new MessageChannel()
    channel.port2.postMessage(undefined)
    // @ts-expect-error
    channel.port1.onmessage = (): void => {
      channel.port1.close()
      channel.port2.close()

      const callbacksCopy = callbacks

      callbacks = []

      for (const callback of callbacksCopy) {
        callback()
      }
    }
  }
  callbacks.push(callback)
}

let promiseEscapeId: number | undefined

/** @internal */
async function yieldControl(): Promise<void> {
  cancelPromiseEscape(promiseEscapeId)

  const task = createTask()

  await schedule()

  if (state.tasks[0] !== task) {
    await task.ready()
    if (isTimeToYield()) {
      await schedule()
    }
  }

  removeTask(task)

  cancelPromiseEscape(promiseEscapeId)

  promiseEscapeId = requestPromiseEscape(() => {
    nextTask()
  })
}

async function schedule(): Promise<void> {
  if (state.frameTimeElapsed) {
    await state.onAnimationFrame.promise()
  }

  // @ts-expect-error
  if (typeof requestIdleCallback === "undefined") {
    await new Promise<void>((resolve) => requestNextTask(resolve))

    // @ts-expect-error
    if (typeof navigator !== "undefined" && navigator.scheduling?.isInputPending?.() === true) {
      await schedule()
    } else if (state.frameWorkStartTime === undefined) {
      state.frameWorkStartTime = Date.now()
    }
  } else {
    await state.onIdleCallback.promise()

    if (state.frameWorkStartTime === undefined) {
      state.frameWorkStartTime = Date.now()
    }
  }
}

/** @internal */
export function yieldBackgroundOrContinue(): Promise<void> {
  if (isTimeToYield()) {
    return yieldControl()
  }

  return Promise.resolve()
}
