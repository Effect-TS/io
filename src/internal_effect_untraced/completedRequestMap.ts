import { globalValue } from "@effect/data/Global"
import { fiberRefUnsafeMake } from "@effect/io/internal_effect_untraced/core"
import type * as Request from "@effect/io/Request"

/** @internal */
export const currentRequestMap = globalValue(
  Symbol.for("@effect/io/FiberRef/currentRequestMap"),
  () => fiberRefUnsafeMake(new Map<any, Request.Entry<any>>())
)
