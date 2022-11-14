import * as RuntimeFlags from "@effect/io/Fiber/Runtime/Flags"
import * as RuntimeFlagsPatch from "@effect/io/Fiber/Runtime/Flags/Patch"
import { pipe } from "@fp-ts/data/Function"
import * as fc from "fast-check"
import { assert, describe, it } from "vitest"

const arbRuntimeFlag = fc.constantFrom(
  RuntimeFlags.None,
  RuntimeFlags.Interruption,
  RuntimeFlags.CurrentFiber,
  RuntimeFlags.OpSupervision,
  RuntimeFlags.RuntimeMetrics,
  RuntimeFlags.FiberRoots,
  RuntimeFlags.WindDown,
  RuntimeFlags.CooperativeYielding
)

const arbRuntimeFlags = fc.uniqueArray(arbRuntimeFlag).map(
  (flags) => RuntimeFlags.make(...flags)
)

describe.concurrent("RuntimeFlags", () => {
  it("isDisabled & isEnabled", () => {
    const flags = RuntimeFlags.make(
      RuntimeFlags.CurrentFiber,
      RuntimeFlags.Interruption
    )
    assert.isTrue(pipe(flags, RuntimeFlags.isEnabled(RuntimeFlags.CurrentFiber)))
    assert.isTrue(pipe(flags, RuntimeFlags.isEnabled(RuntimeFlags.Interruption)))
    assert.isFalse(pipe(flags, RuntimeFlags.isEnabled(RuntimeFlags.CooperativeYielding)))
    assert.isFalse(pipe(flags, RuntimeFlags.isEnabled(RuntimeFlags.FiberRoots)))
    assert.isFalse(pipe(flags, RuntimeFlags.isEnabled(RuntimeFlags.OpSupervision)))
    assert.isFalse(pipe(flags, RuntimeFlags.isEnabled(RuntimeFlags.RuntimeMetrics)))
    assert.isFalse(pipe(flags, RuntimeFlags.isEnabled(RuntimeFlags.WindDown)))
  })

  it("enabled patching", () => {
    const patch = pipe(
      RuntimeFlagsPatch.enable(RuntimeFlags.CurrentFiber),
      RuntimeFlagsPatch.andThen(RuntimeFlagsPatch.enable(RuntimeFlags.OpSupervision))
    )
    const result = pipe(
      RuntimeFlags.none,
      RuntimeFlags.patch(patch)
    )
    const expected = RuntimeFlags.make(
      RuntimeFlags.CurrentFiber,
      RuntimeFlags.OpSupervision
    )
    assert.strictEqual(result, expected)
  })

  it("inverse patching", () => {
    const flags = RuntimeFlags.make(
      RuntimeFlags.CurrentFiber,
      RuntimeFlags.OpSupervision
    )
    const patch1 = pipe(
      RuntimeFlagsPatch.enable(RuntimeFlags.CurrentFiber),
      RuntimeFlagsPatch.inverse
    )
    const patch2 = pipe(
      RuntimeFlagsPatch.enable(RuntimeFlags.CurrentFiber),
      RuntimeFlagsPatch.andThen(RuntimeFlagsPatch.enable(RuntimeFlags.OpSupervision)),
      RuntimeFlagsPatch.inverse
    )
    assert.strictEqual(
      pipe(flags, RuntimeFlags.patch(patch1)),
      RuntimeFlags.make(RuntimeFlags.OpSupervision)
    )
    assert.strictEqual(
      pipe(flags, RuntimeFlags.patch(patch2)),
      RuntimeFlags.none
    )
  })

  it("diff", () => {
    const flags1 = RuntimeFlags.make(RuntimeFlags.CurrentFiber)
    const flags2 = RuntimeFlags.make(RuntimeFlags.CurrentFiber, RuntimeFlags.OpSupervision)
    assert.strictEqual(
      pipe(flags1, RuntimeFlags.diff(flags2)),
      RuntimeFlagsPatch.enable(RuntimeFlags.OpSupervision)
    )
  })

  it("flags within a set of RuntimeFlags is enabled", () => {
    fc.assert(fc.property(arbRuntimeFlags, (flags) => {
      const result = Array.from(RuntimeFlags.toSet(flags)).every(
        (flag) => pipe(flags, RuntimeFlags.isEnabled(flag))
      )
      assert.isTrue(result)
    }))
  })

  it("patching a diff between `none` and a set of flags is an identity", () => {
    fc.assert(fc.property(arbRuntimeFlags, (flags) => {
      const diff = pipe(RuntimeFlags.none, RuntimeFlags.diff(flags))
      assert.strictEqual(
        pipe(RuntimeFlags.none, RuntimeFlags.patch(diff)),
        flags
      )
    }))
  })

  it("patching the inverse diff between `non` and a set of flags is `none`", () => {
    fc.assert(fc.property(arbRuntimeFlags, (flags) => {
      const diff = pipe(RuntimeFlags.none, RuntimeFlags.diff(flags))
      assert.strictEqual(
        pipe(
          flags,
          RuntimeFlags.patch(RuntimeFlagsPatch.inverse(diff))
        ),
        RuntimeFlags.none
      )
      assert.strictEqual(
        pipe(
          flags,
          RuntimeFlags.patch(
            RuntimeFlagsPatch.inverse(RuntimeFlagsPatch.inverse(diff))
          )
        ),
        flags
      )
    }))
  })
})
