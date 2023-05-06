---
title: Scheduler.ts
nav_order: 53
parent: Modules
---

## Scheduler overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [models](#models)
  - [Scheduler (interface)](#scheduler-interface)
  - [Task (type alias)](#task-type-alias)
- [schedulers](#schedulers)
  - [ControlledScheduler (class)](#controlledscheduler-class)
    - [scheduleTask (method)](#scheduletask-method)
    - [step (method)](#step-method)
    - [tasks (property)](#tasks-property)
    - [deferred (property)](#deferred-property)
  - [MixedScheduler (class)](#mixedscheduler-class)
    - [starveInternal (method)](#starveinternal-method)
    - [starve (method)](#starve-method)
    - [scheduleTask (method)](#scheduletask-method-1)
    - [running (property)](#running-property)
    - [tasks (property)](#tasks-property-1)
  - [SyncScheduler (class)](#syncscheduler-class)
    - [scheduleTask (method)](#scheduletask-method-2)
    - [flush (method)](#flush-method)
    - [tasks (property)](#tasks-property-2)
    - [deferred (property)](#deferred-property-1)
  - [defaultScheduler](#defaultscheduler)
  - [timeBased](#timebased)

---

# models

## Scheduler (interface)

**Signature**

```ts
export interface Scheduler {
  scheduleTask(task: Task): void
}
```

Added in v1.0.0

## Task (type alias)

**Signature**

```ts
export type Task = () => void
```

Added in v1.0.0

# schedulers

## ControlledScheduler (class)

**Signature**

```ts
export declare class ControlledScheduler
```

Added in v1.0.0

### scheduleTask (method)

**Signature**

```ts
scheduleTask(task: Task)
```

Added in v1.0.0

### step (method)

**Signature**

```ts
step()
```

Added in v1.0.0

### tasks (property)

**Signature**

```ts
tasks: Task[]
```

Added in v1.0.0

### deferred (property)

**Signature**

```ts
deferred: boolean
```

Added in v1.0.0

## MixedScheduler (class)

**Signature**

```ts
export declare class MixedScheduler {
  constructor(
    /**
     * @since 1.0.0
     */
    readonly maxNextTickBeforeTimer: number
  )
}
```

Added in v1.0.0

### starveInternal (method)

**Signature**

```ts
private starveInternal(depth: number)
```

Added in v1.0.0

### starve (method)

**Signature**

```ts
private starve(depth = 0)
```

Added in v1.0.0

### scheduleTask (method)

**Signature**

```ts
scheduleTask(task: Task)
```

Added in v1.0.0

### running (property)

**Signature**

```ts
running: boolean
```

Added in v1.0.0

### tasks (property)

**Signature**

```ts
tasks: Task[]
```

Added in v1.0.0

## SyncScheduler (class)

**Signature**

```ts
export declare class SyncScheduler
```

Added in v1.0.0

### scheduleTask (method)

**Signature**

```ts
scheduleTask(task: Task)
```

Added in v1.0.0

### flush (method)

**Signature**

```ts
flush()
```

Added in v1.0.0

### tasks (property)

**Signature**

```ts
tasks: Task[]
```

Added in v1.0.0

### deferred (property)

**Signature**

```ts
deferred: boolean
```

Added in v1.0.0

## defaultScheduler

**Signature**

```ts
export declare const defaultScheduler: Scheduler
```

Added in v1.0.0

## timeBased

**Signature**

```ts
export declare const timeBased: Scheduler
```

Added in v1.0.0
