import * as Config from "@effect/io/Config"
import * as Effect from "@effect/io/Effect"
import * as assert from "node:assert"
import * as util from "node:util"

const UrlConfig = Config.string("URL")

const program = Effect.gen(function*($) {
  yield* $(Effect.sync(() => console.log(process.env)))
  const url = yield* $(Effect.config(UrlConfig))
  assert.strictEqual(url, "https://example.com") // fails, 'https' does not match 'https://example.com'
})

Effect.unsafeRun(program, (exit) => {
  switch (exit._tag) {
    case "Success": {
      console.log(util.inspect(exit.value, { depth: null, colors: true }))
      break
    }
    case "Failure": {
      console.log(util.inspect(exit.cause, { depth: null, colors: true }))
      break
    }
  }
})
