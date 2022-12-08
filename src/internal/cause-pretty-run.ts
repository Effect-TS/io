import type * as Cause from "@effect/io/Cause"
import { defaultRenderer, prettySafe } from "@effect/io/internal/cause-pretty"
import { unsafeRunSync } from "@effect/io/internal/runtime"

/** @internal */
export const pretty = <E>(renderer: Cause.CauseRenderer<E> = defaultRenderer) =>
  (cause: Cause.Cause<E>): string => unsafeRunSync(prettySafe(cause, renderer))
