import type * as Cause from "@effect/io/Cause"
import * as Clock from "@effect/io/Clock"
import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRef from "@effect/io/FiberRef"
import * as FiberRefs from "@effect/io/FiberRefs"
import type * as FiberRefsPatch from "@effect/io/FiberRefs/Patch"
import * as internalCause from "@effect/io/internal/cause"
import * as core from "@effect/io/internal/core"
import * as fiberRefsPatch from "@effect/io/internal/fiberRefs/patch"
import * as metricLabel from "@effect/io/internal/metric/label"
import * as SingleShotGen from "@effect/io/internal/singleShotGen"
import type { EnforceNonEmptyRecord, MergeRecord, NonEmptyArrayEffect, TupleEffect } from "@effect/io/internal/types"
import * as LogLevel from "@effect/io/Logger/Level"
import * as LogSpan from "@effect/io/Logger/Span"
import type * as Metric from "@effect/io/Metric"
import type * as MetricLabel from "@effect/io/Metric/Label"
import * as Random from "@effect/io/Random"
import * as Ref from "@effect/io/Ref"
import { currentTracer } from "@effect/io/Tracer"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import { constFalse, constTrue, constVoid, identity, pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as Option from "@fp-ts/data/Option"
import type { Predicate, Refinement } from "@fp-ts/data/Predicate"

/**
 * @macro traced
 * @internal
 */
export const absolve = <R, E, A>(self: Effect.Effect<R, E, Either.Either<E, A>>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return pipe(self, core.flatMap(core.fromEither)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const absorb = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, unknown, A> => {
  const trace = getCallTrace()
  return pipe(self, absorbWith(identity)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const absorbWith = <E>(f: (e: E) => unknown) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, unknown, A> => {
    return pipe(
      sandbox(self),
      core.matchEffect((cause) => core.fail(pipe(cause, internalCause.squashWith(f))), core.succeed)
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const allowInterrupt = (): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return descriptorWith(
    (descriptor) =>
      HashSet.size(descriptor.interruptors) > 0 ?
        core.interrupt() :
        core.unit()
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const asLeft = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, Either.Either<A, never>> => {
  const trace = getCallTrace()
  return pipe(self, core.map(Either.left)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const asLeftError = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Either.Either<E, never>, A> => {
  const trace = getCallTrace()
  return pipe(self, core.mapError(Either.left)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const asRight = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, Either.Either<never, A>> => {
  const trace = getCallTrace()
  return pipe(self, core.map(Either.right)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const asRightError = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Either.Either<never, E>, A> => {
  const trace = getCallTrace()
  return pipe(self, core.mapError(Either.right)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const asSome = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, Option.Option<A>> => {
  const trace = getCallTrace()
  return pipe(self, core.map(Option.some)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const asSomeError = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Option.Option<E>, A> => {
  const trace = getCallTrace()
  return pipe(self, core.mapError(Option.some)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const asyncOption = <R, E, A>(
  register: (callback: (_: Effect.Effect<R, E, A>) => void) => Option.Option<Effect.Effect<R, E, A>>,
  blockingOn: FiberId.FiberId = FiberId.none
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.asyncInterruptEither<R, E, A>(
    (cb) => {
      const option = register(cb)
      switch (option._tag) {
        case "None": {
          return Either.left(core.unit())
        }
        case "Some": {
          return Either.right(option.value)
        }
      }
    },
    blockingOn
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const attempt = <A>(evaluate: () => A): Effect.Effect<never, unknown, A> => {
  const trace = getCallTrace()
  return core.sync(() => {
    try {
      return evaluate()
    } catch (error) {
      throw core.makeEffectError(internalCause.fail(error))
    }
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const blocking = <R, E, A>(self: Effect.Effect<R, E, A>) => {
  const trace = getCallTrace()
  return pipe(core.yieldNow("background"), core.zipRight(self)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const _catch = <N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(
  tag: N,
  k: K,
  f: (e: Extract<E, { [n in N]: K }>) => Effect.Effect<R1, E1, A1>
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, Exclude<E, { [n in N]: K }> | E1, A | A1> => {
    return pipe(
      self,
      core.catchAll((e) => {
        if (typeof e === "object" && e != null && tag in e && e[tag] === k) {
          return f(e as any)
        }
        return core.fail(e as any)
      })
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const catchAllDefect = <R2, E2, A2>(f: (defect: unknown) => Effect.Effect<R2, E2, A2>) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return pipe(self, catchSomeDefect((defect) => Option.some(f(defect))))
  }
}

/**
 * @macro traced
 * @internal
 */
export const catchSomeCause = <E, R2, E2, A2>(
  f: (cause: Cause.Cause<E>) => Option.Option<Effect.Effect<R2, E2, A2>>
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return pipe(
      self,
      core.matchCauseEffect(
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
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const catchSomeDefect = <R2, E2, A2>(
  pf: (_: unknown) => Option.Option<Effect.Effect<R2, E2, A2>>
) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return pipe(self, unrefineWith(pf, core.fail), core.catchAll((s): Effect.Effect<R2, E | E2, A2> => s))
  }
}

/**
 * @macro traced
 * @internal
 */
export const catchTag = <K extends E["_tag"] & string, E extends { _tag: string }, R1, E1, A1>(
  k: K,
  f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, Exclude<E, { _tag: K }> | E1, A | A1> => {
    return pipe(
      self,
      core.catchAll((e) => {
        if ("_tag" in e && e["_tag"] === k) {
          return f(e as any)
        }
        return core.fail(e as any)
      })
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const cause = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Cause.Cause<E>> => {
  const trace = getCallTrace()
  return pipe(self, core.matchCause(identity, () => internalCause.empty)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const clock = (): Effect.Effect<never, never, Clock.Clock> => clockWith(core.succeed)

/**
 * @macro traced
 * @internal
 */
export const clockWith: <R, E, A>(f: (clock: Clock.Clock) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  Clock.clockWith

/**
 * @macro traced
 * @internal
 */
export const collectAll = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, E, Chunk.Chunk<A>> => {
  const trace = getCallTrace()
  return pipe(effects, core.forEach(identity)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const collectAllDiscard = <R, E, A>(
  effects: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  return pipe(effects, core.forEachDiscard(identity)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const collectAllWith = <A, B>(pf: (a: A) => Option.Option<B>) => {
  const trace = getCallTrace()
  return <R, E>(elements: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return pipe(collectAll(elements), core.map(Chunk.filterMap(pf))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const collectAllWithEffect = <A, R, E, B>(f: (a: A) => Option.Option<Effect.Effect<R, E, B>>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    const array = Array.from(elements)
    // Break out early if there are no elements
    if (array.length === 0) {
      return core.succeed(Chunk.empty()).traced(trace)
    }
    // Break out early if there is only one element
    if (array.length === 1) {
      const option = f(array[0]!)
      switch (option._tag) {
        case "None": {
          return core.succeed(Chunk.empty()).traced(trace)
        }
        case "Some": {
          return pipe(option.value, core.map(Chunk.of)).traced(trace)
        }
      }
    }
    // Otherwise create the intermediate result structure
    let result: Effect.Effect<R, E, Chunk.Chunk<B>> = core.succeed(Chunk.empty<B>())
    for (let i = array.length - 1; i >= 0; i--) {
      const option = f(array[i]!)
      if (option._tag === "Some") {
        result = pipe(result, core.zipWith(option.value, (list, b) => pipe(list, Chunk.prepend(b))))
      }
    }
    return pipe(result, core.map(Chunk.fromIterable)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const collectAllSuccesses = <R, E, A>(
  as: Iterable<Effect.Effect<R, E, A>>
): Effect.Effect<R, never, Chunk.Chunk<A>> => {
  const trace = getCallTrace()
  return pipe(
    Array.from(as).map(core.exit),
    collectAllWith((exit) => (Exit.isSuccess(exit) ? Option.some(exit.value) : Option.none))
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const collectFirst = <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, Option.Option<B>>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Option.Option<B>> => {
    return core.suspendSucceed(() => collectFirstLoop(elements[Symbol.iterator](), f)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
const collectFirstLoop = <R, E, A, B>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Effect.Effect<R, E, Option.Option<B>>
): Effect.Effect<R, E, Option.Option<B>> => {
  const next = iterator.next()
  return next.done
    ? core.succeed(Option.none)
    : pipe(
      f(next.value),
      core.flatMap((option) => {
        switch (option._tag) {
          case "None": {
            return collectFirstLoop(iterator, f)
          }
          case "Some": {
            return core.succeed(option)
          }
        }
      })
    )
}

/**
 * @macro traced
 * @internal
 */
export const collectWhile = <A, R, E, B>(f: (a: A) => Option.Option<Effect.Effect<R, E, B>>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    const array = Array.from(elements)
    // Break out early if the input is empty
    if (array.length === 0) {
      return core.succeed(Chunk.empty()).traced(trace)
    }
    // Break out early if there is only one element in the list
    if (array.length === 1) {
      const option = f(array[0]!)
      switch (option._tag) {
        case "None": {
          return core.succeed(Chunk.empty()).traced(trace)
        }
        case "Some": {
          return pipe(option.value, core.map(Chunk.of)).traced(trace)
        }
      }
    }
    // Otherwise setup our intermediate result
    let result: Effect.Effect<R, E, Chunk.Chunk<B>> = core.succeed(Chunk.empty())
    for (let i = array.length - 1; i >= 0; i--) {
      const option = f(array[i]!)
      switch (option._tag) {
        case "None": {
          return pipe(result, core.map(Chunk.fromIterable)).traced(trace)
        }
        case "Some": {
          result = pipe(result, core.zipWith(option.value, (bs, b) => pipe(bs, Chunk.prepend(b))))
        }
      }
    }
    return pipe(result, core.map(Chunk.fromIterable)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const cond = <E, A>(predicate: () => boolean, result: () => A, error: () => E): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => predicate() ? core.sync(result) : core.failSync(error)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const continueOrFail = <E1, A, A2>(error: E1, pf: (a: A) => Option.Option<A2>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E | E1, A2> => {
    return pipe(self, continueOrFailEffect(error, (a) => pipe(pf(a), Option.map(core.succeed)))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const continueOrFailEffect = <E1, A, R2, E2, A2>(
  error: E1,
  pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E1 | E2, A2> => {
    return pipe(
      self,
      core.flatMap((value): Effect.Effect<R2, E1 | E2, A2> => pipe(pf(value), Option.getOrElse(() => core.fail(error))))
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const delay = (duration: Duration.Duration) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(Clock.sleep(duration), core.zipRight(self)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const descriptor = (): Effect.Effect<never, never, Fiber.Fiber.Descriptor> => {
  const trace = getCallTrace()
  return descriptorWith(core.succeed).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const descriptorWith = <R, E, A>(
  f: (descriptor: Fiber.Fiber.Descriptor) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.withFiberRuntime((state, status) => {
    return f({
      id: state.id(),
      status,
      interruptors: internalCause.interruptors(state.getFiberRef(core.interruptedCause))
    })
  }).traced(trace) as Effect.Effect<R, E, A>
}

/**
 * @macro traced
 * @internal
 */
export const dieMessage = (message: string): Effect.Effect<never, never, never> => {
  return core.failCauseSync(() => internalCause.die(internalCause.RuntimeException(message)))
}

/**
 * @macro traced
 * @internal
 */
export const diffFiberRefs = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, readonly [FiberRefsPatch.FiberRefsPatch, A]> => {
  const trace = getCallTrace()
  return pipe(self, summarized(getFiberRefs(), fiberRefsPatch.diff)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const Do = (): Effect.Effect<never, never, {}> => {
  const trace = getCallTrace()
  return core.succeed({}).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const bind = <N extends string, K, R2, E2, A>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect.Effect<R2, E2, A>
) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, K>): Effect.Effect<
    R | R2,
    E | E2,
    MergeRecord<
      K,
      {
        [k in N]: A
      }
    >
  > => {
    return pipe(
      self,
      core.flatMap((k) =>
        pipe(
          f(k),
          core.map(
            (
              a
            ): MergeRecord<
              K,
              {
                [k in N]: A
              }
            > => ({ ...k, [tag]: a } as any)
          )
        )
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const bindValue = <N extends string, K, A>(tag: Exclude<N, keyof K>, f: (_: K) => A) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, K>): Effect.Effect<
    R,
    E,
    MergeRecord<
      K,
      {
        [k in N]: A
      }
    >
  > => {
    return pipe(
      self,
      core.map(
        (
          k
        ): MergeRecord<
          K,
          {
            [k in N]: A
          }
        > => ({ ...k, [tag]: f(k) } as any)
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const dropUntil = <A, R, E>(predicate: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<A>> =>
    core.suspendSucceed(() => {
      const iterator = elements[Symbol.iterator]()
      const builder: Array<A> = []
      let next: IteratorResult<A, any>
      let dropping: Effect.Effect<R, E, boolean> = core.succeed(false)
      while ((next = iterator.next()) && !next.done) {
        const a = next.value
        dropping = pipe(
          dropping,
          core.flatMap((bool) => {
            if (bool) {
              builder.push(a)
              return core.succeed(true)
            }
            return predicate(a)
          })
        )
      }
      return pipe(dropping, core.map(() => Chunk.unsafeFromArray(builder)))
    }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const dropWhile = <R, E, A>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<A>> => {
    return core.suspendSucceed(() => {
      const iterator = elements[Symbol.iterator]()
      const builder: Array<A> = []
      let next
      let dropping: Effect.Effect<R, E, boolean> = core.succeed(true)
      while ((next = iterator.next()) && !next.done) {
        const a = next.value
        dropping = pipe(
          dropping,
          core.flatMap((d) =>
            pipe(
              d ? f(a) : core.succeed(false),
              core.map((b) => {
                if (!b) {
                  builder.push(a)
                }
                return b
              })
            )
          )
        )
      }
      return pipe(dropping, core.map(() => Chunk.unsafeFromArray(builder)))
    }).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const environmentWith = <R, A>(f: (context: Context.Context<R>) => A): Effect.Effect<R, never, A> => {
  const trace = getCallTrace()
  return pipe(core.environment<R>(), core.map(f)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const exists = <R, E, A>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, boolean> => {
    return core.suspendSucceed(() => existsLoop(elements[Symbol.iterator](), f)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
const existsLoop = <R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect.Effect<R, E, boolean>
): Effect.Effect<R, E, boolean> => {
  const next = iterator.next()
  if (next.done) {
    return core.succeed(false)
  }
  return pipe(f(next.value), core.flatMap((b) => b ? core.succeed(b) : existsLoop(iterator, f)))
}

/**
 * @macro traced
 * @internal
 */
export const eventually = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A> => {
  const trace = getCallTrace()
  return pipe(self, core.orElse(() => pipe(core.yieldNow(), core.flatMap(() => eventually(self))))).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const filter = <A, R, E>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<A>> => {
    return core.suspendSucceed(() =>
      pipe(
        Array.from(elements).reduceRight(
          (effect, a) =>
            pipe(
              effect,
              core.zipWith(
                core.suspendSucceed(() => f(a)),
                (list, b) => b ? pipe(list, Chunk.prepend(a)) : list
              )
            ),
          core.sync(() => Chunk.empty<A>()) as Effect.Effect<R, E, Chunk.Chunk<A>>
        )
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const filterNot = <A, R, E>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<A>> => {
    return pipe(elements, filter((a) => pipe(f(a), core.map((b) => !b)))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const filterOrDie: {
  <A, B extends A>(
    f: Refinement<A, B>,
    defect: () => unknown
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>
  <A>(
    f: Predicate<A>,
    defect: () => unknown
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
} = <A>(f: Predicate<A>, defect: () => unknown) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(self, filterOrElse(f, () => core.dieSync(defect))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const filterOrDieMessage: {
  <A, B extends A>(
    f: Refinement<A, B>,
    message: string
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>
  <A>(
    f: Predicate<A>,
    message: string
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
} = <A>(f: Predicate<A>, message: string) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(self, filterOrElse(f, () => dieMessage(message))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const filterOrElse: {
  <A, B extends A, R2, E2, C>(
    f: Refinement<A, B>,
    orElse: () => Effect.Effect<R2, E2, C>
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, B | C>
  <A, R2, E2, B>(
    f: Predicate<A>,
    orElse: () => Effect.Effect<R2, E2, B>
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | B>
} = <A, R2, E2, B>(f: Predicate<A>, orElse: () => Effect.Effect<R2, E2, B>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | B> => {
    return pipe(self, filterOrElseWith(f, orElse)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const filterOrElseWith: {
  <A, B extends A, R2, E2, C>(
    f: Refinement<A, B>,
    orElse: (a: A) => Effect.Effect<R2, E2, C>
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, B | C>
  <A, R2, E2, B>(
    f: Predicate<A>,
    orElse: (a: A) => Effect.Effect<R2, E2, B>
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A | B>
} = <A, R2, E2, B>(f: Predicate<A>, orElse: (a: A) => Effect.Effect<R2, E2, B>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A | B> => {
    return pipe(self, core.flatMap((a) => f(a) ? core.succeed<A | B>(a) : orElse(a))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const filterOrFail: {
  <A, B extends A, E2>(
    f: Refinement<A, B>,
    error: () => E2
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E2, B>
  <A, E2>(
    f: Predicate<A>,
    error: () => E2
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E2, A>
} = <A, E2>(f: Predicate<A>, error: () => E2) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E | E2, A> => {
    return pipe(self, filterOrElse(f, () => core.failSync(error))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const find = <A, R, E>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Option.Option<A>> => {
    return core.suspendSucceed(() => {
      const array = Array.from(elements)
      const iterator = array[Symbol.iterator]()
      const next = iterator.next()
      if (!next.done) {
        return findLoop(iterator, f, next.value)
      }
      return core.succeed(Option.none)
    }).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const firstSuccessOf = <R, E, A>(effects: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A> => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => {
    const list = Chunk.fromIterable(effects)
    if (!Chunk.isNonEmpty(list)) {
      return core.dieSync(() => internalCause.IllegalArgumentException(`Received an empty collection of effects`))
    }
    return pipe(
      Chunk.tailNonEmpty(list),
      Chunk.reduce(Chunk.headNonEmpty(list), (left, right) => pipe(left, core.orElse(() => right)))
    )
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
const findLoop = <A, R, E>(
  iterator: Iterator<A>,
  f: (a: A) => Effect.Effect<R, E, boolean>,
  value: A
): Effect.Effect<R, E, Option.Option<A>> => {
  return pipe(
    f(value),
    core.flatMap((result) => {
      if (result) {
        return core.succeed(Option.some(value))
      }
      const next = iterator.next()
      if (!next.done) {
        return findLoop(iterator, f, next.value)
      }
      return core.succeed(Option.none)
    })
  )
}

/**
 * @macro traced
 * @internal
 */
export const flattenErrorOption = <E1>(fallback: E1) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, Option.Option<E>, A>): Effect.Effect<R, E | E1, A> => {
    return pipe(self, core.mapError(Option.getOrElse(() => fallback))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const flipWith = <R, A, E, R2, A2, E2>(f: (effect: Effect.Effect<R, A, E>) => Effect.Effect<R2, A2, E2>) => {
  const trace = getCallTrace()
  return (self: Effect.Effect<R, E, A>): Effect.Effect<R2, E2, A2> => {
    return core.flip(f(core.flip(self))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const match = <E, A, A2, A3>(onFailure: (error: E) => A2, onSuccess: (value: A) => A3) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, A2 | A3> => {
    return pipe(
      self,
      core.matchEffect(
        (e) => core.succeed(onFailure(e)),
        (a) => core.succeed(onSuccess(a))
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const forAll = <R, E, A>(f: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, boolean> => {
    return core.suspendSucceed(() => forAllLoop(elements[Symbol.iterator](), f)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
const forAllLoop = <R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect.Effect<R, E, boolean>
): Effect.Effect<R, E, boolean> => {
  const next = iterator.next()
  return next.done
    ? core.succeed(true)
    : pipe(
      f(next.value),
      core.flatMap((b) => b ? forAllLoop(iterator, f) : core.succeed(b))
    )
}

/**
 * @macro traced
 * @internal
 */
export const forEachEffect = <A, R1, E1, B>(f: (a: A) => Effect.Effect<R1, E1, B>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E1, Option.Option<B>> => {
    return pipe(
      self,
      core.matchCauseEffect(
        () => core.succeed(Option.none),
        (a) => pipe(f(a), core.map(Option.some))
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const forEachOption = <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, B>) => {
  const trace = getCallTrace()
  return (option: Option.Option<A>): Effect.Effect<R, E, Option.Option<B>> => {
    switch (option._tag) {
      case "None": {
        return core.succeed(Option.none).traced(trace)
      }
      case "Some": {
        return pipe(f(option.value), core.map(Option.some)).traced(trace)
      }
    }
  }
}

/**
 * @macro traced
 * @internal
 */
export const forEachWithIndex = <A, R, E, B>(f: (a: A, i: number) => Effect.Effect<R, E, B>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<B>> => {
    return core.suspendSucceed(() => {
      let index = 0
      const acc: Array<B> = []
      return pipe(
        elements,
        core.forEachDiscard((a) =>
          pipe(
            f(a, index),
            core.map((b) => {
              acc.push(b)
              index++
            })
          )
        ),
        core.map(() => Chunk.unsafeFromArray(acc))
      )
    }).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const forever = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, never> => {
  const trace = getCallTrace()
  const loop: Effect.Effect<R, E, never> = pipe(self, core.flatMap(() => core.yieldNow()), core.flatMap(() => loop))
  return loop.traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const fromEitherCause = <E, A>(either: Either.Either<Cause.Cause<E>, A>): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  switch (either._tag) {
    case "Left": {
      return core.failCause(either.left).traced(trace)
    }
    case "Right": {
      return core.succeed(either.right).traced(trace)
    }
  }
}

/** @internal */
class EffectGen {
  constructor(readonly value: Effect.Effect<any, any, any>) {
    Equal.considerByRef(this)
  }
  [Symbol.iterator]() {
    return new SingleShotGen.SingleShotGen(this)
  }
}

/**
 * Inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 *
 * @macro traced
 * @internal
 */
export const gen: typeof Effect.gen = (f) => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => {
    const iterator = f((self) => new EffectGen(self) as any)
    const state = iterator.next()
    const run = (
      state: IteratorYieldResult<any> | IteratorReturnResult<any>
    ): Effect.Effect<any, any, any> =>
      (state.done ?
        core.succeed(state.value) :
        pipe(
          state.value.value as unknown as Effect.Effect<any, any, any>,
          core.flatMap((val: any) => run(iterator.next(val)))
        )).traced(trace)
    return run(state)
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const getFiberRefs = (): Effect.Effect<never, never, FiberRefs.FiberRefs> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, FiberRefs.FiberRefs>(
    (state) => core.succeed(state.unsafeGetFiberRefs())
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const getOrFail = <A>(
  option: Option.Option<A>
): Effect.Effect<never, Cause.NoSuchElementException, A> => {
  const trace = getCallTrace()
  return pipe(option, getOrFailWith(() => internalCause.NoSuchElementException())).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const getOrFailDiscard = <A>(option: Option.Option<A>): Effect.Effect<never, void, A> => {
  const trace = getCallTrace()
  return pipe(option, getOrFailWith(constVoid)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const getOrFailWith = <E>(error: () => E) => {
  const trace = getCallTrace()
  return <A>(option: Option.Option<A>): Effect.Effect<never, E, A> => {
    switch (option._tag) {
      case "None": {
        return core.failSync(error).traced(trace)
      }
      case "Some": {
        return core.succeed(option.value).traced(trace)
      }
    }
  }
}

/**
 * @macro traced
 * @internal
 */
export const head = <R, E, A>(
  self: Effect.Effect<R, E, Iterable<A>>
): Effect.Effect<R, Option.Option<E>, A> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.matchEffect(
      (e) => core.fail(Option.some(e)),
      (as) => {
        const iterator = as[Symbol.iterator]()
        const next = iterator.next()
        if (next.done) {
          return core.fail(Option.none)
        }
        return core.succeed(next.value)
      }
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const ignore = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, void> => {
  const trace = getCallTrace()
  return pipe(self, match(constVoid, constVoid)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const ignoreLogged = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, void> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.matchCauseEffect(
      (cause) =>
        logDebugCauseMessage(
          "An error was silently ignored because it is not anticipated to be useful",
          cause
        ),
      () => core.unit()
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const inheritFiberRefs = (childFiberRefs: FiberRefs.FiberRefs) => {
  return updateFiberRefs((parentFiberId, parentFiberRefs) =>
    pipe(parentFiberRefs, FiberRefs.joinAs(parentFiberId, childFiberRefs))
  )
}

/**
 * @macro traced
 * @internal
 */
export const isFailure = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, boolean> => {
  const trace = getCallTrace()
  return pipe(self, match(constTrue, constFalse)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const isSuccess = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, boolean> => {
  const trace = getCallTrace()
  return pipe(self, match(constFalse, constTrue)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const iterate = <Z>(initial: Z, cont: (z: Z) => boolean) => {
  const trace = getCallTrace()
  return <R, E>(body: (z: Z) => Effect.Effect<R, E, Z>): Effect.Effect<R, E, Z> =>
    core.suspendSucceed<R, E, Z>(() => {
      if (cont(initial)) {
        return pipe(
          body(initial),
          core.flatMap((z2) => iterate(z2, cont)(body))
        )
      }
      return core.succeed(initial)
    }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const left = <R, E, A, B>(
  self: Effect.Effect<R, E, Either.Either<A, B>>
): Effect.Effect<R, Either.Either<E, B>, A> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.matchEffect(
      (e) => core.fail(Either.left(e)),
      (either) => {
        switch (either._tag) {
          case "Left": {
            return core.succeed(either.left)
          }
          case "Right": {
            return core.fail(Either.right(either.right))
          }
        }
      }
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const leftWith = <R, E, B, A, R1, E1, B1, A1>(
  f: (effect: Effect.Effect<R, Either.Either<E, B>, A>) => Effect.Effect<R1, Either.Either<E1, B1>, A1>
) => {
  const trace = getCallTrace()
  return (self: Effect.Effect<R, E, Either.Either<A, B>>): Effect.Effect<R | R1, E | E1, Either.Either<A1, B1>> => {
    return core.suspendSucceed(() => unleft(f(left(self)))).traced(trace)
  }
}

/** @internal */
const someFatal = Option.some(LogLevel.Fatal)
/** @internal */
const someError = Option.some(LogLevel.Error)
/** @internal */
const someWarning = Option.some(LogLevel.Warning)
/** @internal */
const someTrace = Option.some(LogLevel.Trace)
/** @internal */
const someInfo = Option.some(LogLevel.Info)
/** @internal */
const someDebug = Option.some(LogLevel.Debug)

/**
 * @macro traced
 * @internal
 */
export const log = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, internalCause.empty, Option.none)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logDebug = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, internalCause.empty, someDebug)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logDebugCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log("", cause, someDebug)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logDebugCauseMessage = <E>(
  message: string,
  cause: Cause.Cause<E>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, someDebug)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logError = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, internalCause.empty, someError)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logErrorCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log("", cause, someError)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logErrorCauseMessage = <E>(
  message: string,
  cause: Cause.Cause<E>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, someError)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logFatal = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, internalCause.empty, someFatal)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logFatalCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log("", cause, someFatal)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logFatalCauseMessage = <E>(
  message: string,
  cause: Cause.Cause<E>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, someFatal)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logInfo = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, internalCause.empty, someInfo)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logInfoCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log("", cause, someInfo)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logInfoCauseMessage = <E>(
  message: string,
  cause: Cause.Cause<E>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, someInfo)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logWarning = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, internalCause.empty, someWarning)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logWarningCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log("", cause, someWarning)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logWarningCauseMessage = <E>(
  message: string,
  cause: Cause.Cause<E>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, someWarning)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logTrace = (message: string): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, internalCause.empty, someTrace)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logTraceCause = <E>(cause: Cause.Cause<E>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log("", cause, someTrace)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logTraceCauseMessage = <E>(
  message: string,
  cause: Cause.Cause<E>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.withFiberRuntime<never, never, void>((fiberState) => {
    fiberState.log(message, cause, someTrace)
    return core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const logSpan = (label: string) => {
  const trace = getCallTrace()
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(
      core.fiberRefGet(core.currentLogSpan),
      core.flatMap((stack) =>
        pipe(
          Clock.currentTimeMillis(),
          core.flatMap((now) =>
            core.suspendSucceed(() => {
              const logSpan = LogSpan.make(label, now)
              return core.fiberRefLocally(core.currentLogSpan)(
                pipe(stack, Chunk.prepend(logSpan)) as Chunk.Chunk<LogSpan.LogSpan>
              )(effect)
            })
          )
        )
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const logAnnotate = (key: string, value: string) => {
  const trace = getCallTrace()
  return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return pipe(
      core.fiberRefGet(core.currentLogAnnotations),
      core.flatMap((annotations) =>
        core.suspendSucceed(() =>
          pipe(
            effect,
            core.fiberRefLocally(core.currentLogAnnotations)(
              (annotations as Map<string, string>).set(key, value) as ReadonlyMap<string, string>
            )
          )
        )
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const logAnnotations = (): Effect.Effect<never, never, ReadonlyMap<string, string>> => {
  const trace = getCallTrace()
  return core.fiberRefGet(core.currentLogAnnotations).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const loop = <Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, Chunk.Chunk<A>> => {
  const trace = getCallTrace()
  return loopInternal(initial, cont, inc, body).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
const loopInternal = <Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, Chunk.Chunk<A>> => {
  return core.suspendSucceed(() => {
    return cont(initial)
      ? pipe(
        body(initial),
        core.flatMap((a) =>
          pipe(
            loopInternal(inc(initial), cont, inc, body),
            core.map(Chunk.prepend(a))
          )
        )
      )
      : core.sync(() => Chunk.empty())
  })
}

/**
 * @macro traced
 * @internal
 */
export const loopDiscard = <Z, R, E, X>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect.Effect<R, E, X>
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => {
    return cont(initial)
      ? pipe(body(initial), core.flatMap(() => loopDiscard(inc(initial), cont, inc, body)))
      : core.unit()
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const mapAccum = <A, B, R, E, Z>(
  elements: Iterable<A>,
  zero: Z,
  f: (z: Z, a: A) => Effect.Effect<R, E, readonly [Z, B]>
): Effect.Effect<R, E, readonly [Z, Chunk.Chunk<B>]> => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => {
    const iterator = elements[Symbol.iterator]()
    const builder: Array<B> = []
    let result: Effect.Effect<R, E, Z> = core.succeed(zero)
    let next: IteratorResult<A, any>
    while (!(next = iterator.next()).done) {
      result = pipe(
        result,
        core.flatMap((state) =>
          pipe(
            f(state, next.value),
            core.map(([z, b]) => {
              builder.push(b)
              return z
            })
          )
        )
      )
    }
    return pipe(result, core.map((z) => [z, Chunk.unsafeFromArray(builder)] as const))
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const mapBoth = <E, A, E2, A2>(f: (e: E) => E2, g: (a: A) => A2) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E2, A2> => {
    return pipe(
      self,
      core.matchEffect(
        (e) => core.failSync(() => f(e)),
        (a) => core.sync(() => g(a))
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const mapErrorCause = <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E2, A> => {
    return pipe(
      self,
      core.matchCauseEffect((c) => core.failCauseSync(() => f(c)), core.succeed)
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const mapTryCatch = <A, B, E1>(f: (a: A) => B, onThrow: (u: unknown) => E1) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E | E1, B> => {
    return pipe(self, core.flatMap((a) => tryCatch(() => f(a), onThrow))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const memoize = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<never, never, Effect.Effect<R, E, A>> => {
  const trace = getCallTrace()
  return pipe(
    core.deferredMake<E, readonly [FiberRefsPatch.FiberRefsPatch, A]>(),
    core.flatMap((deferred) =>
      pipe(
        diffFiberRefs(self),
        core.intoDeferred(deferred),
        once,
        core.map((complete) =>
          pipe(
            complete,
            core.zipRight(
              pipe(
                core.deferredAwait(deferred),
                core.flatMap(([patch, a]) => pipe(patchFiberRefs(patch), core.as(a)))
              )
            )
          )
        )
      )
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const merge = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, E | A> => {
  const trace = getCallTrace()
  return pipe(self, core.matchEffect((e) => core.succeed(e), core.succeed)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const mergeAll = <Z, A>(zero: Z, f: (z: Z, a: A) => Z) => {
  const trace = getCallTrace()
  return <R, E>(elements: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, Z> => {
    return Array.from(elements).reduce(
      (acc, a) => pipe(acc, core.zipWith(a, f)),
      core.succeed(zero) as Effect.Effect<R, E, Z>
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const negate = <R, E>(self: Effect.Effect<R, E, boolean>): Effect.Effect<R, E, boolean> => {
  const trace = getCallTrace()
  return pipe(self, core.map((b) => !b)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const none = <R, E, A>(
  self: Effect.Effect<R, E, Option.Option<A>>
): Effect.Effect<R, Option.Option<E>, void> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.matchEffect(
      (e) => core.fail(Option.some(e)),
      (option) => {
        switch (option._tag) {
          case "None": {
            return core.unit()
          }
          case "Some": {
            return core.fail(Option.none)
          }
        }
      }
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const noneOrFail = <E>(option: Option.Option<E>): Effect.Effect<never, E, void> => {
  const trace = getCallTrace()
  return core.flip(getOrFailDiscard(option)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const noneOrFailWith = <E, A>(
  option: Option.Option<A>,
  f: (a: A) => E
): Effect.Effect<never, E, void> => {
  const trace = getCallTrace()
  return pipe(core.flip(getOrFailDiscard(option)), core.mapError(f)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const once = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<never, never, Effect.Effect<R, E, void>> => {
  const trace = getCallTrace()
  return pipe(
    Ref.make(true),
    core.map((ref) => pipe(self, core.whenEffect(pipe(ref, Ref.getAndSet(false))), core.asUnit))
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const option = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, never, Option.Option<A>> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.matchEffect(
      () => core.succeed(Option.none),
      (a) => core.succeed(Option.some(a))
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const orDieKeep = <R, E, A>(self: Effect.Effect<R, E, A>) => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.matchCauseEffect(
      (cause) => core.failCause(pipe(cause, internalCause.flatMap(internalCause.die))),
      core.succeed
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const orElseEither = <R2, E2, A2>(that: () => Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E2, Either.Either<A, A2>> => {
    return pipe(
      self,
      core.tryOrElse(
        () => pipe(that(), core.map(Either.right)),
        (a) => core.succeed(Either.left(a))
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const orElseFail = <E2>(evaluate: () => E2) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E2, A> => {
    return pipe(self, core.orElse(() => core.failSync(evaluate))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const orElseOptional = <R, E, A, R2, E2, A2>(
  that: () => Effect.Effect<R2, Option.Option<E2>, A2>
) => {
  const trace = getCallTrace()
  return (
    self: Effect.Effect<R, Option.Option<E>, A>
  ): Effect.Effect<R | R2, Option.Option<E | E2>, A | A2> => {
    return pipe(
      self,
      core.catchAll((option) => {
        switch (option._tag) {
          case "None": {
            return that()
          }
          case "Some": {
            return core.fail(Option.some<E | E2>(option.value))
          }
        }
      })
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const orElseSucceed = <A2>(evaluate: () => A2) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A | A2> => {
    return pipe(self, core.orElse(() => core.sync(evaluate))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const parallelErrors = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, Chunk.Chunk<E>, A> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.matchCauseEffect((cause) => {
      const errors = Chunk.fromIterable(internalCause.failures(cause))
      return errors.length === 0
        ? core.failCause(cause as Cause.Cause<never>)
        : core.fail(errors)
    }, core.succeed)
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const partition = <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, B>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]> => {
    return pipe(
      elements,
      core.forEach((a) => core.either(f(a))),
      core.map((chunk) => core.partitionMap(chunk, identity))
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const patchFiberRefs = (
  patch: FiberRefsPatch.FiberRefsPatch
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return updateFiberRefs(
    (fiberId, fiberRefs) => pipe(patch, fiberRefsPatch.patch(fiberId, fiberRefs))
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const promise = <A>(evaluate: () => Promise<A>): Effect.Effect<never, never, A> => {
  const trace = getCallTrace()
  return core.async<never, never, A>((resolve) => {
    evaluate()
      .then((a) => resolve(core.succeed(a)))
      .catch((e) => resolve(core.die(e)))
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const promiseInterrupt = <A>(evaluate: (signal: AbortSignal) => Promise<A>): Effect.Effect<never, never, A> => {
  const trace = getCallTrace()
  return core.asyncInterruptEither<never, never, A>((resolve) => {
    const controller = new AbortController()
    evaluate(controller.signal)
      .then((a) => resolve(core.succeed(a)))
      .catch((e) => resolve(core.die(e)))
    return Either.left(core.sync(() => controller.abort()))
  })
    .traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const provideService = <T>(tag: Context.Tag<T>) =>
  (resource: T) => {
    const trace = getCallTrace()
    return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<Exclude<R, T>, E, A> => {
      return pipe(self, provideServiceEffect(tag)(core.succeed(resource))).traced(trace)
    }
  }

/**
 * @macro traced
 * @internal
 */
export const provideServiceEffect = <T>(tag: Context.Tag<T>) =>
  <R1, E1>(effect: Effect.Effect<R1, E1, T>) => {
    const trace = getCallTrace()
    return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R1 | Exclude<R, T>, E | E1, A> => {
      return core.environmentWithEffect((env: Context.Context<R1 | Exclude<R, T>>) =>
        pipe(
          effect,
          core.flatMap((service) =>
            pipe(self, core.provideEnvironment(pipe(env, Context.add(tag)(service)) as Context.Context<R | R1>))
          )
        )
      ).traced(trace)
    }
  }

/**
 * @macro traced
 * @internal
 */
export const random = (): Effect.Effect<never, never, Random.Random> => {
  const trace = getCallTrace()
  return randomWith(core.succeed).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const randomWith: <R, E, A>(f: (random: Random.Random) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
  Random.randomWith

/**
 * @macro traced
 * @internal
 */
export const reduce = <Z, A, R, E>(zero: Z, f: (z: Z, a: A) => Effect.Effect<R, E, Z>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Z> => {
    return Array.from(elements).reduce(
      (acc, el) => pipe(acc, core.flatMap((a) => f(a, el))),
      core.succeed(zero) as Effect.Effect<R, E, Z>
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const reduceAll = <R, E, A>(zero: Effect.Effect<R, E, A>, f: (acc: A, a: A) => A) => {
  const trace = getCallTrace()
  return (elements: Iterable<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A> => {
    return Array.from(elements).reduce((acc, a) => pipe(acc, core.zipWith(a, f)), zero).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const reduceRight = <A, Z, R, E>(zero: Z, f: (a: A, z: Z) => Effect.Effect<R, E, Z>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Z> => {
    return Array.from(elements).reduceRight(
      (acc, el) => pipe(acc, core.flatMap((a) => f(el, a))),
      core.succeed(zero) as Effect.Effect<R, E, Z>
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const reduceWhile = <A, R, E, Z>(
  zero: Z,
  p: Predicate<Z>,
  f: (s: Z, a: A) => Effect.Effect<R, E, Z>
) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Z> => {
    const iterator = elements[Symbol.iterator]()
    let next: IteratorResult<A, any>
    let acc: Effect.Effect<R, E, Z> = core.succeed(zero)
    while (!(next = iterator.next()).done) {
      acc = pipe(acc, core.flatMap((z) => f(z, next.value)))
    }
    return acc.traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const refineOrDie = <E, E1>(pf: (e: E) => Option.Option<E1>) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E1, A> => {
    return pipe(self, refineOrDieWith(pf, identity)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const reject = <A, E1>(pf: (a: A) => Option.Option<E1>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E | E1, A> => {
    return pipe(self, rejectEffect((a) => pipe(pf(a), Option.map(core.fail)))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const rejectEffect = <A, R1, E1>(pf: (a: A) => Option.Option<Effect.Effect<R1, E1, E1>>) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E | E1, A> => {
    return pipe(
      self,
      core.flatMap((a) => {
        const option = pf(a)
        switch (option._tag) {
          case "None": {
            return core.succeed(a)
          }
          case "Some": {
            return pipe(option.value, core.flatMap(core.fail))
          }
        }
      })
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const refineOrDieWith = <E, E1>(
  pf: (e: E) => Option.Option<E1>,
  f: (e: E) => unknown
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E1, A> => {
    return pipe(
      self,
      core.catchAll((e) => {
        const option = pf(e)
        switch (option._tag) {
          case "None": {
            return core.die(f(e))
          }
          case "Some": {
            return core.fail(option.value)
          }
        }
      })
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const repeatN = (n: number) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return core.suspendSucceed(() => repeatNLoop(self, n)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
const repeatNLoop = <R, E, A>(self: Effect.Effect<R, E, A>, n: number): Effect.Effect<R, E, A> => {
  return pipe(
    self,
    core.flatMap((a) =>
      n <= 0 ?
        core.succeed(a) :
        pipe(core.yieldNow(), core.zipRight(repeatNLoop(self, n - 1)))
    )
  )
}

/**
 * @macro traced
 * @internal
 */
export const replicate = (n: number) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Chunk.Chunk<Effect.Effect<R, E, A>> => {
    return Chunk.unsafeFromArray(Array.from({ length: n }, () => self))
  }
}

/**
 * @macro traced
 * @internal
 */
export const replicateEffect = (n: number) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, Chunk.Chunk<A>> => {
    return collectAll(replicate(n)(self)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const replicateEffectDiscard = (n: number) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, void> => {
    return collectAllDiscard(replicate(n)(self)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const resurrect = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, unknown, A> => {
  const trace = getCallTrace()
  return pipe(self, unrefineWith(Option.some, identity)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const right = <R, E, A, B>(
  self: Effect.Effect<R, E, Either.Either<A, B>>
): Effect.Effect<R, Either.Either<A, E>, B> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.matchEffect(
      (e) => core.fail(Either.right(e)),
      (either) => {
        switch (either._tag) {
          case "Left": {
            return core.fail(Either.left(either.left))
          }
          case "Right": {
            return core.succeed(either.right)
          }
        }
      }
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const rightWith = <R, E, A, A1, B, B1, R1, E1>(
  f: (effect: Effect.Effect<R, Either.Either<A, E>, B>) => Effect.Effect<R1, Either.Either<A1, E1>, B1>
) => {
  const trace = getCallTrace()
  return (
    self: Effect.Effect<R, E, Either.Either<A, B>>
  ): Effect.Effect<R | R1, E | E1, Either.Either<A1, B1>> => {
    return core.suspendSucceed(() => unright(f(right(self)))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const sandbox = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, Cause.Cause<E>, A> => {
  const trace = getCallTrace()
  return pipe(self, core.matchCauseEffect(core.fail, core.succeed)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const setFiberRefs = (fiberRefs: FiberRefs.FiberRefs): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => FiberRefs.setAll(fiberRefs)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const sleep: (duration: Duration.Duration) => Effect.Effect<never, never, void> = Clock.sleep

/**
 * @macro traced
 * @internal
 */
export const someOrElse = <B>(orElse: () => B) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, Option.Option<A>>): Effect.Effect<R, E, A | B> => {
    return pipe(
      self,
      core.map((option) => {
        switch (option._tag) {
          case "None": {
            return orElse()
          }
          case "Some": {
            return option.value
          }
        }
      })
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const someOrElseEffect = <R2, E2, A2>(orElse: () => Effect.Effect<R2, E2, A2>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, Option.Option<A>>): Effect.Effect<R | R2, E | E2, A | A2> => {
    return pipe(
      self as Effect.Effect<R, E, Option.Option<A | A2>>,
      core.flatMap((option) => pipe(option, Option.map(core.succeed), Option.getOrElse(() => orElse())))
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const someOrFail = <E2>(orFail: () => E2) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, Option.Option<A>>): Effect.Effect<R, E | E2, A> => {
    return pipe(
      self,
      core.flatMap((option) => {
        switch (option._tag) {
          case "None": {
            return pipe(core.sync(orFail), core.flatMap(core.fail))
          }
          case "Some": {
            return core.succeed(option.value)
          }
        }
      })
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const someOrFailException = <R, E, A>(
  self: Effect.Effect<R, E, Option.Option<A>>
): Effect.Effect<R, E | Cause.NoSuchElementException, A> => {
  const trace = getCallTrace()
  return pipe(self, someOrFail(() => internalCause.NoSuchElementException())).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const succeedLeft = <A>(value: A): Effect.Effect<never, never, Either.Either<A, never>> => {
  const trace = getCallTrace()
  return core.succeed(Either.left(value)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const succeedNone = (): Effect.Effect<never, never, Option.Option<never>> => {
  const trace = getCallTrace()
  return core.succeed(Option.none).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const succeedRight = <A>(value: A): Effect.Effect<never, never, Either.Either<never, A>> => {
  const trace = getCallTrace()
  return core.succeed(Either.right(value)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const succeedSome = <A>(value: A): Effect.Effect<never, never, Option.Option<A>> => {
  const trace = getCallTrace()
  return core.succeed(Option.some(value)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const summarized = <R2, E2, B, C>(
  summary: Effect.Effect<R2, E2, B>,
  f: (start: B, end: B) => C
) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, readonly [C, A]> => {
    return pipe(
      summary,
      core.flatMap((start) =>
        pipe(
          self,
          core.flatMap((value) =>
            pipe(
              summary,
              core.map((end) => [f(start, end), value] as const)
            )
          )
        )
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const suspend = <R, E, A>(
  evaluate: () => Effect.Effect<R, E, A>
): Effect.Effect<R, unknown, A> => {
  const trace = getCallTrace()
  return pipe(attempt(evaluate), core.flatMap(identity)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const struct = <NER extends Record<string, Effect.Effect<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> | Record<string, Effect.Effect<any, any, any>>
): Effect.Effect<
  [NER[keyof NER]] extends [{ [core.EffectTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [NER[keyof NER]] extends [{ [core.EffectTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  {
    [K in keyof NER]: [NER[K]] extends [{ [core.EffectTypeId]: { _A: (_: never) => infer A } }] ? A : never
  }
> => {
  const trace = getCallTrace()
  return pipe(
    Object.entries(r),
    core.forEach(([_, e]) => pipe(e, core.map((a) => [_, a] as const))),
    core.map((values) => {
      const res = {}
      for (const [k, v] of values) {
        res[k] = v
      }
      return res
    })
  ).traced(trace) as any
}

/**
 * @macro traced
 * @internal
 */
export const tagged = (key: string, value: string) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
    pipe(self, taggedWithLabels(metricLabel.make(key, value))).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const taggedWithLabels = <Labels extends readonly [MetricLabel.MetricLabel, ...Array<MetricLabel.MetricLabel>]>(
  ...labels: Labels
) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
    pipe(self, taggedWithLabelSet(HashSet.from(labels))).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const taggedWithLabelSet = (labels: HashSet.HashSet<MetricLabel.MetricLabel>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
    pipe(
      self,
      core.fiberRefLocallyWith(core.currentTags)((set) => pipe(set, HashSet.union(labels)))
    ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const takeWhile = <R, E, A>(predicate: (a: A) => Effect.Effect<R, E, boolean>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, E, Chunk.Chunk<A>> => {
    return core.suspendSucceed(() => {
      const iterator = elements[Symbol.iterator]()
      const builder: Array<A> = []
      let next: IteratorResult<A, any>
      let taking: Effect.Effect<R, E, boolean> = core.succeed(true)
      while ((next = iterator.next()) && !next.done) {
        const a = next.value
        taking = pipe(
          taking,
          core.flatMap((taking) =>
            pipe(
              taking ? predicate(a) : core.succeed(false),
              core.map((bool) => {
                if (bool) {
                  builder.push(a)
                }
                return bool
              })
            )
          )
        )
      }
      return pipe(taking, core.map(() => Chunk.unsafeFromArray(builder)))
    }).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const tapBoth = <E, A, R2, E2, X, R3, E3, X1>(
  f: (e: E) => Effect.Effect<R2, E2, X>,
  g: (a: A) => Effect.Effect<R3, E3, X1>
) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2 | R3, E | E2 | E3, A> => {
    return pipe(
      self,
      core.matchCauseEffect(
        (cause) => {
          const either = internalCause.failureOrCause(cause)
          switch (either._tag) {
            case "Left": {
              return pipe(f(either.left), core.zipRight(core.failCause(cause)))
            }
            case "Right": {
              return core.failCause(cause)
            }
          }
        },
        (a) => pipe(g(a), core.as(a))
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const tapDefect = <R2, E2, X>(f: (cause: Cause.Cause<never>) => Effect.Effect<R2, E2, X>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A> =>
    pipe(
      self,
      core.catchAllCause((cause) =>
        pipe(
          internalCause.keepDefects(cause),
          Option.match(
            () => core.failCause(cause),
            (a) =>
              pipe(
                f(a),
                core.zipRight(core.failCause(cause))
              )
          )
        )
      )
    ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const tapEither = <E, A, R2, E2, X>(
  f: (either: Either.Either<E, A>) => Effect.Effect<R2, E2, X>
) => {
  const trace = getCallTrace()
  return <R>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A> => {
    return pipe(
      self,
      core.matchCauseEffect(
        (cause) => {
          const either = internalCause.failureOrCause(cause)
          switch (either._tag) {
            case "Left": {
              return pipe(f(either), core.zipRight(core.failCause(cause)))
            }
            case "Right": {
              return core.failCause(cause)
            }
          }
        },
        (a) => pipe(f(Either.right(a)), core.as(a))
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const tapError = <E, R2, E2, X>(f: (e: E) => Effect.Effect<R2, E2, X>) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A> => {
    return pipe(
      self,
      core.matchCauseEffect(
        (cause) => {
          const either = internalCause.failureOrCause(cause)
          switch (either._tag) {
            case "Left": {
              return pipe(f(either.left), core.zipRight(core.failCause(cause)))
            }
            case "Right": {
              return core.failCause(cause)
            }
          }
        },
        core.succeed
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const tapErrorCause = <E, R2, E2, X>(
  f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, X>
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, A> => {
    return pipe(
      self,
      core.matchCauseEffect(
        (cause) => pipe(f(cause), core.zipRight(core.failCause(cause))),
        core.succeed
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const tapSome = <A, R1, E1, X>(
  pf: (a: A) => Option.Option<Effect.Effect<R1, E1, X>>
) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E | E1, A> => {
    return pipe(
      self,
      core.tap((a) =>
        pipe(
          pf(a),
          Option.map(core.asUnit),
          Option.getOrElse(() => core.unit())
        )
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const timed = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R, E, readonly [Duration.Duration, A]> => {
  const trace = getCallTrace()
  return pipe(self, timedWith(Clock.currentTimeMillis())).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const timedWith = <R1, E1>(milliseconds: Effect.Effect<R1, E1, number>) => {
  const trace = getCallTrace()
  return <R, E, A>(
    self: Effect.Effect<R, E, A>
  ): Effect.Effect<R | R1, E | E1, readonly [Duration.Duration, A]> => {
    return pipe(self, summarized(milliseconds, (start, end) => Duration.millis(end - start))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const tryCatch = <E, A>(
  attempt: () => A,
  onThrow: (u: unknown) => E
): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  return core.sync(() => {
    try {
      return attempt()
    } catch (error) {
      throw core.makeEffectError(internalCause.fail(onThrow(error)))
    }
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const tryCatchPromise = <E, A>(
  evaluate: () => Promise<A>,
  onReject: (reason: unknown) => E
): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  return pipe(
    tryCatch(evaluate, onReject),
    core.flatMap((promise) =>
      core.async<never, E, A>((resolve) => {
        promise
          .then((a) => resolve(core.succeed(a)))
          .catch((e) => resolve(core.fail(onReject(e))))
      })
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const tryCatchPromiseInterrupt = <E, A>(
  evaluate: (signal: AbortSignal) => Promise<A>,
  onReject: (reason: unknown) => E
): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  return core.suspendSucceed(() => {
    const controller = new AbortController()
    return pipe(
      tryCatch(() => evaluate(controller.signal), onReject),
      core.flatMap((promise) =>
        core.async<never, E, A>((resolve) => {
          promise
            .then((a) => resolve(core.succeed(a)))
            .catch((e) => resolve(core.fail(onReject(e))))
        })
      )
    )
  }).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const tryPromise = <A>(evaluate: () => Promise<A>): Effect.Effect<never, unknown, A> => {
  const trace = getCallTrace()
  return pipe(
    attempt(evaluate),
    core.flatMap((promise) =>
      core.async<never, unknown, A>((resolve) => {
        promise
          .then((a) => resolve(core.succeed(a)))
          .catch((e) => resolve(core.fail(e)))
      })
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const tryPromiseInterrupt = <A>(
  evaluate: (signal: AbortSignal) => Promise<A>
): Effect.Effect<never, unknown, A> => {
  const trace = getCallTrace()
  return pipe(
    attempt(() => {
      const controller = new AbortController()
      return [controller, evaluate(controller.signal)] as const
    }),
    core.flatMap(([controller, promise]) =>
      core.asyncInterruptEither<never, unknown, A>((resolve) => {
        promise
          .then((a) => resolve(core.succeed(a)))
          .catch((e) => resolve(core.fail(e)))
        return Either.left(core.sync(() => controller.abort()))
      })
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const tuple = <T extends NonEmptyArrayEffect>(
  ...t: T
): Effect.Effect<
  [T[number]] extends [{ [core.EffectTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [T[number]] extends [{ [core.EffectTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  TupleEffect<T>
> => {
  const trace = getCallTrace()
  return pipe(collectAll(t), core.map(Chunk.toReadonlyArray)).traced(trace) as any
}

/**
 * @macro traced
 * @internal
 */
export const uncause = <R, E>(
  self: Effect.Effect<R, never, Cause.Cause<E>>
): Effect.Effect<R, E, void> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.flatMap((cause) => internalCause.isEmpty(cause) ? core.unit() : core.failCause(cause))
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const unfold = <A, R, E, S>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, Option.Option<readonly [A, S]>>
): Effect.Effect<R, E, Chunk.Chunk<A>> => {
  const trace = getCallTrace()
  return pipe(
    unfoldLoop(s, f, Chunk.empty()),
    core.map((list) => Chunk.reverse(list))
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
const unfoldLoop = <A, R, E, S>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, Option.Option<readonly [A, S]>>,
  builder: Chunk.Chunk<A>
): Effect.Effect<R, E, Chunk.Chunk<A>> => {
  return pipe(
    f(s),
    core.flatMap((option) => {
      if (Option.isSome(option)) {
        return unfoldLoop(option.value[1], f, pipe(builder, Chunk.prepend(option.value[0])))
      } else {
        return core.succeed(builder)
      }
    })
  )
}

/**
 * @macro traced
 * @internal
 */
export const unleft = <R, E, B, A>(
  self: Effect.Effect<R, Either.Either<E, B>, A>
): Effect.Effect<R, E, Either.Either<A, B>> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.matchEffect(
      (either) => {
        switch (either._tag) {
          case "Left": {
            return core.fail(either.left)
          }
          case "Right": {
            return core.succeed(either)
          }
        }
      },
      (a) => core.succeed(Either.left(a))
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const unless = (predicate: () => boolean) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, Option.Option<A>> => {
    return core.suspendSucceed(() => predicate() ? succeedNone() : asSome(self)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const unlessEffect = <R2, E2>(predicate: Effect.Effect<R2, E2, boolean>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, Option.Option<A>> => {
    return pipe(predicate, core.flatMap((b) => (b ? succeedNone() : asSome(self)))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const unrefine = <E1>(pf: (u: unknown) => Option.Option<E1>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E | E1, A> => {
    return pipe(self, unrefineWith(pf, identity)).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const unrefineWith = <E, E1, E2>(
  pf: (u: unknown) => Option.Option<E1>,
  f: (e: E) => E2
) => {
  const trace = getCallTrace()
  return <R, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E1 | E2, A> => {
    return pipe(
      self,
      core.catchAllCause(
        (cause): Effect.Effect<R, E1 | E2, A> => {
          const option = pipe(
            cause,
            internalCause.find((cause) => (internalCause.isDieType(cause) ? pf(cause.defect) : Option.none))
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
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const unright = <R, B, E, A>(
  self: Effect.Effect<R, Either.Either<B, E>, A>
): Effect.Effect<R, E, Either.Either<B, A>> => {
  const trace = getCallTrace()
  return pipe(
    self,
    core.matchEffect(
      (either) => {
        switch (either._tag) {
          case "Left": {
            return core.succeed(Either.left(either.left))
          }
          case "Right": {
            return core.fail(either.right)
          }
        }
      },
      (a) => core.succeed(Either.right(a))
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const unsandbox = <R, E, A>(self: Effect.Effect<R, Cause.Cause<E>, A>) => {
  const trace = getCallTrace()
  return pipe(self, mapErrorCause(internalCause.flatten)).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const updateFiberRefs = (
  f: (fiberId: FiberId.Runtime, fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs
): Effect.Effect<never, never, void> => {
  return core.withFiberRuntime((state) => {
    state.setFiberRefs(f(state.id(), state.unsafeGetFiberRefs()))
    return core.unit()
  })
}

/**
 * @macro traced
 * @internal
 */
export const updateService = <T>(tag: Context.Tag<T>) => {
  const trace = getCallTrace()
  return <T1 extends T>(f: (_: T) => T1) => {
    return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | T, E, A> => {
      return pipe(
        self,
        core.provideSomeEnvironment((env) => pipe(env, Context.add(tag)(f(pipe(env, Context.unsafeGet(tag))))))
      ).traced(trace) as Effect.Effect<R | T, E, A>
    }
  }
}

/**
 * @macro traced
 * @internal
 */
export const validate = <R1, E1, B>(that: Effect.Effect<R1, E1, B>) => {
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E | E1, readonly [A, B]> => {
    return pipe(self, validateWith(that, (a, b) => [a, b] as const))
  }
}

/**
 * @macro traced
 * @internal
 */
export const validateAll = <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, B>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, Chunk.Chunk<E>, Chunk.Chunk<B>> => {
    return pipe(
      elements,
      partition(f),
      core.flatMap(([es, bs]) =>
        Chunk.isEmpty(es)
          ? core.succeed(bs)
          : core.fail(es)
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const validateAllDiscard = <R, E, A, X>(f: (a: A) => Effect.Effect<R, E, X>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, Chunk.Chunk<E>, void> => {
    return pipe(
      elements,
      partition(f),
      core.flatMap(([es, _]) =>
        Chunk.isEmpty(es) ?
          core.unit() :
          core.fail(es)
      )
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const validateFirst = <R, E, A, B>(f: (a: A) => Effect.Effect<R, E, B>) => {
  const trace = getCallTrace()
  return (elements: Iterable<A>): Effect.Effect<R, Chunk.Chunk<E>, B> => {
    return pipe(elements, core.forEach((a) => core.flip(f(a))), core.flip).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const validateWith = <A, R1, E1, B, C>(that: Effect.Effect<R1, E1, B>, f: (a: A, b: B) => C) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R1, E | E1, C> => {
    return pipe(
      core.exit(self),
      core.zipWith(
        core.exit(that),
        (ea, eb) => pipe(ea, core.exitZipWith(eb, f, (ca, cb) => internalCause.sequential(ca, cb)))
      ),
      core.flatten
    ).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const when = (predicate: () => boolean) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, Option.Option<A>> => {
    return core.suspendSucceed(() => predicate() ? pipe(self, core.map(Option.some)) : core.succeed(Option.none))
      .traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const whenCase = <R, E, A, B>(
  evaluate: () => A,
  pf: (a: A) => Option.Option<Effect.Effect<R, E, B>>
): Effect.Effect<R, E, Option.Option<B>> => {
  const trace = getCallTrace()
  return pipe(
    core.sync(evaluate),
    core.flatMap((a) =>
      pipe(
        pf(a),
        Option.map(asSome),
        Option.getOrElse(() => succeedNone())
      )
    )
  ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const whenCaseEffect = <A, R2, E2, A2>(
  pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
) => {
  const trace = getCallTrace()
  return <R, E>(self: Effect.Effect<R, E, A>): Effect.Effect<R | R2, E | E2, Option.Option<A2>> => {
    return pipe(self, core.flatMap((a) => whenCase(() => a, pf))).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const whenFiberRef = <S>(fiberRef: FiberRef.FiberRef<S>, predicate: Predicate<S>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, readonly [S, Option.Option<A>]> =>
    pipe(
      core.fiberRefGet(fiberRef),
      core.flatMap((s) =>
        predicate(s) ?
          pipe(self, core.map((a) => [s, Option.some(a)] as const)) :
          core.succeed<readonly [S, Option.Option<A>]>([s, Option.none])
      )
    ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const whenRef = <S>(ref: Ref.Ref<S>, predicate: Predicate<S>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, readonly [S, Option.Option<A>]> =>
    pipe(
      Ref.get(ref),
      core.flatMap((s) =>
        predicate(s) ?
          pipe(self, core.map((a) => [s, Option.some(a)] as const)) :
          core.succeed<readonly [S, Option.Option<A>]>([s, Option.none])
      )
    ).traced(trace)
}

/**
 * @macro traced
 * @internal
 */
export const withMetric = <Type, In, Out>(metric: Metric.Metric<Type, In, Out>) => {
  const trace = getCallTrace()
  return <R, E, A extends In>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> => {
    return metric(self).traced(trace)
  }
}

/**
 * @macro traced
 * @internal
 */
export const withSpan = (name: string, attributes?: Record<string, string>) => {
  const trace = getCallTrace()
  return <R, E, A>(self: Effect.Effect<R, E, A>) =>
    core.withFiberRuntime<R, E, A>((fiber) => {
      const tracerMaybe = fiber.getFiberRef(currentTracer)
      if (tracerMaybe._tag === "Some") {
        const tracer = tracerMaybe.value
        const parentSpan = fiber.getFiberRef(tracer.ref)
        const span = tracer.create(name, attributes ?? {}, parentSpan, trace)
        return core.acquireUseRelease(
          pipe(core.fiberRefGet(tracer.ref), core.zipLeft(core.fiberRefSet(tracer.ref)(span))),
          () => self,
          (oldValue, exit) => {
            tracer.status(span, exit)
            tracer.end(span)
            return core.fiberRefSet(tracer.ref)(oldValue)
          }
        )
      }
      return self
    })
      .traced(trace)
}
