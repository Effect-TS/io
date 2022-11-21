---
title: Debug.ts
nav_order: 4
parent: Modules
---

## Debug overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [debug](#debug)
  - [nodeSourceMapExtractor](#nodesourcemapextractor)
  - [runtimeDebug](#runtimedebug)
- [models](#models)
  - [Debug (interface)](#debug-interface)
- [utils](#utils)
  - [getCallTrace](#getcalltrace)
  - [withCallTrace](#withcalltrace)

---

# debug

## nodeSourceMapExtractor

**Signature**

```ts
export declare const nodeSourceMapExtractor: (at: number) => string | undefined
```

Added in v1.0.0

## runtimeDebug

**Signature**

```ts
export declare const runtimeDebug: Debug
```

Added in v1.0.0

# models

## Debug (interface)

**Signature**

```ts
export interface Debug {
  /**
   * Overrides the default log level filter for loggers such as console.
   */
  logLevelOverride: LogLevel | undefined
  /**
   * When specified it will be used to collect call traces at runtime.
   *
   * NOTE: Collecting traces at runtime is expensive and unreliable due
   * to the stack trace format being non standardized across platforms.
   * This flag is meant to be used only when debugging during development.
   */
  traceExtractor: ((at: number) => string | undefined) | undefined
  /**
   * A function that is used to filter which traces to show and collect.
   */
  traceFilter: (trace: string) => boolean
  /**
   * Enables execution tracing in the fiber runtime.
   */
  traceExecutionEnabled: boolean
  /**
   * Renders the execution trace in the error cause when it is available.
   */
  traceExecutionEnabledInCause: boolean
  /**
   * Renders the stack trace in the error cause when it is available.
   */
  traceStackEnabledInCause: boolean
  /**
   * Renders the span trace in the error cause when it is available.
   */
  traceSpanEnabledInCause: boolean
  /**
   * Sets a limit on how many execution traces should be rendered.
   */
  traceExecutionLimit: number
  /**
   * Sets a limit on how many stack traces should be rendered.
   */
  traceStackLimit: number
  /**
   * Sets a limit on how many span traces should be rendered.
   */
  traceSpanLimit: number
  /**
   * Enables debug logging of execution traces.
   */
  traceExecutionLogEnabled: boolean
  /**
   * Enables tracing.
   */
  traceEnabled: boolean
  /**
   * Listens to execution traces.
   */
  traceExecutionHook: Array<(trace: string) => void>
}
```

Added in v1.0.0

# utils

## getCallTrace

**Signature**

```ts
export declare const getCallTrace: () => string | undefined
```

Added in v1.0.0

## withCallTrace

**Signature**

```ts
export declare const withCallTrace: (trace: string) => <A>(x: A) => A
```

Added in v1.0.0
