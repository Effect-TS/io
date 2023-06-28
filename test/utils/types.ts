export const assertType = <A>() => <B>(_: B): [A] extends [B] ? [B] extends [A] ? true : false : false => void 0 as any
