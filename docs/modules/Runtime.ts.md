---
title: Runtime.ts
nav_order: 42
parent: Modules
---

## Runtime overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [defaultRuntime](#defaultruntime)
  - [defaultRuntimeFlags](#defaultruntimeflags)
  - [make](#make)
- [models](#models)
  - [AsyncFiber (interface)](#asyncfiber-interface)
  - [Runtime (interface)](#runtime-interface)

---

# constructors

## defaultRuntime

**Signature**

```ts
export declare const defaultRuntime: Runtime<never>
```

Added in v1.0.0

## defaultRuntimeFlags

**Signature**

```ts
export declare const defaultRuntimeFlags: RuntimeFlags.RuntimeFlags
```

Added in v1.0.0

## make

**Signature**

```ts
export declare const make: <R>(
  context: Context.Context<R>,
  runtimeFlags: RuntimeFlags.RuntimeFlags,
  fiberRefs: FiberRefs.FiberRefs
) => Runtime<R>
```

Added in v1.0.0

# models

## AsyncFiber (interface)

**Signature**

```ts
export interface AsyncFiber<E, A> {
  readonly _tag: 'AsyncFiber'
  readonly fiber: Fiber.RuntimeFiber<E, A>
}
```

Added in v1.0.0

## Runtime (interface)

**Signature**

```ts
export interface Runtime<R> {
  unsafeFork: <E, A>(effect: Effect.Effect<R, E, A>) => Fiber.RuntimeFiber<E, A>

  unsafeRunWith: <E, A>(
    effect: Effect.Effect<R, E, A>,
    k: (exit: Exit.Exit<E, A>) => void
  ) => (fiberId: FiberId.FiberId) => (_: (exit: Exit.Exit<E, A>) => void) => void

  unsafeRunSync: <E, A>(effect: Effect.Effect<R, E, A>) => A

  unsafeRunSyncExit: <E, A>(effect: Effect.Effect<R, E, A>) => Exit.Exit<E, A>

  /**
   * Executes the effect asynchronously, discarding the result of execution.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunAsync: <E, A>(effect: Effect.Effect<R, E, A>) => void

  /**
   * Executes the effect asynchronously, eventually passing the exit value to
   * the specified callback.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunAsyncWith: <E, A>(effect: Effect.Effect<R, E, A>, k: (exit: Exit.Exit<E, A>) => void) => void

  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the value of the effect once the effect has been executed, or will be
   * rejected with the first error or exception throw by the effect.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   */
  unsafeRunPromise: <E, A>(effect: Effect.Effect<R, E, A>) => Promise<A>

  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the `Exit` state of the effect once the effect has been executed.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   */
  unsafeRunPromiseExit: <E, A>(effect: Effect.Effect<R, E, A>) => Promise<Exit.Exit<E, A>>
}
```

Added in v1.0.0
