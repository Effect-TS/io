import * as Config from "@effect/io/Config"
import * as ConfigError from "@effect/io/Config/Error"
import * as ConfigProvider from "@effect/io/Config/Provider"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as it from "@effect/io/test/utils/extend"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as HashMap from "@fp-ts/data/HashMap"
import * as HashSet from "@fp-ts/data/HashSet"
import { camelCase } from "camel-case"
import { constantCase } from "constant-case"
import { assert, describe } from "vitest"

interface HostPort {
  readonly host: string
  readonly port: number
}

const hostPortConfig: Config.Config<HostPort> = Config.struct({
  host: Config.string("host"),
  port: Config.integer("port")
})

interface HostPorts {
  readonly hostPorts: ReadonlyArray<HostPort>
}

const hostPortsConfig: Config.Config<HostPorts> = Config.struct({
  hostPorts: Config.arrayOf(hostPortConfig, "hostPorts")
})

interface ServiceConfig {
  readonly hostPort: HostPort
  readonly timeout: number
}

const serviceConfigConfig: Config.Config<ServiceConfig> = Config.struct({
  hostPort: pipe(hostPortConfig, Config.nested("hostPort")),
  timeout: Config.integer("timeout")
})

interface StockDay {
  readonly date: Date
  readonly open: number
  readonly close: number
  readonly low: number
  readonly high: number
  readonly volume: number
}

const stockDayConfig: Config.Config<StockDay> = Config.struct({
  date: Config.date("date"),
  open: Config.float("open"),
  close: Config.float("close"),
  low: Config.float("low"),
  high: Config.float("high"),
  volume: Config.integer("volume")
})

interface SNP500 {
  readonly stockDays: HashMap.HashMap<string, StockDay>
}

const snp500Config: Config.Config<SNP500> = Config.struct({
  stockDays: Config.table(stockDayConfig)
})

interface WebScrapingTargets {
  readonly targets: HashSet.HashSet<string>
}

const webScrapingTargetsConfig: Config.Config<WebScrapingTargets> = Config.struct({
  targets: Config.setOf(Config.string(), "targets")
})

const webScrapingTargetsConfigWithDefault = Config.struct({
  targets: pipe(
    Config.chunkOf(Config.string()),
    Config.withDefault(Chunk.make("https://effect.website2", "https://github.com/Effect-TS2"))
  )
})

const provider = (map: Map<string, string>): ConfigProvider.ConfigProvider => {
  return ConfigProvider.fromMap(map)
}

