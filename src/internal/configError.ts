import type * as Cause from "@effect/io/Cause"
import type * as ConfigError from "@effect/io/Config/Error"
import * as OpCodes from "@effect/io/internal/opCodes/configError"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/** @internal */
const ConfigErrorSymbolKey = "@effect/io/Config/Error"

/** @internal */
export const ConfigErrorTypeId: ConfigError.ConfigErrorTypeId = Symbol.for(
  ConfigErrorSymbolKey
) as ConfigError.ConfigErrorTypeId

/** @internal */
export const proto = {
  [ConfigErrorTypeId]: ConfigErrorTypeId
}

/** @internal */
export const And = (self: ConfigError.ConfigError, that: ConfigError.ConfigError): ConfigError.ConfigError => {
  const error = Object.create(proto)
  error._tag = OpCodes.OP_AND
  error.left = self
  error.right = that
  Object.defineProperty(error, "toString", {
    enumerable: false,
    value(this: ConfigError.And) {
      return `${this.left} and ${this.right}`
    }
  })
  return error
}

/** @internal */
export const Or = (self: ConfigError.ConfigError, that: ConfigError.ConfigError): ConfigError.ConfigError => {
  const error = Object.create(proto)
  error._tag = OpCodes.OP_OR
  error.left = self
  error.right = that
  Object.defineProperty(error, "toString", {
    enumerable: false,
    value(this: ConfigError.Or) {
      return `${this.left} or ${this.right}`
    }
  })
  return error
}

/** @internal */
export const InvalidData = (path: Chunk.Chunk<string>, message: string): ConfigError.ConfigError => {
  const error = Object.create(proto)
  error._tag = OpCodes.OP_INVALID_DATA
  error.path = path
  error.message = message
  Object.defineProperty(error, "toString", {
    enumerable: false,
    value(this: ConfigError.InvalidData) {
      const path = pipe(this.path, Chunk.join("."))
      return `(Invalid data at ${path}: "${this.message}")`
    }
  })
  return error
}

/** @internal */
export const MissingData = (path: Chunk.Chunk<string>, message: string): ConfigError.ConfigError => {
  const error = Object.create(proto)
  error._tag = OpCodes.OP_MISSING_DATA
  error.path = path
  error.message = message
  Object.defineProperty(error, "toString", {
    enumerable: false,
    value(this: ConfigError.MissingData) {
      const path = pipe(this.path, Chunk.join("."))
      return `(Missing data at ${path}: "${this.message}")`
    }
  })
  return error
}

/** @internal */
export const SourceUnavailable = (
  path: Chunk.Chunk<string>,
  message: string,
  cause: Cause.Cause<unknown>
): ConfigError.ConfigError => {
  const error = Object.create(proto)
  error._tag = OpCodes.OP_SOURCE_UNAVAILABLE
  error.path = path
  error.message = message
  error.cause = cause
  Object.defineProperty(error, "toString", {
    enumerable: false,
    value(this: ConfigError.SourceUnavailable) {
      const path = pipe(this.path, Chunk.join("."))
      return `(Source unavailable at ${path}: "${this.message}")`
    }
  })
  return error
}

/** @internal */
export const Unsupported = (path: Chunk.Chunk<string>, message: string): ConfigError.ConfigError => {
  const error = Object.create(proto)
  error._tag = OpCodes.OP_UNSUPPORTED
  error.path = path
  error.message = message
  Object.defineProperty(error, "toString", {
    enumerable: false,
    value(this: ConfigError.Unsupported) {
      const path = pipe(this.path, Chunk.join("."))
      return `(Unsupported operation at ${path}: "${this.message}")`
    }
  })
  return error
}

/** @internal */
export const isConfigError = (u: unknown): u is ConfigError.ConfigError => {
  return typeof u === "object" && u != null && ConfigErrorTypeId in u
}

/** @internal */
export const isAnd = (self: ConfigError.ConfigError): self is ConfigError.And => {
  return self._tag === OpCodes.OP_AND
}

/** @internal */
export const isOr = (self: ConfigError.ConfigError): self is ConfigError.Or => {
  return self._tag === OpCodes.OP_OR
}

/** @internal */
export const isInvalidData = (self: ConfigError.ConfigError): self is ConfigError.InvalidData => {
  return self._tag === OpCodes.OP_INVALID_DATA
}

/** @internal */
export const isMissingData = (self: ConfigError.ConfigError): self is ConfigError.MissingData => {
  return self._tag === OpCodes.OP_MISSING_DATA
}

/** @internal */
export const isSourceUnavailable = (self: ConfigError.ConfigError): self is ConfigError.SourceUnavailable => {
  return self._tag === OpCodes.OP_SOURCE_UNAVAILABLE
}

/** @internal */
export const isUnsupported = (self: ConfigError.ConfigError): self is ConfigError.Unsupported => {
  return self._tag === OpCodes.OP_UNSUPPORTED
}

/** @internal */
export const prefixed = (prefix: Chunk.Chunk<string>) => {
  return (self: ConfigError.ConfigError): ConfigError.ConfigError => {
    switch (self._tag) {
      case OpCodes.OP_AND: {
        return And(prefixed(prefix)(self.left), prefixed(prefix)(self.right))
      }
      case OpCodes.OP_OR: {
        return Or(prefixed(prefix)(self.left), prefixed(prefix)(self.right))
      }
      case OpCodes.OP_INVALID_DATA: {
        return InvalidData(pipe(prefix, Chunk.concat(self.path)), self.message)
      }
      case OpCodes.OP_MISSING_DATA: {
        return MissingData(pipe(prefix, Chunk.concat(self.path)), self.message)
      }
      case OpCodes.OP_SOURCE_UNAVAILABLE: {
        return SourceUnavailable(pipe(prefix, Chunk.concat(self.path)), self.message, self.cause)
      }
      case OpCodes.OP_UNSUPPORTED: {
        return Unsupported(pipe(prefix, Chunk.concat(self.path)), self.message)
      }
    }
  }
}
