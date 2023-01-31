import type * as ConfigError from "@effect/io/Config/Error"
import type * as ConfigProvider from "@effect/io/Config/Provider"
import * as Debug from "@effect/io/Debug"
import * as configError from "@effect/io/internal_effect_untraced/configError"
import * as Either from "@fp-ts/core/Either"
import { pipe } from "@fp-ts/core/Function"
import * as Option from "@fp-ts/core/Option"
import * as String from "@fp-ts/core/String"
import * as Chunk from "@fp-ts/data/Chunk"
import * as List from "@fp-ts/data/List"

/** @internal */
export const empty: ConfigProvider.ConfigProvider.Flat.PathPatch = {
  _tag: "Empty"
}

/** @internal */
export const andThen = (
  self: ConfigProvider.ConfigProvider.Flat.PathPatch,
  that: ConfigProvider.ConfigProvider.Flat.PathPatch
): ConfigProvider.ConfigProvider.Flat.PathPatch => ({
  _tag: "AndThen",
  first: self,
  second: that
})

/** @internal */
export const mapName = (
  self: ConfigProvider.ConfigProvider.Flat.PathPatch,
  f: (string: string) => string
): ConfigProvider.ConfigProvider.Flat.PathPatch => andThen(self, { _tag: "MapName", f })

/** @internal */
export const nested = (
  self: ConfigProvider.ConfigProvider.Flat.PathPatch,
  name: string
): ConfigProvider.ConfigProvider.Flat.PathPatch => andThen(self, { _tag: "Nested", name })

/** @internal */
export const unnested = (
  self: ConfigProvider.ConfigProvider.Flat.PathPatch,
  name: string
): ConfigProvider.ConfigProvider.Flat.PathPatch => andThen(self, { _tag: "Unnested", name })

/** @internal */
export const patch = Debug.dual<
  (
    path: Chunk.Chunk<string>,
    patch: ConfigProvider.ConfigProvider.Flat.PathPatch
  ) => Either.Either<ConfigError.ConfigError, Chunk.Chunk<string>>,
  (
    patch: ConfigProvider.ConfigProvider.Flat.PathPatch
  ) => (
    path: Chunk.Chunk<string>
  ) => Either.Either<ConfigError.ConfigError, Chunk.Chunk<string>>
>(2, (path, patch) => {
  let input = List.of(patch)
  let output: Chunk.Chunk<string> = path
  while (List.isCons(input)) {
    const patch = input.head
    switch (patch._tag) {
      case "Empty": {
        input = input.tail
        break
      }
      case "AndThen": {
        input = List.cons(patch.first, List.cons(patch.second, input.tail))
        break
      }
      case "MapName": {
        output = Chunk.map(output, patch.f)
        input = input.tail
        break
      }
      case "Nested": {
        output = Chunk.prepend(output, patch.name)
        input = input.tail
        break
      }
      case "Unnested": {
        const containsName = pipe(
          Chunk.head(output),
          Option.contains(String.Equivalence)(patch.name)
        )
        if (containsName) {
          output = Chunk.tailNonEmpty(output as Chunk.NonEmptyChunk<string>)
          input = input.tail
        } else {
          return Either.left(configError.MissingData(
            output,
            `Expected ${patch.name} to be in path in ConfigProvider#unnested`
          ))
        }
        break
      }
    }
  }
  return Either.right(output)
})
