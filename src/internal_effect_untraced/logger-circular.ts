import * as Chunk from "@effect/data/Chunk"
import * as HashMap from "@effect/data/HashMap"
import * as Cause from "@effect/io/Cause"
import * as core from "@effect/io/internal_effect_untraced/core"
import * as _fiberId from "@effect/io/internal_effect_untraced/fiberId"
import * as fiberRefs from "@effect/io/internal_effect_untraced/fiberRefs"
import { defaultRuntime } from "@effect/io/internal_effect_untraced/runtime"
import type * as Logger from "@effect/io/Logger"
import { dual } from "@fp-ts/core/Function"

/** @internal */
export const test = dual<
  <Message>(input: Message) => <Output>(self: Logger.Logger<Message, Output>) => Output,
  <Message, Output>(self: Logger.Logger<Message, Output>, input: Message) => Output
>(2, (self, input) =>
  self.log(
    _fiberId.none,
    core.logLevelInfo,
    input,
    Cause.empty,
    fiberRefs.unsafeMake(new Map()),
    Chunk.empty(),
    HashMap.empty(),
    defaultRuntime
  ))
