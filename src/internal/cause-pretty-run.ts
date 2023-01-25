import type * as Cause from "@effect/io/Cause"
import * as Debug from "@effect/io/Debug"
import { defaultRenderer, prettySafe } from "@effect/io/internal/cause-pretty"
import { unsafeRunSync } from "@effect/io/internal/runtime"

/** @internal */
export const pretty = <E>(cause: Cause.Cause<E>): string => unsafeRunSync(prettySafe(cause, defaultRenderer))

/** @internal */
export const prettyWithRenderer = Debug.dual<
  <E>(cause: Cause.Cause<E>, renderer: Cause.CauseRenderer<E>) => string,
  <E>(renderer: Cause.CauseRenderer<E>) => (cause: Cause.Cause<E>) => string
>(2, (cause, renderer) => unsafeRunSync(prettySafe(cause, renderer)))
