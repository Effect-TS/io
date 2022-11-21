---
title: Logger.ts
nav_order: 21
parent: Modules
---

## Logger overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [consoleLogger](#consolelogger)
  - [defaultLogger](#defaultlogger)
  - [none](#none)
  - [simple](#simple)
  - [succeed](#succeed)
  - [sync](#sync)
  - [test](#test)
- [environment](#environment)
  - [console](#console)
  - [layer](#layer)
- [filtering](#filtering)
  - [filterLogLevel](#filterloglevel)
- [mapping](#mapping)
  - [contramap](#contramap)
  - [map](#map)
- [models](#models)
  - [Logger (interface)](#logger-interface)
- [symbols](#symbols)
  - [LoggerTypeId](#loggertypeid)
  - [LoggerTypeId (type alias)](#loggertypeid-type-alias)
- [zipping](#zipping)
  - [zip](#zip)
  - [zipLeft](#zipleft)
  - [zipRight](#zipright)

---

# constructors

## consoleLogger

**Signature**

```ts
export declare const consoleLogger: any
```

Added in v1.0.0

## defaultLogger

**Signature**

```ts
export declare const defaultLogger: any
```

Added in v1.0.0

## none

A logger that does nothing in response to logging events.

**Signature**

```ts
export declare const none: any
```

Added in v1.0.0

## simple

**Signature**

```ts
export declare const simple: any
```

Added in v1.0.0

## succeed

**Signature**

```ts
export declare const succeed: any
```

Added in v1.0.0

## sync

**Signature**

```ts
export declare const sync: any
```

Added in v1.0.0

## test

**Signature**

```ts
export declare const test: any
```

Added in v1.0.0

# environment

## console

**Signature**

```ts
export declare const console: any
```

Added in v1.0.0

## layer

**Signature**

```ts
export declare const layer: any
```

Added in v1.0.0

# filtering

## filterLogLevel

Returns a version of this logger that only logs messages when the log level
satisfies the specified predicate.

**Signature**

```ts
export declare const filterLogLevel: any
```

Added in v1.0.0

# mapping

## contramap

**Signature**

```ts
export declare const contramap: any
```

Added in v1.0.0

## map

**Signature**

```ts
export declare const map: any
```

Added in v1.0.0

# models

## Logger (interface)

**Signature**

```ts
export interface Logger<Message, Output> extends Logger.Variance<Message, Output> {
  readonly log: (
    fiberId: FiberId.FiberId,
    logLevel: LogLevel.LogLevel,
    message: Message,
    cause: Cause.Cause<unknown>,
    context: FiberRefs.FiberRefs,
    spans: List.List<LogSpan.LogSpan>,
    annotations: ReadonlyMap<string, string>
  ) => Output
}
```

Added in v1.0.0

# symbols

## LoggerTypeId

**Signature**

```ts
export declare const LoggerTypeId: typeof LoggerTypeId
```

Added in v1.0.0

## LoggerTypeId (type alias)

**Signature**

```ts
export type LoggerTypeId = typeof LoggerTypeId
```

Added in v1.0.0

# zipping

## zip

Combines this logger with the specified logger to produce a new logger that
logs to both this logger and that logger.

**Signature**

```ts
export declare const zip: any
```

Added in v1.0.0

## zipLeft

**Signature**

```ts
export declare const zipLeft: any
```

Added in v1.0.0

## zipRight

**Signature**

```ts
export declare const zipRight: any
```

Added in v1.0.0
