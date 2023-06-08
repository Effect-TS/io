export type Concurrency = number | "inherit" | "batched"

/** @internal */
export const match = <A>(concurrency: Concurrency | undefined, cases: {
  readonly sequential: () => A
  readonly inherit: () => A
  readonly withLimit: (limit: number) => A
}) => {
  switch (concurrency) {
    case undefined:
      return cases.sequential()
    case "inherit":
      return cases.inherit()
    case "batched":
      return cases.withLimit(1)
    default:
      return concurrency > 1 ? cases.withLimit(concurrency) : cases.sequential()
  }
}
