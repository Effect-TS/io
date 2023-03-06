---
title: Scheduler.ts
nav_order: 50
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
  - [SyncScheduler (class)](#syncscheduler-class)
    - [scheduleTask (method)](#scheduletask-method-1)
    - [flush (method)](#flush-method)
    - [tasks (property)](#tasks-property-1)
    - [deferred (property)](#deferred-property-1)
  - [defaultScheduler](#defaultscheduler)

---

# models

## Scheduler (interface)

**Signature**

```ts
export interface Scheduler {
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
export declare class ControlledScheduler {
  constructor(
    /**
     * @since 1.0.0
     */
    readonly currentMode: () => 'PreferSync' | 'PreferAsync' | 'Sync'
  )
}
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

## SyncScheduler (class)

**Signature**

```ts
export declare class SyncScheduler {
  constructor(
    /**
     * @since 1.0.0
     */
    readonly initialMode: 'PreferSync' | 'PreferAsync' | 'Sync'
  )
}
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
