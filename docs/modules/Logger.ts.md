---
title: Logger.ts
nav_order: 25
parent: Modules
---

## Logger overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [defaultLogger](#defaultlogger)
  - [logFmt](#logfmt)
  - [logfmtLogger](#logfmtlogger)
  - [make](#make)
  - [none](#none)
  - [simple](#simple)
  - [stringLogger](#stringlogger)
  - [succeed](#succeed)
  - [sync](#sync)
  - [test](#test)
- [context](#context)
  - [add](#add)
  - [minimumLogLevel](#minimumloglevel)
  - [remove](#remove)
  - [replace](#replace)
  - [set](#set)
  - [withMinimumLogLevel](#withminimumloglevel)
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

## defaultLogger

**Signature**

```ts
export declare const defaultLogger: Logger<string, void>
```

Added in v1.0.0

## logFmt

**Signature**

```ts
export declare const logFmt: Layer.Layer<never, never, never>
```

Added in v1.0.0

## logfmtLogger

**Signature**

```ts
export declare const logfmtLogger: Logger<string, string>
```

Added in v1.0.0

## make

**Signature**

```ts
export declare const make: <Message, Output>(
  log: (
    fiberId: FiberId.FiberId,
    logLevel: LogLevel.LogLevel,
    message: Message,
    cause: Cause.Cause<unknown>,
    context: FiberRefs.FiberRefs,
    spans: Chunk.Chunk<LogSpan.LogSpan>,
    annotations: HashMap.HashMap<string, string>
  ) => Output
) => Logger<Message, Output>
```

Added in v1.0.0

## none

A logger that does nothing in response to logging events.

**Signature**

```ts
export declare const none: (_: void) => Logger<unknown, void>
```

Added in v1.0.0

## simple

**Signature**

```ts
export declare const simple: <A, B>(log: (a: A) => B) => Logger<A, B>
```

Added in v1.0.0

## stringLogger

**Signature**

```ts
export declare const stringLogger: Logger<string, string>
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
export declare const sync: <A>(evaluate: LazyArg<A>) => Logger<unknown, A>
```

Added in v1.0.0

## test

**Signature**

```ts
export declare const test: {
  <Message>(input: Message): <Output>(self: Logger<Message, Output>) => Output
  <Message, Output>(self: Logger<Message, Output>, input: Message): Output
}
```

Added in v1.0.0

# context

## add

**Signature**

```ts
export declare const add: <B>(logger: Logger<string, B>) => Layer.Layer<never, never, never>
```

Added in v1.0.0

## minimumLogLevel

**Signature**

```ts
export declare const minimumLogLevel: (level: LogLevel.LogLevel) => Layer.Layer<never, never, never>
```

Added in v1.0.0

## remove

**Signature**

```ts
export declare const remove: <A>(logger: Logger<string, A>) => Layer.Layer<never, never, never>
```

Added in v1.0.0

## replace

**Signature**

```ts
export declare const replace: {
  <B>(that: Logger<string, B>): <A>(self: Logger<string, A>) => Layer.Layer<never, never, never>
  <A, B>(self: Logger<string, A>, that: Logger<string, B>): Layer.Layer<never, never, never>
}
```

Added in v1.0.0

## set

**Signature**

```ts
export declare const set: <A>(logger: Logger<string, A>) => Layer.Layer<never, never, never>
```

Added in v1.0.0

## withMinimumLogLevel

**Signature**

```ts
export declare const withMinimumLogLevel: {
  (level: LogLevel.LogLevel): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, level: LogLevel.LogLevel): Effect<R, E, A>
}
```

Added in v1.0.0

# filtering

## filterLogLevel

Returns a version of this logger that only logs messages when the log level
satisfies the specified predicate.

**Signature**

```ts
export declare const filterLogLevel: {
  (f: (logLevel: LogLevel.LogLevel) => boolean): <Message, Output>(
    self: Logger<Message, Output>
  ) => Logger<Message, Option.Option<Output>>
  <Message, Output>(self: Logger<Message, Output>, f: (logLevel: LogLevel.LogLevel) => boolean): Logger<
    Message,
    Option.Option<Output>
  >
}
```

Added in v1.0.0

# mapping

## contramap

**Signature**

```ts
export declare const contramap: {
  <Message, Message2>(f: (message: Message2) => Message): <Output>(
    self: Logger<Message, Output>
  ) => Logger<Message2, Output>
  <Output, Message, Message2>(self: Logger<Message, Output>, f: (message: Message2) => Message): Logger<
    Message2,
    Output
  >
}
```

Added in v1.0.0

## map

**Signature**

```ts
export declare const map: {
  <Output, Output2>(f: (output: Output) => Output2): <Message>(
    self: Logger<Message, Output>
  ) => Logger<Message, Output2>
  <Message, Output, Output2>(self: Logger<Message, Output>, f: (output: Output) => Output2): Logger<Message, Output2>
}
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
    spans: Chunk.Chunk<LogSpan.LogSpan>,
    annotations: HashMap.HashMap<string, string>
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
export declare const zip: {
  <Message2, Output2>(that: Logger<Message2, Output2>): <Message, Output>(
    self: Logger<Message, Output>
  ) => Logger<Message & Message2, readonly [Output, Output2]>
  <Message, Output, Message2, Output2>(self: Logger<Message, Output>, that: Logger<Message2, Output2>): Logger<
    Message & Message2,
    readonly [Output, Output2]
  >
}
```

Added in v1.0.0

## zipLeft

**Signature**

```ts
export declare const zipLeft: {
  <Message2, Output2>(that: Logger<Message2, Output2>): <Message, Output>(
    self: Logger<Message, Output>
  ) => Logger<Message & Message2, Output>
  <Message, Output, Message2, Output2>(self: Logger<Message, Output>, that: Logger<Message2, Output2>): Logger<
    Message & Message2,
    Output
  >
}
```

Added in v1.0.0

## zipRight

**Signature**

```ts
export declare const zipRight: {
  <Message2, Output2>(that: Logger<Message2, Output2>): <Message, Output>(
    self: Logger<Message, Output>
  ) => Logger<Message & Message2, Output2>
  <Message, Output, Message2, Output2>(self: Logger<Message, Output>, that: Logger<Message2, Output2>): Logger<
    Message & Message2,
    Output2
  >
}
```

Added in v1.0.0
