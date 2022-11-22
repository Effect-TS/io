import type * as Cause from "@effect/io/Cause"
import * as Clock from "@effect/io/Clock"
import { getCallTrace } from "@effect/io/Debug"
import type * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import type * as Fiber from "@effect/io/Fiber"
import * as FiberId from "@effect/io/Fiber/Id"
import * as FiberStatus from "@effect/io/Fiber/Status"
import * as core from "@effect/io/internal/core"
import * as fiberScope from "@effect/io/internal/fiberScope"
import * as runtimeFlags from "@effect/io/internal/runtimeFlags"
import * as order from "@fp-ts/core/typeclass/Order"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Either from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as number from "@fp-ts/data/Number"
import * as Option from "@fp-ts/data/Option"

/** @internal */
const FiberSymbolKey = "@effect/io/Fiber"

/** @internal */
export const FiberTypeId: Fiber.FiberTypeId = Symbol.for(
  FiberSymbolKey
) as Fiber.FiberTypeId

/** @internal */
export const fiberVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
const RuntimeFiberSymbolKey = "@effect/io/Fiber"

/** @internal */
export const RuntimeFiberTypeId: Fiber.RuntimeFiberTypeId = Symbol.for(
  RuntimeFiberSymbolKey
) as Fiber.RuntimeFiberTypeId

/** @internal */
export const Order: order.Order<Fiber.RuntimeFiber<unknown, unknown>> = pipe(
  order.tuple(number.Order, number.Order),
  order.contramap((fiber: Fiber.RuntimeFiber<unknown, unknown>) =>
    [
      (fiber.id() as FiberId.Runtime).startTimeMillis,
      (fiber.id() as FiberId.Runtime).id
    ] as const
  )
)

/** @internal */
export const isFiber = (u: unknown): u is Fiber.Fiber<unknown, unknown> => {
  return typeof u === "object" && u != null && FiberTypeId in u
}

/** @internal */
export const isRuntimeFiber = <E, A>(self: Fiber.Fiber<E, A>): self is Fiber.RuntimeFiber<E, A> => {
  return RuntimeFiberTypeId in self
}

/** @internal */
export const _await = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, Exit.Exit<E, A>> => {
  const trace = getCallTrace()
  return self.await().traced(trace)
}

/** @internal */
export const children = <E, A>(
  self: Fiber.Fiber<E, A>
): Effect.Effect<never, never, Chunk.Chunk<Fiber.RuntimeFiber<any, any>>> => {
  const trace = getCallTrace()
  return self.children().traced(trace)
}

/** @internal */
export const done = <E, A>(exit: Exit.Exit<E, A>): Fiber.Fiber<E, A> => {
  return {
    [FiberTypeId]: fiberVariance,
    id: () => FiberId.none,
    await: () => {
      const trace = getCallTrace()
      return core.succeed(exit).traced(trace)
    },
    children: () => {
      const trace = getCallTrace()
      return core.succeed(Chunk.empty).traced(trace)
    },
    inheritAll: () => {
      const trace = getCallTrace()
      return core.unit().traced(trace)
    },
    poll: () => {
      const trace = getCallTrace()
      return core.succeed(Option.some(exit)).traced(trace)
    },
    interruptWithFork: () => {
      const trace = getCallTrace()
      return core.unit().traced(trace)
    }
  }
}

/** @internal */
export const dump = <E, A>(self: Fiber.RuntimeFiber<E, A>): Effect.Effect<never, never, Fiber.Fiber.Dump> => {
  const trace = getCallTrace()
  return pipe(self.status(), core.map((status) => ({ id: self.id(), status }))).traced(trace)
}

/** @internal */
export const dumpAll = (
  fibers: Iterable<Fiber.RuntimeFiber<unknown, unknown>>
): Effect.Effect<never, never, Chunk.Chunk<Fiber.Fiber.Dump>> => {
  const trace = getCallTrace()
  return pipe(fibers, core.forEach(dump)).traced(trace)
}

/** @internal */
export const fail = <E>(error: E): Fiber.Fiber<E, never> => {
  return done(Exit.fail(error))
}

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Fiber.Fiber<E, never> => {
  return done(Exit.failCause(cause))
}

/** @internal */
export const fromEffect = <E, A>(
  effect: Effect.Effect<never, E, A>
): Effect.Effect<never, never, Fiber.Fiber<E, A>> => {
  const trace = getCallTrace()
  return pipe(core.exit(effect), core.map(done)).traced(trace)
}

/** @internal */
export const id = <E, A>(self: Fiber.Fiber<E, A>): FiberId.FiberId => {
  return self.id()
}

/** @internal */
export const inheritAll = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return self.inheritAll().traced(trace)
}

/** @internal */
export const interrupted = (fiberId: FiberId.FiberId): Fiber.Fiber<never, never> => {
  return done(Exit.interrupt(fiberId))
}

