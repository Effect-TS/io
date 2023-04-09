import * as Chunk from "@effect/data/Chunk"
import * as Equal from "@effect/data/Equal"
import { pipe } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as HashSet from "@effect/data/HashSet"
import * as Option from "@effect/data/Option"
import * as Cause from "@effect/io/Cause"
import * as Config from "@effect/io/Config"
import * as ConfigError from "@effect/io/Config/Error"
import * as ConfigProvider from "@effect/io/Config/Provider"
import * as ConfigSecret from "@effect/io/Config/Secret"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

interface HostPort {
  readonly host: string
  readonly port: number
}

const hostPortConfig: Config.Config<HostPort> = Config.all({
  host: Config.string("host"),
  port: Config.integer("port")
})

interface HostPorts {
  readonly hostPorts: ReadonlyArray<HostPort>
}

const hostPortsConfig: Config.Config<HostPorts> = Config.all({
  hostPorts: Config.arrayOf(hostPortConfig, "hostPorts")
})

interface ServiceConfig {
  readonly hostPort: HostPort
  readonly timeout: number
}

const serviceConfigConfig: Config.Config<ServiceConfig> = Config.all({
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

const stockDayConfig: Config.Config<StockDay> = Config.all({
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

const snp500Config: Config.Config<SNP500> = Config.all({
  stockDays: Config.table(stockDayConfig)
})

interface WebScrapingTargets {
  readonly targets: HashSet.HashSet<string>
}

const webScrapingTargetsConfig: Config.Config<WebScrapingTargets> = Config.all({
  targets: Config.setOf(Config.string(), "targets")
})

const webScrapingTargetsConfigWithDefault = Config.all({
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

  it.effect("indexed - simple", () =>
    Effect.gen(function*($) {
      const config = Config.arrayOf(Config.integer(), "id")
      const map = new Map([
        ["id[0]", "1"],
        ["id[1]", "2"],
        ["id[2]", "3"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual([1, 2, 3])
    }))

  it.effect("indexed sequence - simple with list values", () =>
    Effect.gen(function*($) {
      const config = Config.arrayOf(Config.arrayOf(Config.integer()), "id")
      const map = new Map([
        ["id[0]", "1, 2"],
        ["id[1]", "3, 4"],
        ["id[2]", "5, 6"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]])
    }))

  it.effect("indexed sequence - one product type", () =>
    Effect.gen(function*($) {
      const config = Config.arrayOf(
        Config.all({
          age: Config.integer("age"),
          id: Config.integer("id")
        }),
        "employees"
      )
      const map = new Map([
        ["employees[0].age", "1"],
        ["employees[0].id", "1"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual([{ age: 1, id: 1 }])
    }))

  it.effect("indexed sequence - multiple product types", () =>
    Effect.gen(function*($) {
      const config = Config.arrayOf(
        Config.all({
          age: Config.integer("age"),
          id: Config.integer("id")
        }),
        "employees"
      )
      const map = new Map([
        ["employees[0].age", "1"],
        ["employees[0].id", "2"],
        ["employees[1].age", "3"],
        ["employees[1].id", "4"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual([{ age: 1, id: 2 }, { age: 3, id: 4 }])
    }))

  it.effect("indexed sequence - multiple product types with missing fields", () =>
    Effect.gen(function*($) {
      const config = Config.arrayOf(
        Config.all({
          age: Config.integer("age"),
          id: Config.integer("id")
        }),
        "employees"
      )
      const map = new Map([
        ["employees[0].age", "1"],
        ["employees[0].id", "2"],
        ["employees[1].age", "3"],
        ["employees[1]", "4"]
      ])
      const result = yield* $(
        Effect.exit(ConfigProvider.fromMap(map).load(config)),
        Effect.map(Exit.unannotate)
      )
      assert.isTrue(
        Exit.isFailure(result) &&
          Cause.isFailType(result.i0) &&
          ConfigError.isMissingData(result.i0.error) &&
          // TODO: fix error message to not include `.[index]`
          result.i0.error.message === "Expected employees.[1].id to exist in the provided map" &&
          Equal.equals(result.i0.error.path, Chunk.make("employees", "[1]", "id"))
      )
    }))

  it.effect("indexed sequence - multiple product types with optional fields", () =>
    Effect.gen(function*($) {
      const config = Config.arrayOf(
        Config.all({
          age: Config.optional(Config.integer("age")),
          id: Config.integer("id")
        }),
        "employees"
      )
      const map = new Map([
        ["employees[0].age", "1"],
        ["employees[0].id", "2"],
        ["employees[1].id", "4"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual([{ age: Option.some(1), id: 2 }, { age: Option.none(), id: 4 }])
    }))

  it.effect("indexed sequence - multiple product types with sequence fields", () =>
    Effect.gen(function*($) {
      const config = Config.arrayOf(
        Config.all({
          refunds: Config.arrayOf(Config.integer(), "refunds"),
          id: Config.integer("id")
        }),
        "employees"
      )
      const map = new Map([
        ["employees[0].refunds", "1,2,3"],
        ["employees[0].id", "0"],
        ["employees[1].id", "1"],
        ["employees[1].refunds", "4,5,6"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual([{ refunds: [1, 2, 3], id: 0 }, { refunds: [4, 5, 6], id: 1 }])
    }))

  it.effect("indexed sequence - product type of indexed sequences with reusable config", () =>
    Effect.gen(function*($) {
      const idAndAge = Config.all({
        id: Config.integer("id"),
        age: Config.integer("age")
      })
      const config = Config.all({
        employees: Config.arrayOf(idAndAge, "employees"),
        students: Config.arrayOf(idAndAge, "students")
      })
      const map = new Map([
        ["employees[0].id", "0"],
        ["employees[1].id", "1"],
        ["employees[0].age", "10"],
        ["employees[1].age", "11"],
        ["students[0].id", "20"],
        ["students[1].id", "30"],
        ["students[0].age", "2"],
        ["students[1].age", "3"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual({
        employees: [{ id: 0, age: 10 }, { id: 1, age: 11 }],
        students: [{ id: 20, age: 2 }, { id: 30, age: 3 }]
      })
    }))

  it.effect("indexed sequence - map of indexed sequences", () =>
    Effect.gen(function*($) {
      //   val employee = Config.int("age").zip(Config.int("id"))

      //   val config = Config.table("departments", Config.listOf("employees", employee))
      const employee = Config.all({
        age: Config.integer("age"),
        id: Config.integer("id")
      })
      const config = Config.table(Config.arrayOf(employee, "employees"), "departments")
      const map = new Map([
        ["departments.department1.employees[0].age", "10"],
        ["departments.department1.employees[0].id", "0"],
        ["departments.department1.employees[1].age", "20"],
        ["departments.department1.employees[1].id", "1"],
        ["departments.department2.employees[0].age", "10"],
        ["departments.department2.employees[0].id", "0"],
        ["departments.department2.employees[1].age", "20"],
        ["departments.department2.employees[1].id", "1"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      const expectedEmployees = [{ age: 10, id: 0 }, { age: 20, id: 1 }]
      expect(Array.from(result)).toEqual([
        ["department1", expectedEmployees],
        ["department2", expectedEmployees]
      ])
    }))

  it.effect("indexed sequence - map", () =>
    Effect.gen(function*($) {
      const employee = Config.table(Config.integer(), "details")
      const config = Config.arrayOf(employee, "employees")
      const map = new Map([
        ["employees[0].details.age", "10"],
        ["employees[0].details.id", "0"],
        ["employees[1].details.age", "20"],
        ["employees[1].details.id", "1"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result.map((table) => Array.from(table))).toEqual([
        [["age", 10], ["id", 0]],
        [["age", 20], ["id", 1]]
      ])
    }))

  it.effect("indexed sequence - indexed sequences", () =>
    Effect.gen(function*($) {
      const employee = Config.all({
        age: Config.integer("age"),
        id: Config.integer("id")
      })
      const department = Config.arrayOf(employee, "employees")
      const config = Config.arrayOf(department, "departments")
      const map = new Map([
        ["departments[0].employees[0].age", "10"],
        ["departments[0].employees[0].id", "0"],
        ["departments[0].employees[1].age", "20"],
        ["departments[0].employees[1].id", "1"],
        ["departments[1].employees[0].age", "10"],
        ["departments[1].employees[0].id", "0"],
        ["departments[1].employees[1].age", "20"],
        ["departments[1].employees[1].id", "1"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      const expectedEmployees = [{ age: 10, id: 0 }, { age: 20, id: 1 }]
      expect(result).toEqual([expectedEmployees, expectedEmployees])
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

  it.effect("values are not split unless a sequence is expected", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(new Map([["greeting", "Hello, World!"]]))
      const result = yield* $(configProvider.load(Config.string("greeting")))
      assert.strictEqual(result, "Hello, World!")
    }))

  it.effect("constantCase", () =>
    Effect.gen(function*($) {
      const configProvider = pipe(
        ConfigProvider.fromMap(new Map([["CONSTANT_CASE", "value"]])),
        ConfigProvider.constantCase
      )
      const result = yield* $(configProvider.load(Config.string("constant.case")))
      assert.strictEqual(result, "value")
    }))

  it.effect("contramapPath", () =>
    Effect.gen(function*($) {
      const configProvider = pipe(
        ConfigProvider.fromMap(new Map([["KEY", "VALUE"]])),
        ConfigProvider.contramapPath((path) => path.toUpperCase())
      )
      const result = yield* $(configProvider.load(Config.string("key")))
      assert.strictEqual(result, "VALUE")
    }))

  it.effect("kebabCase", () =>
    Effect.gen(function*($) {
      const configProvider = pipe(
        ConfigProvider.fromMap(new Map([["kebab-case", "value"]])),
        ConfigProvider.kebabCase
      )
      const result = yield* $(configProvider.load(Config.string("kebabCase")))
      assert.strictEqual(result, "value")
    }))

  it.effect("lowerCase", () =>
    Effect.gen(function*($) {
      const configProvider = pipe(
        ConfigProvider.fromMap(new Map([["lowercase", "value"]])),
        ConfigProvider.lowerCase
      )
      const result = yield* $(configProvider.load(Config.string("lowerCase")))
      assert.strictEqual(result, "value")
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

  it.effect("nested - multiple layers of nesting", () =>
    Effect.gen(function*($) {
      const configProvider1 = ConfigProvider.fromMap(new Map([["parent.child.key", "value"]]))
      const config1 = pipe(
        Config.string("key"),
        Config.nested("child"),
        Config.nested("parent")
      )
      const configProvider2 = pipe(
        ConfigProvider.fromMap(new Map([["parent.child.key", "value"]])),
        ConfigProvider.nested("child"),
        ConfigProvider.nested("parent")
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

  it.effect("secret", () =>
    Effect.gen(function*($) {
      const value = "Hello, World!"
      const configProvider = ConfigProvider.fromMap(new Map([["greeting", value]]))
      const result = yield* $(configProvider.load(Config.secret("greeting")))
      assert.deepStrictEqual(result, ConfigSecret.make(value.split("").map((c) => c.charCodeAt(0))))
    }))

  it.effect("snakeCase", () =>
    Effect.gen(function*($) {
      const configProvider = pipe(
        ConfigProvider.fromMap(new Map([["snake_case", "value"]])),
        ConfigProvider.snakeCase
      )
      const result = yield* $(configProvider.load(Config.string("snakeCase")))
      assert.strictEqual(result, "value")
    }))

  it.effect("unnested", () =>
    Effect.gen(function*($) {
      const configProvider1 = ConfigProvider.fromMap(new Map([["key", "value"]]))
      const config1 = Config.string("key")
      const configProvider2 = pipe(
        ConfigProvider.fromMap(new Map([["key", "value"]])),
        ConfigProvider.unnested("nested")
      )
      const config2 = pipe(Config.string("key"), Config.nested("nested"))
      const result1 = yield* $(configProvider1.load(config1))
      const result2 = yield* $(configProvider2.load(config2))
      assert.strictEqual(result1, "value")
      assert.strictEqual(result2, "value")
    }))

  it.effect("unnested - multiple layers of nesting", () =>
    Effect.gen(function*($) {
      const configProvider1 = ConfigProvider.fromMap(new Map([["key", "value"]]))
      const config1 = Config.string("key")
      const configProvider2 = pipe(
        ConfigProvider.fromMap(new Map([["key", "value"]])),
        ConfigProvider.unnested("parent"),
        ConfigProvider.unnested("child")
      )
      const config2 = pipe(
        Config.string("key"),
        Config.nested("child"),
        Config.nested("parent")
      )
      const result1 = yield* $(configProvider1.load(config1))
      const result2 = yield* $(configProvider2.load(config2))
      assert.strictEqual(result1, "value")
      assert.strictEqual(result2, "value")
    }))

  it.effect("unnested - failure", () =>
    Effect.gen(function*($) {
      const configProvider = pipe(
        ConfigProvider.fromMap(new Map([["key", "value"]])),
        ConfigProvider.unnested("nested")
      )
      const config = Config.string("key")
      const result = yield* $(Effect.exit(configProvider.load(config)))
      const error = ConfigError.MissingData(
        Chunk.of("key"),
        "Expected nested to be in path in ConfigProvider#unnested"
      )
      assert.deepStrictEqual(Exit.unannotate(result), Exit.fail(error))
    }))

  it.effect("upperCase", () =>
    Effect.gen(function*($) {
      const configProvider = pipe(
        ConfigProvider.fromMap(new Map([["UPPERCASE", "value"]])),
        ConfigProvider.upperCase
      )
      const result = yield* $(configProvider.load(Config.string("upperCase")))
      assert.strictEqual(result, "value")
    }))

  it.effect("within", () =>
    Effect.gen(function*($) {
      const configProvider = pipe(
        ConfigProvider.fromMap(new Map([["nesting1.key1", "value1"], ["nesting2.KEY2", "value2"]])),
        ConfigProvider.within(Chunk.of("nesting2"), ConfigProvider.contramapPath((s) => s.toUpperCase()))
      )
      const config = pipe(
        Config.string("key1"),
        Config.nested("nesting1"),
        Config.zip(pipe(
          Config.string("key2"),
          Config.nested("nesting2")
        ))
      )
      const result = yield* $(configProvider.load(config))
      assert.deepStrictEqual(result, ["value1", "value2"])
    }))

  it.effect("within - multiple layers of nesting", () =>
    Effect.gen(function*($) {
      const configProvider = pipe(
        ConfigProvider.fromMap(new Map([["nesting1.key1", "value1"], ["nesting2.nesting3.KEY2", "value2"]])),
        ConfigProvider.within(Chunk.make("nesting2", "nesting3"), ConfigProvider.contramapPath((s) => s.toUpperCase()))
      )
      const config = pipe(
        Config.string("key1"),
        Config.nested("nesting1"),
        Config.zip(pipe(
          Config.string("key2"),
          Config.nested("nesting3"),
          Config.nested("nesting2")
        ))
      )
      const result = yield* $(configProvider.load(config))
      assert.deepStrictEqual(result, ["value1", "value2"])
    }))
})