describe.concurrent("ConfigProvider", () => {
  it.effect("flat atoms", () =>
    Effect.gen(function*($) {
      const map = new Map([["host", "localhost"], ["port", "8080"]])
      const result = yield* $(provider(map).load(hostPortConfig))
      assert.deepStrictEqual(result, {
        host: "localhost",
        port: 8080
      })
    }))

  it.effect("nested atoms", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["hostPort.host", "localhost"],
        ["hostPort.port", "8080"],
        ["timeout", "1000"]
      ])
      const result = yield* $(provider(map).load(serviceConfigConfig))
      assert.deepStrictEqual(result, {
        hostPort: {
          host: "localhost",
          port: 8080
        },
        timeout: 1000
      })
    }))

  it.effect("top-level list with same number of elements per key", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["hostPorts.host", "localhost,localhost,localhost"],
        ["hostPorts.port", "8080,8080,8080"]
      ])
      const result = yield* $(provider(map).load(hostPortsConfig))
      assert.deepStrictEqual(result, {
        hostPorts: Array.from({ length: 3 }, () => ({ host: "localhost", port: 8080 }))
      })
    }))

  it.effect("top-level missing list", () =>
    Effect.gen(function*($) {
      const map = new Map()
      const result = yield* $(Effect.exit(provider(map).load(hostPortsConfig)))
      assert.isTrue(Exit.isFailure(result))
    }))

  it.effect("simple map", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["name", "Sherlock Holmes"],
        ["address", "221B Baker Street"]
      ])
      const result = yield* $(provider(map).load(Config.table(Config.string())))
      assert.deepStrictEqual(
        result,
        HashMap.make(
          ["name", "Sherlock Holmes"],
          ["address", "221B Baker Street"]
        )
      )
    }))

  it.effect("top-level lists with multi-character sequence delimiters", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["hostPorts.host", "localhost///localhost///localhost"],
        ["hostPorts.port", "8080///8080///8080"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map, { seqDelim: "///" }).load(hostPortsConfig))
      assert.deepStrictEqual(result, {
        hostPorts: Array.from({ length: 3 }, () => ({ host: "localhost", port: 8080 }))
      })
    }))

  it.effect("top-level lists with special regex multi-character sequence delimiter", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["hostPorts.host", "localhost|||localhost|||localhost"],
        ["hostPorts.port", "8080|||8080|||8080"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map, { seqDelim: "|||" }).load(hostPortsConfig))
      assert.deepStrictEqual(result, {
        hostPorts: Array.from({ length: 3 }, () => ({ host: "localhost", port: 8080 }))
      })
    }))

  it.effect("top-level lists with special regex character sequence delimiter", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["hostPorts.host", "localhost*localhost*localhost"],
        ["hostPorts.port", "8080*8080*8080"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map, { seqDelim: "*" }).load(hostPortsConfig))
      assert.deepStrictEqual(result, {
        hostPorts: Array.from({ length: 3 }, () => ({ host: "localhost", port: 8080 }))
      })
    }))

  it.effect("top-level list with different number of elements per key fails", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["hostPorts.host", "localhost"],
        ["hostPorts.port", "8080,8080,8080"]
      ])
      const result = yield* $(Effect.exit(provider(map).load(hostPortsConfig)))
      assert.deepStrictEqual(
        Exit.unannotate(result),
        Exit.fail(
          ConfigError.MissingData(
            Chunk.unsafeFromArray(["hostPorts"]),
            "The element at index 1 in a sequence at path \"hostPorts\" was missing"
          )
        )
      )
    }))

  it.effect("flat atoms of different types", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["date", "2022-10-28"],
        ["open", "98.8"],
        ["close", "150.0"],
        ["low", "98.0"],
        ["high", "151.5"],
        ["volume", "100091990"]
      ])
      const result = yield* $(provider(map).load(stockDayConfig))
      assert.deepStrictEqual(result, {
        date: new Date("2022-10-28"),
        open: 98.8,
        close: 150.0,
        low: 98.0,
        high: 151.5,
        volume: 100091990
      })
    }))

  it.effect("tables", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["Effect.date", "2022-10-28"],
        ["Effect.open", "98.8"],
        ["Effect.close", "150.0"],
        ["Effect.low", "98.0"],
        ["Effect.high", "151.5"],
        ["Effect.volume", "100091990"]
      ])
      const result = yield* $(provider(map).load(snp500Config))
      assert.deepStrictEqual(result, {
        stockDays: HashMap.make([
          "Effect",
          {
            date: new Date("2022-10-28"),
            open: 98.8,
            close: 150.0,
            low: 98.0,
            high: 151.5,
            volume: 100091990
          }
        ])
      })
    }))

  it.effect("empty tables", () =>
    Effect.gen(function*($) {
      const result = yield* $(provider(new Map()).load(snp500Config))
      assert.deepStrictEqual(result, { stockDays: HashMap.empty() })
    }))

  it.effect("collection of atoms", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["targets", "https://effect.website,https://github.com/Effect-TS"]
      ])
      const result = yield* $(provider(map).load(webScrapingTargetsConfig))
      assert.deepStrictEqual(result, {
        targets: HashSet.make("https://effect.website", "https://github.com/Effect-TS")
      })
    }))

  it.effect("collection of atoms falls back to default", () =>
    Effect.gen(function*($) {
      const map = new Map()
      const result = yield* $(provider(map).load(webScrapingTargetsConfigWithDefault))
      assert.deepStrictEqual(result, {
        targets: Chunk.make("https://effect.website2", "https://github.com/Effect-TS2")
      })
    }))

  it.effect("accessing a non-existent key fails", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["k1.k3", "v"]
      ])
      const config = pipe(
        Config.string("k2"),
        Config.nested("k1")
      )
      const result = yield* $(Effect.exit(provider(map).load(config)))
      assert.deepStrictEqual(
        Exit.unannotate(result),
        Exit.fail(
          ConfigError.MissingData(
            Chunk.unsafeFromArray(["k1", "k2"]),
            "Expected k1.k2 to exist in the provided map"
          )
        )
      )
    }))

  it.effect("nested", () =>
    Effect.gen(function*($) {
      const configProvider1 = ConfigProvider.fromMap(new Map([["nested.key", "value"]]))
      const config1 = pipe(Config.string("key"), Config.nested("nested"))
      const configProvider2 = pipe(
        ConfigProvider.fromMap(new Map([["nested.key", "value"]])),
        ConfigProvider.nested("nested")
      )
      const config2 = Config.string("key")
      const result1 = yield* $(configProvider1.load(config1))
      const result2 = yield* $(configProvider2.load(config2))
      assert.strictEqual(result1, "value")
      assert.strictEqual(result2, "value")
    }))

  it.effect("orElse", () =>
    Effect.gen(function*($) {
      const configProvider1 = ConfigProvider.fromMap(new Map([["key", "value"]]))
      const configProvider2 = ConfigProvider.fromMap(new Map([["key1", "value1"]]))
      const config = Config.string("key1")
      const result = yield* $(
        pipe(
          configProvider1,
          ConfigProvider.orElse(() => configProvider2)
        ).load(config)
      )
      assert.strictEqual(result, "value1")
    }))
})

const makeEnvProvider = () =>
  ConfigProvider.fromEnv({ pathDelim: "__", conversion: constantCase, reverseConversion: camelCase, seqDelim: "," })

describe.concurrent("EnvProvider", () => {
  it.effect("capitalisation", () => {
    return Effect.gen(function*($) {
      // current in comments
      process.env["HOST" /* "host" */] = "localhost"
      process.env["PORT" /* "port" */] = "8080"
      const provider = makeEnvProvider()
      const result = yield* $(provider.load(hostPortConfig))
      assert.deepStrictEqual(result, {
        host: "localhost",
        port: 8080
      })
    })
  })

  it.effect("capitalisation, word separation should use _, and nesting __", () => {
    return Effect.gen(function*($) {
      // current in comments
      process.env["HOST_PORT__HOST" /* "hostPort_host" */] = "localhost"
      process.env["HOST_PORT__PORT" /* "hostPort_port" */] = "8080"
      process.env["TIMEOUT" /* "timeout" */] = "1000"
      const provider = makeEnvProvider()
      const result = yield* $(provider.load(serviceConfigConfig))
      assert.deepStrictEqual(result, {
        hostPort: {
          host: "localhost",
          port: 8080
        },
        timeout: 1000
      })
    })
  })

  it.effect("default", () => {
    return Effect.gen(function*($) {
      process.env["hostPort_host"] = "localhost"
      process.env["hostPort_port"] = "8080"
      process.env["timeout"] = "1000"
      const provider = ConfigProvider.fromEnv()
      const result = yield* $(provider.load(serviceConfigConfig))
      assert.deepStrictEqual(result, {
        hostPort: {
          host: "localhost",
          port: 8080
        },
        timeout: 1000
      })
    })
  })
})
