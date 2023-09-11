import { pipe } from "@effect/data/Function"

export declare function limited(): <X extends string | number>(x: X) => X extends string ? string : number

// Argument of type 'number' is not assignable to parameter of type 'string'
export const mmm = pipe(1, limited())
