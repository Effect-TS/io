import * as Chunk from "@effect/data/Chunk"
import * as Context from "@effect/data/Context"
import * as Duration from "@effect/data/Duration"
import * as Either from "@effect/data/Either"
import type { LazyArg } from "@effect/data/Function"
import { constFalse, constTrue, constVoid, dual, identity, pipe } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as HashSet from "@effect/data/HashSet"
import * as List from "@effect/data/List"
import * as Option from "@effect/data/Option"
import type { Predicate, Refinement } from "@effect/data/Predicate"
import { tuple } from "@effect/data/ReadonlyArray"
import type * as Cause from "@effect/io/Cause"
import * as Clock from "@effect/io/Clock"
import type * as Effect from "@effect/io/Effect"
import type * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRef from "@effect/io/FiberRef"
import * as FiberRefs from "@effect/io/FiberRefs"
import type * as FiberRefsPatch from "@effect/io/FiberRefs/Patch"
import * as internalCause from "@effect/io/internal/cause"
import * as core from "@effect/io/internal/core"
import * as defaultServices from "@effect/io/internal/defaultServices"
import * as fiberRefsPatch from "@effect/io/internal/fiberRefs/patch"
import * as metricLabel from "@effect/io/internal/metric/label"
import * as SingleShotGen from "@effect/io/internal/singleShotGen"
import * as LogLevel from "@effect/io/Logger/Level"
import * as LogSpan from "@effect/io/Logger/Span"
import type * as Metric from "@effect/io/Metric"
import type * as MetricLabel from "@effect/io/Metric/Label"
import type * as Random from "@effect/io/Random"
import * as Ref from "@effect/io/Ref"
import * as Tracer from "@effect/io/Tracer"

/* @internal */
export const annotateLogs = dual<
  (key: string, value: string) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, key: string, value: string) => Effect.Effect<R, E, A>
>(
  3,
  (effect, key, value) =>
    core.flatMap(
      core.fiberRefGet(core.currentLogAnnotations),
      (annotations) =>
        core.suspend(() =>
          core.fiberRefLocally(
            core.currentLogAnnotations,
            HashMap.set(annotations, key, value)
          )(effect)
        )
    )
)

/* @internal */
export const annotateSpans = dual<
  (key: string, value: string) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, key: string, value: string) => Effect.Effect<R, E, A>
>(
  3,
  (self, key, value) =>
    core.flatMap(
      core.fiberRefGet(core.currentTracerSpanAnnotations),
      (annotations) =>
        core.suspend(() =>
          core.fiberRefLocally(
            core.currentTracerSpanAnnotations,
            HashMap.set(annotations, key, value)
          )(self)
        )
    )
)

/* @internal */
export const asSome = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, Option.Option<A>> =>
  core.map(self, Option.some)

/* @internal */
export const asSomeError = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Option.Option<E>, A> =>
  core.mapError(self, Option.some)

/* @internal */
export const asyncOption = <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => Option.Option<Effect.Effect<R, E, A>>,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> =>
  core.asyncInterruptEither<R, E, A>(
    (cb) => {
      const option = register(cb)
      switch (option._tag) {
        case "None": {
          return Either.left(core.unit)
        }
        case "Some": {
          return Either.right(option.value)
        }
      }
    },
    blockingOn
  )

/* @internal */
export const attempt = <A>(evaluate: LazyArg<A>): Effect.Effect<never, unknown, A> =>
  core.sync(() => {
    try {
      return evaluate()
    } catch (error) {
      throw core.makeEffectError(internalCause.fail(error))
    }
  })

/* @internal */
export const _catch = dual<
  <N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
    tag: N,
    k: K,
    f: (error: Extract<E, { [n in N]: K }>) => Effect.Effect<R1, E1, A1>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<
    R | R1,
    Exclude<E, { [n in N]: K }> | E1,
    A | A1
  >,
  <R, E, A, N extends keyof E, K extends E[N] & string, R1, E1, A1>(
    self: Effect.Effect<R, E, A>,
    tag: N,
    k: K,
    f: (error: Extract<E, { [n in N]: K }>) => Effect.Effect<R1, E1, A1>
  ) => Effect.Effect<R | R1, Exclude<E, { [n in N]: K }> | E1, A | A1>
>(
  // @ts-expect-error - probably a TS bug - infers to never because "DF does not extend (...args: any[]) => any)" but, of course, it does)
  4,
  (self, tag, k, f) =>
    core.catchAll(self, (e) => {
      if (typeof e === "object" && e != null && tag in e && e[tag] === k) {
        return f(e as any)
      }
      return core.fail(e as any)
    })
)

/* @internal */
export const catchAllDefect = dual<
  <R2, E2, A2>(
    f: (defect: unknown) => Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    f: (defect: unknown) => Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E | E2, A | A2>
>(2, (self, f) => catchSomeDefect(self, (defect) => Option.some(f(defect))))

/* @internal */
export const catchSomeCause = dual<
  <E, R2, E2, A2>(
    f: (cause: Cause.Cause<E>) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    f: (cause: Cause.Cause<E>) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => Effect.Effect<R | R2, E | E2, A | A2>
>(2, <R, E, A, R2, E2, A2>(
  self: Effect.Effect<R, E, A>,
  f: (cause: Cause.Cause<E>) => Option.Option<Effect.Effect<R2, E2, A2>>
) =>
  core.matchCauseEffect(
    self,
    (cause): Effect.Effect<R2, E | E2, A2> => {
      const option = f(cause)
      switch (option._tag) {
        case "None": {
          return core.failCause(cause)
        }
        case "Some": {
          return option.value
        }
      }
    },
    core.succeed
  ))

/* @internal */
export const catchSomeDefect = dual<
  <R2, E2, A2>(
    pf: (defect: unknown) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    pf: (defect: unknown) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => Effect.Effect<R | R2, E | E2, A | A2>
>(
  2,
  <R, E, A, R2, E2, A2>(self: Effect.Effect<R, E, A>, pf: (_: unknown) => Option.Option<Effect.Effect<R2, E2, A2>>) =>
    core.catchAll(
      unrefineWith(self, pf, core.fail),
      (s): Effect.Effect<R2, E | E2, A2> => s
    )
)

/* @internal */
export const catchTag = dual<
  <K extends E["_tag"] & string, E extends { _tag: string }, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, Exclude<E, { _tag: K }> | E1, A | A1>,
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string, R1, E1, A1>(
    self: Effect.Effect<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
  ) => Effect.Effect<R | R1, Exclude<E, { _tag: K }> | E1, A | A1>
>(3, (self, k, f) =>
  core.catchAll(self, (e) => {
    if ("_tag" in e && e["_tag"] === k) {
      return f(e as any)
    }
    return core.fail(e as any)
  }))

/** @internal */
export const catchTags: {
  <
    E extends { _tag: string },
    Cases extends {
      [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => Effect.Effect<any, any, any>
    }
  >(
    cases: Cases
  ): <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<infer R, any, any>) ? R : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, infer E, any>) ? E : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, any, infer A>) ? A : never
    }[keyof Cases]
  >
  <
    R,
    E extends { _tag: string },
    A,
    Cases extends {
      [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => Effect.Effect<any, any, any>
    }
  >(
    self: Effect.Effect<R, E, A>,
    cases: Cases
  ): Effect.Effect<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<infer R, any, any>) ? R : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, infer E, any>) ? E : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, any, infer A>) ? A : never
    }[keyof Cases]
  >
} = dual(2, (self, cases) =>
  core.catchAll(self, (e: any) => {
    const keys = Object.keys(cases)
    if ("_tag" in e && keys.includes(e["_tag"])) {
      return cases[e["_tag"]](e as any)
    }
    return core.fail(e as any)
  }))

/* @internal */
export const cause = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Cause.Cause<E>> =>
  core.matchCause(self, identity, () => internalCause.empty)

/* @internal */
export const clockWith: <R, E, A>(f: (clock: Clock.Clock) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  Clock.clockWith

/* @internal */
export const clock: Effect.Effect<never, never, Clock.Clock> = clockWith(core.succeed)

/* @internal */
export const allDiscard: Effect.All.SignatureDiscard = function() {
  if (arguments.length === 1) {
    if (core.isEffect(arguments[0])) {
      return core.asUnit(arguments[0])
    } else if (Array.isArray(arguments[0]) || Symbol.iterator in arguments[0]) {
      return core.forEachDiscard(arguments[0], identity as any)
    } else {
      return core.forEachDiscard(
        Object.entries(arguments[0] as Readonly<{ [K: string]: Effect.Effect<any, any, any> }>),
        ([_, e]) => core.asUnit(e)
      ) as any
    }
  }
  return core.forEachDiscard(arguments, identity as any)
}

/* @internal */
export const currentSpan: Effect.Effect<never, never, Option.Option<Tracer.Span>> = core.map(
  core.fiberRefGet(core.currentTracerSpan),
  List.head
)

/* @internal */
export const delay = dual<
  (duration: Duration.Duration) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, duration: Duration.Duration) => Effect.Effect<R, E, A>
