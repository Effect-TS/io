---
title: Logger.ts
nav_order: 20
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
  - [addLogger](#addlogger)
  - [console](#console)
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
export declare const consoleLogger: () => Logger<string, void>
```

Added in v1.0.0

## defaultLogger

**Signature**

```ts
export declare const defaultLogger: Logger<string, string>
```

Added in v1.0.0

## none

A logger that does nothing in response to logging events.

**Signature**

```ts
export declare const none: () => Logger<unknown, void>
```

Added in v1.0.0

## simple

**Signature**

```ts
export declare const simple: <A, B>(log: (a: A) => B) => Logger<A, B>
```

Added in v1.0.0

## succeed

**Signature**

```ts
export declare const succeed: <A>(value: A) => Logger<unknown, A>
```

Added in v1.0.0

## sync

**Signature**

```ts
export declare const sync: <A>(evaluate: () => A) => Logger<unknown, A>
```

Added in v1.0.0

## test

**Signature**

```ts
export declare const test: <Message>(input: Message) => <Output>(self: Logger<Message, Output>) => Output
```

Added in v1.0.0

# environment

## addLogger

**Signature**

```ts
export declare const addLogger: <B>(logger: Logger<string, B>) => Layer.Layer<never, never, never>
```

Added in v1.0.0

## console

**Signature**

```ts
export declare const console: (
  minLevel?:
    | LogLevel.All
    | LogLevel.Fatal
    | LogLevel.Error
    | LogLevel.Warning
    | LogLevel.Info
    | LogLevel.Debug
    | LogLevel.Trace
    | LogLevel.None
    | undefined
) => Layer.Layer<never, never, never>
```

Added in v1.0.0

# filtering

## filterLogLevel

Returns a version of this logger that only logs messages when the log level
satisfies the specified predicate.

**Signature**

```ts
export declare const filterLogLevel: (
  f: (logLevel: LogLevel.LogLevel) => boolean
) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message, Option.Option<Output>>
```

Added in v1.0.0

# mapping

## contramap

**Signature**

```ts
export declare const contramap: <Message, Message2>(
  f: (message: Message2) => Message
) => <Output>(self: Logger<Message, Output>) => Logger<Message2, Output>
```

Added in v1.0.0

## map

**Signature**

```ts
export declare const map: <Output, Output2>(
  f: (output: Output) => Output2
) => <Message>(self: Logger<Message, Output>) => Logger<Message, Output2>
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
export declare const zip: <Message2, Output2>(
  that: Logger<Message2, Output2>
) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message2, readonly [Output, Output2]>
```

Added in v1.0.0

## zipLeft

**Signature**

```ts
export declare const zipLeft: <Message2, Output2>(
  that: Logger<Message2, Output2>
) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message2, Output>
```

Added in v1.0.0

## zipRight

**Signature**

```ts
export declare const zipRight: <Message2, Output2>(
  that: Logger<Message2, Output2>
) => <Message, Output>(self: Logger<Message, Output>) => Logger<Message & Message2, Output2>
```

Added in v1.0.0
