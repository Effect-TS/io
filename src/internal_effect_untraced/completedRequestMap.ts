import * as HashMap from "@effect/data/HashMap"
import { fiberRefUnsafeMake } from "@effect/io/internal_effect_untraced/core"
import type * as Request from "@effect/io/Request"

/** @internal */
export const currentRequestMap = fiberRefUnsafeMake(HashMap.empty<any, Request.Entry<any>>())
