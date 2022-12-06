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
  - [highPriorityScheduler](#highpriorityscheduler)
  - [lowPriorityScheduler](#lowpriorityscheduler)
  - [midPriorityScheduler](#midpriorityscheduler)

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

## highPriorityScheduler

**Signature**

```ts
export declare const highPriorityScheduler: Scheduler
```

Added in v1.0.0

## lowPriorityScheduler

**Signature**

```ts
export declare const lowPriorityScheduler: Scheduler
```

Added in v1.0.0

## midPriorityScheduler

**Signature**

```ts
export declare const midPriorityScheduler: Scheduler
```

Added in v1.0.0
