---
title: Debug.ts
nav_order: 8
parent: Modules
---

## Debug overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [debug](#debug)
  - [getCallTraceFromNewError](#getcalltracefromnewerror)
  - [runtimeDebug](#runtimedebug)
- [models](#models)
  - [Debug (interface)](#debug-interface)
- [utils](#utils)
  - [debugAs](#debugas)
  - [getCallTrace](#getcalltrace)
  - [isTraceEnabled](#istraceenabled)
  - [withCallTrace](#withcalltrace)

---

# debug

## getCallTraceFromNewError

**Signature**

```ts
export declare const getCallTraceFromNewError: (at: number) => string | undefined
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
  defaultLogLevel: 'All' | 'Fatal' | 'Error' | 'Warning' | 'Info' | 'Debug' | 'Trace' | 'None'
  /**
   * When specified it will be used to collect call traces at runtime.
   *
   * NOTE: Collecting traces at runtime is expensive and unreliable due
   * to the stack trace format being non standardized across platforms.
   * This flag is meant to be used only when debugging during development.
   */
  getCallTrace: ((at: number) => string | undefined) | undefined
  /**
   * A function that is used to filter which traces to show and collect.
   */
  traceFilter: (trace: string) => boolean
  /**
   * Sets a limit on how many stack traces should be rendered.
   */
  traceStackLimit: number
  /**
   * Sets a limit on how many execution traces should be rendered.
   */
  traceExecutionLimit: number
  /**
   * Enables debug logging of execution traces.
   */
  traceExecutionLogEnabled: boolean
}
```

Added in v1.0.0

# utils

## debugAs

**Signature**

```ts
export declare const debugAs: <F, G>(f: F, g: G) => G
```

Added in v1.0.0

## getCallTrace

**Signature**

```ts
export declare const getCallTrace: () => string | undefined
```

Added in v1.0.0

## isTraceEnabled

**Signature**

```ts
export declare const isTraceEnabled: () => boolean
```

Added in v1.0.0

## withCallTrace

**Signature**

```ts
export declare const withCallTrace: (trace: string) => <A>(value: A) => A
```

Added in v1.0.0
