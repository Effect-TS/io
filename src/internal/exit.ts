import type * as Cause from "@effect/io/Cause"
import type * as Exit from "@effect/io/Exit"
import * as _runtime from "@effect/io/internal/runtime"

/** @internal */
export const isExit = (u: unknown): u is Exit.Exit<unknown, unknown> => {
  return _runtime.isEffect(u) && "_tag" in u &&
    (u["_tag"] === "Success" || u["_tag"] === "Failure")
}

/** @internal */
export const succeed: <A>(value: A) => Exit.Exit<never, A> = _runtime.succeed as any

/** @internal */
export const failCause: <E>(error: Cause.Cause<E>) => Exit.Exit<E, never> = _runtime.failCause as any

/** @internal */
export const match = <E, A, Z>(
  onFailure: (cause: Cause.Cause<E>) => Z,
  onSuccess: (a: A) => Z
) => {
  return (self: Exit.Exit<E, A>): Z => {
    switch (self._tag) {
      case "Failure":
        return onFailure(self.body.error)
      case "Success":
        return onSuccess(self.body.value)
    }
  }
}
