export const assertType = <A>() => <B>(_: B): [A] extends [B] ? [B] extends [A] ? true : false : false => true as any
