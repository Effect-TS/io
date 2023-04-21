import { globalValue } from "@effect/data/Global"
import * as HashMap from "@effect/data/HashMap"
import { fiberRefUnsafeMake } from "@effect/io/internal_effect_untraced/core"
import type * as Request from "@effect/io/Request"

/** @internal */
export const currentRequestMap = globalValue(
  Symbol.for("@effect/io/FiberRef/currentRequestMap"),
  () => fiberRefUnsafeMake(HashMap.empty<any, Request.Entry<any>>())
)
