import { pipe } from "@effect/data/Function"
import * as RuntimeFlags from "@effect/io/RuntimeFlags"
import * as RuntimeFlagsPatch from "@effect/io/RuntimeFlagsPatch"
import { describe, expect, it } from "bun:test"
import * as fc from "fast-check"
import assert from "node:assert"

const arbRuntimeFlag = fc.constantFrom(
  RuntimeFlags.None,
  RuntimeFlags.Interruption,
  RuntimeFlags.OpSupervision,
  RuntimeFlags.RuntimeMetrics,
  RuntimeFlags.WindDown,
  RuntimeFlags.CooperativeYielding
)

const arbRuntimeFlags = fc.uniqueArray(arbRuntimeFlag).map(
  (flags) => RuntimeFlags.make(...flags)
)

describe("RuntimeFlags", () => {
  it("isDisabled & isEnabled", () => {
    const flags = RuntimeFlags.make(
      RuntimeFlags.RuntimeMetrics,
      RuntimeFlags.Interruption
    )
    expect(RuntimeFlags.isEnabled(flags, RuntimeFlags.RuntimeMetrics)).toBeTrue()
    expect(RuntimeFlags.isEnabled(flags, RuntimeFlags.Interruption)).toBeTrue()
    expect(RuntimeFlags.isEnabled(flags, RuntimeFlags.CooperativeYielding)).toBeFalse()
    expect(RuntimeFlags.isEnabled(flags, RuntimeFlags.OpSupervision)).toBeFalse()
    expect(RuntimeFlags.isEnabled(flags, RuntimeFlags.WindDown)).toBeFalse()
  })

  it("enabled patching", () => {
    const patch = pipe(
      RuntimeFlagsPatch.enable(RuntimeFlags.RuntimeMetrics),
      RuntimeFlagsPatch.andThen(RuntimeFlagsPatch.enable(RuntimeFlags.OpSupervision))
    )
    const result = RuntimeFlags.patch(RuntimeFlags.none, patch)

    const expected = RuntimeFlags.make(
      RuntimeFlags.RuntimeMetrics,
      RuntimeFlags.OpSupervision
    )
    assert.strictEqual(result, expected)
  })

  it("inverse patching", () => {
    const flags = RuntimeFlags.make(
      RuntimeFlags.RuntimeMetrics,
      RuntimeFlags.OpSupervision
    )
    const patch1 = pipe(
      RuntimeFlagsPatch.enable(RuntimeFlags.RuntimeMetrics),
      RuntimeFlagsPatch.inverse
    )
    const patch2 = pipe(
      RuntimeFlagsPatch.enable(RuntimeFlags.RuntimeMetrics),
      RuntimeFlagsPatch.andThen(RuntimeFlagsPatch.enable(RuntimeFlags.OpSupervision)),
      RuntimeFlagsPatch.inverse
    )
    assert.strictEqual(
      RuntimeFlags.patch(flags, patch1),
      RuntimeFlags.make(RuntimeFlags.OpSupervision)
    )
    assert.strictEqual(
      RuntimeFlags.patch(flags, patch2),
      RuntimeFlags.none
    )
  })

  it("diff", () => {
    const flags1 = RuntimeFlags.make(RuntimeFlags.RuntimeMetrics)
    const flags2 = RuntimeFlags.make(RuntimeFlags.RuntimeMetrics, RuntimeFlags.OpSupervision)
    assert.strictEqual(
      RuntimeFlags.diff(flags1, flags2),
      RuntimeFlagsPatch.enable(RuntimeFlags.OpSupervision)
    )
  })

  it("flags within a set of RuntimeFlags is enabled", () => {
    fc.assert(fc.property(arbRuntimeFlags, (flags) => {
      const result = Array.from(RuntimeFlags.toSet(flags)).every(
        (flag) => RuntimeFlags.isEnabled(flags, flag)
      )
      expect(result).toBeTrue()
    }))
  })

  it("patching a diff between `none` and a set of flags is an identity", () => {
    fc.assert(fc.property(arbRuntimeFlags, (flags) => {
      const diff = RuntimeFlags.diff(RuntimeFlags.none, flags)
      assert.strictEqual(
        RuntimeFlags.patch(RuntimeFlags.none, diff),
        flags
      )
    }))
  })

  it("patching the inverse diff between `non` and a set of flags is `none`", () => {
    fc.assert(fc.property(arbRuntimeFlags, (flags) => {
      const diff = RuntimeFlags.diff(RuntimeFlags.none, flags)
      assert.strictEqual(
        RuntimeFlags.patch(flags, RuntimeFlagsPatch.inverse(diff)),
        RuntimeFlags.none
      )
      assert.strictEqual(
        RuntimeFlags.patch(flags, RuntimeFlagsPatch.inverse(RuntimeFlagsPatch.inverse(diff))),
        flags
      )
    }))
  })
})
