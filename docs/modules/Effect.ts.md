---
title: Effect.ts
nav_order: 7
parent: Modules
---

## Effect overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [alternatives](#alternatives)
  - [orDie](#ordie)
  - [orDieKeep](#ordiekeep)
  - [orDieWith](#ordiewith)
  - [orElse](#orelse)
  - [orElseEither](#orelseeither)
  - [orElseFail](#orelsefail)
  - [orElseOptional](#orelseoptional)
  - [orElseSucceed](#orelsesucceed)
  - [tryOrElse](#tryorelse)
- [aspects](#aspects)
  - [withParallelismUnbounded](#withparallelismunbounded)
- [concurrency](#concurrency)
  - [withParallelism](#withparallelism)
- [constructors](#constructors)
  - [acquireRelease](#acquirerelease)
  - [acquireReleaseInterruptible](#acquirereleaseinterruptible)
  - [acquireUseRelease](#acquireuserelease)
  - [allowInterrupt](#allowinterrupt)
  - [async](#async)
  - [asyncEffect](#asynceffect)
  - [asyncInterrupt](#asyncinterrupt)
  - [asyncOption](#asyncoption)
  - [attempt](#attempt)
  - [checkInterruptible](#checkinterruptible)
  - [clockWith](#clockwith)
  - [collect](#collect)
  - [collectAll](#collectall)
  - [collectAllDiscard](#collectalldiscard)
  - [collectAllPar](#collectallpar)
  - [collectAllParDiscard](#collectallpardiscard)
  - [collectAllSuccesses](#collectallsuccesses)
  - [collectAllSuccessesPar](#collectallsuccessespar)
  - [collectAllWith](#collectallwith)
  - [collectAllWithEffect](#collectallwitheffect)
  - [collectAllWithPar](#collectallwithpar)
  - [collectFirst](#collectfirst)
  - [collectPar](#collectpar)
  - [collectWhile](#collectwhile)
  - [cond](#cond)
  - [descriptor](#descriptor)
  - [descriptorWith](#descriptorwith)
  - [die](#die)
  - [dieMessage](#diemessage)
  - [dieSync](#diesync)
  - [done](#done)
  - [dropWhile](#dropwhile)
  - [exists](#exists)
  - [existsPar](#existspar)
  - [fail](#fail)
  - [failCause](#failcause)
  - [failCauseSync](#failcausesync)
  - [failSync](#failsync)
  - [fiberIdWith](#fiberidwith)
  - [forEach](#foreach)
  - [forEachDiscard](#foreachdiscard)
  - [forEachExec](#foreachexec)
  - [forEachPar](#foreachpar)
  - [forEachParDiscard](#foreachpardiscard)
  - [forEachParWithIndex](#foreachparwithindex)
  - [gen](#gen)
  - [getFiberRefs](#getfiberrefs)
  - [ifEffect](#ifeffect)
  - [inheritFiberRefs](#inheritfiberrefs)
  - [loop](#loop)
  - [loopDiscard](#loopdiscard)
  - [makeEffectError](#makeeffecterror)
  - [memoizeFunction](#memoizefunction)
  - [mergeAll](#mergeall)
  - [mergeAllPar](#mergeallpar)
  - [never](#never)
  - [none](#none)
  - [noneOrFail](#noneorfail)
  - [noneOrFailWith](#noneorfailwith)
  - [partition](#partition)
  - [partitionPar](#partitionpar)
  - [promise](#promise)
  - [random](#random)
  - [randomWith](#randomwith)
  - [runtime](#runtime)
  - [sleep](#sleep)
  - [struct](#struct)
  - [structPar](#structpar)
  - [succeed](#succeed)
  - [succeedLeft](#succeedleft)
  - [succeedNone](#succeednone)
  - [succeedRight](#succeedright)
  - [succeedSome](#succeedsome)
  - [suspend](#suspend)
  - [suspendSucceed](#suspendsucceed)
  - [sync](#sync)
  - [takeWhile](#takewhile)
  - [tryCatch](#trycatch)
  - [tryCatchPromise](#trycatchpromise)
  - [tryPromise](#trypromise)
  - [tuple](#tuple)
  - [tuplePar](#tuplepar)
  - [unfold](#unfold)
  - [unit](#unit)
  - [updateFiberRefs](#updatefiberrefs)
  - [whenEffect](#wheneffect)
  - [whileLoop](#whileloop)
  - [withClockScoped](#withclockscoped)
  - [yieldNow](#yieldnow)
- [conversions](#conversions)
  - [either](#either)
  - [fromEither](#fromeither)
  - [fromEitherCause](#fromeithercause)
  - [fromFiber](#fromfiber)
  - [fromFiberEffect](#fromfibereffect)
  - [fromOption](#fromoption)
  - [getOrFail](#getorfail)
  - [getOrFailDiscard](#getorfaildiscard)
  - [getOrFailWith](#getorfailwith)
  - [toLayer](#tolayer)
- [do notation](#do-notation)
  - [Do](#do)
  - [bind](#bind)
  - [bindValue](#bindvalue)
- [elements](#elements)
  - [find](#find)
  - [firstSuccessOf](#firstsuccessof)
  - [forAll](#forall)
  - [forEachEffect](#foreacheffect)
  - [forEachOption](#foreachoption)
- [environment](#environment)
  - [clock](#clock)
  - [environment](#environment-1)
  - [environmentWith](#environmentwith)
  - [environmentWithEffect](#environmentwitheffect)
  - [provideEnvironment](#provideenvironment)
  - [provideLayer](#providelayer)
  - [provideService](#provideservice)
  - [provideServiceEffect](#provideserviceeffect)
  - [provideSomeEnvironment](#providesomeenvironment)
  - [provideSomeLayer](#providesomelayer)
  - [scope](#scope)
  - [scoped](#scoped)
  - [service](#service)
  - [serviceWith](#servicewith)
  - [serviceWithEffect](#servicewitheffect)
  - [updateService](#updateservice)
- [error handling](#error-handling)
  - [absolve](#absolve)
  - [absorb](#absorb)
  - [absorbWith](#absorbwith)
  - [catch](#catch)
  - [catchAll](#catchall)
  - [catchAllCause](#catchallcause)
  - [catchAllDefect](#catchalldefect)
  - [catchSome](#catchsome)
  - [catchSomeCause](#catchsomecause)
  - [catchSomeDefect](#catchsomedefect)
  - [catchTag](#catchtag)
  - [cause](#cause)
  - [continueOrFail](#continueorfail)
  - [continueOrFailEffect](#continueorfaileffect)
  - [foldCause](#foldcause)
  - [foldCauseEffect](#foldcauseeffect)
  - [foldEffect](#foldeffect)
  - [sandbox](#sandbox)
  - [unrefineWith](#unrefinewith)
- [execution](#execution)
  - [unsafeFork](#unsafefork)
  - [unsafeRunAsync](#unsaferunasync)
  - [unsafeRunAsyncWith](#unsaferunasyncwith)
  - [unsafeRunPromise](#unsaferunpromise)
  - [unsafeRunPromiseExit](#unsaferunpromiseexit)
  - [unsafeRunSync](#unsaferunsync)
  - [unsafeRunSyncExit](#unsaferunsyncexit)
  - [unsafeRunWith](#unsaferunwith)
- [filtering](#filtering)
  - [filter](#filter)
  - [filterNot](#filternot)
  - [filterNotPar](#filternotpar)
  - [filterOrDie](#filterordie)
  - [filterOrDieMessage](#filterordiemessage)
  - [filterOrElse](#filterorelse)
  - [filterOrElseWith](#filterorelsewith)
  - [filterOrFail](#filterorfail)
  - [filterPar](#filterpar)
- [finalization](#finalization)
  - [addFinalizer](#addfinalizer)
  - [ensuring](#ensuring)
  - [ensuringChild](#ensuringchild)
  - [ensuringChildren](#ensuringchildren)
  - [onExit](#onexit)
  - [onInterrupt](#oninterrupt)
- [folding](#folding)
  - [fold](#fold)
  - [reduce](#reduce)
  - [reduceAll](#reduceall)
  - [reduceAllPar](#reduceallpar)
  - [reduceRight](#reduceright)
  - [reduceWhile](#reducewhile)
- [getters](#getters)
  - [right](#right)
  - [rightWith](#rightwith)
  - [unleft](#unleft)
- [interruption](#interruption)
  - [disconnect](#disconnect)
  - [interrupt](#interrupt)
  - [interruptAs](#interruptas)
  - [interruptible](#interruptible)
  - [interruptibleMask](#interruptiblemask)
  - [uninterruptible](#uninterruptible)
  - [uninterruptibleMask](#uninterruptiblemask)
- [logging](#logging)
  - [log](#log)
  - [logAnnotate](#logannotate)
  - [logAnnotations](#logannotations)
  - [logDebug](#logdebug)
  - [logDebugCause](#logdebugcause)
  - [logDebugCauseMessage](#logdebugcausemessage)
  - [logError](#logerror)
  - [logErrorCause](#logerrorcause)
  - [logErrorCauseMessage](#logerrorcausemessage)
  - [logFatal](#logfatal)
  - [logFatalCause](#logfatalcause)
  - [logFatalCauseMessage](#logfatalcausemessage)
  - [logInfo](#loginfo)
  - [logInfoCause](#loginfocause)
  - [logInfoCauseMessage](#loginfocausemessage)
  - [logSpan](#logspan)
  - [logTrace](#logtrace)
  - [logTraceCause](#logtracecause)
  - [logTraceCauseMessage](#logtracecausemessage)
  - [logWarning](#logwarning)
  - [logWarningCause](#logwarningcause)
  - [logWarningCauseMessage](#logwarningcausemessage)
- [mapping](#mapping)
  - [as](#as)
  - [asLeft](#asleft)
  - [asLeftError](#aslefterror)
  - [asRight](#asright)
  - [asRightError](#asrighterror)
  - [asSome](#assome)
  - [asSomeError](#assomeerror)
  - [asUnit](#asunit)
  - [map](#map)
  - [mapAccum](#mapaccum)
  - [mapBoth](#mapboth)
  - [mapError](#maperror)
  - [mapErrorCause](#maperrorcause)
  - [mapTryCatch](#maptrycatch)
  - [negate](#negate)
- [models](#models)
  - [Effect (interface)](#effect-interface)
- [mutations](#mutations)
  - [awaitAllChildren](#awaitallchildren)
  - [cached](#cached)
  - [cachedInvalidate](#cachedinvalidate)
  - [delay](#delay)
  - [diffFiberRefs](#difffiberrefs)
  - [eventually](#eventually)
  - [flip](#flip)
  - [flipWith](#flipwith)
  - [forever](#forever)
  - [head](#head)
  - [ignore](#ignore)
  - [ignoreLogged](#ignorelogged)
  - [memoize](#memoize)
  - [merge](#merge)
  - [onDone](#ondone)
  - [onDoneCause](#ondonecause)
  - [onError](#onerror)
  - [once](#once)
  - [option](#option)
  - [parallelErrors](#parallelerrors)
  - [parallelFinalizers](#parallelfinalizers)
  - [patchFiberRefs](#patchfiberrefs)
  - [race](#race)
  - [raceAll](#raceall)
  - [raceAwait](#raceawait)
  - [raceEither](#raceeither)
  - [raceFibersWith](#racefiberswith)
  - [raceFirst](#racefirst)
  - [raceWith](#racewith)
  - [refineOrDie](#refineordie)
  - [refineOrDieWith](#refineordiewith)
  - [reject](#reject)
  - [rejectEffect](#rejecteffect)
  - [repeat](#repeat)
  - [repeatN](#repeatn)
  - [repeatOrElse](#repeatorelse)
  - [repeatOrElseEither](#repeatorelseeither)
  - [repeatUntil](#repeatuntil)
  - [repeatUntilEffect](#repeatuntileffect)
  - [repeatUntilEquals](#repeatuntilequals)
  - [repeatWhile](#repeatwhile)
  - [repeatWhileEffect](#repeatwhileeffect)
  - [repeatWhileEquals](#repeatwhileequals)
  - [replicate](#replicate)
  - [replicateEffect](#replicateeffect)
  - [replicateEffectDiscard](#replicateeffectdiscard)
  - [resurrect](#resurrect)
  - [retry](#retry)
  - [retryN](#retryn)
  - [retryOrElse](#retryorelse)
  - [retryOrElseEither](#retryorelseeither)
  - [retryUntil](#retryuntil)
  - [retryUntilEffect](#retryuntileffect)
  - [retryUntilEquals](#retryuntilequals)
  - [retryWhile](#retrywhile)
  - [retryWhileEffect](#retrywhileeffect)
  - [retryWhileEquals](#retrywhileequals)
  - [schedule](#schedule)
  - [scheduleForked](#scheduleforked)
  - [scheduleFrom](#schedulefrom)
  - [sequentialFinalizers](#sequentialfinalizers)
  - [setFiberRefs](#setfiberrefs)
  - [some](#some)
  - [someOrElse](#someorelse)
  - [someOrElseEffect](#someorelseeffect)
  - [someOrFail](#someorfail)
  - [someOrFailException](#someorfailexception)
  - [someWith](#somewith)
  - [summarized](#summarized)
  - [supervised](#supervised)
  - [timed](#timed)
  - [timedWith](#timedwith)
  - [timeout](#timeout)
  - [timeoutFail](#timeoutfail)
  - [timeoutFailCause](#timeoutfailcause)
  - [timeoutTo](#timeoutto)
  - [transplant](#transplant)
  - [uncause](#uncause)
  - [unless](#unless)
  - [unlessEffect](#unlesseffect)
  - [unrefine](#unrefine)
  - [unright](#unright)
  - [unsandbox](#unsandbox)
  - [unsome](#unsome)
  - [using](#using)
  - [validate](#validate)
  - [validateAll](#validateall)
  - [validateAllDiscard](#validatealldiscard)
  - [validateAllPar](#validateallpar)
  - [validateAllParDiscard](#validateallpardiscard)
  - [validateFirst](#validatefirst)
  - [validateFirstPar](#validatefirstpar)
  - [validatePar](#validatepar)
  - [validateWith](#validatewith)
  - [validateWithPar](#validatewithpar)
  - [when](#when)
  - [whenCase](#whencase)
  - [whenCaseEffect](#whencaseeffect)
  - [withClock](#withclock)
  - [withEarlyRelease](#withearlyrelease)
  - [withMetric](#withmetric)
- [products](#products)
  - [zip](#zip)
  - [zipLeft](#zipleft)
  - [zipRight](#zipright)
  - [zipWith](#zipwith)
- [refinements](#refinements)
  - [isEffect](#iseffect)
- [runtime](#runtime-1)
  - [updateRuntimeFlags](#updateruntimeflags)
  - [withRuntimeFlags](#withruntimeflags)
- [scoping](#scoping)
  - [scopeWith](#scopewith)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
  - [flatten](#flatten)
  - [flattenErrorOption](#flattenerroroption)
  - [tap](#tap)
  - [tapBoth](#tapboth)
  - [tapDefect](#tapdefect)
  - [tapEither](#tapeither)
  - [tapError](#taperror)
  - [tapErrorCause](#taperrorcause)
  - [tapSome](#tapsome)
- [supervision](#supervision)
  - [daemonChildren](#daemonchildren)
  - [fork](#fork)
  - [forkAll](#forkall)
  - [forkAllDiscard](#forkalldiscard)
  - [forkDaemon](#forkdaemon)
  - [forkIn](#forkin)
  - [forkScoped](#forkscoped)
  - [forkWithErrorHandler](#forkwitherrorhandler)
- [symbols](#symbols)
  - [EffectTypeId](#effecttypeid)
  - [EffectTypeId (type alias)](#effecttypeid-type-alias)
- [tracing](#tracing)
  - [traced](#traced)
- [traversing](#traversing)
  - [forEachWithIndex](#foreachwithindex)
- [utilities](#utilities)
  - [exit](#exit)
  - [fiberId](#fiberid)
  - [intoDeferred](#intodeferred)
- [zipping](#zipping)
  - [zipPar](#zippar)
  - [zipParLeft](#zipparleft)
  - [zipParRight](#zipparright)
  - [zipWithPar](#zipwithpar)

---

# alternatives

## orDie

Translates effect failure into death of the fiber, making all failures
unchecked and not a part of the type of the effect.

**Signature**

```ts
export declare const orDie: any
```

Added in v1.0.0

## orDieKeep

Converts all failures to unchecked exceptions.

**Signature**

```ts
export declare const orDieKeep: any
```

Added in v1.0.0

## orDieWith

Keeps none of the errors, and terminates the fiber with them, using the
specified function to convert the `E` into a `Throwable`.

**Signature**

```ts
export declare const orDieWith: any
```

Added in v1.0.0

## orElse

Executes this effect and returns its value, if it succeeds, but otherwise
executes the specified effect.

**Signature**

```ts
export declare const orElse: any
```

Added in v1.0.0

## orElseEither

Returns an effect that will produce the value of this effect, unless it
fails, in which case, it will produce the value of the specified effect.

**Signature**

```ts
export declare const orElseEither: any
```

Added in v1.0.0

## orElseFail

Executes this effect and returns its value, if it succeeds, but otherwise
fails with the specified error.

**Signature**

```ts
export declare const orElseFail: any
```

Added in v1.0.0

## orElseOptional

Returns an effect that will produce the value of this effect, unless it
fails with the `None` value, in which case it will produce the value of
the specified effect.

**Signature**

```ts
export declare const orElseOptional: any
```

Added in v1.0.0

## orElseSucceed

Executes this effect and returns its value, if it succeeds, but
otherwise succeeds with the specified value.

**Signature**

```ts
export declare const orElseSucceed: any
```

Added in v1.0.0

## tryOrElse

Executed `that` in case `self` fails with a `Cause` that doesn't contain
defects, executes `success` in case of successes

**Signature**

```ts
export declare const tryOrElse: any
```

Added in v1.0.0

# aspects

## withParallelismUnbounded

Runs the specified effect with an unbounded maximum number of fibers for
parallel operations.

**Signature**

```ts
export declare const withParallelismUnbounded: any
```

Added in v1.0.0

# concurrency

## withParallelism

**Signature**

```ts
export declare const withParallelism: any
```

Added in v1.0.0

# constructors

## acquireRelease

Constructs a scoped resource from an `acquire` and `release` effect.

If `acquire` successfully completes execution then `release` will be added to
the finalizers associated with the scope of this effect and is guaranteed to
be run when the scope is closed.

The `acquire` and `release` effects will be run uninterruptibly.

Additionally, the `release` effect may depend on the `Exit` value specified
when the scope is closed.

**Signature**

```ts
export declare const acquireRelease: any
```

Added in v1.0.0

## acquireReleaseInterruptible

A variant of `acquireRelease` that allows the `acquire` effect to be
interruptible.

Since the `acquire` effect could be interrupted after partially acquiring
resources, the `release` effect is not allowed to access the resource
produced by `acquire` and must independently determine what finalization,
if any, needs to be performed (e.g. by examining in memory state).

Additionally, the `release` effect may depend on the `Exit` value specified
when the scope is closed.

**Signature**

```ts
export declare const acquireReleaseInterruptible: any
```

Added in v1.0.0

## acquireUseRelease

When this effect represents acquisition of a resource (for example, opening
a file, launching a thread, etc.), `acquireUseRelease` can be used to
ensure the acquisition is not interrupted and the resource is always
released.

The function does two things:

1. Ensures this effect, which acquires the resource, will not be
   interrupted. Of course, acquisition may fail for internal reasons (an
   uncaught exception).
2. Ensures the `release` effect will not be interrupted, and will be
   executed so long as this effect successfully
   acquires the resource.

In between acquisition and release of the resource, the `use` effect is
executed.

If the `release` effect fails, then the entire effect will fail even if the
`use` effect succeeds. If this fail-fast behavior is not desired, errors
produced by the `release` effect can be caught and ignored.

**Signature**

```ts
export declare const acquireUseRelease: any
```

Added in v1.0.0

## allowInterrupt

Makes an explicit check to see if any fibers are attempting to interrupt the
current fiber, and if so, performs self-interruption.

Note that this allows for interruption to occur in uninterruptible regions.

**Signature**

```ts
export declare const allowInterrupt: any
```

Added in v1.0.0

## async

Imports an asynchronous side-effect into a pure `Effect` value. See
`asyncMaybe` for the more expressive variant of this function that can
return a value synchronously.

The callback function `Effect<R, E, A> => void` must be called at most once.

The `FiberId` of the fiber that may complete the async callback may be
provided to allow for better diagnostics.

**Signature**

```ts
export declare const async: any
```

Added in v1.0.0

## asyncEffect

Converts an asynchronous, callback-style API into an `Effect`, which will
be executed asynchronously.

With this variant, the registration function may return a an `Effect`.

**Signature**

```ts
export declare const asyncEffect: any
```

Added in v1.0.0

## asyncInterrupt

Imports an asynchronous side-effect into an effect. The side-effect has
the option of returning the value synchronously, which is useful in cases
where it cannot be determined if the effect is synchronous or asynchronous
until the side-effect is actually executed. The effect also has the option
of returning a canceler, which will be used by the runtime to cancel the
asynchronous effect if the fiber executing the effect is interrupted.

If the register function returns a value synchronously, then the callback
function `Effect<R, E, A> => void` must not be called. Otherwise the callback
function must be called at most once.

The `FiberId` of the fiber that may complete the async callback may be
provided to allow for better diagnostics.

**Signature**

```ts
export declare const asyncInterrupt: any
```

Added in v1.0.0

## asyncOption

Imports an asynchronous effect into a pure `Effect` value, possibly returning
the value synchronously.

If the register function returns a value synchronously, then the callback
function `Effect<R, E, A> => void` must not be called. Otherwise the callback
function must be called at most once.

The `FiberId` of the fiber that may complete the async callback may be
provided to allow for better diagnostics.

**Signature**

```ts
export declare const asyncOption: any
```

Added in v1.0.0

## attempt

Imports a synchronous side-effect into a pure `Effect` value, translating any
thrown exceptions into typed failed effects creating with `Effect.fail`.

**Signature**

```ts
export declare const attempt: any
```

Added in v1.0.0

## checkInterruptible

Checks the interrupt status, and produces the effect returned by the
specified callback.

**Signature**

```ts
export declare const checkInterruptible: any
```

Added in v1.0.0

## clockWith

Retreives the `Clock` service from the environment and provides it to the
specified effectful function.

**Signature**

```ts
export declare const clockWith: any
```

Added in v1.0.0

## collect

Evaluate each effect in the structure from left to right, collecting the
the successful values and discarding the empty cases. For a parallel version, see `collectPar`.

**Signature**

```ts
export declare const collect: any
```

Added in v1.0.0

## collectAll

Evaluate each effect in the structure from left to right, and collect the
results. For a parallel version, see `collectAllPar`.

**Signature**

```ts
export declare const collectAll: any
```

Added in v1.0.0

## collectAllDiscard

Evaluate each effect in the structure from left to right, and discard the
results. For a parallel version, see `collectAllParDiscard`.

**Signature**

```ts
export declare const collectAllDiscard: any
```

Added in v1.0.0

## collectAllPar

Evaluate each effect in the structure in parallel, and collect the results.
For a sequential version, see `collectAll`.

**Signature**

```ts
export declare const collectAllPar: any
```

Added in v1.0.0

## collectAllParDiscard

Evaluate each effect in the structure in parallel, and discard the results.
For a sequential version, see `collectAllDiscard`.

**Signature**

```ts
export declare const collectAllParDiscard: any
```

Added in v1.0.0

## collectAllSuccesses

Evaluate and run each effect in the structure and collect the results,
discarding results from failed effects.

**Signature**

```ts
export declare const collectAllSuccesses: any
```

Added in v1.0.0

## collectAllSuccessesPar

Evaluate and run each effect in the structure in parallel and collect the
results, discarding results from failed effects.

**Signature**

```ts
export declare const collectAllSuccessesPar: any
```

Added in v1.0.0

## collectAllWith

Evaluate each effect in the structure with `collectAll`, and collect the
results with given partial function.

**Signature**

```ts
export declare const collectAllWith: any
```

Added in v1.0.0

## collectAllWithEffect

Returns a filtered, mapped subset of the elements of the iterable based on a
partial function.

**Signature**

```ts
export declare const collectAllWithEffect: any
```

Added in v1.0.0

## collectAllWithPar

Evaluate each effect in the structure with `collectAllPar`, and collect
the results with given partial function.

**Signature**

```ts
export declare const collectAllWithPar: any
```

Added in v1.0.0

## collectFirst

Collects the first element of the `Collection<A?` for which the effectual
function `f` returns `Some`.

**Signature**

```ts
export declare const collectFirst: any
```

Added in v1.0.0

## collectPar

Evaluate each effect in the structure in parallel, collecting the successful
values and discarding the empty cases.

**Signature**

```ts
export declare const collectPar: any
```

Added in v1.0.0

## collectWhile

Transforms all elements of the chunk for as long as the specified partial
function is defined.

**Signature**

```ts
export declare const collectWhile: any
```

Added in v1.0.0

## cond

Evaluate the predicate, return the given `A` as success if predicate returns
true, and the given `E` as error otherwise

For effectful conditionals, see `ifEffect`.

**Signature**

```ts
export declare const cond: any
```

Added in v1.0.0

## descriptor

Constructs an effect with information about the current `Fiber`.

**Signature**

```ts
export declare const descriptor: any
```

Added in v1.0.0

## descriptorWith

Constructs an effect based on information about the current `Fiber`.

**Signature**

```ts
export declare const descriptorWith: any
```

Added in v1.0.0

## die

**Signature**

```ts
export declare const die: any
```

Added in v1.0.0

## dieMessage

**Signature**

```ts
export declare const dieMessage: any
```

Added in v1.0.0

## dieSync

**Signature**

```ts
export declare const dieSync: any
```

Added in v1.0.0

## done

**Signature**

```ts
export declare const done: any
```

Added in v1.0.0

## dropWhile

Drops all elements so long as the predicate returns true.

**Signature**

```ts
export declare const dropWhile: any
```

Added in v1.0.0

## exists

Determines whether any element of the `Iterable<A>` satisfies the effectual
predicate `f`, working sequentially.

**Signature**

```ts
export declare const exists: any
```

Added in v1.0.0

## existsPar

Determines whether any element of the `Iterable<A>` satisfies the effectual
predicate `f`, working in parallel. Interrupts all effects on any failure or
finding an element that satisfies the predicate.

**Signature**

```ts
export declare const existsPar: any
```

Added in v1.0.0

## fail

**Signature**

```ts
export declare const fail: any
```

Added in v1.0.0

## failCause

**Signature**

```ts
export declare const failCause: any
```

Added in v1.0.0

## failCauseSync

**Signature**

```ts
export declare const failCauseSync: any
```

Added in v1.0.0

## failSync

**Signature**

```ts
export declare const failSync: any
```

Added in v1.0.0

## fiberIdWith

**Signature**

```ts
export declare const fiberIdWith: any
```

Added in v1.0.0

## forEach

**Signature**

```ts
export declare const forEach: any
```

Added in v1.0.0

## forEachDiscard

**Signature**

```ts
export declare const forEachDiscard: any
```

Added in v1.0.0

## forEachExec

Applies the function `f` to each element of the `Collection<A>` and returns
the result in a new `Chunk<B>` using the specified execution strategy.

**Signature**

```ts
export declare const forEachExec: any
```

Added in v1.0.0

## forEachPar

**Signature**

```ts
export declare const forEachPar: any
```

Added in v1.0.0

## forEachParDiscard

**Signature**

```ts
export declare const forEachParDiscard: any
```

Added in v1.0.0

## forEachParWithIndex

Same as `forEachPar`, except that the function `f` is supplied
a second argument that corresponds to the index (starting from 0)
of the current element being iterated over.

**Signature**

```ts
export declare const forEachParWithIndex: any
```

Added in v1.0.0

## gen

**Signature**

```ts
export declare const gen: any
```

Added in v1.0.0

## getFiberRefs

Returns a collection of all `FiberRef` values for the fiber running this
effect.

**Signature**

```ts
export declare const getFiberRefs: any
```

Added in v1.0.0

## ifEffect

Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.

**Signature**

```ts
export declare const ifEffect: any
```

Added in v1.0.0

## inheritFiberRefs

Inherits values from all `FiberRef` instances into current fiber.

**Signature**

```ts
export declare const inheritFiberRefs: any
```

Added in v1.0.0

## loop

Loops with the specified effectual function, collecting the results into a
list. The moral equivalent of:

```ts
let s = initial
let as = [] as readonly A[]

while (cont(s)) {
  as = [body(s), ...as]
  s = inc(s)
}

A.reverse(as)
```

**Signature**

```ts
export declare const loop: any
```

Added in v1.0.0

## loopDiscard

Loops with the specified effectual function purely for its effects. The
moral equivalent of:

```ts
let s = initial

while (cont(s)) {
  body(s)
  s = inc(s)
}
```

**Signature**

```ts
export declare const loopDiscard: any
```

Added in v1.0.0

## makeEffectError

Constructs a new `EffectError`.

**Signature**

```ts
export declare const makeEffectError: any
```

Added in v1.0.0

## memoizeFunction

Returns a memoized version of the specified effectual function.

**Signature**

```ts
export declare const memoizeFunction: any
```

Added in v1.0.0

## mergeAll

Merges an `Iterable<Effect<R, E, A>>` to a single effect, working
sequentially.

**Signature**

```ts
export declare const mergeAll: any
```

Added in v1.0.0

## mergeAllPar

Merges an `Iterable<Effect<R, E, A>>` to a single effect, working in
parallel.

Due to the parallel nature of this combinator, `f` must be both:

- commutative: `f(a, b) == f(b, a)`
- associative: `f(a, f(b, c)) == f(f(a, b), c)`

It's unsafe to execute side effects inside `f`, as `f` may be executed
more than once for some of `in` elements during effect execution.

**Signature**

```ts
export declare const mergeAllPar: any
```

Added in v1.0.0

## never

Returns a effect that will never produce anything. The moral equivalent of
`while(true) {}`, only without the wasted CPU cycles.

**Signature**

```ts
export declare const never: any
```

Added in v1.0.0

## none

Requires the option produced by this value to be `None`.

**Signature**

```ts
export declare const none: any
```

Added in v1.0.0

## noneOrFail

Lifts an `Option` into a `Effect`. If the option is empty it succeeds with
`void`. If the option is defined it fails with the content.

**Signature**

```ts
export declare const noneOrFail: any
```

Added in v1.0.0

## noneOrFailWith

Lifts an `Option` into a `Effect`. If the option is empty it succeeds with
`undefined`. If the option is defined it fails with an error computed by
the specified function.

**Signature**

```ts
export declare const noneOrFailWith: any
```

Added in v1.0.0

## partition

Feeds elements of type `A` to a function `f` that returns an effect.
Collects all successes and failures in a tupled fashion.

**Signature**

```ts
export declare const partition: any
```

Added in v1.0.0

## partitionPar

Feeds elements of type `A` to a function `f` that returns an effect.
Collects all successes and failures in parallel and returns the result as a
tuple.

**Signature**

```ts
export declare const partitionPar: any
```

Added in v1.0.0

## promise

Like `tryPromise` but produces a defect in case of errors.

**Signature**

```ts
export declare const promise: any
```

Added in v1.0.0

## random

Retreives the `Random` service from the environment.

**Signature**

```ts
export declare const random: any
```

Added in v1.0.0

## randomWith

Retreives the `Random` service from the environment and uses it to run the
specified workflow.

**Signature**

```ts
export declare const randomWith: any
```

Added in v1.0.0

## runtime

Returns an effect that accesses the runtime, which can be used to
(unsafely) execute tasks. This is useful for integration with legacy code
that must call back into Effect code.

**Signature**

```ts
export declare const runtime: any
```

Added in v1.0.0

## sleep

Returns an effect that suspends for the specified duration. This method is
asynchronous, and does not actually block the fiber executing the effect.

**Signature**

```ts
export declare const sleep: any
```

Added in v1.0.0

## struct

**Signature**

```ts
export declare const struct: <NER extends Record<string, Effect<any, any, any>>>(
  r: any
) => Effect<
  [NER[keyof NER]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [NER[keyof NER]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  { [K in keyof NER]: [NER[K]] extends [{ [EffectTypeId]: { _A: (_: never) => infer A } }] ? A : never }
>
```

Added in v1.0.0

## structPar

**Signature**

```ts
export declare const structPar: any
```

Added in v1.0.0

## succeed

**Signature**

```ts
export declare const succeed: any
```

Added in v1.0.0

## succeedLeft

Returns an effect which succeeds with the value wrapped in a `Left`.

**Signature**

```ts
export declare const succeedLeft: any
```

Added in v1.0.0

## succeedNone

Returns an effect which succeeds with `None`.

**Signature**

```ts
export declare const succeedNone: any
```

Added in v1.0.0

## succeedRight

Returns an effect which succeeds with the value wrapped in a `Right`.

**Signature**

```ts
export declare const succeedRight: any
```

Added in v1.0.0

## succeedSome

Returns an effect which succeeds with the value wrapped in a `Some`.

**Signature**

```ts
export declare const succeedSome: any
```

Added in v1.0.0

## suspend

Returns a lazily constructed effect, whose construction may itself require
effects. When no environment is required (i.e., when `R == unknown`) it is
conceptually equivalent to `flatten(succeed(io))`.

**Signature**

```ts
export declare const suspend: any
```

Added in v1.0.0

## suspendSucceed

**Signature**

```ts
export declare const suspendSucceed: any
```

Added in v1.0.0

## sync

**Signature**

```ts
export declare const sync: any
```

Added in v1.0.0

## takeWhile

Takes all elements so long as the effectual predicate returns true.

**Signature**

```ts
export declare const takeWhile: any
```

Added in v1.0.0

## tryCatch

Imports a synchronous side-effect into a pure value, translating any
thrown exceptions into typed failed effects.

**Signature**

```ts
export declare const tryCatch: any
```

Added in v1.0.0

## tryCatchPromise

Create an `Effect` that when executed will construct `promise` and wait for
its result, errors will be handled using `onReject`.

**Signature**

```ts
export declare const tryCatchPromise: any
```

Added in v1.0.0

## tryPromise

Create an `Effect` that when executed will construct `promise` and wait for
its result, errors will produce failure as `unknown`.

**Signature**

```ts
export declare const tryPromise: any
```

Added in v1.0.0

## tuple

Like `forEach` + `identity` with a tuple type.

**Signature**

```ts
export declare const tuple: <T extends any>(
  ...t: T
) => Effect<
  [T[number]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [T[number]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  any
>
```

Added in v1.0.0

## tuplePar

Like tuple but parallel, same as `forEachPar` + `identity` with a tuple type.

**Signature**

```ts
export declare const tuplePar: <T extends any>(
  ...t: T
) => Effect<
  [T[number]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  [T[number]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  any
>
```

Added in v1.0.0

## unfold

Constructs a `Chunk` by repeatedly applying the effectual function `f` as
long as it returns `Some`.

**Signature**

```ts
export declare const unfold: any
```

Added in v1.0.0

## unit

**Signature**

```ts
export declare const unit: any
```

Added in v1.0.0

## updateFiberRefs

Updates the `FiberRef` values for the fiber running this effect using the
specified function.

**Signature**

```ts
export declare const updateFiberRefs: any
```

Added in v1.0.0

## whenEffect

**Signature**

```ts
export declare const whenEffect: any
```

Added in v1.0.0

## whileLoop

**Signature**

```ts
export declare const whileLoop: any
```

Added in v1.0.0

## withClockScoped

Sets the implementation of the clock service to the specified value and
restores it to its original value when the scope is closed.

**Signature**

```ts
export declare const withClockScoped: any
```

Added in v1.0.0

## yieldNow

**Signature**

```ts
export declare const yieldNow: any
```

Added in v1.0.0

# conversions

## either

Returns an effect whose failure and success have been lifted into an
`Either`. The resulting effect cannot fail, because the failure case has
been exposed as part of the `Either` success case.

This method is useful for recovering from effects that may fail.

The error parameter of the returned `Effect` is `never`, since it is
guaranteed the effect does not model failure.

**Signature**

```ts
export declare const either: any
```

Added in v1.0.0

## fromEither

Lifts an `Either<E, A>` into an `Effect<never, E, A>`.

**Signature**

```ts
export declare const fromEither: any
```

Added in v1.0.0

## fromEitherCause

Lifts an `Either<Cause<E>, A>` into an `Effect<never, E, A>`.

**Signature**

```ts
export declare const fromEitherCause: any
```

Added in v1.0.0

## fromFiber

Creates an `Effect` value that represents the exit value of the specified
fiber.

**Signature**

```ts
export declare const fromFiber: any
```

Added in v1.0.0

## fromFiberEffect

Creates an `Effect` value that represents the exit value of the specified
fiber.

**Signature**

```ts
export declare const fromFiberEffect: any
```

Added in v1.0.0

## fromOption

Lifts an `Option` into an `Effect` but preserves the error as an option in
the error channel, making it easier to compose in some scenarios.

**Signature**

```ts
export declare const fromOption: any
```

Added in v1.0.0

## getOrFail

Lifts an `Option` into an `Effect`, if the option is not defined it fails
with `NoSuchElementException`.

**Signature**

```ts
export declare const getOrFail: any
```

Added in v1.0.0

## getOrFailDiscard

Lifts an `Option` into a `IO`, if the option is not defined it fails with
`void`.

**Signature**

```ts
export declare const getOrFailDiscard: any
```

Added in v1.0.0

## getOrFailWith

Lifts an `Maybe` into an `Effect`. If the option is not defined, fail with
the specified `e` value.

**Signature**

```ts
export declare const getOrFailWith: any
```

Added in v1.0.0

## toLayer

Constructs a layer from this effect.

**Signature**

```ts
export declare const toLayer: any
```

Added in v1.0.0

# do notation

## Do

**Signature**

```ts
export declare const Do: any
```

Added in v1.0.0

## bind

Binds an effectful value in a `do` scope

**Signature**

```ts
export declare const bind: any
```

Added in v1.0.0

## bindValue

Like bind for values

**Signature**

```ts
export declare const bindValue: any
```

Added in v1.0.0

# elements

## find

Returns the first element that satisfies the effectful predicate.

**Signature**

```ts
export declare const find: any
```

Added in v1.0.0

## firstSuccessOf

Returns an effect that runs this effect and in case of failure, runs each
of the specified effects in order until one of them succeeds.

**Signature**

```ts
export declare const firstSuccessOf: any
```

Added in v1.0.0

## forAll

Determines whether all elements of the `Collection<A>` satisfies the effectual
predicate `f`.

**Signature**

```ts
export declare const forAll: any
```

Added in v1.0.0

## forEachEffect

Returns a new effect that will pass the success value of this effect to the
provided callback. If this effect fails, then the failure will be ignored.

**Signature**

```ts
export declare const forEachEffect: any
```

Added in v1.0.0

## forEachOption

Applies the function `f` if the argument is non-empty and returns the
results in a new `Option<B>`.

**Signature**

```ts
export declare const forEachOption: any
```

Added in v1.0.0

# environment

## clock

Retreives the `Clock` service from the environment.

**Signature**

```ts
export declare const clock: any
```

Added in v1.0.0

## environment

**Signature**

```ts
export declare const environment: any
```

Added in v1.0.0

## environmentWith

Accesses the environment of the effect.

**Signature**

```ts
export declare const environmentWith: any
```

Added in v1.0.0

## environmentWithEffect

Effectually accesses the environment of the effect.

**Signature**

```ts
export declare const environmentWithEffect: any
```

Added in v1.0.0

## provideEnvironment

Provides the effect with its required environment, which eliminates its
dependency on `R`.

**Signature**

```ts
export declare const provideEnvironment: any
```

Added in v1.0.0

## provideLayer

Provides a layer to the effect, which translates it to another level.

**Signature**

```ts
export declare const provideLayer: any
```

Added in v1.0.0

## provideService

Provides the effect with the single service it requires. If the effect
requires more than one service use `provideEnvironment` instead.

**Signature**

```ts
export declare const provideService: any
```

Added in v1.0.0

## provideServiceEffect

Provides the effect with the single service it requires. If the effect
requires more than one service use `provideEnvironment` instead.

**Signature**

```ts
export declare const provideServiceEffect: any
```

Added in v1.0.0

## provideSomeEnvironment

Provides some of the environment required to run this effect,
leaving the remainder `R0`.

**Signature**

```ts
export declare const provideSomeEnvironment: any
```

Added in v1.0.0

## provideSomeLayer

Splits the environment into two parts, providing one part using the
specified layer and leaving the remainder `R0`.

**Signature**

```ts
export declare const provideSomeLayer: any
```

Added in v1.0.0

## scope

**Signature**

```ts
export declare const scope: any
```

Added in v1.0.0

## scoped

Scopes all resources uses in this workflow to the lifetime of the workflow,
ensuring that their finalizers are run as soon as this workflow completes
execution, whether by success, failure, or interruption.

**Signature**

```ts
export declare const scoped: any
```

Added in v1.0.0

## service

Extracts the specified service from the environment of the effect.

**Signature**

```ts
export declare const service: any
```

Added in v1.0.0

## serviceWith

Accesses the specified service in the environment of the effect.

**Signature**

```ts
export declare const serviceWith: any
```

Added in v1.0.0

## serviceWithEffect

Effectfully accesses the specified service in the environment of the effect.

**Signature**

```ts
export declare const serviceWithEffect: any
```

Added in v1.0.0

## updateService

Updates the service with the required service entry.

**Signature**

```ts
export declare const updateService: any
```

Added in v1.0.0

# error handling

## absolve

Submerges the error case of an `Either` into an `Effect`. The inverse
operation of `either`.

**Signature**

```ts
export declare const absolve: any
```

Added in v1.0.0

## absorb

Attempts to convert defects into a failure, throwing away all information
about the cause of the failure.

**Signature**

```ts
export declare const absorb: any
```

Added in v1.0.0

## absorbWith

Attempts to convert defects into a failure with the specified function,
throwing away all information about the cause of the failure.

**Signature**

```ts
export declare const absorbWith: any
```

Added in v1.0.0

## catch

Recovers from specified error.

**Signature**

```ts
export declare const catch: any
```

Added in v1.0.0

## catchAll

Recovers from all recoverable errors.

**Note**: that `Effect.catchAll` will not recover from unrecoverable defects. To
recover from both recoverable and unrecoverable errors use
`Effect.catchAllCause`.

**Signature**

```ts
export declare const catchAll: any
```

Added in v1.0.0

## catchAllCause

Recovers from both recoverable and unrecoverable errors.

See `absorb`, `sandbox`, `mapErrorCause` for other functions that can
recover from defects.

**Signature**

```ts
export declare const catchAllCause: any
```

Added in v1.0.0

## catchAllDefect

Recovers from all defects with provided function.

**WARNING**: There is no sensible way to recover from defects. This
method should be used only at the boundary between Effect and an external
system, to transmit information on a defect for diagnostic or explanatory
purposes.

**Signature**

```ts
export declare const catchAllDefect: any
```

Added in v1.0.0

## catchSome

Recovers from some or all of the error cases.

**Signature**

```ts
export declare const catchSome: any
```

Added in v1.0.0

## catchSomeCause

Recovers from some or all of the error cases with provided cause.

**Signature**

```ts
export declare const catchSomeCause: any
```

Added in v1.0.0

## catchSomeDefect

Recovers from some or all of the defects with provided partial function.

**WARNING**: There is no sensible way to recover from defects. This
method should be used only at the boundary between Effect and an external
system, to transmit information on a defect for diagnostic or explanatory
purposes.

**Signature**

```ts
export declare const catchSomeDefect: any
```

Added in v1.0.0

## catchTag

Recovers from specified tagged error.

**Signature**

```ts
export declare const catchTag: any
```

Added in v1.0.0

## cause

Returns an effect that succeeds with the cause of failure of this effect,
or `Cause.empty` if the effect did succeed.

**Signature**

```ts
export declare const cause: any
```

Added in v1.0.0

## continueOrFail

Fail with the specifed `error` if the supplied partial function does not
match, otherwise continue with the returned value.

**Signature**

```ts
export declare const continueOrFail: any
```

Added in v1.0.0

## continueOrFailEffect

Fail with the specifed `error` if the supplied partial function does not
match, otherwise continue with the returned value.

**Signature**

```ts
export declare const continueOrFailEffect: any
```

Added in v1.0.0

## foldCause

**Signature**

```ts
export declare const foldCause: any
```

Added in v1.0.0

## foldCauseEffect

**Signature**

```ts
export declare const foldCauseEffect: any
```

Added in v1.0.0

## foldEffect

**Signature**

```ts
export declare const foldEffect: any
```

Added in v1.0.0

## sandbox

Exposes the full `Cause` of failure for the specified effect.

**Signature**

```ts
export declare const sandbox: any
```

Added in v1.0.0

## unrefineWith

Takes some fiber failures and converts them into errors, using the specified
function to convert the `E` into an `E1 | E2`.

**Signature**

```ts
export declare const unrefineWith: any
```

Added in v1.0.0

# execution

## unsafeFork

**Signature**

```ts
export declare const unsafeFork: any
```

Added in v1.0.0

## unsafeRunAsync

**Signature**

```ts
export declare const unsafeRunAsync: any
```

Added in v1.0.0

## unsafeRunAsyncWith

**Signature**

```ts
export declare const unsafeRunAsyncWith: any
```

Added in v1.0.0

## unsafeRunPromise

Runs an `Effect` workflow, returning a `Promise` which resolves with the
result of the workflow or rejects with an error.

**Signature**

```ts
export declare const unsafeRunPromise: any
```

Added in v1.0.0

## unsafeRunPromiseExit

Runs an `Effect` workflow, returning a `Promise` which resolves with the
`Exit` value of the workflow.

**Signature**

```ts
export declare const unsafeRunPromiseExit: any
```

Added in v1.0.0

## unsafeRunSync

**Signature**

```ts
export declare const unsafeRunSync: any
```

Added in v1.0.0

## unsafeRunSyncExit

**Signature**

```ts
export declare const unsafeRunSyncExit: any
```

Added in v1.0.0

## unsafeRunWith

**Signature**

```ts
export declare const unsafeRunWith: any
```

Added in v1.0.0

# filtering

## filter

Filters the collection using the specified effectful predicate.

**Signature**

```ts
export declare const filter: any
```

Added in v1.0.0

## filterNot

Filters the collection using the specified effectual predicate, removing
all elements that satisfy the predicate.

**Signature**

```ts
export declare const filterNot: any
```

Added in v1.0.0

## filterNotPar

Filters the collection in parallel using the specified effectual predicate.
See `filterNot` for a sequential version.

**Signature**

```ts
export declare const filterNotPar: any
```

Added in v1.0.0

## filterOrDie

Filter the specified effect with the provided function, dying with specified
defect if the predicate fails.

**Signature**

```ts
export declare const filterOrDie: any
```

Added in v1.0.0

## filterOrDieMessage

Filter the specified effect with the provided function, dying with specified
message if the predicate fails.

**Signature**

```ts
export declare const filterOrDieMessage: any
```

Added in v1.0.0

## filterOrElse

Filters the specified effect with the provided function returning the value
of the effect if it is successful, otherwise returns the value of `orElse`.

**Signature**

```ts
export declare const filterOrElse: any
```

Added in v1.0.0

## filterOrElseWith

Filters the specified effect with the provided function returning the value
of the effect if it is successful, otherwise returns the value of `orElse`.

**Signature**

```ts
export declare const filterOrElseWith: any
```

Added in v1.0.0

## filterOrFail

Filter the specified effect with the provided function, failing with specified
error if the predicate fails.

**Signature**

```ts
export declare const filterOrFail: any
```

Added in v1.0.0

## filterPar

Filters the collection in parallel using the specified effectual predicate.
See `filter` for a sequential version of it.

**Signature**

```ts
export declare const filterPar: any
```

Added in v1.0.0

# finalization

## addFinalizer

Adds a finalizer to the scope of this effect. The finalizer is guaranteed
to be run when the scope is closed and may depend on the `Exit` value that
the scope is closed with.

**Signature**

```ts
export declare const addFinalizer: any
```

Added in v1.0.0

## ensuring

Returns an effect that, if this effect _starts_ execution, then the
specified `finalizer` is guaranteed to be executed, whether this effect
succeeds, fails, or is interrupted.

For use cases that need access to the effect's result, see `onExit`.

Finalizers offer very powerful guarantees, but they are low-level, and
should generally not be used for releasing resources. For higher-level
logic built on `ensuring`, see the `acquireRelease` family of methods.

**Signature**

```ts
export declare const ensuring: any
```

Added in v1.0.0

## ensuringChild

Acts on the children of this fiber (collected into a single fiber),
guaranteeing the specified callback will be invoked, whether or not this
effect succeeds.

**Signature**

```ts
export declare const ensuringChild: any
```

Added in v1.0.0

## ensuringChildren

Acts on the children of this fiber, guaranteeing the specified callback
will be invoked, whether or not this effect succeeds.

**Signature**

```ts
export declare const ensuringChildren: any
```

Added in v1.0.0

## onExit

Ensures that a cleanup functions runs, whether this effect succeeds, fails,
or is interrupted.

**Signature**

```ts
export declare const onExit: any
```

Added in v1.0.0

## onInterrupt

**Signature**

```ts
export declare const onInterrupt: any
```

Added in v1.0.0

# folding

## fold

Folds over the failure value or the success value to yield an effect that
does not fail, but succeeds with the value returned by the left or right
function passed to `fold`.

**Signature**

```ts
export declare const fold: any
```

Added in v1.0.0

## reduce

Folds an `Iterable<A>` using an effectual function f, working sequentially
from left to right.

**Signature**

```ts
export declare const reduce: any
```

Added in v1.0.0

## reduceAll

Reduces an `Iterable<Effect<R, E, A>>` to a single effect, working
sequentially.

**Signature**

```ts
export declare const reduceAll: any
```

Added in v1.0.0

## reduceAllPar

Reduces an `Iterable<Effect<R, E, A>>` to a single effect, working in
parallel.

**Signature**

```ts
export declare const reduceAllPar: any
```

Added in v1.0.0

## reduceRight

Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.

**Signature**

```ts
export declare const reduceRight: any
```

Added in v1.0.0

## reduceWhile

Folds over the elements in this chunk from the left, stopping the fold early
when the predicate is not satisfied.

**Signature**

```ts
export declare const reduceWhile: any
```

Added in v1.0.0

# getters

## right

"Zooms in" on the value in the `Right` side of an `Either`, moving the
possibility that the value is a `Left` to the error channel.

**Signature**

```ts
export declare const right: any
```

Added in v1.0.0

## rightWith

Performs the specified operation while "zoomed in" on the `Right` case of an
`Either`.

**Signature**

```ts
export declare const rightWith: any
```

Added in v1.0.0

## unleft

Converts a `Effect<R, Either<E, B>, A>` into a `Effect<R, E, Either<A, B>>`.
The inverse of `left`.

**Signature**

```ts
export declare const unleft: any
```

Added in v1.0.0

# interruption

## disconnect

Returns an effect whose interruption will be disconnected from the
fiber's own interruption, being performed in the background without
slowing down the fiber's interruption.

This method is useful to create "fast interrupting" effects. For
example, if you call this on a bracketed effect, then even if the
effect is "stuck" in acquire or release, its interruption will return
immediately, while the acquire / release are performed in the
background.

See timeout and race for other applications.

**Signature**

```ts
export declare const disconnect: any
```

Added in v1.0.0

## interrupt

**Signature**

```ts
export declare const interrupt: any
```

Added in v1.0.0

## interruptAs

**Signature**

```ts
export declare const interruptAs: any
```

Added in v1.0.0

## interruptible

**Signature**

```ts
export declare const interruptible: any
```

Added in v1.0.0

## interruptibleMask

**Signature**

```ts
export declare const interruptibleMask: any
```

Added in v1.0.0

## uninterruptible

**Signature**

```ts
export declare const uninterruptible: any
```

Added in v1.0.0

## uninterruptibleMask

**Signature**

```ts
export declare const uninterruptibleMask: any
```

Added in v1.0.0

# logging

## log

Logs the specified message at the current log level.

**Signature**

```ts
export declare const log: any
```

Added in v1.0.0

## logAnnotate

Annotates each log in this effect with the specified log annotation.

**Signature**

```ts
export declare const logAnnotate: any
```

Added in v1.0.0

## logAnnotations

Retrieves the log annotations associated with the current scope.

**Signature**

```ts
export declare const logAnnotations: any
```

Added in v1.0.0

## logDebug

Logs the specified message at the debug log level.

**Signature**

```ts
export declare const logDebug: any
```

Added in v1.0.0

## logDebugCause

Logs the specified cause at the debug log level.

**Signature**

```ts
export declare const logDebugCause: any
```

Added in v1.0.0

## logDebugCauseMessage

Logs the specified message and cause at the debug log level.

**Signature**

```ts
export declare const logDebugCauseMessage: any
```

Added in v1.0.0

## logError

Logs the specified message at the error log level.

**Signature**

```ts
export declare const logError: any
```

Added in v1.0.0

## logErrorCause

Logs the specified cause at the error log level.

**Signature**

```ts
export declare const logErrorCause: any
```

Added in v1.0.0

## logErrorCauseMessage

Logs the specified message and cause at the error log level.

**Signature**

```ts
export declare const logErrorCauseMessage: any
```

Added in v1.0.0

## logFatal

Logs the specified message at the fatal log level.

**Signature**

```ts
export declare const logFatal: any
```

Added in v1.0.0

## logFatalCause

Logs the specified cause at the fatal log level.

**Signature**

```ts
export declare const logFatalCause: any
```

Added in v1.0.0

## logFatalCauseMessage

Logs the specified message and cause at the fatal log level.

**Signature**

```ts
export declare const logFatalCauseMessage: any
```

Added in v1.0.0

## logInfo

Logs the specified message at the informational log level.

**Signature**

```ts
export declare const logInfo: any
```

Added in v1.0.0

## logInfoCause

Logs the specified cause at the informational log level.

**Signature**

```ts
export declare const logInfoCause: any
```

Added in v1.0.0

## logInfoCauseMessage

Logs the specified message and cause at the informational log level.

**Signature**

```ts
export declare const logInfoCauseMessage: any
```

Added in v1.0.0

## logSpan

Adjusts the label for the current logging span.

**Signature**

```ts
export declare const logSpan: any
```

Added in v1.0.0

## logTrace

Logs the specified message at the trace log level.

**Signature**

```ts
export declare const logTrace: any
```

Added in v1.0.0

## logTraceCause

Logs the specified cause at the trace log level.

**Signature**

```ts
export declare const logTraceCause: any
```

Added in v1.0.0

## logTraceCauseMessage

Logs the specified message and cause at the trace log level.

**Signature**

```ts
export declare const logTraceCauseMessage: any
```

Added in v1.0.0

## logWarning

Logs the specified message at the warning log level.

**Signature**

```ts
export declare const logWarning: any
```

Added in v1.0.0

## logWarningCause

Logs the specified cause at the warning log level.

**Signature**

```ts
export declare const logWarningCause: any
```

Added in v1.0.0

## logWarningCauseMessage

Logs the specified message and cause at the warning log level.

**Signature**

```ts
export declare const logWarningCauseMessage: any
```

Added in v1.0.0

# mapping

## as

Maps the success value of this effect to the specified constant value.

**Signature**

```ts
export declare const as: any
```

Added in v1.0.0

## asLeft

Maps the success value of this effect to a `Left` value.

**Signature**

```ts
export declare const asLeft: any
```

Added in v1.0.0

## asLeftError

Maps the error value of this effect to a `Left` value.

**Signature**

```ts
export declare const asLeftError: any
```

Added in v1.0.0

## asRight

Maps the success value of this effect to a `Right` value.

**Signature**

```ts
export declare const asRight: any
```

Added in v1.0.0

## asRightError

Maps the error value of this effect to a `Right` value.

**Signature**

```ts
export declare const asRightError: any
```

Added in v1.0.0

## asSome

Maps the success value of this effect to a `Some` value.

**Signature**

```ts
export declare const asSome: any
```

Added in v1.0.0

## asSomeError

Maps the error value of this effect to a `Some` value.

**Signature**

```ts
export declare const asSomeError: any
```

Added in v1.0.0

## asUnit

Maps the success value of this effect to `void`.

**Signature**

```ts
export declare const asUnit: any
```

Added in v1.0.0

## map

**Signature**

```ts
export declare const map: any
```

Added in v1.0.0

## mapAccum

Statefully and effectfully maps over the elements of this chunk to produce
new elements.

**Signature**

```ts
export declare const mapAccum: any
```

Added in v1.0.0

## mapBoth

Returns an effect whose failure and success channels have been mapped by
the specified pair of functions, `f` and `g`.

**Signature**

```ts
export declare const mapBoth: any
```

Added in v1.0.0

## mapError

Returns an effect with its error channel mapped using the specified function.

**Signature**

```ts
export declare const mapError: any
```

Added in v1.0.0

## mapErrorCause

Returns an effect with its full cause of failure mapped using the specified
function. This can be used to transform errors while preserving the
original structure of `Cause`.

See `absorb`, `sandbox`, `catchAllCause` for other functions for dealing
with defects.

**Signature**

```ts
export declare const mapErrorCause: any
```

Added in v1.0.0

## mapTryCatch

Returns an effect whose success is mapped by the specified side effecting
`f` function, translating any thrown exceptions into typed failed effects.

**Signature**

```ts
export declare const mapTryCatch: any
```

Added in v1.0.0

## negate

Returns a new effect where boolean value of this effect is negated.

**Signature**

```ts
export declare const negate: any
```

Added in v1.0.0

# models

## Effect (interface)

**Signature**

```ts
export interface Effect<R, E, A> extends Effect.Variance<R, E, A>, Equal {
  /** @internal */
  traced(trace: string | undefined): Effect<R, E, A>
}
```

Added in v1.0.0

# mutations

## awaitAllChildren

Returns a new effect that will not succeed with its value before first
waiting for the end of all child fibers forked by the effect.

**Signature**

```ts
export declare const awaitAllChildren: any
```

Added in v1.0.0

## cached

Returns an effect that, if evaluated, will return the cached result of this
effect. Cached results will expire after `timeToLive` duration.

**Signature**

```ts
export declare const cached: any
```

Added in v1.0.0

## cachedInvalidate

Returns an effect that, if evaluated, will return the cached result of this
effect. Cached results will expire after `timeToLive` duration. In
addition, returns an effect that can be used to invalidate the current
cached value before the `timeToLive` duration expires.

**Signature**

```ts
export declare const cachedInvalidate: any
```

Added in v1.0.0

## delay

Returns an effect that is delayed from this effect by the specified
`Duration`.

**Signature**

```ts
export declare const delay: any
```

Added in v1.0.0

## diffFiberRefs

Returns a new workflow that executes this one and captures the changes in
`FiberRef` values.

**Signature**

```ts
export declare const diffFiberRefs: any
```

Added in v1.0.0

## eventually

Returns an effect that ignores errors and runs repeatedly until it
eventually succeeds.

**Signature**

```ts
export declare const eventually: any
```

Added in v1.0.0

## flip

Returns an effect that swaps the error/success cases. This allows you to
use all methods on the error channel, possibly before flipping back.

**Signature**

```ts
export declare const flip: any
```

Added in v1.0.0

## flipWith

Swaps the error/value parameters, applies the function `f` and flips the
parameters back

**Signature**

```ts
export declare const flipWith: any
```

Added in v1.0.0

## forever

Repeats this effect forever (until the first error).

**Signature**

```ts
export declare const forever: any
```

Added in v1.0.0

## head

Returns a successful effect with the head of the collection if the collection
is non-empty, or fails with the error `None` if the collection is empty.

**Signature**

```ts
export declare const head: any
```

Added in v1.0.0

## ignore

Returns a new effect that ignores the success or failure of this effect.

**Signature**

```ts
export declare const ignore: any
```

Added in v1.0.0

## ignoreLogged

Returns a new effect that ignores the success or failure of this effect,
but which also logs failures at the Debug level, just in case the failure
turns out to be important.

**Signature**

```ts
export declare const ignoreLogged: any
```

Added in v1.0.0

## memoize

Returns an effect that, if evaluated, will return the lazily computed
result of this effect.

**Signature**

```ts
export declare const memoize: any
```

Added in v1.0.0

## merge

Returns a new effect where the error channel has been merged into the
success channel to their common combined type.

**Signature**

```ts
export declare const merge: any
```

Added in v1.0.0

## onDone

**Signature**

```ts
export declare const onDone: any
```

Added in v1.0.0

## onDoneCause

**Signature**

```ts
export declare const onDoneCause: any
```

Added in v1.0.0

## onError

Runs the specified effect if this effect fails, providing the error to the
effect if it exists. The provided effect will not be interrupted.

**Signature**

```ts
export declare const onError: any
```

Added in v1.0.0

## once

Returns an effect that will be executed at most once, even if it is
evaluated multiple times.

**Signature**

```ts
export declare const once: any
```

Added in v1.0.0

## option

Executes this effect, skipping the error but returning optionally the
success.

**Signature**

```ts
export declare const option: any
```

Added in v1.0.0

## parallelErrors

Exposes all parallel errors in a single call.

**Signature**

```ts
export declare const parallelErrors: any
```

Added in v1.0.0

## parallelFinalizers

**Signature**

```ts
export declare const parallelFinalizers: any
```

Added in v1.0.0

## patchFiberRefs

Applies the specified changes to the `FiberRef` values for the fiber
running this workflow.

**Signature**

```ts
export declare const patchFiberRefs: any
```

Added in v1.0.0

## race

Returns an effect that races this effect with the specified effect,
returning the first successful `A` from the faster side. If one effect
succeeds, the other will be interrupted. If neither succeeds, then the
effect will fail with some error.

Note that both effects are disconnected before being raced. This means that
interruption of the loser will always be performed in the background. If this
behavior is not desired, you can use `Effect.raceWith`, which will not
disconnect or interrupt losers.

**Signature**

```ts
export declare const race: any
```

Added in v1.0.0

## raceAll

Returns an effect that races this effect with all the specified effects,
yielding the value of the first effect to succeed with a value. Losers of
the race will be interrupted immediately

**Signature**

```ts
export declare const raceAll: any
```

Added in v1.0.0

## raceAwait

Returns an effect that races this effect with the specified effect,
returning the first successful `A` from the faster side. If one effect
succeeds, the other will be interrupted. If neither succeeds, then the
effect will fail with some error.

**Signature**

```ts
export declare const raceAwait: any
```

Added in v1.0.0

## raceEither

Returns an effect that races this effect with the specified effect,
yielding the first result to succeed. If neither effect succeeds, then the
composed effect will fail with some error.

WARNING: The raced effect will safely interrupt the "loser", but will not
resume until the loser has been cleanly terminated.

**Signature**

```ts
export declare const raceEither: any
```

Added in v1.0.0

## raceFibersWith

Forks this effect and the specified effect into their own fibers, and races
them, calling one of two specified callbacks depending on which fiber wins
the race. This method does not interrupt, join, or otherwise do anything
with the fibers. It can be considered a low-level building block for
higher-level operators like `race`.

**Signature**

```ts
export declare const raceFibersWith: any
```

Added in v1.0.0

## raceFirst

Returns an effect that races this effect with the specified effect,
yielding the first result to complete, whether by success or failure. If
neither effect completes, then the composed effect will not complete.

WARNING: The raced effect will safely interrupt the "loser", but will not
resume until the loser has been cleanly terminated. If early return is
desired, then instead of performing `l raceFirst r`, perform
`l.disconnect raceFirst r.disconnect`, which disconnects left and right
interrupt signal, allowing a fast return, with interruption performed
in the background.

**Signature**

```ts
export declare const raceFirst: any
```

Added in v1.0.0

## raceWith

Returns an effect that races this effect with the specified effect, calling
the specified finisher as soon as one result or the other has been computed.

**Signature**

```ts
export declare const raceWith: any
```

Added in v1.0.0

## refineOrDie

Keeps some of the errors, and terminates the fiber with the rest

**Signature**

```ts
export declare const refineOrDie: any
```

Added in v1.0.0

## refineOrDieWith

Keeps some of the errors, and terminates the fiber with the rest, using
the specified function to convert the `E` into a defect.

**Signature**

```ts
export declare const refineOrDieWith: any
```

Added in v1.0.0

## reject

Fail with the returned value if the `PartialFunction` matches, otherwise
continue with our held value.

**Signature**

```ts
export declare const reject: any
```

Added in v1.0.0

## rejectEffect

Continue with the returned computation if the `PartialFunction` matches,
translating the successful match into a failure, otherwise continue with
our held value.

**Signature**

```ts
export declare const rejectEffect: any
```

Added in v1.0.0

## repeat

Returns a new effect that repeats this effect according to the specified
schedule or until the first failure. Scheduled recurrences are in addition
to the first execution, so that `io.repeat(Schedule.once)` yields an effect
that executes `io`, and then if that succeeds, executes `io` an additional
time.

**Signature**

```ts
export declare const repeat: any
```

Added in v1.0.0

## repeatN

Returns a new effect that repeats this effect the specified number of times
or until the first failure. Repeats are in addition to the first execution,
so that `io.repeatN(1)` yields an effect that executes `io`, and then if
that succeeds, executes `io` an additional time.

**Signature**

```ts
export declare const repeatN: any
```

Added in v1.0.0

## repeatOrElse

Returns a new effect that repeats this effect according to the specified
schedule or until the first failure, at which point, the failure value and
schedule output are passed to the specified handler.

Scheduled recurrences are in addition to the first execution, so that
`pipe(effect, Effect.repeat(Schedule.once()))` yields an effect that executes
`effect`, and then if that succeeds, executes `effect` an additional time.

**Signature**

```ts
export declare const repeatOrElse: any
```

Added in v1.0.0

## repeatOrElseEither

Returns a new effect that repeats this effect according to the specified
schedule or until the first failure, at which point, the failure value and
schedule output are passed to the specified handler.

Scheduled recurrences are in addition to the first execution, so that
`pipe(effect, Effect.repeat(Schedule.once()))` yields an effect that executes
`effect`, and then if that succeeds, executes `effect` an additional time.

**Signature**

```ts
export declare const repeatOrElseEither: any
```

Added in v1.0.0

## repeatUntil

Repeats this effect until its value satisfies the specified predicate or
until the first failure.

**Signature**

```ts
export declare const repeatUntil: any
```

Added in v1.0.0

## repeatUntilEffect

Repeats this effect until its value satisfies the specified effectful
predicate or until the first failure.

**Signature**

```ts
export declare const repeatUntilEffect: any
```

Added in v1.0.0

## repeatUntilEquals

Repeats this effect until its value is equal to the specified value or
until the first failure.

**Signature**

```ts
export declare const repeatUntilEquals: any
```

Added in v1.0.0

## repeatWhile

Repeats this effect while its value satisfies the specified effectful
predicate or until the first failure.

**Signature**

```ts
export declare const repeatWhile: any
```

Added in v1.0.0

## repeatWhileEffect

Repeats this effect while its value satisfies the specified effectful
predicate or until the first failure.

**Signature**

```ts
export declare const repeatWhileEffect: any
```

Added in v1.0.0

## repeatWhileEquals

Repeats this effect for as long as its value is equal to the specified
value or until the first failure.

**Signature**

```ts
export declare const repeatWhileEquals: any
```

Added in v1.0.0

## replicate

Replicates the given effect `n` times.

**Signature**

```ts
export declare const replicate: any
```

Added in v1.0.0

## replicateEffect

Performs this effect the specified number of times and collects the
results.

**Signature**

```ts
export declare const replicateEffect: any
```

Added in v1.0.0

## replicateEffectDiscard

Performs this effect the specified number of times, discarding the
results.

**Signature**

```ts
export declare const replicateEffectDiscard: any
```

Added in v1.0.0

## resurrect

Unearth the unchecked failure of the effect (opposite of `orDie`).

**Signature**

```ts
export declare const resurrect: any
```

Added in v1.0.0

## retry

Retries with the specified retry policy. Retries are done following the
failure of the original `io` (up to a fixed maximum with `once` or `recurs`
for example), so that that `io.retry(Schedule.once)` means "execute `io`
and in case of failure, try again once".

**Signature**

```ts
export declare const retry: any
```

Added in v1.0.0

## retryN

Retries this effect the specified number of times.

**Signature**

```ts
export declare const retryN: any
```

Added in v1.0.0

## retryOrElse

Retries with the specified schedule, until it fails, and then both the
value produced by the schedule together with the last error are passed to
the recovery function.

**Signature**

```ts
export declare const retryOrElse: any
```

Added in v1.0.0

## retryOrElseEither

Retries with the specified schedule, until it fails, and then both the
value produced by the schedule together with the last error are passed to
the recovery function.

**Signature**

```ts
export declare const retryOrElseEither: any
```

Added in v1.0.0

## retryUntil

Retries this effect until its error satisfies the specified predicate.

**Signature**

```ts
export declare const retryUntil: any
```

Added in v1.0.0

## retryUntilEffect

Retries this effect until its error satisfies the specified effectful
predicate.

**Signature**

```ts
export declare const retryUntilEffect: any
```

Added in v1.0.0

## retryUntilEquals

Retries this effect until its error is equal to the specified error.

**Signature**

```ts
export declare const retryUntilEquals: any
```

Added in v1.0.0

## retryWhile

Retries this effect while its error satisfies the specified predicate.

**Signature**

```ts
export declare const retryWhile: any
```

Added in v1.0.0

## retryWhileEffect

Retries this effect while its error satisfies the specified effectful
predicate.

**Signature**

```ts
export declare const retryWhileEffect: any
```

Added in v1.0.0

## retryWhileEquals

Retries this effect for as long as its error is equal to the specified
error.

**Signature**

```ts
export declare const retryWhileEquals: any
```

Added in v1.0.0

## schedule

Runs this effect according to the specified schedule.

See `scheduleFrom` for a variant that allows the schedule's decision to
depend on the result of this effect.

**Signature**

```ts
export declare const schedule: any
```

Added in v1.0.0

## scheduleForked

Runs this effect according to the specified schedule in a new fiber
attached to the current scope.

**Signature**

```ts
export declare const scheduleForked: any
```

Added in v1.0.0

## scheduleFrom

Runs this effect according to the specified schedule starting from the
specified input value.

**Signature**

```ts
export declare const scheduleFrom: any
```

Added in v1.0.0

## sequentialFinalizers

Returns a new scoped workflow that runs finalizers added to the scope of
this workflow sequentially in the reverse of the order in which they were
added. Note that finalizers are run sequentially by default so this only
has meaning if used within a scope where finalizers are being run in
parallel.

**Signature**

```ts
export declare const sequentialFinalizers: any
```

Added in v1.0.0

## setFiberRefs

Sets the `FiberRef` values for the fiber running this effect to the values
in the specified collection of `FiberRef` values.

**Signature**

```ts
export declare const setFiberRefs: any
```

Added in v1.0.0

## some

Converts an option on values into an option on errors.

**Signature**

```ts
export declare const some: any
```

Added in v1.0.0

## someOrElse

Extracts the optional value, or returns the given 'orElse'.

**Signature**

```ts
export declare const someOrElse: any
```

Added in v1.0.0

## someOrElseEffect

Extracts the optional value, or executes the given 'orElse' effect.

**Signature**

```ts
export declare const someOrElseEffect: any
```

Added in v1.0.0

## someOrFail

Extracts the optional value, or fails with the given error 'e'.

**Signature**

```ts
export declare const someOrFail: any
```

Added in v1.0.0

## someOrFailException

Extracts the optional value, or fails with a `NoSuchElementException`.

**Signature**

```ts
export declare const someOrFailException: any
```

Added in v1.0.0

## someWith

Perfoms the specified operation while "zoomed in" on the `Some` case of an
`Option`.

**Signature**

```ts
export declare const someWith: any
```

Added in v1.0.0

## summarized

Summarizes a effect by computing some value before and after execution, and
then combining the values to produce a summary, together with the result of
execution.

**Signature**

```ts
export declare const summarized: any
```

Added in v1.0.0

## supervised

Returns an effect with the behavior of this one, but where all child fibers
forked in the effect are reported to the specified supervisor.

**Signature**

```ts
export declare const supervised: any
```

Added in v1.0.0

## timed

Returns a new effect that executes this one and times the execution.

**Signature**

```ts
export declare const timed: any
```

Added in v1.0.0

## timedWith

A more powerful variation of `timed` that allows specifying the clock.

**Signature**

```ts
export declare const timedWith: any
```

Added in v1.0.0

## timeout

Returns an effect that will timeout this effect, returning `None` if the
timeout elapses before the effect has produced a value; and returning
`Some` of the produced value otherwise.

If the timeout elapses without producing a value, the running effect will
be safely interrupted.

WARNING: The effect returned by this method will not itself return until
the underlying effect is actually interrupted. This leads to more
predictable resource utilization. If early return is desired, then instead
of using `effect.timeout(d)`, use `effect.disconnect.timeout(d)`, which
first disconnects the effect's interruption signal before performing the
timeout, resulting in earliest possible return, before an underlying effect
has been successfully interrupted.

**Signature**

```ts
export declare const timeout: any
```

Added in v1.0.0

## timeoutFail

The same as `timeout`, but instead of producing a `None` in the event of
timeout, it will produce the specified error.

**Signature**

```ts
export declare const timeoutFail: any
```

Added in v1.0.0

## timeoutFailCause

The same as `timeout`, but instead of producing a `None` in the event of
timeout, it will produce the specified failure.

**Signature**

```ts
export declare const timeoutFailCause: any
```

Added in v1.0.0

## timeoutTo

Returns an effect that will timeout this effect, returning either the
default value if the timeout elapses before the effect has produced a
value or returning the result of applying the function `f` to the
success value of the effect.

If the timeout elapses without producing a value, the running effect will
be safely interrupted.

**Signature**

```ts
export declare const timeoutTo: any
```

Added in v1.0.0

## transplant

Transplants specified effects so that when those effects fork other
effects, the forked effects will be governed by the scope of the fiber that
executes this effect.

This can be used to "graft" deep grandchildren onto a higher-level scope,
effectively extending their lifespans into the parent scope.

**Signature**

```ts
export declare const transplant: any
```

Added in v1.0.0

## uncause

When this effect succeeds with a cause, then this method returns a new
effect that either fails with the cause that this effect succeeded with, or
succeeds with unit, depending on whether the cause is empty.

This operation is the opposite of `cause`.

**Signature**

```ts
export declare const uncause: any
```

Added in v1.0.0

## unless

The moral equivalent of `if (!p) exp`.

**Signature**

```ts
export declare const unless: any
```

Added in v1.0.0

## unlessEffect

The moral equivalent of `if (!p) exp` when `p` has side-effects.

**Signature**

```ts
export declare const unlessEffect: any
```

Added in v1.0.0

## unrefine

Takes some fiber failures and converts them into errors.

**Signature**

```ts
export declare const unrefine: any
```

Added in v1.0.0

## unright

Converts a `Effect<R, Either<B, E>, A>` into a `Effect<R, E, Either<B, A>>`.
The inverse of `right`.

**Signature**

```ts
export declare const unright: any
```

Added in v1.0.0

## unsandbox

The inverse operation `sandbox(effect)`

Terminates with exceptions on the `Left` side of the `Either` error, if it
exists. Otherwise extracts the contained `Effect< R, E, A>`

**Signature**

```ts
export declare const unsandbox: any
```

Added in v1.0.0

## unsome

Converts an option on errors into an option on values.

**Signature**

```ts
export declare const unsome: any
```

Added in v1.0.0

## using

Scopes all resources acquired by `resource` to the lifetime of `use`
without effecting the scope of any resources acquired by `use`.

**Signature**

```ts
export declare const using: any
```

Added in v1.0.0

## validate

Sequentially zips the this result with the specified result. Combines both
`Cause`s when both effects fail.

**Signature**

```ts
export declare const validate: any
```

Added in v1.0.0

## validateAll

Feeds elements of type `A` to `f` and accumulates all errors in error
channel or successes in success channel.

This combinator is lossy meaning that if there are errors all successes
will be lost. To retain all information please use `partition`.

**Signature**

```ts
export declare const validateAll: any
```

Added in v1.0.0

## validateAllDiscard

Feeds elements of type `A` to `f` and accumulates all errors, discarding
the successes.

**Signature**

```ts
export declare const validateAllDiscard: any
```

Added in v1.0.0

## validateAllPar

Feeds elements of type `A` to `f `and accumulates, in parallel, all errors
in error channel or successes in success channel.

This combinator is lossy meaning that if there are errors all successes
will be lost. To retain all information please use [[partitionPar]].

**Signature**

```ts
export declare const validateAllPar: any
```

Added in v1.0.0

## validateAllParDiscard

Feeds elements of type `A` to `f` in parallel and accumulates all errors,
discarding the successes.

**Signature**

```ts
export declare const validateAllParDiscard: any
```

Added in v1.0.0

## validateFirst

Feeds elements of type `A` to `f` until it succeeds. Returns first success
or the accumulation of all errors.

**Signature**

```ts
export declare const validateFirst: any
```

Added in v1.0.0

## validateFirstPar

Feeds elements of type `A` to `f` until it succeeds. Returns first success
or the accumulation of all errors.

**Signature**

```ts
export declare const validateFirstPar: any
```

Added in v1.0.0

## validatePar

Returns an effect that executes both this effect and the specified effect,
in parallel. Combines both Cause<E1>` when both effects fail.

**Signature**

```ts
export declare const validatePar: any
```

Added in v1.0.0

## validateWith

Sequentially zips this effect with the specified effect using the specified
combiner function. Combines the causes in case both effect fail.

**Signature**

```ts
export declare const validateWith: any
```

Added in v1.0.0

## validateWithPar

Returns an effect that executes both this effect and the specified effect,
in parallel, combining their results with the specified `f` function. If
both sides fail, then the cause will be combined.

**Signature**

```ts
export declare const validateWithPar: any
```

Added in v1.0.0

## when

The moral equivalent of `if (p) exp`.

**Signature**

```ts
export declare const when: any
```

Added in v1.0.0

## whenCase

Runs an effect when the supplied partial function matches for the given
value, otherwise does nothing.

**Signature**

```ts
export declare const whenCase: any
```

Added in v1.0.0

## whenCaseEffect

Runs an effect when the supplied partial function matches for the given
value, otherwise does nothing.

**Signature**

```ts
export declare const whenCaseEffect: any
```

Added in v1.0.0

## withClock

Executes the specified workflow with the specified implementation of the
clock service.

**Signature**

```ts
export declare const withClock: any
```

Added in v1.0.0

## withEarlyRelease

Returns a new scoped workflow that returns the result of this workflow as
well as a finalizer that can be run to close the scope of this workflow.

**Signature**

```ts
export declare const withEarlyRelease: any
```

Added in v1.0.0

## withMetric

**Signature**

```ts
export declare const withMetric: any
```

Added in v1.0.0

# products

## zip

**Signature**

```ts
export declare const zip: any
```

Added in v1.0.0

## zipLeft

**Signature**

```ts
export declare const zipLeft: any
```

Added in v1.0.0

## zipRight

**Signature**

```ts
export declare const zipRight: any
```

Added in v1.0.0

## zipWith

**Signature**

```ts
export declare const zipWith: any
```

Added in v1.0.0

# refinements

## isEffect

Returns `true` if the specified value is an `Effect`, `false` otherwise.

**Signature**

```ts
export declare const isEffect: any
```

Added in v1.0.0

# runtime

## updateRuntimeFlags

**Signature**

```ts
export declare const updateRuntimeFlags: any
```

Added in v1.0.0

## withRuntimeFlags

**Signature**

```ts
export declare const withRuntimeFlags: any
```

Added in v1.0.0

# scoping

## scopeWith

Accesses the current scope and uses it to perform the specified effect.

**Signature**

```ts
export declare const scopeWith: any
```

Added in v1.0.0

# sequencing

## flatMap

**Signature**

```ts
export declare const flatMap: any
```

Added in v1.0.0

## flatten

**Signature**

```ts
export declare const flatten: any
```

Added in v1.0.0

## flattenErrorOption

Unwraps the optional error, defaulting to the provided value.

**Signature**

```ts
export declare const flattenErrorOption: any
```

Added in v1.0.0

## tap

**Signature**

```ts
export declare const tap: any
```

Added in v1.0.0

## tapBoth

Returns an effect that effectfully "peeks" at the failure or success of
this effect.

**Signature**

```ts
export declare const tapBoth: any
```

Added in v1.0.0

## tapDefect

Returns an effect that effectually "peeks" at the defect of this effect.

**Signature**

```ts
export declare const tapDefect: any
```

Added in v1.0.0

## tapEither

Returns an effect that effectfully "peeks" at the result of this effect.

**Signature**

```ts
export declare const tapEither: any
```

Added in v1.0.0

## tapError

Returns an effect that effectfully "peeks" at the failure of this effect.

**Signature**

```ts
export declare const tapError: any
```

Added in v1.0.0

## tapErrorCause

Returns an effect that effectually "peeks" at the cause of the failure of
this effect.

**Signature**

```ts
export declare const tapErrorCause: any
```

Added in v1.0.0

## tapSome

Returns an effect that effectfully "peeks" at the success of this effect.
If the partial function isn't defined at the input, the result is
equivalent to the original effect.

**Signature**

```ts
export declare const tapSome: any
```

Added in v1.0.0

# supervision

## daemonChildren

Returns a new workflow that will not supervise any fibers forked by this
workflow.

**Signature**

```ts
export declare const daemonChildren: any
```

Added in v1.0.0

## fork

Returns an effect that forks this effect into its own separate fiber,
returning the fiber immediately, without waiting for it to begin executing
the effect.

You can use the `fork` method whenever you want to execute an effect in a
new fiber, concurrently and without "blocking" the fiber executing other
effects. Using fibers can be tricky, so instead of using this method
directly, consider other higher-level methods, such as `raceWith`,
`zipPar`, and so forth.

The fiber returned by this method has methods to interrupt the fiber and to
wait for it to finish executing the effect. See `Fiber` for more
information.

Whenever you use this method to launch a new fiber, the new fiber is
attached to the parent fiber's scope. This means when the parent fiber
terminates, the child fiber will be terminated as well, ensuring that no
fibers leak. This behavior is called "auto supervision", and if this
behavior is not desired, you may use the `forkDaemon` or `forkIn` methods.

**Signature**

```ts
export declare const fork: any
```

Added in v1.0.0

## forkAll

Returns an effect that forks all of the specified values, and returns a
composite fiber that produces a list of their results, in order.

**Signature**

```ts
export declare const forkAll: any
```

Added in v1.0.0

## forkAllDiscard

Returns an effect that forks all of the specified values, and returns a
composite fiber that produces unit. This version is faster than `forkAll`
in cases where the results of the forked fibers are not needed.

**Signature**

```ts
export declare const forkAllDiscard: any
```

Added in v1.0.0

## forkDaemon

Forks the effect into a new fiber attached to the global scope. Because the
new fiber is attached to the global scope, when the fiber executing the
returned effect terminates, the forked fiber will continue running.

**Signature**

```ts
export declare const forkDaemon: any
```

Added in v1.0.0

## forkIn

Forks the effect in the specified scope. The fiber will be interrupted
when the scope is closed.

**Signature**

```ts
export declare const forkIn: any
```

Added in v1.0.0

## forkScoped

Forks the fiber in a `Scope`, interrupting it when the scope is closed.

**Signature**

```ts
export declare const forkScoped: any
```

Added in v1.0.0

## forkWithErrorHandler

Like fork but handles an error with the provided handler.

**Signature**

```ts
export declare const forkWithErrorHandler: any
```

Added in v1.0.0

# symbols

## EffectTypeId

**Signature**

```ts
export declare const EffectTypeId: typeof EffectTypeId
```

Added in v1.0.0

## EffectTypeId (type alias)

**Signature**

```ts
export type EffectTypeId = typeof EffectTypeId
```

Added in v1.0.0

# tracing

## traced

**Signature**

```ts
export declare const traced: any
```

Added in v1.0.0

# traversing

## forEachWithIndex

Same as `forEach`, except that the function `f` is supplied
a second argument that corresponds to the index (starting from 0)
of the current element being iterated over.

**Signature**

```ts
export declare const forEachWithIndex: any
```

Added in v1.0.0

# utilities

## exit

**Signature**

```ts
export declare const exit: any
```

Added in v1.0.0

## fiberId

**Signature**

```ts
export declare const fiberId: any
```

Added in v1.0.0

## intoDeferred

**Signature**

```ts
export declare const intoDeferred: any
```

Added in v1.0.0

# zipping

## zipPar

Zips this effect and that effect in parallel.

**Signature**

```ts
export declare const zipPar: any
```

Added in v1.0.0

## zipParLeft

Returns an effect that executes both this effect and the specified effect,
in parallel, returning result of that effect. If either side fails,
then the other side will be interrupted.

**Signature**

```ts
export declare const zipParLeft: any
```

Added in v1.0.0

## zipParRight

Returns an effect that executes both this effect and the specified effect,
in parallel, returning result of the provided effect. If either side fails,
then the other side will be interrupted.

**Signature**

```ts
export declare const zipParRight: any
```

Added in v1.0.0

## zipWithPar

Sequentially zips this effect with the specified effect using the
specified combiner function.

**Signature**

```ts
export declare const zipWithPar: any
```

Added in v1.0.0
