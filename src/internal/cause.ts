import type * as Cause from "@effect/io/Cause"
import * as Debug from "@effect/io/Debug"
import * as FiberId from "@effect/io/Fiber/Id"
import type * as FiberRuntime from "@effect/io/internal/runtime"
import { Stack } from "@effect/io/internal/stack"
import * as Tracer from "@effect/io/Tracer"
import * as Doc from "@effect/printer/Doc"
import * as Optimize from "@effect/printer/Optimize"
import * as Render from "@effect/printer/Render"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import { constFalse, constTrue, identity, pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as NonEmptyReadonlyArray from "@fp-ts/data/NonEmptyReadonlyArray"
import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"
import * as SafeEval from "@fp-ts/data/SafeEval"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/** @internal */
const CauseSymbolKey = "@effect/io/Cause"

/** @internal */
export const CauseTypeId: Cause.CauseTypeId = Symbol.for(
  CauseSymbolKey
) as Cause.CauseTypeId

/** @internal */
const variance = {
  _E: (_: never) => _
}

/** @internal */
const proto = {
  [CauseTypeId]: variance,
  [Equal.symbolHash](this: Cause.Cause<any>): number {
    return pipe(
      Equal.hash(CauseSymbolKey),
      Equal.hashCombine(Equal.hash(flattenCause(this)))
    )
  },
  [Equal.symbolEqual](this: Cause.Cause<any>, that: unknown): boolean {
    return isCause(that) && causeEquals(this, that)
  }
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const empty: Cause.Cause<never> = (() => {
  const o = Object.create(proto)
  o._tag = "Empty"
  return o
})()

/** @internal */
export const fail = <E>(error: E): Cause.Cause<E> => {
  const o = Object.create(proto)
  o._tag = "Fail"
  o.error = error
  return o
}

/** @internal */
export const die = (defect: unknown): Cause.Cause<never> => {
  const o = Object.create(proto)
  o._tag = "Die"
  o.defect = defect
  return o
}

/** @internal */
export const interrupt = (fiberId: FiberId.FiberId): Cause.Cause<never> => {
  const o = Object.create(proto)
  o._tag = "Interrupt"
  o.fiberId = fiberId
  return o
}

/** @internal */
export const annotated = <E>(cause: Cause.Cause<E>, annotation: unknown): Cause.Cause<E> => {
  const o = Object.create(proto)
  o._tag = "Annotated"
  o.cause = cause
  o.annotation = annotation
  return o
}

/** @internal */
export const parallel = <E>(left: Cause.Cause<E>, right: Cause.Cause<E>): Cause.Cause<E> => {
  const o = Object.create(proto)
  o._tag = "Parallel"
  o.left = left
  o.right = right
  return o
}

/** @internal */
export const sequential = <E>(left: Cause.Cause<E>, right: Cause.Cause<E>): Cause.Cause<E> => {
  const o = Object.create(proto)
  o._tag = "Sequential"
  o.left = left
  o.right = right
  return o
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/** @internal */
export const isCause = (u: unknown): u is Cause.Cause<never> => {
  return typeof u === "object" && u != null && CauseTypeId in u
}

/** @internal */
export const isEmptyType = <E>(self: Cause.Cause<E>): self is Cause.Empty => {
  return self._tag === "Empty"
}

/** @internal */
export const isFailType = <E>(self: Cause.Cause<E>): self is Cause.Fail<E> => {
  return self._tag === "Fail"
}

/** @internal */
export const isDieType = <E>(self: Cause.Cause<E>): self is Cause.Die => {
  return self._tag === "Die"
}

/** @internal */
export const isInterruptType = <E>(self: Cause.Cause<E>): self is Cause.Interrupt => {
  return self._tag === "Interrupt"
}

/** @internal */
export const isAnnotatedType = <E>(self: Cause.Cause<E>): self is Cause.Annotated<E> => {
  return self._tag === "Annotated"
}

/** @internal */
export const isSequentialType = <E>(self: Cause.Cause<E>): self is Cause.Sequential<E> => {
  return self._tag === "Sequential"
}

/** @internal */
export const isParallelType = <E>(self: Cause.Cause<E>): self is Cause.Parallel<E> => {
  return self._tag === "Parallel"
}

// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------

/** @internal */
export const size = <E>(self: Cause.Cause<E>): number => {
  return reduceWithContext(void 0, SizeCauseReducer)(self)
}

/** @internal */
export const isEmpty = <E>(self: Cause.Cause<E>): boolean => {
  if (self._tag === "Empty") {
    return true
  }
  return reduce(true, (acc, cause) => {
    switch (cause._tag) {
      case "Empty": {
        return Option.some(acc)
      }
      case "Die":
      case "Fail":
      case "Interrupt": {
        return Option.some(false)
      }
      default: {
        return Option.none
      }
    }
  })(self)
}

/** @internal */
export const isFailure = <E>(self: Cause.Cause<E>): boolean => {
  return Option.isSome(failureOption(self))
}

/** @internal */
export const isDie = <E>(self: Cause.Cause<E>): boolean => {
  return Option.isSome(dieOption(self))
}

/** @internal */
export const isInterrupted = <E>(self: Cause.Cause<E>): boolean => {
  return Option.isSome(interruptOption(self))
}

/** @internal */
export const isInterruptedOnly = <E>(self: Cause.Cause<E>): boolean => {
  return reduceWithContext(void 0, IsInterruptedOnlyCauseReducer)(self)
}

/** @internal */
export const failures = <E>(self: Cause.Cause<E>): List.List<E> => {
  return List.reverse(
    reduce<List.List<E>, E>(
      List.empty<E>(),
      (list, cause) =>
        cause._tag === "Fail" ?
          Option.some(pipe(list, List.prepend(cause.error))) :
          Option.none
    )(self)
  )
}

/** @internal */
export const defects = <E>(self: Cause.Cause<E>): List.List<unknown> => {
  return List.reverse(
    reduce<List.List<unknown>, E>(
      List.empty<unknown>(),
      (list, cause) =>
        cause._tag === "Die" ?
          Option.some(pipe(list, List.prepend(cause.defect))) :
          Option.none
    )(self)
  )
}

/** @internal */
export const interruptors = <E>(self: Cause.Cause<E>): HashSet.HashSet<FiberId.FiberId> => {
  return reduce(HashSet.empty<FiberId.FiberId>(), (set, cause) =>
    cause._tag === "Interrupt" ?
      Option.some(pipe(set, HashSet.add(cause.fiberId))) :
      Option.none)(self)
}

/** @internal */
export const failureOption = <E>(self: Cause.Cause<E>): Option.Option<E> => {
  return find<E, E>((cause) =>
    cause._tag === "Fail" ?
      Option.some(cause.error) :
      Option.none
  )(self)
}

/** @internal */
export const failureOrCause = <E>(self: Cause.Cause<E>): Either.Either<E, Cause.Cause<never>> => {
  const option = failureOption(self)
  switch (option._tag) {
    case "None": {
      // no `E` inside this `Cause`, so it can be safely cast to `never`
      return Either.right(self as Cause.Cause<never>)
    }
    case "Some": {
      return Either.left(option.value)
    }
  }
}

/** @internal */
export const dieOption = <E>(self: Cause.Cause<E>): Option.Option<unknown> => {
  return find((cause) =>
    cause._tag === "Die" ?
      Option.some(cause.defect) :
      Option.none
  )(self)
}

/** @internal */
export const interruptOption = <E>(self: Cause.Cause<E>): Option.Option<FiberId.FiberId> => {
  return find((cause) =>
    cause._tag === "Interrupt" ?
      Option.some(cause.fiberId) :
      Option.none
  )(self)
}

/** @internal */
export const keepDefects = <E>(self: Cause.Cause<E>): Option.Option<Cause.Cause<never>> => {
  return match<Option.Option<Cause.Cause<never>>, E>(
    Option.none,
    () => Option.none,
    (defect) => Option.some(die(defect)),
    () => Option.none,
    (option, annotation) => pipe(option, Option.map((cause) => annotated(cause, annotation))),
    (left, right) => {
      if (Option.isSome(left) && Option.isSome(right)) {
        return Option.some(sequential(left.value, right.value))
      }
      if (Option.isSome(left) && Option.isNone(right)) {
        return Option.some(left.value)
      }
      if (Option.isNone(left) && Option.isSome(right)) {
        return Option.some(right.value)
      }
      return Option.none
    },
    (left, right) => {
      if (Option.isSome(left) && Option.isSome(right)) {
        return Option.some(parallel(left.value, right.value))
      }
      if (Option.isSome(left) && Option.isNone(right)) {
        return Option.some(left.value)
      }
      if (Option.isNone(left) && Option.isSome(right)) {
        return Option.some(right.value)
      }
      return Option.none
    }
  )(self)
}

/** @internal */
export const linearize = <E>(self: Cause.Cause<E>): HashSet.HashSet<Cause.Cause<E>> => {
  return match<HashSet.HashSet<Cause.Cause<E>>, E>(
    HashSet.empty(),
    (error) => HashSet.make(fail(error)),
    (defect) => HashSet.make(die(defect)),
    (fiberId) => HashSet.make(interrupt(fiberId)),
    (set, annotation) => pipe(set, HashSet.map((cause) => annotated(cause, annotation))),
    (leftSet, rightSet) =>
      pipe(
        leftSet,
        HashSet.flatMap((leftCause) =>
          pipe(
            rightSet,
            HashSet.map((rightCause) => sequential(leftCause, rightCause))
          )
        )
      ),
    (leftSet, rightSet) =>
      pipe(
        leftSet,
        HashSet.flatMap((leftCause) =>
          pipe(
            rightSet,
            HashSet.map((rightCause) => parallel(leftCause, rightCause))
          )
        )
      )
  )(self)
}

/** @internal */
export const stripFailures = <E>(self: Cause.Cause<E>): Cause.Cause<never> => {
  return match<Cause.Cause<never>, E>(
    empty,
    () => empty,
    (defect) => die(defect),
    (fiberId) => interrupt(fiberId),
    (cause, annotation) => annotated(cause, annotation),
    (left, right) => sequential(left, right),
    (left, right) => parallel(left, right)
  )(self)
}

/** @internal */
export const stripSomeDefects = (pf: (defect: unknown) => Option.Option<unknown>) => {
  return <E>(self: Cause.Cause<E>): Option.Option<Cause.Cause<E>> => {
    return match<Option.Option<Cause.Cause<E>>, E>(
      Option.some(empty),
      (error) => Option.some(fail(error)),
      (defect) => {
        const option = pf(defect)
        return Option.isSome(option) ? Option.none : Option.some(die(defect))
      },
      (fiberId) => Option.some(interrupt(fiberId)),
      (option, annotation) => pipe(option, Option.map((cause) => annotated(cause, annotation))),
      (left, right) => {
        if (Option.isSome(left) && Option.isSome(right)) {
          return Option.some(sequential(left.value, right.value))
        }
        if (Option.isSome(left) && Option.isNone(right)) {
          return Option.some(left.value)
        }
        if (Option.isNone(left) && Option.isSome(right)) {
          return Option.some(right.value)
        }
        return Option.none
      },
      (left, right) => {
        if (Option.isSome(left) && Option.isSome(right)) {
          return Option.some(parallel(left.value, right.value))
        }
        if (Option.isSome(left) && Option.isNone(right)) {
          return Option.some(left.value)
        }
        if (Option.isNone(left) && Option.isSome(right)) {
          return Option.some(right.value)
        }
        return Option.none
      }
    )(self)
  }
}

// -----------------------------------------------------------------------------
// Mapping
// -----------------------------------------------------------------------------

/** @internal */
export const as = <E1>(error: E1) => {
  return <E>(self: Cause.Cause<E>): Cause.Cause<E1> => {
    if (self._tag === "Fail") {
      return fail(error)
    }
    return self as Cause.Cause<E1>
  }
}

/** @internal */
export const map = <E, E1>(f: (e: E) => E1) => {
  return (self: Cause.Cause<E>): Cause.Cause<E1> => {
    if (self._tag === "Fail") {
      return fail(f(self.error))
    }
    return self as Cause.Cause<E1>
  }
}

// -----------------------------------------------------------------------------
// Sequencing
// -----------------------------------------------------------------------------

/** @internal */
export const flatMap = <E, E1>(f: (e: E) => Cause.Cause<E1>) => {
  return (self: Cause.Cause<E>): Cause.Cause<E1> => {
    if (self._tag === "Fail") {
      return f(self.error)
    }
    return self as Cause.Cause<E1>
  }
}

/** @internal */
export const flatten = <E>(self: Cause.Cause<Cause.Cause<E>>): Cause.Cause<E> => {
  return flatMap<Cause.Cause<E>, E>(identity)(self)
}

// -----------------------------------------------------------------------------
// Equality
// -----------------------------------------------------------------------------

/** @internal */
export const contains = <E2>(that: Cause.Cause<E2>) => {
  return <E>(self: Cause.Cause<E>): boolean => {
    if (that._tag === "Empty" || self === that) {
      return true
    }
    return reduce(false, (accumulator, cause) => {
      return Option.some(accumulator || causeEquals(cause, that))
    })(self)
  }
}

/** @internal */
const causeEquals = (left: Cause.Cause<unknown>, right: Cause.Cause<unknown>): boolean => {
  let leftStack = List.of(left)
  let rightStack = List.of(right)
  while (List.isCons(leftStack) && List.isCons(rightStack)) {
    const [leftParallel, leftSequential] = pipe(
      leftStack.head,
      reduce(
        [HashSet.empty<unknown>(), List.empty<Cause.Cause<unknown>>()] as const,
        ([parallel, sequential], cause) => {
          const [par, seq] = evaluateCause(cause)
          return Option.some(
            [
              pipe(parallel, HashSet.union(par)),
              pipe(sequential, List.concat(seq))
            ] as const
          )
        }
      )
    )
    const [rightParallel, rightSequential] = pipe(
      rightStack.head,
      reduce(
        [HashSet.empty<unknown>(), List.empty<Cause.Cause<unknown>>()] as const,
        ([parallel, sequential], cause) => {
          const [par, seq] = evaluateCause(cause)
          return Option.some(
            [
              pipe(parallel, HashSet.union(par)),
              pipe(sequential, List.concat(seq))
            ] as const
          )
        }
      )
    )
    if (!Equal.equals(leftParallel, rightParallel)) {
      return false
    }
    leftStack = leftSequential
    rightStack = rightSequential
  }
  return true
}

// -----------------------------------------------------------------------------
// Flattening
// -----------------------------------------------------------------------------

/**
 * Flattens a cause to a sequence of sets of causes, where each set represents
 * causes that fail in parallel and sequential sets represent causes that fail
 * after each other.
 *
 * @internal
 */
const flattenCause = (cause: Cause.Cause<unknown>): List.List<HashSet.HashSet<unknown>> => {
  return flattenCauseLoop(List.of(cause), List.nil())
}

/** @internal */
const flattenCauseLoop = (
  causes: List.List<Cause.Cause<unknown>>,
  flattened: List.List<HashSet.HashSet<unknown>>
): List.List<HashSet.HashSet<unknown>> => {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const [parallel, sequential] = pipe(
      causes,
      List.reduce(
        [HashSet.empty<unknown>(), List.empty<Cause.Cause<unknown>>()] as const,
        ([parallel, sequential], cause) => {
          const [par, seq] = evaluateCause(cause)
          return [
            pipe(parallel, HashSet.union(par)),
            pipe(sequential, List.concat(seq))
          ]
        }
      )
    )
    const updated = HashSet.size(parallel) > 0 ?
      pipe(flattened, List.prepend(parallel)) :
      flattened
    if (List.isNil(sequential)) {
      return List.reverse(updated)
    }
    causes = sequential
    flattened = updated
  }
  throw new Error("BUG: Cause.flattenCauseLoop - please report an issue at https://github.com/Effect-TS/io/issues")
}

// -----------------------------------------------------------------------------
// Squashing
// -----------------------------------------------------------------------------

/** @internal */
export const squash = <E>(self: Cause.Cause<E>): unknown => {
  return squashWith((error) => error instanceof Error)(self)
}

/** @internal */
export const squashWith = <E>(f: (error: E) => unknown) => {
  return (self: Cause.Cause<E>): unknown => {
    const option = pipe(self, failureOption, Option.map(f))
    switch (option._tag) {
      case "None": {
        if (isInterrupted(self)) {
          const fibers = pipe(
            interruptors(self),
            HashSet.flatMap((fiberId) => pipe(FiberId.ids(fiberId), HashSet.map((n) => `#${n}`))),
            HashSet.reduce("", (acc, id) => `${acc}, ${id}`)
          )
          return new InterruptedException(`Interrupted by fibers: ${fibers}`)
        }
        return pipe(
          defects(self),
          List.head,
          Option.getOrElse(new InterruptedException())
        )
      }
      case "Some": {
        return option.value
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Finding
// -----------------------------------------------------------------------------

/** @internal */
export const find = <E, Z>(pf: (cause: Cause.Cause<E>) => Option.Option<Z>) => {
  return (self: Cause.Cause<E>): Option.Option<Z> => {
    let stack: Stack<Cause.Cause<E>> | undefined = new Stack(self)
    while (stack !== undefined) {
      const option = pf(stack.value)
      switch (option._tag) {
        case "None": {
          switch (stack.value._tag) {
            case "Sequential":
            case "Parallel": {
              stack = new Stack(stack.value.left, new Stack(stack.value.right, stack))
              break
            }
            case "Annotated": {
              stack = new Stack(stack.value.cause, stack)
              break
            }
            default: {
              stack = stack.previous
              break
            }
          }
          break
        }
        case "Some": {
          return option
        }
      }
    }
    return Option.none
  }
}

// -----------------------------------------------------------------------------
// Filtering
// -----------------------------------------------------------------------------

/** @internal */
export const filter = <E>(predicate: Predicate<Cause.Cause<E>>) => {
  return (self: Cause.Cause<E>): Cause.Cause<E> => {
    return reduceWithContext(void 0, FilterCauseReducer(predicate))(self)
  }
}

// -----------------------------------------------------------------------------
// Evaluation
// -----------------------------------------------------------------------------

/**
 * Takes one step in evaluating a cause, returning a set of causes that fail
 * in parallel and a list of causes that fail sequentially after those causes.
 *
 * @internal
 */
const evaluateCause = (
  self: Cause.Cause<unknown>
): readonly [HashSet.HashSet<unknown>, List.List<Cause.Cause<unknown>>] => {
  let cause: Cause.Cause<unknown> | undefined = self
  let stack: Stack<Cause.Cause<unknown>> | undefined = undefined
  let _parallel = HashSet.empty<unknown>()
  let _sequential = List.empty<Cause.Cause<unknown>>()
  while (cause !== undefined) {
    switch (cause._tag) {
      case "Empty": {
        if (stack === undefined) {
          return [_parallel, _sequential]
        }
        cause = stack.value
        stack = stack.previous
        break
      }
      case "Fail": {
        if (stack === undefined) {
          return [pipe(_parallel, HashSet.add(cause.error)), _sequential]
        }
        _parallel = pipe(_parallel, HashSet.add(cause.error))
        cause = stack.value
        stack = stack.previous
        break
      }
      case "Die": {
        if (stack === undefined) {
          return [pipe(_parallel, HashSet.add(cause.defect)), _sequential]
        }
        _parallel = pipe(_parallel, HashSet.add(cause.defect))
        cause = stack.value
        stack = stack.previous
        break
      }
      case "Interrupt": {
        if (stack === undefined) {
          return [pipe(_parallel, HashSet.add(cause.fiberId as unknown)), _sequential]
        }
        _parallel = pipe(_parallel, HashSet.add(cause.fiberId as unknown))
        cause = stack.value
        stack = stack.previous
        break
      }
      case "Annotated": {
        cause = cause.cause
        break
      }
      case "Sequential": {
        switch (cause.left._tag) {
          case "Empty": {
            cause = cause.right
            break
          }
          case "Sequential": {
            cause = sequential(cause.left.left, sequential(cause.left.right, cause.right))
            break
          }
          case "Parallel": {
            cause = parallel(
              sequential(cause.left.left, cause.right),
              sequential(cause.left.right, cause.right)
            )
            break
          }
          case "Annotated": {
            cause = sequential(cause.left.cause, cause.right)
            break
          }
          default: {
            _sequential = pipe(_sequential, List.prepend(cause.right))
            cause = cause.left
            break
          }
        }
        break
      }
      case "Parallel": {
        stack = new Stack(cause.right, stack)
        cause = cause.left
        break
      }
    }
  }
  throw new Error("BUG: Cause.evaluateCauseLoop - please report an issue at https://github.com/Effect-TS/io/issues")
}

// -----------------------------------------------------------------------------
// Reducing
// -----------------------------------------------------------------------------

/** @internal */
const SizeCauseReducer: Cause.Cause.Reducer<unknown, unknown, number> = {
  emptyCase: () => 0,
  failCase: () => 1,
  dieCase: () => 1,
  interruptCase: () => 1,
  annotatedCase: (_, value) => value,
  sequentialCase: (_, left, right) => left + right,
  parallelCase: (_, left, right) => left + right
}

/** @internal */
const IsInterruptedOnlyCauseReducer: Cause.Cause.Reducer<unknown, unknown, boolean> = {
  emptyCase: constTrue,
  failCase: constFalse,
  dieCase: constFalse,
  interruptCase: constTrue,
  annotatedCase: (_, value) => value,
  sequentialCase: (_, left, right) => left && right,
  parallelCase: (_, left, right) => left && right
}

/** @internal */
const FilterCauseReducer = <E>(
  predicate: Predicate<Cause.Cause<E>>
): Cause.Cause.Reducer<unknown, E, Cause.Cause<E>> => ({
  emptyCase: () => empty,
  failCase: (_, error) => fail(error),
  dieCase: (_, defect) => die(defect),
  interruptCase: (_, fiberId) => interrupt(fiberId),
  annotatedCase: (_, cause, annotation) => annotated(cause, annotation),
  sequentialCase: (_, left, right) => {
    if (predicate(left)) {
      if (predicate(right)) {
        return sequential(left, right)
      }
      return left
    }
    if (predicate(right)) {
      return right
    }
    return empty
  },
  parallelCase: (_, left, right) => {
    if (predicate(left)) {
      if (predicate(right)) {
        return parallel(left, right)
      }
      return left
    }
    if (predicate(right)) {
      return right
    }
    return empty
  }
})

/** @internal */
type CauseCase = SequentialCase | ParallelCase | AnnotatedCase

/** @internal */
interface SequentialCase {
  readonly _tag: "SequentialCase"
}

/** @internal */
interface ParallelCase {
  readonly _tag: "ParallelCase"
}

/** @internal */
interface AnnotatedCase {
  readonly _tag: "AnnotatedCase"
  readonly annotation: unknown
}

/** @internal */
export const match = <Z, E>(
  emptyCase: Z,
  failCase: (error: E) => Z,
  dieCase: (defect: unknown) => Z,
  interruptCase: (fiberId: FiberId.FiberId) => Z,
  annotatedCase: (value: Z, annotation: unknown) => Z,
  sequentialCase: (left: Z, right: Z) => Z,
  parallelCase: (left: Z, right: Z) => Z
): (self: Cause.Cause<E>) => Z => {
  return reduceWithContext(void 0, {
    emptyCase: () => emptyCase,
    failCase: (_, error) => failCase(error),
    dieCase: (_, defect) => dieCase(defect),
    interruptCase: (_, fiberId) => interruptCase(fiberId),
    annotatedCase: (_, value, annotation) => annotatedCase(value, annotation),
    sequentialCase: (_, left, right) => sequentialCase(left, right),
    parallelCase: (_, left, right) => parallelCase(left, right)
  })
}

/** @internal */
export const reduce = <Z, E>(
  zero: Z,
  pf: (accumulator: Z, cause: Cause.Cause<E>) => Option.Option<Z>
) => {
  return (self: Cause.Cause<E>): Z => {
    let accumulator: Z = zero
    let cause: Cause.Cause<E> | undefined = self
    let causes: Stack<Cause.Cause<E>> | undefined = undefined
    while (cause !== undefined) {
      const option = pf(accumulator, cause)
      accumulator = Option.isSome(option) ? option.value : accumulator
      switch (cause._tag) {
        case "Sequential": {
          causes = new Stack(cause.right, causes)
          cause = cause.left
          break
        }
        case "Parallel": {
          causes = new Stack(cause.right, causes)
          cause = cause.left
          break
        }
        case "Annotated": {
          cause = cause.cause
          break
        }
        default: {
          cause = undefined
          break
        }
      }
      if (cause === undefined && causes !== undefined) {
        cause = causes.value
        causes = causes.previous
      }
    }
    return accumulator
  }
}

/** @internal */
export const reduceWithContext = <C, E, Z>(context: C, reducer: Cause.Cause.Reducer<C, E, Z>) => {
  return (self: Cause.Cause<E>): Z => {
    let input: Stack<Cause.Cause<E>> | undefined = new Stack(self)
    let output: Stack<Either.Either<CauseCase, Z>> | undefined = undefined
    while (input !== undefined) {
      const cause = input.value
      switch (cause._tag) {
        case "Empty": {
          input = input.previous
          output = new Stack(Either.right(reducer.emptyCase(context)), output)
          break
        }
        case "Fail": {
          input = input.previous
          output = new Stack(Either.right(reducer.failCase(context, cause.error)), output)
          break
        }
        case "Die": {
          input = input.previous
          output = new Stack(Either.right(reducer.dieCase(context, cause.defect)), output)
          break
        }
        case "Interrupt": {
          input = input.previous
          output = new Stack(Either.right(reducer.interruptCase(context, cause.fiberId)), output)
          break
        }
        case "Annotated": {
          input = new Stack(cause.cause, input)
          output = new Stack(
            Either.left({ _tag: "AnnotatedCase", annotation: cause.annotation }),
            output
          )
          break
        }
        case "Sequential": {
          input = new Stack(cause.left, new Stack(cause.right, input))
          output = new Stack(Either.left({ _tag: "SequentialCase" }), output)
          break
        }
        case "Parallel": {
          input = new Stack(cause.left, new Stack(cause.right, input))
          output = new Stack(Either.left({ _tag: "ParallelCase" }), output)
          break
        }
      }
    }
    let accumulator: Stack<Z> | undefined = undefined
    while (output !== undefined) {
      const either = output.value
      switch (either._tag) {
        case "Left": {
          switch (either.left._tag) {
            case "SequentialCase": {
              const left = accumulator!.value
              const right = accumulator!.previous!.value
              const value = reducer.sequentialCase(context, left, right)
              accumulator = new Stack(value, accumulator!.previous!.previous)
              break
            }
            case "ParallelCase": {
              const left = accumulator!.value
              const right = accumulator!.previous!.value
              const value = reducer.parallelCase(context, left, right)
              accumulator = new Stack(value, accumulator!.previous!.previous)
              break
            }
            case "AnnotatedCase": {
              const cause = accumulator!.value
              const value = reducer.annotatedCase(context, cause, either.left.annotation)
              accumulator = new Stack(value, accumulator!.previous)
              break
            }
          }
          break
        }
        case "Right": {
          accumulator = new Stack(either.right, accumulator)
          break
        }
      }
    }
    if (accumulator === undefined) {
      throw new Error("BUG: Cause.reduceWithContext - please report an issue at https://github.com/Effect-TS/io/issues")
    }
    return accumulator.value
  }
}

// -----------------------------------------------------------------------------
// Reducing
// -----------------------------------------------------------------------------

/** @internal */
export const InterruptedExceptionTypeId: Cause.InterruptedExceptionTypeId = Symbol.for(
  "@effect/io/Cause/errors/InterruptedException"
) as Cause.InterruptedExceptionTypeId

/** @internal */
export class InterruptedException extends Error implements Cause.Cause.InterruptedException {
  readonly [InterruptedExceptionTypeId]: Cause.InterruptedExceptionTypeId = InterruptedExceptionTypeId
  constructor(message?: string) {
    super(message)
    this.name = "InterruptedException"
  }
}

/** @internal */
export const isInterruptedException = (u: unknown): u is Cause.Cause.InterruptedException => {
  return u instanceof Error && InterruptedExceptionTypeId in u && u.name === "InterruptedException"
}

// -----------------------------------------------------------------------------
// Stack Annotations
// -----------------------------------------------------------------------------

/** @internal */
export const StackAnnotationTypeId: Cause.StackAnnotationTypeId = Symbol.for(
  "@effect/io/Cause/StackAnnotation"
) as Cause.StackAnnotationTypeId

/** @internal */
export class StackAnnotation implements Cause.Cause.StackAnnotation {
  readonly [StackAnnotationTypeId]: Cause.StackAnnotationTypeId = StackAnnotationTypeId
  constructor(
    readonly stack: Stack<FiberRuntime.Continuation> | undefined,
    readonly execution: Chunk.Chunk<string> | undefined
  ) {}
}

/** @internal */
export const isStackAnnotation = (u: unknown): u is Cause.Cause.StackAnnotation => {
  return typeof u === "object" && u != null && StackAnnotationTypeId in u
}

// -----------------------------------------------------------------------------
// Pretty Printing
// -----------------------------------------------------------------------------

/** @internal */
type Segment = SequentialSegment | ParallelSegment | FailureSegment

/** @internal */
type Step = ParallelSegment | FailureSegment

/** @internal */
interface FailureSegment {
  readonly _tag: "FailureSegment"
  readonly lines: ReadonlyArray<Doc.Doc<never>>
}

/** @internal */
interface ParallelSegment {
  readonly _tag: "ParallelSegment"
  readonly all: ReadonlyArray<SequentialSegment>
}

/** @internal */
interface SequentialSegment {
  readonly _tag: "SequentialSegment"
  readonly all: ReadonlyArray<Step>
}

/** @internal */
const FailureSegment = (lines: ReadonlyArray<Doc.Doc<never>>): FailureSegment => {
  return {
    _tag: "FailureSegment",
    lines
  }
}

/** @internal */
const SequentialSegment = (all: ReadonlyArray<Step>): SequentialSegment => {
  return {
    _tag: "SequentialSegment",
    all
  }
}

/** @internal */
const ParallelSegment = (all: ReadonlyArray<SequentialSegment>): ParallelSegment => {
  return {
    _tag: "ParallelSegment",
    all
  }
}

/** @internal */
const box = {
  horizontal: {
    light: Doc.char("─"),
    heavy: Doc.char("═")
  },
  vertical: {
    heavy: Doc.char("║")
  },
  branch: {
    right: {
      heavy: Doc.char("╠")
    },
    down: {
      light: Doc.char("╥"),
      heavy: Doc.char("╦")
    }
  },
  terminal: {
    down: {
      heavy: Doc.char("╗")
    }
  },
  arrow: {
    down: Doc.char("▼")
  }
}

/** @internal */
const lines = (s: string) => {
  return s.split("\n").map((s) => s.replace("\r", "")) as ReadonlyArray<string>
}

/** @internal */
const renderToString = (u: unknown): string => {
  if (
    typeof u === "object" &&
    u != null &&
    "toString" in u &&
    typeof u["toString"] === "function" &&
    u["toString"] !== Object.prototype.toString
  ) {
    return u["toString"]()
  }
  return JSON.stringify(u, null, 2)
}

/** @internal */
const times = <A>(value: A, n: number): ReadonlyArray<A> => {
  const array: Array<A> = []
  for (let i = 0; i < n; i = i + 1) {
    array.push(value)
  }
  return array
}

/** @internal */
const spanToLines = (span: Tracer.Span, renderer: Cause.Cause.Renderer<any>): ReadonlyArray<Doc.Doc<never>> => {
  const lines: Array<Doc.Doc<never>> = []
  let current = Option.some(span)
  while (Option.isSome(current) && lines.length < renderer.renderSpanDepth) {
    if (current.value.trace) {
      lines.push(Doc.text(`${current.value.name} @ ${current.value.trace}`))
    } else {
      lines.push(Doc.text(`${current.value.name}`))
    }
    current = current.value.parent
  }
  return lines
}

/** @internal */
const stackToLines = (stack: StackAnnotation, renderer: Cause.Cause.Renderer<any>): ReadonlyArray<Doc.Doc<never>> => {
  const lines: Array<Doc.Doc<never>> = []
  let current = Option.fromNullable(stack.stack)
  while (Option.isSome(current) && lines.length < renderer.renderStackDepth) {
    switch (current.value.value._tag) {
      case "OnSuccess":
      case "OnFailure":
      case "OnSuccessAndFailure": {
        if (current.value.value.trace) {
          lines.push(Doc.text(current.value.value.trace))
        }
        break
      }
    }
    current = Option.fromNullable(current.value?.previous)
  }
  return lines
}

/** @internal */
const renderSpan = (
  span: Option.Option<Tracer.Span>,
  renderer: Cause.Cause.Renderer<any>
): ReadonlyArray<Doc.Doc<never>> => {
  if (!renderer.renderSpan || Option.isNone(span)) {
    return []
  }
  const lines = spanToLines(span.value, renderer)
  return lines.length === 0 ? [] : [
    Doc.text("Span:"),
    Doc.empty,
    ...lines,
    Doc.empty
  ]
}

/** @internal */
const renderStack = (
  span: Option.Option<StackAnnotation>,
  renderer: Cause.Cause.Renderer<any>
): ReadonlyArray<Doc.Doc<never>> => {
  if (!renderer.renderStack || Option.isNone(span)) {
    return []
  }
  const lines = stackToLines(span.value, renderer)
  return lines.length === 0 ? [] : [
    Doc.text("Stack:"),
    Doc.empty,
    ...lines,
    Doc.empty
  ]
}

/** @internal */
const renderExecution = (
  span: Option.Option<StackAnnotation>,
  renderer: Cause.Cause.Renderer<any>
): ReadonlyArray<Doc.Doc<never>> => {
  if (!renderer.renderExecution || Option.isNone(span)) {
    return []
  }
  if (span.value.execution && Chunk.isNonEmpty(span.value.execution)) {
    return [
      Doc.text("Execution:"),
      Doc.empty,
      ...pipe(
        span.value.execution,
        Chunk.take(renderer.renderExecutionDepth),
        Chunk.map((line) => Doc.text(line))
      ),
      Doc.empty
    ]
  }
  return []
}

/** @internal */
const renderFail = (
  error: ReadonlyArray<Doc.Doc<never>>,
  span: Option.Option<Tracer.Span>,
  stack: Option.Option<StackAnnotation>,
  renderer: Cause.Cause.Renderer<any>
): SequentialSegment => {
  return SequentialSegment([
    FailureSegment([
      Doc.text("A checked error was not handled."),
      Doc.empty,
      ...error,
      Doc.empty,
      ...renderSpan(span, renderer),
      ...renderStack(stack, renderer),
      ...renderExecution(stack, renderer)
    ])
  ])
}

/** @internal */
const renderDie = (
  error: ReadonlyArray<Doc.Doc<never>>,
  span: Option.Option<Tracer.Span>,
  stack: Option.Option<StackAnnotation>,
  renderer: Cause.Cause.Renderer<any>
): SequentialSegment => {
  return SequentialSegment([
    FailureSegment([
      Doc.text("An unchecked error was produced."),
      Doc.empty,
      ...error,
      Doc.empty,
      ...renderSpan(span, renderer),
      ...renderStack(stack, renderer),
      ...renderExecution(stack, renderer)
    ])
  ])
}

/** @internal */
const renderInterrupt = (
  fiberId: FiberId.FiberId,
  span: Option.Option<Tracer.Span>,
  stack: Option.Option<StackAnnotation>,
  renderer: Cause.Cause.Renderer<any>
): SequentialSegment => {
  const ids = Array.from(FiberId.ids(fiberId)).map((id) => `#${id}`).join(", ")
  return SequentialSegment([
    FailureSegment([
      Doc.text(`An interrupt was produced by ${ids}.`),
      Doc.empty,
      ...renderSpan(span, renderer),
      ...renderStack(stack, renderer),
      ...renderExecution(stack, renderer)
    ])
  ])
}

/** @internal */
const renderError = (error: Error): ReadonlyArray<string> => {
  return lines(error.stack ? error.stack : String(error))
}

/** @internal */
const prefixBlock = (
  values: ReadonlyArray<Doc.Doc<never>>,
  prefix1: Doc.Doc<never>,
  prefix2: Doc.Doc<never>
): ReadonlyArray<Doc.Doc<never>> => {
  if (ReadonlyArray.isNonEmpty(values)) {
    const head = NonEmptyReadonlyArray.head(values)
    const tail = NonEmptyReadonlyArray.tail(values)
    const init = Doc.cat(head)(prefix1)
    const rest = tail.map((value) => Doc.cat(value)(prefix2))
    return [init, ...rest]
  }
  return []
}

/** @internal */
const format = (segment: Segment): ReadonlyArray<Doc.Doc<never>> => {
  switch (segment._tag) {
    case "FailureSegment": {
      return prefixBlock(segment.lines, box.horizontal.light, Doc.char(" "))
    }
    case "ParallelSegment": {
      const spaces = Doc.spaces(2)
      const horizontalLines = Doc.cat(box.horizontal.heavy)(box.horizontal.heavy)
      const verticalSeparator = Doc.cat(box.vertical.heavy)(spaces)

      const junction = Doc.cat(box.branch.down.heavy)(horizontalLines)
      const busTerminal = Doc.cat(box.terminal.down.heavy)(horizontalLines)

      const fiberBus = Doc.hcat([...times(junction, segment.all.length - 1), busTerminal])
      const segments = segment.all.reduceRight(
        (acc, curr) => [
          ...prefixBlock(acc, verticalSeparator, verticalSeparator),
          ...prefixBlock(format(curr), spaces, spaces)
        ],
        [] as ReadonlyArray<Doc.Doc<never>>
      )

      return [fiberBus, ...segments]
    }
    case "SequentialSegment": {
      return segment.all.flatMap((step) => [
        box.vertical.heavy,
        ...prefixBlock(format(step), box.branch.right.heavy, box.vertical.heavy),
        box.arrow.down
      ])
    }
  }
}

/** @internal */
const linearSegments = <E>(
  cause: Cause.Cause<E>,
  renderer: Cause.Cause.Renderer<E>,
  span: Option.Option<Tracer.Span>,
  stack: Option.Option<StackAnnotation>
): SafeEval.SafeEval<ReadonlyArray<Step>> => {
  switch (cause._tag) {
    case "Sequential": {
      return pipe(
        linearSegments(cause.left, renderer, span, stack),
        SafeEval.zipWith(
          linearSegments(cause.right, renderer, span, stack),
          (left, right) => [...left, ...right]
        )
      )
    }
    default: {
      return pipe(
        causeToSequential(cause, renderer, span, stack),
        SafeEval.map((sequential) => sequential.all)
      )
    }
  }
}

/** @internal */
const parallelSegments = <E>(
  cause: Cause.Cause<E>,
  renderer: Cause.Cause.Renderer<E>,
  span: Option.Option<Tracer.Span>,
  stack: Option.Option<StackAnnotation>
): SafeEval.SafeEval<ReadonlyArray<SequentialSegment>> => {
  switch (cause._tag) {
    case "Parallel": {
      return pipe(
        parallelSegments(cause.left, renderer, span, stack),
        SafeEval.zipWith(
          parallelSegments(cause.right, renderer, span, stack),
          (left, right) => [...left, ...right]
        )
      )
    }
    default: {
      return pipe(
        causeToSequential(cause, renderer, span, stack),
        SafeEval.map((sequential) => [sequential])
      )
    }
  }
}

/** @internal */
const causeToSequential = <E>(
  cause: Cause.Cause<E>,
  renderer: Cause.Cause.Renderer<E>,
  span: Option.Option<Tracer.Span>,
  stack: Option.Option<StackAnnotation>
): SafeEval.SafeEval<SequentialSegment> => {
  switch (cause._tag) {
    case "Empty": {
      return SafeEval.succeed(SequentialSegment([]))
    }
    case "Fail": {
      return SafeEval.succeed(
        renderFail(
          renderer.renderError(cause.error).map((line) => Doc.text(line)),
          span,
          stack,
          renderer
        )
      )
    }
    case "Die": {
      return SafeEval.succeed(
        renderDie(
          renderer.renderUnknown(cause.defect).map((line) => Doc.text(line)),
          span,
          stack,
          renderer
        )
      )
    }
    case "Interrupt": {
      return SafeEval.succeed(
        renderInterrupt(cause.fiberId, span, stack, renderer)
      )
    }
    case "Sequential": {
      return pipe(
        linearSegments(cause, renderer, span, stack),
        SafeEval.map((segments) => SequentialSegment(segments))
      )
    }
    case "Parallel": {
      return pipe(
        parallelSegments(cause, renderer, span, stack),
        SafeEval.map((segments) => SequentialSegment([ParallelSegment(segments)]))
      )
    }
    case "Annotated": {
      const annotation = cause.annotation
      if (Tracer.isSpan(annotation)) {
        return SafeEval.suspend(() =>
          causeToSequential(
            cause.cause,
            renderer,
            Option.some(annotation),
            stack
          )
        )
      }
      if (isStackAnnotation(annotation)) {
        return SafeEval.suspend(() =>
          causeToSequential(
            cause.cause,
            renderer,
            span,
            Option.some(annotation)
          )
        )
      }
      return SafeEval.suspend(() => causeToSequential(cause.cause, renderer, span, stack))
    }
  }
}

/** @internal */
const defaultErrorToLines = (error: unknown) => {
  return error instanceof Error ? renderError(error) : lines(renderToString(error))
}

/** @internal */
export const defaultRenderer: Cause.Cause.Renderer = {
  lineWidth: 80,
  ribbonFraction: 1,
  renderSpan: Debug.runtimeDebug.traceSpanEnabledInCause,
  renderStack: Debug.runtimeDebug.traceStackEnabledInCause,
  renderExecution: Debug.runtimeDebug.traceExecutionEnabledInCause,
  renderSpanDepth: Debug.runtimeDebug.traceSpanLimit,
  renderStackDepth: Debug.runtimeDebug.traceStackLimit,
  renderExecutionDepth: Debug.runtimeDebug.traceExecutionLimit,
  renderError: defaultErrorToLines,
  renderUnknown: defaultErrorToLines
}

/** @internal */
const prettyDocuments = <E>(
  cause: Cause.Cause<E>,
  renderer: Cause.Cause.Renderer<E>
): SafeEval.SafeEval<ReadonlyArray<Doc.Doc<never>>> => {
  return pipe(
    causeToSequential(cause, renderer, Option.none, Option.none),
    SafeEval.map((sequential) => {
      if (
        sequential.all.length === 1 &&
        sequential.all[0] &&
        sequential.all[0]._tag === "FailureSegment"
      ) {
        return sequential.all[0].lines
      }
      const documents = format(sequential)
      return documents.length > 0 ? [box.branch.down.light, ...documents] : documents
    })
  )
}

/** @internal */
const prettySafe = <E>(
  cause: Cause.Cause<E>,
  renderer: Cause.Cause.Renderer<E>
): SafeEval.SafeEval<string> => {
  return pipe(
    prettyDocuments(cause, renderer),
    SafeEval.map((docs) =>
      pipe(
        Doc.lineBreak,
        Doc.cat(
          pipe(
            docs,
            Doc.concatWith((left, right) => pipe(left, Doc.catWithLineBreak(right)))
          )
        ),
        Optimize.optimize(Optimize.Deep),
        Render.pretty(renderer.lineWidth, renderer.ribbonFraction)
      )
    )
  )
}

/** @internal */
export const pretty = <E>(renderer: Cause.Cause.Renderer<E> = defaultRenderer) => {
  return (self: Cause.Cause<E>): string => SafeEval.execute(prettySafe(self, renderer))
}
