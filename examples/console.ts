import * as Console from "@effect/io/Console"
import * as Effect from "@effect/io/Effect"

Effect.succeed("Hello World!").pipe(
  Effect.tap(Console.log),
  Effect.zipRight(Console.dir({ a: 1, b: 2 })),
  Effect.zipLeft(Console.time("Time 1")),
  Effect.zipRight(Console.table({ a: 1, b: 2 })),
  Console.withGroup({ label: "Group 1" }),
  Effect.zipRight(Console.log("Goodbye World!")),
  Console.withGroup({ label: "Group 2" }),
  Console.withTime("Time 2"),
  Effect.scoped,
  Effect.runFork
)
