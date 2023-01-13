import * as Cause from "@effect/io/Cause"
import * as core from "@effect/io/internal/core"
import * as _fiberId from "@effect/io/internal/fiberId"
import * as fiberRefs from "@effect/io/internal/fiberRefs"
import { defaultRuntime } from "@effect/io/internal/runtime"
import type * as Logger from "@effect/io/Logger"
import * as Chunk from "@fp-ts/data/Chunk"
import * as HashMap from "@fp-ts/data/HashMap"

/** @internal */
export const test = <Message>(input: Message) => {
  return <Output>(self: Logger.Logger<Message, Output>): Output => {
    return self.log(
      _fiberId.none,
      core.logLevelInfo,
      input,
      Cause.empty,
      fiberRefs.unsafeMake(new Map()),
      Chunk.empty(),
      HashMap.empty(),
      defaultRuntime
    )
  }
}
