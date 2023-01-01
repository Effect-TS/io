import { runtimeDebug } from "@effect/io/Debug"

runtimeDebug.minumumLogLevel = "Debug"
runtimeDebug.traceExecutionLogEnabled = true

import("./traced")
