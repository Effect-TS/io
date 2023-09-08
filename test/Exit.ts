import * as Exit from "@effect/io/Exit"

describe.concurrent("Exit", () => {
  describe.concurrent("toJSON", () => {
    it("succeed", () => {
      expect(Exit.succeed(1).toJSON()).toEqual({
        _id: "Exit",
        _tag: "Success",
        value: 1
      })
    })

    it("fail", () => {
      expect(Exit.fail("error").toJSON()).toEqual({
        _id: "Exit",
        _tag: "Failure",
        cause: {
          _id: "Cause",
          _tag: "Fail",
          error: "error"
        }
      })
    })
  })

  describe.concurrent("toString", () => {
    it("succeed", () => {
      expect(String(Exit.succeed(1))).toEqual(`{
  "_id": "Exit",
  "_tag": "Success",
  "value": 1
}`)
    })

    it("fail", () => {
      expect(String(Exit.fail("error"))).toEqual(`{
  "_id": "Exit",
  "_tag": "Failure",
  "cause": {
    "_id": "Cause",
    "_tag": "Fail",
    "error": "error"
  }
}`)
    })
  })
})
