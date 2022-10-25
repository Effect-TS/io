import { runtimeDebug } from "@effect/io/Debug"

runtimeDebug.traceEnabled = true
runtimeDebug.traceFilter = (traceToFilter) => traceToFilter.startsWith(__dirname)
