import * as Effect from "@effect/io/Effect"
import * as Flags from "@effect/io/RuntimeFlags"
import * as Patch from "@effect/io/RuntimeFlagsPatch"
import * as it from "@effect/io/test/utils/extend"
import { describe } from "vitest"

describe.concurrent("Effect", () => {
  it.it("should enable flags in the current fiber", () =>
    Effect.runPromise(Effect.gen(function*($) {
      const before = yield* $(Effect.getRuntimeFlags)
      assert.isFalse(Flags.isEnabled(before, Flags.OpSupervision))
      yield* $(Effect.patchRuntimeFlags(Patch.enable(Flags.OpSupervision)))
      const after = yield* $(Effect.getRuntimeFlags)
      assert.isTrue(Flags.isEnabled(after, Flags.OpSupervision))
    })))
  it.it("should enable flags in the wrapped effect", () =>
    Effect.runPromise(Effect.gen(function*($) {
      const before = yield* $(Effect.getRuntimeFlags)
      assert.isFalse(Flags.isEnabled(before, Flags.OpSupervision))
      const inside = yield* $(Effect.getRuntimeFlags, Effect.withRuntimeFlagsPatch(Patch.enable(Flags.OpSupervision)))
      const after = yield* $(Effect.getRuntimeFlags)
      assert.isFalse(Flags.isEnabled(after, Flags.OpSupervision))
      assert.isTrue(Flags.isEnabled(inside, Flags.OpSupervision))
    })))
})
