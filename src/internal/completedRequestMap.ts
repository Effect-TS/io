import { globalValue } from "@effect/data/GlobalValue"
import { fiberRefUnsafeMake } from "@effect/io/internal/core"
import type * as Request from "@effect/io/Request"

/** @internal */
export const currentRequestMap = globalValue(
  Symbol.for("@effect/io/FiberRef/currentRequestMap"),
  () => fiberRefUnsafeMake(new Map<any, Request.Entry<any>>())
)
