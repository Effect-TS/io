import * as Effect from "@effect/io/Effect"
import * as Flags from "@effect/io/RuntimeFlags"
import * as Patch from "@effect/io/RuntimeFlagsPatch"
import * as it from "@effect/io/test/utils/extend"
import { describe, expect } from "bun:test"

describe("Effect", () => {
  it.it("should enable flags in the current fiber", () =>
    Effect.runPromise(Effect.gen(function*($) {
      const before = yield* $(Effect.getRuntimeFlags)
      expect(Flags.isEnabled(before, Flags.OpSupervision)).toBeFalse()
      yield* $(Effect.patchRuntimeFlags(Patch.enable(Flags.OpSupervision)))
      const after = yield* $(Effect.getRuntimeFlags)
      expect(Flags.isEnabled(after, Flags.OpSupervision)).toBeTrue()
    })))
  it.it("should enable flags in the wrapped effect", () =>
    Effect.runPromise(Effect.gen(function*($) {
      const before = yield* $(Effect.getRuntimeFlags)
      expect(Flags.isEnabled(before, Flags.OpSupervision)).toBeFalse()
      const inside = yield* $(Effect.getRuntimeFlags, Effect.withRuntimeFlagsPatch(Patch.enable(Flags.OpSupervision)))
      const after = yield* $(Effect.getRuntimeFlags)
      expect(Flags.isEnabled(after, Flags.OpSupervision)).toBeFalse()
      expect(Flags.isEnabled(inside, Flags.OpSupervision)).toBeTrue()
    })))
})
