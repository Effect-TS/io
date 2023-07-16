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

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
Effect.all([string, number], {})

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", [string, number]>
Effect.all([string, number], { concurrency: "unbounded" })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
Effect.all([string, number], { discard: true })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
Effect.all([string, number], { discard: true, concurrency: "unbounded" })

// $ExpectType Effect<"dep-1" | "dep-2", [Option<"err-1">, Option<"err-2">], [string, number]>
Effect.all([string, number], { mode: "validate" })

// $ExpectType Effect<"dep-1" | "dep-2", [Option<"err-1">, Option<"err-2">], void>
Effect.all([string, number], { mode: "validate", discard: true })

// $ExpectType Effect<"dep-1" | "dep-2", never, [Either<"err-1", string>, Either<"err-2", number>]>
Effect.all([string, number], { mode: "either" })

// $ExpectType Effect<"dep-1" | "dep-2", never, void>
Effect.all([string, number], { mode: "either", discard: true })

// -------------------------------------------------------------------------------------
// all - struct
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
Effect.all({ a: string, b: number })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
Effect.all({ a: string, b: number }, undefined)

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
Effect.all({ a: string, b: number }, {})

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", { a: string; b: number; }>
Effect.all({ a: string, b: number }, { concurrency: "unbounded" })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
Effect.all({ a: string, b: number }, { discard: true })

// $ExpectType Effect<"dep-1" | "dep-2", "err-1" | "err-2", void>
Effect.all({ a: string, b: number }, { discard: true, concurrency: "unbounded" })

// $ExpectType Effect<"dep-1" | "dep-2", { a: Option<"err-1">; b: Option<"err-2">; }, { a: string; b: number; }>
Effect.all({ a: string, b: number }, { mode: "validate" })

// $ExpectType Effect<"dep-1" | "dep-2", { a: Option<"err-1">; b: Option<"err-2">; }, void>
Effect.all({ a: string, b: number }, { mode: "validate", discard: true })

// $ExpectType Effect<"dep-1" | "dep-2", never, { a: Either<"err-1", string>; b: Either<"err-2", number>; }>
Effect.all({ a: string, b: number }, { mode: "either" })

// $ExpectType Effect<"dep-1" | "dep-2", never, void>
Effect.all({ a: string, b: number }, { mode: "either", discard: true })

// -------------------------------------------------------------------------------------
// all - array
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-3", "err-3", string[]>
Effect.all(stringArray)

// $ExpectType Effect<"dep-3", "err-3", string[]>
Effect.all(stringArray, undefined)

// $ExpectType Effect<"dep-3", "err-3", string[]>
Effect.all(stringArray, {})

// $ExpectType Effect<"dep-3", "err-3", string[]>
Effect.all(stringArray, { concurrency: "unbounded" })

// $ExpectType Effect<"dep-3", "err-3", void>
Effect.all(stringArray, { discard: true })

// $ExpectType Effect<"dep-3", "err-3", void>
Effect.all(stringArray, { discard: true, concurrency: "unbounded" })

// $ExpectType Effect<"dep-3", Option<"err-3">[], string[]>
Effect.all(stringArray, { mode: "validate" })

// $ExpectType Effect<"dep-3", Option<"err-3">[], void>
Effect.all(stringArray, { mode: "validate", discard: true })

// $ExpectType Effect<"dep-3", never, Either<"err-3", string>[]>
Effect.all(stringArray, { mode: "either" })

// $ExpectType Effect<"dep-3", never, void>
Effect.all(stringArray, { mode: "either", discard: true })

// -------------------------------------------------------------------------------------
// all - record
// -------------------------------------------------------------------------------------

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
Effect.all(numberRecord)

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
Effect.all(numberRecord, undefined)

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
Effect.all(numberRecord, {})

// $ExpectType Effect<"dep-4", "err-4", { [x: string]: number; }>
Effect.all(numberRecord, { concurrency: "unbounded" })

// $ExpectType Effect<"dep-4", "err-4", void>
Effect.all(numberRecord, { discard: true })

// $ExpectType Effect<"dep-4", "err-4", void>
Effect.all(numberRecord, { discard: true, concurrency: "unbounded" })

// $ExpectType Effect<"dep-4", { [x: string]: Option<"err-4">; }, { [x: string]: number; }>
Effect.all(numberRecord, { mode: "validate" })

// $ExpectType Effect<"dep-4", { [x: string]: Option<"err-4">; }, void>
Effect.all(numberRecord, { mode: "validate", discard: true })

// $ExpectType Effect<"dep-4", never, { [x: string]: Either<"err-4", number>; }>
Effect.all(numberRecord, { mode: "either" })

// $ExpectType Effect<"dep-4", never, void>
Effect.all(numberRecord, { mode: "either", discard: true })
