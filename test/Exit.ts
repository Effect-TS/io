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
      expect(Exit.fail("failure").toJSON()).toEqual({
        _id: "Exit",
        _tag: "Failure",
        cause: {
          _id: "Cause",
          _tag: "Fail",
          failure: "failure"
        }
      })
      class MyError {
        readonly _tag = "MyError"
      }
      expect(Exit.fail(new MyError()).toJSON()).toEqual({
        _id: "Exit",
        _tag: "Failure",
        cause: {
          _id: "Cause",
          _tag: "Fail",
          failure: {
            _tag: "MyError"
          }
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
      expect(String(Exit.fail("failure"))).toEqual(`{
  "_id": "Exit",
  "_tag": "Failure",
  "cause": {
    "_id": "Cause",
    "_tag": "Fail",
    "failure": "failure"
  }
}`)
      class MyError {
        readonly _tag = "MyError"
      }
      expect(String(Exit.fail(new MyError()))).toEqual(`{
  "_id": "Exit",
  "_tag": "Failure",
  "cause": {
    "_id": "Cause",
    "_tag": "Fail",
    "failure": {
      "_tag": "MyError"
    }
  }
}`)
    })
  })
})
