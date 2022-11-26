import { runtimeDebug } from "@effect/io/Debug"

runtimeDebug.traceFilter = (traceToFilter) => traceToFilter.startsWith(__dirname)