/** @internal */
export const interruptAll = (
  fibers: Iterable<Fiber.Fiber<any, any>>
): Effect.Effect<never, never, void> => {
  const trace = getCallTrace()
  return pipe(core.fiberId(), core.flatMap((fiberId) => pipe(fibers, interruptAllWith(fiberId)))).traced(trace)
}

/** @internal */
export const interruptAllWith = (fiberId: FiberId.FiberId) => {
  const trace = getCallTrace()
  return (fibers: Iterable<Fiber.Fiber<any, any>>): Effect.Effect<never, never, void> => {
    return pipe(
      fibers,
      core.forEachDiscard(interruptWithFork(fiberId)),
      core.zipRight(pipe(fibers, core.forEachDiscard(_await)))
    ).traced(trace)
  }
}

/** @internal */
export const interruptWithFork = (fiberId: FiberId.FiberId) => {
  const trace = getCallTrace()
  return <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, never, void> => {
    return self.interruptWithFork(fiberId).traced(trace)
  }
}

/** @internal */
export const join = <E, A>(self: Fiber.Fiber<E, A>): Effect.Effect<never, E, A> => {
  const trace = getCallTrace()
  return pipe(self.await(), core.flatten, core.zipLeft(self.inheritAll())).traced(trace)
}

/** @internal */
export const map = <A, B>(f: (a: A) => B) => {
  return <E>(self: Fiber.Fiber<E, A>): Fiber.Fiber<E, B> => {
    return pipe(self, mapEffect((a) => core.sync(() => f(a))))
  }
}

/** @internal */
export const mapEffect = <A, E2, A2>(f: (a: A) => Effect.Effect<never, E2, A2>) => {
  return <E>(self: Fiber.Fiber<E, A>): Fiber.Fiber<E | E2, A2> => {
    return {
      [FiberTypeId]: fiberVariance,
      id: () => self.id(),
      await: () => {
        const trace = getCallTrace()
        return pipe(self.await(), core.flatMap(Exit.forEachEffect(f))).traced(trace)
      },
      children: () => {
        const trace = getCallTrace()
        return self.children().traced(trace)
      },
      inheritAll: () => {
        const trace = getCallTrace()
        return self.inheritAll().traced(trace)
      },
      poll: () => {
        const trace = getCallTrace()
        return pipe(
          self.poll(),
          core.flatMap((result) => {
            switch (result._tag) {
              case "None": {
                return core.succeed(Option.none)
              }
              case "Some": {
                return pipe(result.value, Exit.forEachEffect(f), core.map(Option.some))
              }
            }
          })
        ).traced(trace)
      },
      interruptWithFork: (id) => {
        const trace = getCallTrace()
        return self.interruptWithFork(id).traced(trace)
      }
    }
  }
}

/** @internal */
export const mapFiber = <E, E1, A, B>(f: (a: A) => Fiber.Fiber<E1, B>) => {
  const trace = getCallTrace()
  return (self: Fiber.Fiber<E, A>): Effect.Effect<never, never, Fiber.Fiber<E | E1, B>> => {
    return pipe(
      self.await(),
      core.map(Exit.match(
        (cause): Fiber.Fiber<E | E1, B> => failCause(cause),
        (a) => f(a)
      ))
    ).traced(trace)
  }
}

/** @internal */
export function match<E, A, Z>(
  onFiber: (_: Fiber.Fiber<E, A>) => Z,
  onRuntimeFiber: (_: Fiber.RuntimeFiber<E, A>) => Z
) {
  return (self: Fiber.Fiber<E, A>): Z => {
    if (isRuntimeFiber(self)) {
      return onRuntimeFiber(self)
    }
    return onFiber(self)
  }
}

/** @internal */
export const never = (): Fiber.Fiber<never, never> => ({
  [FiberTypeId]: fiberVariance,
  id: () => FiberId.none,
  await: () => {
    const trace = getCallTrace()
    return core.never().traced(trace)
  },
  children: () => {
    const trace = getCallTrace()
    return core.succeed(Chunk.empty).traced(trace)
  },
  inheritAll: () => {
    const trace = getCallTrace()
    return core.never().traced(trace)
  },
  poll: () => {
    const trace = getCallTrace()
    return core.succeed(Option.none).traced(trace)
  },
  interruptWithFork: () => {
    const trace = getCallTrace()
    return core.never().traced(trace)
  }
})