>(2, (self, duration) => core.zipRight(Clock.sleep(duration), self))

/* @internal */
export const descriptorWith = <R, E, A>(
  f: (descriptor: Fiber.Fiber.Descriptor) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> =>
  core.withFiberRuntime((state, status) =>
    f({
      id: state.id(),
      status,
      interruptors: internalCause.interruptors(state.getFiberRef(core.currentInterruptedCause))
    })
  ) as Effect.Effect<R, E, A>

/* @internal */
export const allowInterrupt: Effect.Effect<never, never, void> = descriptorWith(
  (descriptor) =>
    HashSet.size(descriptor.interruptors) > 0 ?
      core.interrupt :
      core.unit
)

/* @internal */
export const descriptor: Effect.Effect<never, never, Fiber.Fiber.Descriptor> = descriptorWith(core.succeed)

/* @internal */
export const diffFiberRefs = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, [FiberRefsPatch.FiberRefsPatch, A]> => summarized(self, getFiberRefs, fiberRefsPatch.diff)

/* @internal */
export const Do: Effect.Effect<never, never, {}> = core.succeed({})

/* @internal */
export const bind = dual<
  <N extends string, K, R2, E2, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect.Effect<R2, E2, A>
  ) => <R, E>(self: Effect.Effect<R, E, K>) => Effect.Effect<
    R | R2,
    E | E2,
    Effect.MergeRecord<K, { [k in N]: A }>
  >,
  <R, E, N extends string, K, R2, E2, A>(
    self: Effect.Effect<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect.Effect<R2, E2, A>
  ) => Effect.Effect<
    R | R2,
    E | E2,
    Effect.MergeRecord<K, { [k in N]: A }>
  >
>(3, <R, E, N extends string, K, R2, E2, A>(
  self: Effect.Effect<R, E, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect.Effect<R2, E2, A>
) =>
  core.flatMap(self, (k) =>
    core.map(
      f(k),
      (a): Effect.MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: a } as any)
    )))

/* @internal */
export const bindValue = dual<
  <N extends string, K, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ) => <R, E>(self: Effect.Effect<R, E, K>) => Effect.Effect<
    R,
    E,
    Effect.MergeRecord<K, { [k in N]: A }>
  >,
  <R, E, K, N extends string, A>(
    self: Effect.Effect<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ) => Effect.Effect<
    R,
    E,
    Effect.MergeRecord<K, { [k in N]: A }>
  >
>(3, <R, E, K, N extends string, A>(self: Effect.Effect<R, E, K>, tag: Exclude<N, keyof K>, f: (_: K) => A) =>
  core.map(
    self,
    (k): Effect.MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: f(k) } as any)
  ))

/* @internal */
export const dropUntil = dual<
  <A, R, E>(
    predicate: (a: A) => Effect.Effect<R, E, boolean>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Array<A>>,
  <A, R, E>(
    elements: Iterable<A>,
    predicate: (a: A) => Effect.Effect<R, E, boolean>
  ) => Effect.Effect<R, E, Array<A>>
>(2, <A, R, E>(
  elements: Iterable<A>,
  predicate: (a: A) => Effect.Effect<R, E, boolean>
) =>
  core.suspend(() => {
    const iterator = elements[Symbol.iterator]()
    const builder: Array<A> = []
    let next: IteratorResult<A, any>
    let dropping: Effect.Effect<R, E, boolean> = core.succeed(false)
    while ((next = iterator.next()) && !next.done) {
      const a = next.value
      dropping = core.flatMap(dropping, (bool) => {
        if (bool) {
          builder.push(a)
          return core.succeed(true)
        }
        return predicate(a)
      })
    }
    return core.map(dropping, () => builder)
  }))

/* @internal */
export const dropWhile = dual<
  <R, E, A>(
    f: (a: A) => Effect.Effect<R, E, boolean>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Array<A>>,
  <R, E, A>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, E, boolean>) => Effect.Effect<R, E, Array<A>>
>(2, <R, E, A>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, E, boolean>) =>
  core.suspend(() => {
    const iterator = elements[Symbol.iterator]()
    const builder: Array<A> = []
    let next
    let dropping: Effect.Effect<R, E, boolean> = core.succeed(true)
    while ((next = iterator.next()) && !next.done) {
      const a = next.value
      dropping = core.flatMap(dropping, (d) =>
        core.map(d ? f(a) : core.succeed(false), (b) => {
          if (!b) {
            builder.push(a)
          }
          return b
        }))
    }
    return core.map(dropping, () => builder)
  }))

/* @internal */
export const contextWith = <R, A>(f: (context: Context.Context<R>) => A): Effect.Effect<R, never, A> =>
  core.map(core.context<R>(), f)

/* @internal */
export const exists = dual<
  <R, E, A>(f: (a: A) => Effect.Effect<R, E, boolean>) => (elements: Iterable<A>) => Effect.Effect<R, E, boolean>,
  <R, E, A>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, E, boolean>) => Effect.Effect<R, E, boolean>
>(2, (elements, f) => core.suspend(() => existsLoop(elements[Symbol.iterator](), f)))

const existsLoop = <R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect.Effect<R, E, boolean>
): Effect.Effect<R, E, boolean> => {
  const next = iterator.next()
  if (next.done) {
    return core.succeed(false)
  }
  return pipe(core.flatMap(
    f(next.value),
    (b) => b ? core.succeed(b) : existsLoop(iterator, f)
  ))
}

/* @internal */
export const eventually = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A> =>
  core.orElse(self, () => core.flatMap(core.yieldNow, () => eventually(self)))

/* @internal */
export const filter = dual<
  <A, R, E>(
    f: (a: A) => Effect.Effect<R, E, boolean>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Array<A>>,
  <A, R, E>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, E, boolean>) => Effect.Effect<R, E, Array<A>>
>(
  2,
  <A, R, E>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, E, boolean>) =>
    core.suspend(() =>
      Array.from(elements).reduceRight(
        (effect, a) =>
          core.zipWith(
            effect,
            core.suspend(() => f(a)),
            (list, b) => b ? [a, ...list] : list
          ),
        core.sync(() => new Array<A>()) as Effect.Effect<R, E, Array<A>>
      )
    )
)

/* @internal */
export const filterNot = dual<
  <A, R, E>(
    f: (a: A) => Effect.Effect<R, E, boolean>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Array<A>>,
  <A, R, E>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, E, boolean>) => Effect.Effect<R, E, Array<A>>
>(2, (elements, f) => filter(elements, (a) => core.map(f(a), (b) => !b)))

