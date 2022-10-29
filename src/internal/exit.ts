import * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import type * as Exit from "@effect/io/Exit"
import type * as FiberId from "@effect/io/Fiber/Id"
import * as _runtime from "@effect/io/internal/runtime"
import type * as Either from "@fp-ts/data/Either"
import { identity, pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

/** @internal */
export const isExit = (u: unknown): u is Exit.Exit<unknown, unknown> => {
  return _runtime.isEffect(u) &&
    "op" in u &&
    (u["op"] === _runtime.OpCodes.Failure || u["op"] === _runtime.OpCodes.Success)
}

/** @internal */
export const isFailure = <E, A>(self: Exit.Exit<E, A>): self is Exit.Failure<E> => {
  return self.op === _runtime.OpCodes.Failure
}

/** @internal */
export const isSuccess = <E, A>(self: Exit.Exit<E, A>): self is Exit.Success<A> => {
  return self.op === _runtime.OpCodes.Success
}

/** @internal */
export const succeed = <A>(value: A): Exit.Exit<never, A> => {
  const effect = Object.create(_runtime.proto)
  effect._tag = _runtime.OpCodes.Success
  effect.success = value
  return effect
}

/** @internal */
export const fail = <E>(error: E): Exit.Exit<E, never> => {
  return failCause(Cause.fail(error))
}

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Exit.Exit<E, never> => {
  const effect = Object.create(_runtime.proto)
  effect._tag = _runtime.OpCodes.Failure
  effect.cause = cause
  return effect
}

/** @internal */
export const die = (defect: unknown): Exit.Exit<never, never> => {
  return failCause(Cause.die(defect))
}

/** @internal */
export const interrupt = (fiberId: FiberId.FiberId): Exit.Exit<never, never> => {
  return failCause(Cause.interrupt(fiberId))
}

/** @internal */
export const collectAll = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>
): Option.Option<Exit.Exit<E, List.List<A>>> => {
  return collectAllInternal(exits, Cause.sequential)
}

/** @internal */
export const collectAllPar = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>
): Option.Option<Exit.Exit<E, List.List<A>>> => {
  return collectAllInternal(exits, Cause.parallel)
}

/** @internal */
export const unit: () => Exit.Exit<never, void> = _runtime.unit as any

/** @internal */
export const fromEither = <E, A>(either: Either.Either<E, A>): Exit.Exit<E, A> => {
  switch (either._tag) {
    case "Left": {
      return fail(either.left)
    }
    case "Right": {
      return succeed(either.right)
    }
  }
}

/** @internal */
export const fromOption = <A>(option: Option.Option<A>): Exit.Exit<void, A> => {
  switch (option._tag) {
    case "None": {
      return fail(undefined)
    }
    case "Some": {
      return succeed(option.value)
    }
  }
}

/** @internal */
export const isInterrupted = <E, A>(self: Exit.Exit<E, A>): boolean => {
  switch (self.op) {
    case _runtime.OpCodes.Failure: {
      return Cause.isInterrupted(self.body.cause)
    }
    case _runtime.OpCodes.Success: {
      return false
    }
  }
}

/** @internal */
export const causeOption = <E, A>(self: Exit.Exit<E, A>): Option.Option<Cause.Cause<E>> => {
  switch (self.op) {
    case _runtime.OpCodes.Failure: {
      return Option.some(self.body.cause)
    }
    case _runtime.OpCodes.Success: {
      return Option.none
    }
  }
}

/** @internal */
export const getOrElse = <E, A>(orElse: (cause: Cause.Cause<E>) => A) => {
  return (self: Exit.Exit<E, A>): A => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        return orElse(self.body.cause)
      }
      case _runtime.OpCodes.Success: {
        return self.body.value
      }
    }
  }
}

/** @internal */
export const exists = <A>(predicate: Predicate<A>) => {
  return <E>(self: Exit.Exit<E, A>): boolean => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        return false
      }
      case _runtime.OpCodes.Success: {
        return predicate(self.body.value)
      }
    }
  }
}

/** @internal */
export function as<A1>(value: A1) {
  return <E, A>(self: Exit.Exit<E, A>): Exit.Exit<E, A1> => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        return self
      }
      case _runtime.OpCodes.Success: {
        return succeed(value)
      }
    }
  }
}

/** @internal */
export const map = <A, B>(f: (a: A) => B) => {
  return <E>(self: Exit.Exit<E, A>): Exit.Exit<E, B> => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        return self
      }
      case _runtime.OpCodes.Success: {
        return succeed(f(self.body.value))
      }
    }
  }
}

/** @internal */
export const mapBoth = <E, A, E1, A1>(
  onFailure: (e: E) => E1,
  onSuccess: (a: A) => A1
) => {
  return (self: Exit.Exit<E, A>): Exit.Exit<E1, A1> => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        return failCause(pipe(self.body.cause, Cause.map(onFailure)))
      }
      case _runtime.OpCodes.Success: {
        return succeed(onSuccess(self.body.value))
      }
    }
  }
}

/** @internal */
export const mapError = <E, E1>(f: (e: E) => E1) => {
  return <A>(self: Exit.Exit<E, A>): Exit.Exit<E1, A> => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        return failCause(pipe(self.body.cause, Cause.map(f)))
      }
      case _runtime.OpCodes.Success: {
        return self
      }
    }
  }
}

/** @internal */
export const mapErrorCause = <E, E1>(f: (cause: Cause.Cause<E>) => Cause.Cause<E1>) => {
  return <A>(self: Exit.Exit<E, A>): Exit.Exit<E1, A> => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        return failCause(f(self.body.cause))
      }
      case _runtime.OpCodes.Success: {
        return self
      }
    }
  }
}

