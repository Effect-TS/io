import { dual } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as List from "@effect/data/List"
import * as Cause from "@effect/io/Cause"
import * as core from "@effect/io/internal/core"
import * as _fiberId from "@effect/io/internal/fiberId"
import * as fiberRefs from "@effect/io/internal/fiberRefs"
import type * as Logger from "@effect/io/Logger"

/** @internal */
export const test = dual<
  <Message>(input: Message) => <Output>(self: Logger.Logger<Message, Output>) => Output,
  <Message, Output>(self: Logger.Logger<Message, Output>, input: Message) => Output
>(2, (self, input) =>
  self.log({
    fiberId: _fiberId.none,
    logLevel: core.logLevelInfo,
    message: input,
    cause: Cause.empty,
    context: fiberRefs.empty(),
    spans: List.empty(),
    annotations: HashMap.empty(),
    date: new Date()
  }))
