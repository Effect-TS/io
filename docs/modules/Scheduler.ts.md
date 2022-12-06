---
title: Scheduler.ts
nav_order: 47
parent: Modules
---

## Scheduler overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Scheduler (interface)](#scheduler-interface)
  - [Task (interface)](#task-interface)
  - [currentScheduler](#currentscheduler)
  - [defaultScheduler](#defaultscheduler)

---

# utils

## Scheduler (interface)

**Signature**

```ts
export interface Scheduler {
  scheduleTask(task: Task): void
}
```

Added in v1.0.0

## Task (interface)

**Signature**

```ts
export interface Task {
  (): void
}
```

Added in v1.0.0

## currentScheduler

**Signature**

```ts
export declare const currentScheduler: FiberRef<Scheduler>
```

Added in v1.0.0

## defaultScheduler

**Signature**

```ts
export declare const defaultScheduler: Scheduler
```

Added in v1.0.0
