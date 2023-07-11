import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"

declare const string: Effect.Effect<"dep-1", "err-1", string>
declare const number: Effect.Effect<"dep-2", "err-2", number>
declare const stringArray: Array<Effect.Effect<"dep-3", "err-3", string>>
declare const numberRecord: Record<string, Effect.Effect<"dep-4", "err-4", number>>

// -------------------------------------------------------------------------------------
// all - tuple
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
Effect.all([string, number])

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
Effect.all([string, number], undefined)

// not allowed empty options
// @ts-expect-error
Effect.all([string, number], {})

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
Effect.all([string, number], { concurrency: "unbounded" })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
Effect.all([string, number], { discard: true })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
Effect.all([string, number], { discard: true, concurrency: "unbounded" })

// -------------------------------------------------------------------------------------
// all - tuple data-last
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
pipe([string, number] as const, Effect.all())

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
pipe([string, number] as const, Effect.all(undefined))

// @ts-expect-error
pipe([string, number] as const, Effect.all({}))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
pipe([string, number] as const, Effect.all({ concurrency: "unbounded" }))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
pipe([string, number] as const, Effect.all({ discard: true }))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
pipe([string, number] as const, Effect.all({ discard: true, concurrency: "unbounded" }))

// -------------------------------------------------------------------------------------
// all - struct
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
Effect.all({ a: string, b: number })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
Effect.all({ a: string, b: number }, undefined)

// @ts-expect-error
Effect.all({ a: string, b: number }, {})

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
Effect.all({ a: string, b: number }, { concurrency: "unbounded" })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
Effect.all({ a: string, b: number }, { discard: true })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
Effect.all({ a: string, b: number }, { discard: true, concurrency: "unbounded" })

// -------------------------------------------------------------------------------------
// all - struct data-last
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
pipe({ a: string, b: number }, Effect.all())

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
pipe({ a: string, b: number }, Effect.all(undefined))

// @ts-expect-error
pipe({ a: string, b: number }, Effect.all({}))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
pipe({ a: string, b: number }, Effect.all({ concurrency: "unbounded" }))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
pipe({ a: string, b: number }, Effect.all({ discard: true }))

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
pipe({ a: string, b: number }, Effect.all({ discard: true, concurrency: "unbounded" }))

// -------------------------------------------------------------------------------------
// all - array
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-3", "err-3", string[]>
Effect.all(stringArray)

// $ExpectType Effect<"dep-3", "err-3", string[]>
Effect.all(stringArray, undefined)

// not allowed empty options
// @ts-expect-error
Effect.all(stringArray, {})

// $ExpectType Effect<"dep-3", "err-3", string[]>
Effect.all(stringArray, { concurrency: "unbounded" })

// $ExpectType Effect<"dep-3", "err-3", void>
Effect.all(stringArray, { discard: true })

// $ExpectType Effect<"dep-3", "err-3", void>
Effect.all(stringArray, { discard: true, concurrency: "unbounded" })

// -------------------------------------------------------------------------------------
// all - array data-last
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-3", "err-3", string[]>
pipe(stringArray, Effect.all())

// $ExpectType Effect<"dep-3", "err-3", string[]>
pipe(stringArray, Effect.all(undefined))

// not allowed empty options
// @ts-expect-error
pipe(stringArray, Effect.all({}))

// $ExpectType Effect<"dep-3", "err-3", string[]>
pipe(stringArray, Effect.all({ concurrency: "unbounded" }))

// $ExpectType Effect<"dep-3", "err-3", void>
pipe(stringArray, Effect.all({ discard: true }))

// $ExpectType Effect<"dep-3", "err-3", void>
pipe(stringArray, Effect.all({ discard: true, concurrency: "unbounded" }))

// -------------------------------------------------------------------------------------
// all - record
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
Effect.all(numberRecord)

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
Effect.all(numberRecord, undefined)

// not allowed empty options
// @ts-expect-error
Effect.all(numberRecord, {})

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
Effect.all(numberRecord, { concurrency: "unbounded" })

// $ExpectType Effect<"dep-4", "err-4", void>
Effect.all(numberRecord, { discard: true })

// $ExpectType Effect<"dep-4", "err-4", void>
Effect.all(numberRecord, { discard: true, concurrency: "unbounded" })

// -------------------------------------------------------------------------------------
// all - record data-last
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
pipe(numberRecord, Effect.all())

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
pipe(numberRecord, Effect.all(undefined))

// not allowed empty options
// @ts-expect-error
pipeEffect.all(numberRecord, Effect.all({}))

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
pipe(numberRecord, Effect.all({ concurrency: "unbounded" }))

// $ExpectType Effect<"dep-4", "err-4", void>
pipe(numberRecord, Effect.all({ discard: true }))

// $ExpectType Effect<"dep-4", "err-4", void>
pipe(numberRecord, Effect.all({ discard: true, concurrency: "unbounded" }))