/** @internal */
export const orElse = <E2, A2>(that: Fiber.Fiber<E2, A2>) => {
  return <E, A>(self: Fiber.Fiber<E, A>): Fiber.Fiber<E | E2, A | A2> => ({
    [FiberTypeId]: fiberVariance,
    id: () => pipe(self.id(), FiberId.getOrElse(that.id())),
    await: () => {
      const trace = getCallTrace()
      return pipe(
        self.await(),
        core.zipWith(
          that.await(),
          (exit1, exit2) => (Exit.isSuccess(exit1) ? exit1 : exit2)
        )
      ).traced(trace)
    },
    children: () => {
      const trace = getCallTrace()
      return self.children().traced(trace)
    },
    inheritAll: () => {
      const trace = getCallTrace()
      return pipe(that.inheritAll(), core.zipRight(self.inheritAll())).traced(trace)
    },
    poll: () => {
      const trace = getCallTrace()
      return pipe(
        self.poll(),
        core.zipWith(
          that.poll(),
          (option1, option2) => {
            switch (option1._tag) {
              case "None": {
                return Option.none
              }
              case "Some": {
                return Exit.isSuccess(option1.value) ? option1 : option2
              }
            }
          }
        )
      ).traced(trace)
    },
    interruptWithFork: (id) => {
      const trace = getCallTrace()
      return pipe(
        self,
        core.interruptWithFiber(id),
        core.zipRight(pipe(that, core.interruptWithFiber(id))),
        core.asUnit
      ).traced(trace)
    }
  })
}

/** @internal */
export const orElseEither = <E2, A2>(that: Fiber.Fiber<E2, A2>) => {
  return <E, A>(self: Fiber.Fiber<E, A>): Fiber.Fiber<E | E2, Either.Either<A, A2>> => {
    return pipe(self, map(Either.left), orElse(pipe(that, map(Either.right))))
  }
}

/** @internal */
export const poll = <E, A>(
  self: Fiber.Fiber<E, A>
): Effect.Effect<never, never, Option.Option<Exit.Exit<E, A>>> => {
  const trace = getCallTrace()
  return self.poll().traced(trace)
}

// forked from https://github.com/sindresorhus/parse-ms/blob/4da2ffbdba02c6e288c08236695bdece0adca173/index.js
// MIT License
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
/** @internal */
const parseMs = (milliseconds: number) => {
  const roundTowardsZero = milliseconds > 0 ? Math.floor : Math.ceil
  return {
    days: roundTowardsZero(milliseconds / 86400000),
    hours: roundTowardsZero(milliseconds / 3600000) % 24,
    minutes: roundTowardsZero(milliseconds / 60000) % 60,
    seconds: roundTowardsZero(milliseconds / 1000) % 60,
    milliseconds: roundTowardsZero(milliseconds) % 1000,
    microseconds: roundTowardsZero(milliseconds * 1000) % 1000,
    nanoseconds: roundTowardsZero(milliseconds * 1e6) % 1000
  }
}

/** @internal */
const renderStatus = (status: FiberStatus.FiberStatus): string => {
  if (FiberStatus.isDone(status)) {
    return "Done"
  }
  if (FiberStatus.isRunning(status)) {
    return "Running"
  }

  const isInterruptible = runtimeFlags.interruptible(status.runtimeFlags) ?
    "interruptible" :
    "uninterruptible"
  return `Suspended(${isInterruptible})`
}

/** @internal */
export const pretty = <E, A>(self: Fiber.RuntimeFiber<E, A>): Effect.Effect<never, never, string> => {
  const trace = getCallTrace()
  return pipe(
    Clock.currentTimeMillis(),
    core.flatMap((now) =>
      pipe(
        dump(self),
        core.map((dump) => {
          const time = now - dump.id.startTimeMillis
          const { days, hours, milliseconds, minutes, seconds } = parseMs(time)
          const lifeMsg = (days === 0 ? "" : `${days}d`) +
            (days === 0 && hours === 0 ? "" : `${hours}h`) +
            (days === 0 && hours === 0 && minutes === 0 ? "" : `${minutes}m`) +
            (days === 0 && hours === 0 && minutes === 0 && seconds === 0 ? "" : `${seconds}s`) +
            `${milliseconds}ms`
          const waitMsg = FiberStatus.isSuspended(dump.status) ?
            (() => {
              const ids = FiberId.ids(dump.status.blockingOn)
              return HashSet.size(ids) > 0
                ? `waiting on ` + Array.from(ids).map((id) => `${id}`).join(", ")
                : ""
            })() :
            ""
          const statusMsg = renderStatus(dump.status)
          return `[Fiber](#${dump.id.id}) (${lifeMsg}) ${waitMsg}\n   Status: ${statusMsg}`
        })
      )
    )
  ).traced(trace)
}

/** @internal */
export const roots = (): Effect.Effect<never, never, Chunk.Chunk<Fiber.RuntimeFiber<any, any>>> => {
  const trace = getCallTrace()
  return core.sync(() => Chunk.fromIterable(fiberScope._roots)).traced(trace)
}

/** @internal */
export const status = <E, A>(
  self: Fiber.RuntimeFiber<E, A>
): Effect.Effect<never, never, FiberStatus.FiberStatus> => {
  const trace = getCallTrace()
  return self.status().traced(trace)
}

/** @internal */
export const succeed = <A>(value: A): Fiber.Fiber<never, A> => {
  return done(Exit.succeed(value))
}

/** @internal */
export const unit = (): Fiber.Fiber<never, void> => succeed(void 0)
