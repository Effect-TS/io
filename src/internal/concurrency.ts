export type Concurrency = number | "inherit" | "batched"

/** @internal */
export const match = <A>(
  concurrency: Concurrency | undefined,
  sequential: () => A,
  inherit: () => A,
  withLimit: (limit: number) => A
) => {
  switch (concurrency) {
    case undefined:
      return sequential()
    case "inherit":
      return inherit()
    case "batched":
      return withLimit(1)
    default:
      return concurrency > 1 ? withLimit(concurrency) : sequential()
  }
}

/** @internal */
export const matchSimple = <A>(
  concurrency: Concurrency | undefined,
  sequential: () => A,
  parallel: (limit: number | undefined) => A
) => {
  switch (concurrency) {
    case undefined:
      return sequential()
    case "inherit":
      return parallel(undefined)
    case "batched":
      return parallel(1)
    default:
      return concurrency > 1 ? parallel(concurrency) : sequential()
  }
}