/** @internal */
export const flatMap = <A, E1, A1>(f: (a: A) => Exit.Exit<E1, A1>) => {
  return <E>(self: Exit.Exit<E, A>): Exit.Exit<E | E1, A1> => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        return self
      }
      case _runtime.OpCodes.Success: {
        return f(self.body.value)
      }
    }
  }
}

/** @internal */
export const flatMapEffect = <E, A, R, E1, A1>(
  f: (a: A) => Effect.Effect<R, E1, Exit.Exit<E, A1>>
) => {
  return (self: Exit.Exit<E, A>): Effect.Effect<R, E1, Exit.Exit<E, A1>> => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        return _runtime.succeed(self)
      }
      case _runtime.OpCodes.Success: {
        return f(self.body.value)
      }
    }
  }
}

/** @internal */
export const flatten = <E, E1, A>(
  self: Exit.Exit<E, Exit.Exit<E1, A>>
): Exit.Exit<E | E1, A> => {
  return pipe(self, flatMap(identity))
}

/** @internal */
export const match = <E, A, Z>(
  onFailure: (cause: Cause.Cause<E>) => Z,
  onSuccess: (a: A) => Z
) => {
  return (self: Exit.Exit<E, A>): Z => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        return onFailure(self.body.cause)
      }
      case _runtime.OpCodes.Success: {
        return onSuccess(self.body.value)
      }
    }
  }
}

/** @internal */
export const matchEffect = <E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R1, E1, A1>,
  onSuccess: (a: A) => Effect.Effect<R2, E2, A2>
) => {
  return (self: Exit.Exit<E, A>): Effect.Effect<R1 | R2, E1 | E2, A1 | A2> => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        return onFailure(self.body.cause)
      }
      case _runtime.OpCodes.Success: {
        return onSuccess(self.body.value)
      }
    }
  }
}

/** @internal */
export const forEachEffect = <A, R, E1, B>(f: (a: A) => Effect.Effect<R, E1, B>) => {
  return <E>(self: Exit.Exit<E, A>): Effect.Effect<R, never, Exit.Exit<E | E1, B>> => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        return _runtime.succeed(failCause(self.body.cause))
      }
      case _runtime.OpCodes.Success: {
        return _runtime.exit(f(self.body.value))
      }
    }
  }
}

/** @internal */
export const zip = <E2, A2>(that: Exit.Exit<E2, A2>): <E, A>(
  self: Exit.Exit<E, A>
) => Exit.Exit<E | E2, readonly [A, A2]> => {
  return zipWith(that, (a, a2) => [a, a2] as const, Cause.sequential)
}

/** @internal */
export const zipLeft = <E2, A2>(that: Exit.Exit<E2, A2>): <E, A>(
  self: Exit.Exit<E, A>
) => Exit.Exit<E | E2, A> => {
  return zipWith(that, (a, _) => a, Cause.sequential)
}

/** @internal */
export const zipRight = <E2, A2>(that: Exit.Exit<E2, A2>): <E, A>(
  self: Exit.Exit<E, A>
) => Exit.Exit<E | E2, A2> => {
  return zipWith(that, (_, a2) => a2, Cause.sequential)
}

/** @internal */
export const zipPar = <E2, A2>(that: Exit.Exit<E2, A2>): <E, A>(
  self: Exit.Exit<E, A>
) => Exit.Exit<E | E2, readonly [A, A2]> => {
  return zipWith(that, (a, a2) => [a, a2] as const, Cause.parallel)
}

/** @internal */
export const zipParLeft = <E2, A2>(that: Exit.Exit<E2, A2>): <E, A>(
  self: Exit.Exit<E, A>
) => Exit.Exit<E | E2, A> => {
  return zipWith(that, (a, _) => a, Cause.parallel)
}

/** @internal */
export const zipParRight = <E2, A2>(that: Exit.Exit<E2, A2>): <E, A>(
  self: Exit.Exit<E, A>
) => Exit.Exit<E | E2, A2> => {
  return zipWith(that, (_, a2) => a2, Cause.parallel)
}

/** @internal */
export const zipWith = <E, E1, A, B, C>(
  that: Exit.Exit<E1, B>,
  f: (a: A, b: B) => C,
  g: (c: Cause.Cause<E>, c1: Cause.Cause<E1>) => Cause.Cause<E | E1>
) => {
  return (self: Exit.Exit<E, A>): Exit.Exit<E | E1, C> => {
    switch (self.op) {
      case _runtime.OpCodes.Failure: {
        switch (that.op) {
          case _runtime.OpCodes.Success: {
            return self
          }
          case _runtime.OpCodes.Failure: {
            return failCause(g(self.body.cause, that.body.cause))
          }
        }
      }
      case _runtime.OpCodes.Success: {
        switch (that.op) {
          case _runtime.OpCodes.Success: {
            return succeed(f(self.body.value, that.body.value))
          }
          case _runtime.OpCodes.Failure: {
            return that
          }
        }
      }
    }
  }
}

/** @internal */
const collectAllInternal = <E, A>(
  exits: Iterable<Exit.Exit<E, A>>,
  combineCauses: (causeA: Cause.Cause<E>, causeB: Cause.Cause<E>) => Cause.Cause<E>
): Option.Option<Exit.Exit<E, List.List<A>>> => {
  const list = List.fromIterable(exits)
  if (List.isNil(list)) {
    return Option.none
  }
  return pipe(
    list.tail,
    List.reduce(pipe(list.head, map(List.of)), (accumulator, current) =>
      pipe(
        accumulator,
        zipWith(
          current,
          (list, value) => pipe(list, List.prepend(value)),
          combineCauses
        )
      )),
    map(List.reverse),
    Option.some
  )
}
