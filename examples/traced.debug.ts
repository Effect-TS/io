import { runtimeDebug } from "@effect/io/Debug"

runtimeDebug.defaultLogLevel = "Debug"
runtimeDebug.traceExecutionLogEnabled = true

import("./traced")
