import type * as Config from "@effect/io/Config"
import type * as Effect from "@effect/io/Effect"

export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export type MergeRecord<K, H> = {
  readonly [k in keyof K | keyof H]: k extends keyof K ? K[k]
    : k extends keyof H ? H[k]
    : never
} extends infer X ? X
  : never

export type NonEmptyArrayEffect = [Effect.Effect<any, any, any>, ...Array<Effect.Effect<any, any, any>>]

export type NonEmptyArrayConfig = [Config.Config<any>, ...Array<Config.Config<any>>]

export type TupleEffect<T extends NonEmptyArrayEffect> = {
  [K in keyof T]: [T[K]] extends [Effect.Effect<any, any, infer A>] ? A : never
}

export type TupleConfig<T extends NonEmptyArrayConfig> = {
  [K in keyof T]: [T[K]] extends [Config.Config<infer A>] ? A : never
}
