import type * as Cause from "@effect/io/Cause"
import { prettySafe } from "@effect/io/internal_effect_untraced/cause-pretty"
import { unsafeRunSyncEffect } from "@effect/io/internal_effect_untraced/runtime"

/** @internal */
export const pretty = <E>(cause: Cause.Cause<E>): string => unsafeRunSyncEffect(prettySafe(cause))
