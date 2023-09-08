import { identity } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"

describe.concurrent("Effect", () => {
  describe.concurrent("toString", () => {
    it("succeed", () => {
      expect(String(Effect.succeed(1))).toEqual(`{
  "_id": "Exit",
  "_tag": "Success",
  "value": 1
}`)
    })

    it("fail", () => {
      expect(String(Effect.fail("error"))).toEqual(`{
  "_id": "Effect",
  "_tag": "FailureWithAnnotation"
}`)
    })

    it("map", () => {
      expect(String(Effect.map(Effect.succeed(1), identity))).toEqual(`{
  "_id": "Effect",
  "_tag": "OnSuccess",
  "i0": {
    "_id": "Exit",
    "_tag": "Success",
    "value": 1
  }
}`)
    })
  })
})