/* @internal */
export const filterOrDie = dual<
  {
    <A, B extends A>(
      f: Refinement<A, B>,
      defect: LazyArg<unknown>
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>
    <A>(
      f: Predicate<A>,
      defect: LazyArg<unknown>
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  },
  {
    <R, E, A, B extends A>(
      self: Effect.Effect<R, E, A>,
      f: Refinement<A, B>,
      defect: LazyArg<unknown>
    ): Effect.Effect<R, E, B>
    <R, E, A>(
      self: Effect.Effect<R, E, A>,
      f: Predicate<A>,
      defect: LazyArg<unknown>
    ): Effect.Effect<R, E, A>
  }
>(3, <R, E, A>(
  self: Effect.Effect<R, E, A>,
  f: Predicate<A>,
  defect: LazyArg<unknown>
): Effect.Effect<R, E, A> => filterOrElse(self, f, () => core.dieSync(defect)))

/* @internal */
export const filterOrDieMessage = dual<
  {
    <A, B extends A>(
      f: Refinement<A, B>,
      message: string
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>
    <A>(
      f: Predicate<A>,
      message: string
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  },
  {
    <R, E, A, B extends A>(
      self: Effect.Effect<R, E, A>,
      f: Refinement<A, B>,
      message: string
    ): Effect.Effect<R, E, B>
    <R, E, A>(
      self: Effect.Effect<R, E, A>,
      f: Predicate<A>,
      message: string
    ): Effect.Effect<R, E, A>
  }
>(3, <R, E, A>(
  self: Effect.Effect<R, E, A>,
  f: Predicate<A>,
  message: string
): Effect.Effect<R, E, A> => filterOrElse(self, f, () => core.dieMessage(message)))

/* @internal */
export const filterOrElse = dual<
  {
    <A, B extends A, R2, E2, C>(
      f: Refinement<A, B>,
      orElse: LazyArg<Effect.Effect<R2, E2, C>>
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, B | C>
    <A, R2, E2, B>(
      f: Predicate<A>,
      orElse: LazyArg<Effect.Effect<R2, E2, B>>
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | B>
  },
  {
    <R, E, A, B extends A, R2, E2, C>(
      self: Effect.Effect<R, E, A>,
      f: Refinement<A, B>,
      orElse: LazyArg<Effect.Effect<R2, E2, C>>
    ): Effect.Effect<R | R2, E | E2, B | C>
    <R, E, A, R2, E2, B>(
      self: Effect.Effect<R, E, A>,
      f: Predicate<A>,
      orElse: LazyArg<Effect.Effect<R2, E2, B>>
    ): Effect.Effect<R | R2, E | E2, A | B>
  }
>(3, <R, E, A, R2, E2, B>(
  self: Effect.Effect<R, E, A>,
  f: Predicate<A>,
  orElse: LazyArg<Effect.Effect<R2, E2, B>>
): Effect.Effect<R | R2, E | E2, A | B> => filterOrElseWith(self, f, orElse))

/* @internal */
export const filterOrElseWith = dual<
  {
    <A, B extends A, R2, E2, C>(
      f: Refinement<A, B>,
      orElse: (a: A) => Effect.Effect<R2, E2, C>
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, B | C>
    <A, R2, E2, B>(
      f: Predicate<A>,
      orElse: (a: A) => Effect.Effect<R2, E2, B>
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | B>
  },
  {
    <R, E, A, B extends A, R2, E2, C>(
      self: Effect.Effect<R, E, A>,
      f: Refinement<A, B>,
      orElse: (a: A) => Effect.Effect<R2, E2, C>
    ): Effect.Effect<R | R2, E | E2, B | C>
    <R, E, A, R2, E2, B>(
      self: Effect.Effect<R, E, A>,
      f: Predicate<A>,
      orElse: (a: A) => Effect.Effect<R2, E2, B>
    ): Effect.Effect<R | R2, E | E2, A | B>
  }
>(3, <R, E, A, R2, E2, B>(
  self: Effect.Effect<R, E, A>,
  f: Predicate<A>,
  orElse: (a: A) => Effect.Effect<R2, E2, B>
): Effect.Effect<R | R2, E | E2, A | B> => core.flatMap(self, (a) => f(a) ? core.succeed<A | B>(a) : orElse(a)))

/* @internal */
export const filterOrFail = dual<
  {
    <A, B extends A, E2>(
      f: Refinement<A, B>,
      error: LazyArg<E2>
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E2, B>
    <A, E2>(
      f: Predicate<A>,
      error: LazyArg<E2>
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E2, A>
  },
  {
    <R, E, A, B extends A, E2>(
      self: Effect.Effect<R, E, A>,
      f: Refinement<A, B>,
      error: LazyArg<E2>
    ): Effect.Effect<R, E | E2, B>
    <R, E, A, E2>(
      self: Effect.Effect<R, E, A>,
      f: Predicate<A>,
      error: LazyArg<E2>
    ): Effect.Effect<R, E | E2, A>
  }
>(3, <R, E, A, E2>(
  self: Effect.Effect<R, E, A>,
  f: Predicate<A>,
  error: LazyArg<E2>
): Effect.Effect<R, E | E2, A> => filterOrElse(self, f, () => core.failSync(error)))

/* @internal */
export const filterOrFailWith = dual<
  {
    <A, B extends A, E2>(
      f: Refinement<A, B>,
      error: (a: A) => E2
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E2, B>
    <A, E2>(
      f: Predicate<A>,
      error: (a: A) => E2
    ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E2, A>
  },
  {
    <R, E, A, B extends A, E2>(
      self: Effect.Effect<R, E, A>,
      f: Refinement<A, B>,
      error: (a: A) => E2
    ): Effect.Effect<R, E | E2, B>
    <R, E, A, E2>(
      self: Effect.Effect<R, E, A>,
      f: Predicate<A>,
      error: (a: A) => E2
    ): Effect.Effect<R, E | E2, A>
  }
>(3, <R, E, A, E2>(
  self: Effect.Effect<R, E, A>,
  f: Predicate<A>,
  error: (a: A) => E2
): Effect.Effect<R, E | E2, A> => filterOrElseWith(self, f, (a) => core.failSync(() => error(a))))

/* @internal */
export const findFirst = dual<
  <A, R, E>(
    f: (a: A) => Effect.Effect<R, E, boolean>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Option.Option<A>>,
  <A, R, E>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, E, boolean>) => Effect.Effect<R, E, Option.Option<A>>
>(2, (elements, f) =>
  core.suspend(() => {
    const array = Array.from(elements)
    const iterator = array[Symbol.iterator]()
    const next = iterator.next()
    if (!next.done) {
      return findLoop(iterator, f, next.value)
    }
    return core.succeed(Option.none())
  }))

const findLoop = <A, R, E>(
  iterator: Iterator<A>,
  f: (a: A) => Effect.Effect<R, E, boolean>,
  value: A
): Effect.Effect<R, E, Option.Option<A>> =>
  core.flatMap(f(value), (result) => {
    if (result) {
      return core.succeed(Option.some(value))
    }
    const next = iterator.next()
    if (!next.done) {
      return findLoop(iterator, f, next.value)
    }
    return core.succeed(Option.none())
  })

/* @internal */
export const firstSuccessOf = <R, E, A>(effects: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A> =>
  core.suspend(() => {
    const list = Chunk.fromIterable(effects)
    if (!Chunk.isNonEmpty(list)) {
      return core.dieSync(() => internalCause.IllegalArgumentException(`Received an empty collection of effects`))
    }
    return pipe(
      Chunk.tailNonEmpty(list),
      Chunk.reduce(Chunk.headNonEmpty(list), (left, right) => core.orElse(left, () => right))
    )
  })

/* @internal */
export const flipWith = dual<
  <R, A, E, R2, A2, E2>(
    f: (effect: Effect.Effect<R, A, E>) => Effect.Effect<R2, A2, E2>
  ) => (self: Effect.Effect<R, E, A>) => Effect.Effect<R2, E2, A2>,
  <R, A, E, R2, A2, E2>(
    self: Effect.Effect<R, E, A>,
    f: (effect: Effect.Effect<R, A, E>) => Effect.Effect<R2, A2, E2>
  ) => Effect.Effect<R2, E2, A2>
>(2, (self, f) => core.flip(f(core.flip(self))))

/* @internal */
export const match = dual<
  <E, A, A2, A3>(
    onFailure: (error: E) => A2,
    onSuccess: (value: A) => A3
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, A2 | A3>,
  <R, E, A, A2, A3>(
    self: Effect.Effect<R, E, A>,
    onFailure: (error: E) => A2,
    onSuccess: (value: A) => A3
  ) => Effect.Effect<R, never, A2 | A3>
>(3, (self, onFailure, onSuccess) =>
  core.matchEffect(
    self,
    (e) => core.succeed(onFailure(e)),
    (a) => core.succeed(onSuccess(a))
  ))

/* @internal */
export const every = dual<
  <R, E, A>(f: (a: A) => Effect.Effect<R, E, boolean>) => (elements: Iterable<A>) => Effect.Effect<R, E, boolean>,
  <R, E, A>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, E, boolean>) => Effect.Effect<R, E, boolean>
>(2, (elements, f) => core.suspend(() => forAllLoop(elements[Symbol.iterator](), f)))

const forAllLoop = <R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect.Effect<R, E, boolean>
): Effect.Effect<R, E, boolean> => {
  const next = iterator.next()
  return next.done
    ? core.succeed(true)
    : core.flatMap(
      f(next.value),
      (b) => b ? forAllLoop(iterator, f) : core.succeed(b)
    )
}

/* @internal */
export const forEachWithIndex = dual<
  <A, R, E, B>(
    f: (a: A, i: number) => Effect.Effect<R, E, B>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Array<B>>,
  <A, R, E, B>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect.Effect<R, E, B>
  ) => Effect.Effect<R, E, Array<B>>
>(2, <A, R, E, B>(elements: Iterable<A>, f: (a: A, i: number) => Effect.Effect<R, E, B>) =>
  core.suspend(() => {
    let index = 0
    const acc: Array<B> = []
    return core.map(
      core.forEachDiscard(elements, (a) =>
        core.map(f(a, index), (b) => {
          acc.push(b)
          index++
        })),
      () => acc
    )
  }))

/* @internal */
export const forever = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, never> => {
  const loop: Effect.Effect<R, E, never> = core.flatMap(core.flatMap(self, () => core.yieldNow), () => loop)
  return loop
}

/** @internal */
class EffectGen {
  constructor(readonly value: Effect.Effect<any, any, any>) {
  }
  [Symbol.iterator]() {
    return new SingleShotGen.SingleShotGen(this)
  }
}

const adapter = function() {
  let x = arguments[0]
  for (let i = 1; i < arguments.length; i++) {
    x = arguments[i](x)
  }
  return new EffectGen(x) as any
}

/**
 * Inspired by https://github.com/tusharmath/qio/pull/22 (revised)
  @internal */
export const gen: typeof Effect.gen = (f) =>
  core.suspend(() => {
    const iterator = f(adapter)
    const state = iterator.next()
    const run = (
      state: IteratorYieldResult<any> | IteratorReturnResult<any>
    ): Effect.Effect<any, any, any> => (state.done ?
      core.succeed(state.value) :
      pipe(
        state.value.value as unknown as Effect.Effect<any, any, any>,
        core.flatMap((val: any) => run(iterator.next(val)))
      ))
    return run(state)
  })

/* @internal */
export const getFiberRefs: Effect.Effect<never, never, FiberRefs.FiberRefs> = core.withFiberRuntime<
  never,
  never,
  FiberRefs.FiberRefs
>((state) => core.succeed(state.unsafeGetFiberRefs()))

/* @internal */
export const head = <R, E, A>(
  self: Effect.Effect<R, E, Iterable<A>>
): Effect.Effect<R, Option.Option<E>, A> =>
  core.matchEffect(
    self,
    (e) => core.fail(Option.some(e)),
    (as) => {
      const iterator = as[Symbol.iterator]()
      const next = iterator.next()
      if (next.done) {
        return core.fail(Option.none())
      }
      return core.succeed(next.value)
    }
  )

/* @internal */
export const ignore = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, void> =>
  match(self, constVoid, constVoid)

/* @internal */
export const ignoreLogged = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, void> =>
  core.matchCauseEffect(
    self,
    (cause) =>
      logCause(cause, {
        message: "An error was silently ignored because it is not anticipated to be useful",
        level: "Debug"
      }),
    () => core.unit
  )

/* @internal */
export const inheritFiberRefs = (childFiberRefs: FiberRefs.FiberRefs) =>
  updateFiberRefs((parentFiberId, parentFiberRefs) => FiberRefs.joinAs(parentFiberRefs, parentFiberId, childFiberRefs))

/* @internal */
export const isFailure = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, boolean> =>
  match(self, constTrue, constFalse)

/* @internal */
export const isSuccess = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, boolean> =>
  match(self, constFalse, constTrue)

/* @internal */
export const iterate = <Z, R, E>(
  initial: Z,
  cont: (z: Z) => boolean,
  body: (z: Z) => Effect.Effect<R, E, Z>
): Effect.Effect<R, E, Z> =>
  core.suspend<R, E, Z>(() => {
    if (cont(initial)) {
      return core.flatMap(body(initial), (z2) => iterate(z2, cont, body))
    }
    return core.succeed(initial)
  })

/* @internal */
export const log = dual<
  (options?: {
    readonly cause?: Cause.Cause<unknown>
    readonly level?: LogLevel.Literal
  }) => (message: string) => Effect.Effect<never, never, void>,
  (message: string, options?: {
    readonly cause?: Cause.Cause<unknown>
    readonly level?: LogLevel.Literal
  }) => Effect.Effect<never, never, void>
>(
  (args) => typeof args[0] === "string",
  (message: string, options?: {
    readonly cause?: Cause.Cause<unknown>
    readonly level?: LogLevel.Literal
  }): Effect.Effect<never, never, void> =>
    core.withFiberRuntime<never, never, void>((fiberState) => {
      fiberState.log(
        message,
        options?.cause ?? internalCause.empty,
        options?.level ? Option.some(LogLevel.fromLiteral(options.level)) : Option.none()
      )
      return core.unit
    })
)

/* @internal */
export const logCause = dual<
  (options?: {
    readonly message?: string
    readonly level?: LogLevel.Literal
  }) => (cause: Cause.Cause<unknown>) => Effect.Effect<never, never, void>,
  (cause: Cause.Cause<unknown>, options?: {
    readonly message?: string
    readonly level?: LogLevel.Literal
  }) => Effect.Effect<never, never, void>
>(
  (args) => internalCause.isCause(args[0]),
  (cause: Cause.Cause<unknown>, options?: {
    readonly message?: string
    readonly level?: LogLevel.Literal
  }): Effect.Effect<never, never, void> =>
    core.withFiberRuntime<never, never, void>((fiberState) => {
      fiberState.log(
        options?.message ?? "",
        cause,
        options?.level ? Option.some(LogLevel.fromLiteral(options.level)) : Option.none()
      )
      return core.unit
    })
)

/* @internal */
export const withLog = dual<
  (message: string, options?: {
    readonly cause?: Cause.Cause<unknown>
    readonly level?: LogLevel.Literal
  }) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, message: string, options: {
    readonly cause?: Cause.Cause<unknown>
    readonly level?: LogLevel.Literal
  }) => Effect.Effect<R, E, A>
>(
  (args) => core.isEffect(args[0]),
  <R, E, A>(self: Effect.Effect<R, E, A>, message: string, options?: {
    readonly cause?: Cause.Cause<unknown>
    readonly level?: LogLevel.Literal
  }): Effect.Effect<R, E, A> => core.zipLeft(self, log(message, options))
)

/* @internal */
export const withLogCause = dual<
  (options?: {
    readonly message?: string
    readonly level?: LogLevel.Literal
  }) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, options?: {
    readonly message?: string
    readonly level?: LogLevel.Literal
  }) => Effect.Effect<R, E, A>
>(
  (args) => core.isEffect(args[0]),
  <R, E, A>(self: Effect.Effect<R, E, A>, options?: {
    readonly message?: string
    readonly level?: LogLevel.Literal
  }): Effect.Effect<R, E, A> => tapErrorCause(self, logCause(options))
)

/* @internal */
export const logSpan = dual<
  (label: string) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, label: string) => Effect.Effect<R, E, A>
>(2, (effect, label) =>
  core.flatMap(
    core.fiberRefGet(core.currentLogSpan),
    (stack) =>
      core.flatMap(Clock.currentTimeMillis, (now) =>
        core.suspend(() =>
          core.fiberRefLocally(
            core.currentLogSpan,
            List.prepend(stack, LogSpan.make(label, now))
          )(effect)
        ))
  ))

/* @internal */
export const logAnnotations: Effect.Effect<never, never, HashMap.HashMap<string, string>> = core.fiberRefGet(
  core.currentLogAnnotations
)

/* @internal */
export const loop = <Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, Array<A>> => core.map(loopInternal(initial, cont, inc, body), (x) => Array.from(x))

const loopInternal = <Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, List.List<A>> => {
  return core.suspend(() => {
    return cont(initial)
      ? core.flatMap(body(initial), (a) =>
        core.map(
          loopInternal(inc(initial), cont, inc, body),
          List.prepend(a)
        ))
      : core.sync(() => List.empty())
  })
}

/* @internal */
export const loopDiscard = <Z, R, E, X>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect.Effect<R, E, X>
): Effect.Effect<R, E, void> =>
  core.suspend(() =>
    cont(initial)
      ? core.flatMap(
        body(initial),
        () => loopDiscard(inc(initial), cont, inc, body)
      )
      : core.unit
  )

/* @internal */
export const mapAccum = dual<
  <A, B, R, E, Z>(
    zero: Z,
    f: (z: Z, a: A) => Effect.Effect<R, E, readonly [Z, B]>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, [Z, Array<B>]>,
  <A, B, R, E, Z>(
    elements: Iterable<A>,
    zero: Z,
    f: (z: Z, a: A) => Effect.Effect<R, E, readonly [Z, B]>
  ) => Effect.Effect<R, E, [Z, Array<B>]>
>(3, <A, B, R, E, Z>(
  elements: Iterable<A>,
  zero: Z,
  f: (z: Z, a: A) => Effect.Effect<R, E, readonly [Z, B]>
) =>
  core.suspend(() => {
    const iterator = elements[Symbol.iterator]()
    const builder: Array<B> = []
    let result: Effect.Effect<R, E, Z> = core.succeed(zero)
    let next: IteratorResult<A, any>
    while (!(next = iterator.next()).done) {
      result = core.flatMap(result, (state) =>
        core.map(f(state, next.value), ([z, b]) => {
          builder.push(b)
          return z
        }))
    }
    return core.map(result, (z) => tuple(z, builder))
  }))

/* @internal */
export const mapErrorCause = dual<
  <E, E2>(
    f: (cause: Cause.Cause<E>) => Cause.Cause<E2>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E2, A>,
  <R, E, A, E2>(self: Effect.Effect<R, E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => Effect.Effect<R, E2, A>
>(2, (self, f) => core.matchCauseEffect(self, (c) => core.failCauseSync(() => f(c)), core.succeed))

/* @internal */
export const mapTryCatch = dual<
  <A, B, E1>(
    f: (a: A) => B,
    onThrow: (u: unknown) => E1
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E1, B>,
  <R, E, A, B, E1>(
    self: Effect.Effect<R, E, A>,
    f: (a: A) => B,
    onThrow: (u: unknown) => E1
  ) => Effect.Effect<R, E | E1, B>
>(3, (self, f, onThrow) => core.flatMap(self, (a) => attemptCatch(() => f(a), onThrow)))

/* @internal */
export const memoize = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<never, never, Effect.Effect<R, E, A>> =>
  pipe(
    core.deferredMake<E, readonly [FiberRefsPatch.FiberRefsPatch, A]>(),
    core.flatMap((deferred) =>
      pipe(
        diffFiberRefs(self),
        core.intoDeferred(deferred),
        once,
        core.map((complete) =>
          core.zipRight(
            complete,
            pipe(
              core.deferredAwait(deferred),
              core.flatMap(([patch, a]) => core.as(patchFiberRefs(patch), a))
            )
          )
        )
      )
    )
  )

/* @internal */
export const merge = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, E | A> =>
  core.matchEffect(self, (e) => core.succeed(e), core.succeed)

/* @internal */
export const mergeAll = dual<
  <Z, A>(zero: Z, f: (z: Z, a: A) => Z) => <R, E>(elements: Iterable<Effect.Effect<R, E, A>>) => Effect.Effect<R, E, Z>,
  <R, E, Z, A>(elements: Iterable<Effect.Effect<R, E, A>>, zero: Z, f: (z: Z, a: A) => Z) => Effect.Effect<R, E, Z>
>(
  3,
  <R, E, Z, A>(elements: Iterable<Effect.Effect<R, E, A>>, zero: Z, f: (z: Z, a: A) => Z) =>
    Array.from(elements).reduce(
      (acc, a) => core.zipWith(acc, a, f),
      core.succeed(zero) as Effect.Effect<R, E, Z>
    )
)

/* @internal */
export const negate = <R, E>(self: Effect.Effect<R, E, boolean>): Effect.Effect<R, E, boolean> =>
  core.map(self, (b) => !b)

/* @internal */
export const none = <R, E, A>(
  self: Effect.Effect<R, E, Option.Option<A>>
): Effect.Effect<R, Option.Option<E>, void> =>
  core.matchEffect(
    self,
    (e) => core.fail(Option.some(e)),
    (option) => {
      switch (option._tag) {
        case "None": {
          return core.unit
        }
        case "Some": {
          return core.fail(Option.none())
        }
      }
    }
  )

/* @internal */
export const once = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<never, never, Effect.Effect<R, E, void>> =>
  core.map(
    Ref.make(true),
    (ref) => core.asUnit(core.whenEffect(self, Ref.getAndSet(ref, false)))
  )

/* @internal */
export const option = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Option.Option<A>> =>
  core.matchEffect(
    self,
    () => core.succeed(Option.none()),
    (a) => core.succeed(Option.some(a))
  )

/* @internal */
export const orElseFail = dual<
  <E2>(evaluate: LazyArg<E2>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E2, A>,
  <R, E, A, E2>(self: Effect.Effect<R, E, A>, evaluate: LazyArg<E2>) => Effect.Effect<R, E2, A>
>(2, (self, evaluate) => core.orElse(self, () => core.failSync(evaluate)))

/* @internal */
export const orElseSucceed = dual<
  <A2>(evaluate: LazyArg<A2>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A | A2>,
  <R, E, A, A2>(self: Effect.Effect<R, E, A>, evaluate: LazyArg<A2>) => Effect.Effect<R, E, A | A2>
>(2, (self, evaluate) => core.orElse(self, () => core.sync(evaluate)))

/* @internal */
export const parallelErrors = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Array<E>, A> =>
  core.matchCauseEffect(self, (cause) => {
    const errors = Array.from(internalCause.failures(cause))
    return errors.length === 0
      ? core.failCause(cause as Cause.Cause<never>)
      : core.fail(errors)
  }, core.succeed)

/* @internal */
export const partition = dual<
  <R, E, A, B>(
    f: (a: A) => Effect.Effect<R, E, B>
  ) => (elements: Iterable<A>) => Effect.Effect<R, never, [Array<E>, Array<B>]>,
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A) => Effect.Effect<R, E, B>
  ) => Effect.Effect<R, never, [Array<E>, Array<B>]>
>(2, (elements, f) =>
  pipe(
    core.forEach(elements, (a) => core.either(f(a))),
    core.map((chunk) => core.partitionMap(chunk, identity))
  ))

/* @internal */
export const patchFiberRefs = (patch: FiberRefsPatch.FiberRefsPatch): Effect.Effect<never, never, void> =>
  updateFiberRefs((fiberId, fiberRefs) => pipe(patch, fiberRefsPatch.patch(fiberId, fiberRefs)))

/* @internal */
export const promise = <A>(evaluate: LazyArg<Promise<A>>): Effect.Effect<never, never, A> =>
  core.async<never, never, A>((resolve) => {
    evaluate()
      .then((a) => resolve(core.exitSucceed(a)))
      .catch((e) => resolve(core.exitDie(e)))
  })

/* @internal */
export const promiseInterrupt = <A>(evaluate: (signal: AbortSignal) => Promise<A>): Effect.Effect<never, never, A> =>
  core.asyncInterruptEither<never, never, A>((resolve) => {
    const controller = new AbortController()
    evaluate(controller.signal)
      .then((a) => resolve(core.exitSucceed(a)))
      .catch((e) => resolve(core.exitDie(e)))
    return Either.left(core.sync(() => controller.abort()))
  })

/* @internal */
export const provideService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    service: Context.Tag.Service<T>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<Exclude<R, Context.Tag.Identifier<T>>, E, A>,
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Effect.Effect<R, E, A>,
    tag: T,
    service: Context.Tag.Service<T>
  ) => Effect.Effect<Exclude<R, Context.Tag.Identifier<T>>, E, A>
>(3, (self, tag, service) => provideServiceEffect(self, tag, core.succeed(service)))

/* @internal */
export const provideServiceEffect = dual<
  <T extends Context.Tag<any, any>, R1, E1>(
    tag: T,
    effect: Effect.Effect<R1, E1, Context.Tag.Service<T>>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R1 | Exclude<R, Context.Tag.Identifier<T>>, E | E1, A>,
  <R, E, A, T extends Context.Tag<any, any>, R1, E1>(
    self: Effect.Effect<R, E, A>,
    tag: T,
    effect: Effect.Effect<R1, E1, Context.Tag.Service<T>>
  ) => Effect.Effect<R1 | Exclude<R, Context.Tag.Identifier<T>>, E | E1, A>
>(3, <R, E, A, T extends Context.Tag<any, any>, R1, E1>(
  self: Effect.Effect<R, E, A>,
  tag: T,
  effect: Effect.Effect<R1, E1, Context.Tag.Service<T>>
) =>
  core.contextWithEffect((env: Context.Context<R1 | Exclude<R, Context.Tag.Identifier<T>>>) =>
    core.flatMap(
      effect,
      (service) => core.provideContext(self, pipe(env, Context.add(tag, service)) as Context.Context<R | R1>)
    )
  ))

/* @internal */
export const random: Effect.Effect<never, never, Random.Random> = defaultServices.randomWith(core.succeed)

/* @internal */
export const reduce = dual<
  <Z, A, R, E>(zero: Z, f: (z: Z, a: A) => Effect.Effect<R, E, Z>) => (elements: Iterable<A>) => Effect.Effect<R, E, Z>,
  <Z, A, R, E>(elements: Iterable<A>, zero: Z, f: (z: Z, a: A) => Effect.Effect<R, E, Z>) => Effect.Effect<R, E, Z>
>(
  3,
  <Z, A, R, E>(elements: Iterable<A>, zero: Z, f: (z: Z, a: A) => Effect.Effect<R, E, Z>) =>
    Array.from(elements).reduce(
      (acc, el) => core.flatMap(acc, (a) => f(a, el)),
      core.succeed(zero) as Effect.Effect<R, E, Z>
    )
)

/* @internal */
export const reduceAll = dual<
  <R, E, A>(
    zero: Effect.Effect<R, E, A>,
    f: (acc: A, a: A) => A
  ) => (elements: Iterable<Effect.Effect<R, E, A>>) => Effect.Effect<R, E, A>,
  <R, E, A>(
    elements: Iterable<Effect.Effect<R, E, A>>,
    zero: Effect.Effect<R, E, A>,
    f: (acc: A, a: A) => A
  ) => Effect.Effect<R, E, A>
>(3, (elements, zero, f) => Array.from(elements).reduce((acc, a) => core.zipWith(acc, a, f), zero))

/* @internal */
export const reduceRight = dual<
  <A, Z, R, E>(zero: Z, f: (a: A, z: Z) => Effect.Effect<R, E, Z>) => (elements: Iterable<A>) => Effect.Effect<R, E, Z>,
  <A, Z, R, E>(elements: Iterable<A>, zero: Z, f: (a: A, z: Z) => Effect.Effect<R, E, Z>) => Effect.Effect<R, E, Z>
>(
  3,
  <A, Z, R, E>(elements: Iterable<A>, zero: Z, f: (a: A, z: Z) => Effect.Effect<R, E, Z>) =>
    Array.from(elements).reduceRight(
      (acc, el) => core.flatMap(acc, (a) => f(el, a)),
      core.succeed(zero) as Effect.Effect<R, E, Z>
    )
)

/* @internal */
export const reduceWhile = dual<
  <A, R, E, Z>(
    zero: Z,
    predicate: Predicate<Z>,
    f: (s: Z, a: A) => Effect.Effect<R, E, Z>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Z>,
  <A, R, E, Z>(
    elements: Iterable<A>,
    zero: Z,
    predicate: Predicate<Z>,
    f: (s: Z, a: A) => Effect.Effect<R, E, Z>
  ) => Effect.Effect<R, E, Z>
>(4, <A, R, E, Z>(
  elements: Iterable<A>,
  zero: Z,
  predicate: Predicate<Z>,
  f: (s: Z, a: A) => Effect.Effect<R, E, Z>
) =>
  core.flatMap(
    core.sync(() => elements[Symbol.iterator]()),
    (iterator) => reduceWhileLoop(iterator, zero, predicate, f)
  ))

const reduceWhileLoop = <A, R, E, Z>(
  iterator: Iterator<A>,
  state: Z,
  predicate: Predicate<Z>,
  f: (s: Z, a: A) => Effect.Effect<R, E, Z>
): Effect.Effect<R, E, Z> => {
  const next = iterator.next()
  if (!next.done && predicate(state)) {
    return core.flatMap(
      f(state, next.value),
      (nextState) => reduceWhileLoop(iterator, nextState, predicate, f)
    )
  }
  return core.succeed(state)
}

/* @internal */
export const refineOrDie = dual<
  <E, E1>(pf: (e: E) => Option.Option<E1>) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E1, A>,
  <R, E, A, E1>(self: Effect.Effect<R, E, A>, pf: (e: E) => Option.Option<E1>) => Effect.Effect<R, E1, A>
>(2, (self, pf) => refineOrDieWith(self, pf, identity))

/* @internal */
export const refineOrDieWith = dual<
  <E, E1>(
    pf: (e: E) => Option.Option<E1>,
    f: (e: E) => unknown
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E1, A>,
  <R, E, A, E1>(
    self: Effect.Effect<R, E, A>,
    pf: (e: E) => Option.Option<E1>,
    f: (e: E) => unknown
  ) => Effect.Effect<R, E1, A>
>(3, (self, pf, f) =>
  core.catchAll(self, (e) => {
    const option = pf(e)
    switch (option._tag) {
      case "None": {
        return core.die(f(e))
      }
      case "Some": {
        return core.fail(option.value)
      }
    }
  }))

/* @internal */
export const refineTagOrDie = dual<
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string>(
    k: K
  ) => (self: Effect.Effect<R, E, A>) => Effect.Effect<R, Extract<E, { _tag: K }>, A>,
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string>(
    self: Effect.Effect<R, E, A>,
    k: K
  ) => Effect.Effect<R, Extract<E, { _tag: K }>, A>
>(2, (self, k) => refineTagOrDieWith(self, k, identity))

/* @internal */
export const refineTagOrDieWith = dual<
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string>(
    k: K,
    f: (e: Exclude<E, { _tag: K }>) => unknown
  ) => (self: Effect.Effect<R, E, A>) => Effect.Effect<R, Extract<E, { _tag: K }>, A>,
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string>(
    self: Effect.Effect<R, E, A>,
    k: K,
    f: (e: Exclude<E, { _tag: K }>) => unknown
  ) => Effect.Effect<R, Extract<E, { _tag: K }>, A>
>(3, (self, k, f) =>
  core.catchAll(self, (e) => {
    if ("_tag" in e && e["_tag"] === k) {
      return core.fail(e as any)
    }
    return core.die(f(e as any))
  }))

/* @internal */
export const repeatN = dual<
  (n: number) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, n: number) => Effect.Effect<R, E, A>
>(2, (self, n) => core.suspend(() => repeatNLoop(self, n)))

/* @internal */
const repeatNLoop = <R, E, A>(self: Effect.Effect<R, E, A>, n: number): Effect.Effect<R, E, A> =>
  core.flatMap(self, (a) =>
    n <= 0 ?
      core.succeed(a) :
      core.zipRight(core.yieldNow, repeatNLoop(self, n - 1)))

/* @internal */
export const sandbox = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Cause.Cause<E>, A> =>
  core.matchCauseEffect(self, core.fail, core.succeed)

/* @internal */
export const setFiberRefs = (fiberRefs: FiberRefs.FiberRefs): Effect.Effect<never, never, void> =>
  core.suspend(() => FiberRefs.setAll(fiberRefs))

/* @internal */
export const sleep: (duration: Duration.Duration) => Effect.Effect<never, never, void> = Clock.sleep

/* @internal */
export const some = <R, E, A>(self: Effect.Effect<R, E, Option.Option<A>>): Effect.Effect<R, Option.Option<E>, A> =>
  core.matchEffect(
    self,
    (e) => core.fail(Option.some(e)),
    (option) => {
      switch (option._tag) {
        case "None": {
          return core.fail(Option.none())
        }
        case "Some": {
          return core.succeed(option.value)
        }
      }
    }
  )

/* @internal */
export const succeedNone: Effect.Effect<never, never, Option.Option<never>> = core.succeed(Option.none())

/* @internal */
export const succeedSome = <A>(value: A): Effect.Effect<never, never, Option.Option<A>> =>
  core.succeed(Option.some(value))

/* @internal */
export const summarized = dual<
  <R2, E2, B, C>(
    summary: Effect.Effect<R2, E2, B>,
    f: (start: B, end: B) => C
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, [C, A]>,
  <R, E, A, R2, E2, B, C>(
    self: Effect.Effect<R, E, A>,
    summary: Effect.Effect<R2, E2, B>,
    f: (start: B, end: B) => C
  ) => Effect.Effect<R | R2, E | E2, [C, A]>
>(
  3,
  (self, summary, f) =>
    core.flatMap(
      summary,
      (start) => core.flatMap(self, (value) => core.map(summary, (end) => tuple(f(start, end), value)))
    )
)

/* @internal */
export const tagged = dual<
  (key: string, value: string) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, key: string, value: string) => Effect.Effect<R, E, A>
>(3, (self, key, value) => taggedWithLabels(self, [metricLabel.make(key, value)]))

/* @internal */
export const taggedWithLabels = dual<
  (labels: Iterable<MetricLabel.MetricLabel>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, labels: Iterable<MetricLabel.MetricLabel>) => Effect.Effect<R, E, A>
>(2, (self, labels) => taggedWithLabelSet(self, HashSet.fromIterable(labels)))

/* @internal */
export const taggedWithLabelSet = dual<
  (labels: HashSet.HashSet<MetricLabel.MetricLabel>) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, labels: HashSet.HashSet<MetricLabel.MetricLabel>) => Effect.Effect<R, E, A>
>(2, (self, labels) => core.fiberRefLocallyWith(core.currentTags, (set) => pipe(set, HashSet.union(labels)))(self))

/* @internal */
export const takeWhile = dual<
  <R, E, A>(
    predicate: (a: A) => Effect.Effect<R, E, boolean>
  ) => (elements: Iterable<A>) => Effect.Effect<R, E, Array<A>>,
  <R, E, A>(
    elements: Iterable<A>,
    predicate: (a: A) => Effect.Effect<R, E, boolean>
  ) => Effect.Effect<R, E, Array<A>>
>(2, <R, E, A>(elements: Iterable<A>, predicate: (a: A) => Effect.Effect<R, E, boolean>) =>
  core.suspend(() => {
    const iterator = elements[Symbol.iterator]()
    const builder: Array<A> = []
    let next: IteratorResult<A, any>
    let taking: Effect.Effect<R, E, boolean> = core.succeed(true)
    while ((next = iterator.next()) && !next.done) {
      const a = next.value
      taking = core.flatMap(taking, (taking) =>
        pipe(
          taking ? predicate(a) : core.succeed(false),
          core.map((bool) => {
            if (bool) {
              builder.push(a)
            }
            return bool
          })
        ))
    }
    return core.map(taking, () => builder)
  }))

/* @internal */
export const tapBoth = dual<
  <E, A, R2, E2, X, R3, E3, X1>(
    f: (e: E) => Effect.Effect<R2, E2, X>,
    g: (a: A) => Effect.Effect<R3, E3, X1>
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2 | R3, E | E2 | E3, A>,
  <R, E, A, R2, E2, X, R3, E3, X1>(
    self: Effect.Effect<R, E, A>,
    f: (e: E) => Effect.Effect<R2, E2, X>,
    g: (a: A) => Effect.Effect<R3, E3, X1>
  ) => Effect.Effect<R | R2 | R3, E | E2 | E3, A>
>(3, (self, f, g) =>
  core.matchCauseEffect(
    self,
    (cause) => {
      const either = internalCause.failureOrCause(cause)
      switch (either._tag) {
        case "Left": {
          return core.zipRight(f(either.left), core.failCause(cause))
        }
        case "Right": {
          return core.failCause(cause)
        }
      }
    },
    (a) => core.as(g(a), a)
  ))

/* @internal */
export const tapDefect = dual<
  <R2, E2, X>(
    f: (cause: Cause.Cause<never>) => Effect.Effect<R2, E2, X>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, A, R2, E2, X>(
    self: Effect.Effect<R, E, A>,
    f: (cause: Cause.Cause<never>) => Effect.Effect<R2, E2, X>
  ) => Effect.Effect<R | R2, E | E2, A>
>(2, (self, f) =>
  core.catchAllCause(self, (cause) =>
    Option.match(
      internalCause.keepDefects(cause),
      () => core.failCause(cause),
      (a) => core.zipRight(f(a), core.failCause(cause))
    )))

/* @internal */
export const tapError = dual<
  <E, R2, E2, X>(
    f: (e: E) => Effect.Effect<R2, E2, X>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, A, R2, E2, X>(
    self: Effect.Effect<R, E, A>,
    f: (e: E) => Effect.Effect<R2, E2, X>
  ) => Effect.Effect<R | R2, E | E2, A>
>(2, (self, f) =>
  core.matchCauseEffect(
    self,
    (cause) => {
      const either = internalCause.failureOrCause(cause)
      switch (either._tag) {
        case "Left": {
          return core.zipRight(f(either.left), core.failCause(cause))
        }
        case "Right": {
          return core.failCause(cause)
        }
      }
    },
    core.succeed
  ))

/* @internal */
export const tapErrorCause = dual<
  <E, R2, E2, X>(
    f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, X>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, A, R2, E2, X>(
    self: Effect.Effect<R, E, A>,
    f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, X>
  ) => Effect.Effect<R | R2, E | E2, A>
>(2, (self, f) =>
  core.matchCauseEffect(
    self,
    (cause) => core.zipRight(f(cause), core.failCause(cause)),
    core.succeed
  ))

/* @internal */
export const timed = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, [Duration.Duration, A]> => timedWith(self, Clock.currentTimeMillis)

/* @internal */
export const timedWith = dual<
  <R1, E1>(
    milliseconds: Effect.Effect<R1, E1, number>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E | E1, [Duration.Duration, A]>,
  <R, E, A, R1, E1>(
    self: Effect.Effect<R, E, A>,
    milliseconds: Effect.Effect<R1, E1, number>
  ) => Effect.Effect<R | R1, E | E1, [Duration.Duration, A]>
>(2, (self, milliseconds) => summarized(self, milliseconds, (start, end) => Duration.millis(end - start)))

/* @internal */
export const tracerWith: <R, E, A>(f: (tracer: Tracer.Tracer) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  Tracer.tracerWith

/** @internal */
export const tracer: Effect.Effect<never, never, Tracer.Tracer> = tracerWith(core.succeed)

/* @internal */
export const attemptCatch = <E, A>(
  attempt: LazyArg<A>,
  onThrow: (u: unknown) => E
): Effect.Effect<never, E, A> =>
  core.sync(() => {
    try {
      return attempt()
    } catch (error) {
      throw core.makeEffectError(internalCause.fail(onThrow(error)))
    }
  })

/* @internal */
export const attemptCatchPromise = <E, A>(
  evaluate: LazyArg<Promise<A>>,
  onReject: (reason: unknown) => E
): Effect.Effect<never, E, A> =>
  core.flatMap(attemptCatch(evaluate, onReject), (promise) =>
    core.async<never, E, A>((resolve) => {
      promise
        .then((a) => resolve(core.exitSucceed(a)))
        .catch((e) => resolve(core.exitFail(onReject(e))))
    }))

/* @internal */
export const attemptCatchPromiseInterrupt = <E, A>(
  evaluate: (signal: AbortSignal) => Promise<A>,
  onReject: (reason: unknown) => E
): Effect.Effect<never, E, A> =>
  core.flatMap(
    attemptCatch(() => {
      const controller = new AbortController()
      return [controller, evaluate(controller.signal)] as const
    }, onReject),
    ([controller, promise]) =>
      core.asyncInterrupt<never, E, A>((resolve) => {
        promise
          .then((a) => resolve(core.exitSucceed(a)))
          .catch((e) => resolve(core.exitFail(onReject(e))))
        return core.sync(() => controller.abort())
      })
  )

/* @internal */
export const attemptPromise = <A>(evaluate: LazyArg<Promise<A>>): Effect.Effect<never, unknown, A> =>
  core.flatMap(attempt(evaluate), (promise) =>
    core.async<never, unknown, A>((resolve) => {
      promise
        .then((a) => resolve(core.exitSucceed(a)))
        .catch((e) => resolve(core.exitFail(e)))
    }))

/* @internal */
export const attemptPromiseInterrupt = <A>(
  evaluate: (signal: AbortSignal) => Promise<A>
): Effect.Effect<never, unknown, A> =>
  core.flatMap(
    attempt(() => {
      const controller = new AbortController()
      return [controller, evaluate(controller.signal)] as const
    }),
    ([controller, promise]) =>
      core.asyncInterruptEither<never, unknown, A>((resolve) => {
        promise
          .then((a) => resolve(core.exitSucceed(a)))
          .catch((e) => resolve(core.exitFail(e)))
        return Either.left(core.sync(() => controller.abort()))
      })
  )

/* @internal */
export const all: Effect.All.Signature = function() {
  if (arguments.length === 1) {
    if (core.isEffect(arguments[0])) {
      return core.map(arguments[0], (x) => [x])
    } else if (Array.isArray(arguments[0]) || Symbol.iterator in arguments[0]) {
      return core.forEach(arguments[0], identity as any)
    } else {
      return pipe(
        core.forEach(
          Object.entries(arguments[0] as Readonly<{ [K: string]: Effect.Effect<any, any, any> }>),
          ([_, e]) => core.map(e, (a) => [_, a] as const)
        ),
        core.map((values) => {
          const res = {}
          for (const [k, v] of values) {
            ;(res as any)[k] = v
          }
          return res
        })
      ) as any
    }
  }
  return core.forEach(arguments, identity as any)
}

/* @internal */
export const uncause = <R, E>(self: Effect.Effect<R, never, Cause.Cause<E>>): Effect.Effect<R, E, void> =>
  core.flatMap(self, (cause) =>
    internalCause.isEmpty(cause) ?
      core.unit :
      core.failCause(cause))

/* @internal */
export const unfold = <A, R, E, S>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, Option.Option<readonly [A, S]>>
): Effect.Effect<R, E, Array<A>> => core.map(unfoldLoop(s, f, Chunk.empty()), (a) => Array.from(Chunk.reverse(a)))

/* @internal */
const unfoldLoop = <A, R, E, S>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, Option.Option<readonly [A, S]>>,
  builder: Chunk.Chunk<A>
): Effect.Effect<R, E, Chunk.Chunk<A>> =>
  core.flatMap(f(s), (option) => {
    if (Option.isSome(option)) {
      return unfoldLoop(option.value[1], f, pipe(builder, Chunk.prepend(option.value[0])))
    } else {
      return core.succeed(builder)
    }
  })

/* @internal */
export const unless = dual<
  (predicate: LazyArg<boolean>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, Option.Option<A>>,
  <R, E, A>(self: Effect.Effect<R, E, A>, predicate: LazyArg<boolean>) => Effect.Effect<R, E, Option.Option<A>>
>(2, (self, predicate) =>
  core.suspend(() =>
    predicate() ?
      succeedNone :
      asSome(self)
  ))

/* @internal */
export const unlessEffect = dual<
  <R2, E2>(
    predicate: Effect.Effect<R2, E2, boolean>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, Option.Option<A>>,
  <R, E, A, R2, E2>(
    self: Effect.Effect<R, E, A>,
    predicate: Effect.Effect<R2, E2, boolean>
  ) => Effect.Effect<R | R2, E | E2, Option.Option<A>>
>(2, (self, predicate) => core.flatMap(predicate, (b) => (b ? succeedNone : asSome(self))))

/* @internal */
export const unrefine = dual<
  <E1>(pf: (u: unknown) => Option.Option<E1>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E1, A>,
  <R, E, A, E1>(self: Effect.Effect<R, E, A>, pf: (u: unknown) => Option.Option<E1>) => Effect.Effect<R, E | E1, A>
>(2, (self, pf) => unrefineWith(self, pf, identity))

/* @internal */
export const unrefineWith = dual<
  <E, E1, E2>(
    pf: (u: unknown) => Option.Option<E1>,
    f: (e: E) => E2
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E1 | E2, A>,
  <R, E, A, E1, E2>(
    self: Effect.Effect<R, E, A>,
    pf: (u: unknown) => Option.Option<E1>,
    f: (e: E) => E2
  ) => Effect.Effect<R, E1 | E2, A>
>(3, <R, E, A, E1, E2>(
  self: Effect.Effect<R, E, A>,
  pf: (u: unknown) => Option.Option<E1>,
  f: (e: E) => E2
) =>
  core.catchAllCause(
    self,
    (cause): Effect.Effect<R, E1 | E2, A> => {
      const option = pipe(
        cause,
        internalCause.find((cause) =>
          internalCause.isDieType(cause) ?
            pf(cause.defect) :
            Option.none()
        )
      )
      switch (option._tag) {
        case "None": {
          return core.failCause(pipe(cause, internalCause.map(f)))
        }
        case "Some": {
          return core.fail(option.value)
        }
      }
    }
  ))

/* @internal */
export const unsandbox = <R, E, A>(self: Effect.Effect<R, Cause.Cause<E>, A>) =>
  mapErrorCause(self, internalCause.flatten)

/* @internal */
export const updateFiberRefs = (
  f: (fiberId: FiberId.Runtime, fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs
): Effect.Effect<never, never, void> =>
  core.withFiberRuntime<never, never, void>((state) => {
    state.setFiberRefs(f(state.id(), state.unsafeGetFiberRefs()))
    return core.unit
  })

/* @internal */
export const updateService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | Context.Tag.Identifier<T>, E, A>,
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Effect.Effect<R, E, A>,
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ) => Effect.Effect<R | Context.Tag.Identifier<T>, E, A>
>(3, <R, E, A, T extends Context.Tag<any, any>>(
  self: Effect.Effect<R, E, A>,
  tag: T,
  f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
) =>
  core.contramapContext(self, (context) =>
    Context.add(
      context,
      tag,
      f(Context.unsafeGet(context, tag))
    )) as Effect.Effect<R | Context.Tag.Identifier<T>, E, A>)

/** @internal */
export const useSpan: {
  <R, E, A>(name: string, evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
  <R, E, A>(name: string, options: {
    attributes?: Record<string, string>
    parent?: Tracer.ParentSpan
    root?: boolean
  }, evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
} = <R, E, A>(
  name: string,
  ...args: [evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A>] | [
    options: any,
    evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A>
  ]
) => {
  const options: {
    attributes?: Record<string, string>
    parent?: Tracer.ParentSpan
    root?: boolean
  } | undefined = args.length === 1 ? undefined : args[0]
  const evaluate: (span: Tracer.Span) => Effect.Effect<R, E, A> = args[args.length - 1]
  return core.acquireUseRelease(
    tracerWith((tracer) =>
      core.flatMap(
        options?.parent ?
          core.succeed(Option.some(options.parent)) :
          options?.root ?
          core.succeed(Option.none()) :
          core.map(
            core.fiberRefGet(core.currentTracerSpan),
            List.head
          ),
        (parent) =>
          core.flatMap(
            core.fiberRefGet(core.currentTracerSpanAnnotations),
            (annotations) =>
              core.flatMap(
                Clock.clockWith((clock) => clock.currentTimeMillis),
                (startTime) =>
                  core.sync(() => {
                    const span = tracer.span(name, parent, startTime)
                    HashMap.forEachWithIndex(annotations, (value, key) => span.attribute(key, value))
                    Object.entries(options?.attributes ?? {}).forEach(([k, v]) => {
                      span.attribute(k, v)
                    })
                    return span
                  })
              )
          )
      )
    ),
    {
      use: evaluate,
      release: (span, exit) =>
        core.flatMap(
          Clock.clockWith((clock) => clock.currentTimeMillis),
          (endTime) => core.sync(() => span.end(endTime, exit))
        )
    }
  )
}

/* @internal */
export const validate = dual<
  <R2, E2, B>(
    that: Effect.Effect<R2, E2, B>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, [A, B]>,
  <R, E, A, R2, E2, B>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, B>
  ) => Effect.Effect<R | R2, E | E2, [A, B]>
>(2, (self, that) => validateWith(self, that, (a, b) => tuple(a, b)))

/* @internal */
export const validateAll = dual<
  <R, E, A, B>(
    f: (a: A) => Effect.Effect<R, E, B>
  ) => (elements: Iterable<A>) => Effect.Effect<R, Array<E>, Array<B>>,
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A) => Effect.Effect<R, E, B>
  ) => Effect.Effect<R, Array<E>, Array<B>>
>(2, (elements, f) =>
  core.flatMap(partition(elements, f), ([es, bs]) =>
    es.length === 0
      ? core.succeed(bs)
      : core.fail(es)))

/* @internal */
export const validateAllDiscard = dual<
  <R, E, A, X>(
    f: (a: A) => Effect.Effect<R, E, X>
  ) => (elements: Iterable<A>) => Effect.Effect<R, Array<E>, void>,
  <R, E, A, X>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, E, X>) => Effect.Effect<R, Array<E>, void>
>(2, (elements, f) =>
  core.flatMap(partition(elements, f), ([es, _]) =>
    es.length === 0 ?
      core.unit :
      core.fail(es)))

/* @internal */
export const validateFirst = dual<
  <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, B>) => (elements: Iterable<A>) => Effect.Effect<R, Array<E>, B>,
  <R, E, A, B>(elements: Iterable<A>, f: (a: A) => Effect.Effect<R, E, B>) => Effect.Effect<R, Array<E>, B>
>(2, (elements, f) => core.flip(core.forEach(elements, (a) => core.flip(f(a)))))

/* @internal */
export const validateWith = dual<
  <A, R2, E2, B, C>(
    that: Effect.Effect<R2, E2, B>,
    f: (a: A, b: B) => C
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, C>,
  <R, E, A, R2, E2, B, C>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, B>,
    f: (a: A, b: B) => C
  ) => Effect.Effect<R | R2, E | E2, C>
>(3, (self, that, f) =>
  core.flatten(core.zipWith(
    core.exit(self),
    core.exit(that),
    (ea, eb) => core.exitZipWith(ea, eb, f, (ca, cb) => internalCause.sequential(ca, cb))
  )))

/* @internal */
export const when = dual<
  (predicate: LazyArg<boolean>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, Option.Option<A>>,
  <R, E, A>(self: Effect.Effect<R, E, A>, predicate: LazyArg<boolean>) => Effect.Effect<R, E, Option.Option<A>>
>(2, (self, predicate) =>
  core.suspend(() =>
    predicate() ?
      core.map(self, Option.some) :
      core.succeed(Option.none())
  ))

/* @internal */
export const whenFiberRef = dual<
  <S>(
    fiberRef: FiberRef.FiberRef<S>,
    predicate: Predicate<S>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, [S, Option.Option<A>]>,
  <R, E, A, S>(
    self: Effect.Effect<R, E, A>,
    fiberRef: FiberRef.FiberRef<S>,
    predicate: Predicate<S>
  ) => Effect.Effect<R, E, [S, Option.Option<A>]>
>(
  3,
  <R, E, A, S>(self: Effect.Effect<R, E, A>, fiberRef: FiberRef.FiberRef<S>, predicate: Predicate<S>) =>
    core.flatMap(core.fiberRefGet(fiberRef), (s) =>
      predicate(s) ?
        core.map(self, (a) => tuple(s, Option.some(a))) :
        core.succeed<[S, Option.Option<A>]>([s, Option.none()]))
)

/* @internal */
export const whenRef = dual<
  <S>(
    ref: Ref.Ref<S>,
    predicate: Predicate<S>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, [S, Option.Option<A>]>,
  <R, E, A, S>(
    self: Effect.Effect<R, E, A>,
    ref: Ref.Ref<S>,
    predicate: Predicate<S>
  ) => Effect.Effect<R, E, [S, Option.Option<A>]>
>(
  3,
  <R, E, A, S>(self: Effect.Effect<R, E, A>, ref: Ref.Ref<S>, predicate: Predicate<S>) =>
    core.flatMap(Ref.get(ref), (s) =>
      predicate(s) ?
        core.map(self, (a) => tuple(s, Option.some(a))) :
        core.succeed<[S, Option.Option<A>]>([s, Option.none()]))
)

/* @internal */
export const withMetric = dual<
  <Type, In, Out>(
    metric: Metric.Metric<Type, In, Out>
  ) => <R, E, A extends In>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A extends In, Type, In, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric.Metric<Type, In, Out>
  ) => Effect.Effect<R, E, A>
>(2, (self, metric) => metric(self))

/** @internal */
export const withSpan = dual<
  (name: string, options?: {
    attributes?: Record<string, string>
    parent?: Tracer.ParentSpan
    root?: boolean
  }) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, name: string, options?: {
    attributes?: Record<string, string>
    parent?: Tracer.ParentSpan
    root?: boolean
  }) => Effect.Effect<R, E, A>
>(
  (args) => typeof args[0] !== "string",
  (self, name, options) =>
    useSpan(
      name,
      options ?? {},
      (span) =>
        core.flatMap(
          core.fiberRefGet(core.currentTracerSpan),
          (stack) =>
            core.fiberRefLocally(
              self,
              core.currentTracerSpan,
              List.prepend(stack, span)
            )
        )
    )
)

/* @internal */
export const spanAnnotations: Effect.Effect<never, never, HashMap.HashMap<string, string>> = core.fiberRefGet(
  core.currentTracerSpanAnnotations
)

/** @internal */
export const serviceFunctionEffect = <T extends Context.Tag<any, any>, Args extends Array<any>, R, E, A>(
  service: T,
  f: (_: Context.Tag.Service<T>) => (...args: Args) => Effect.Effect<R, E, A>
) => (...args: Args): Effect.Effect<R | Context.Tag.Identifier<T>, E, A> => core.flatMap(service, (a) => f(a)(...args))

/** @internal */
export const serviceFunction = <T extends Context.Tag<any, any>, Args extends Array<any>, A>(
  service: T,
  f: (_: Context.Tag.Service<T>) => (...args: Args) => A
) => (...args: Args): Effect.Effect<Context.Tag.Identifier<T>, never, A> => core.map(service, (a) => f(a)(...args))
