import * as E from "@effect/io/Effect"

E.unsafeRunPromise(E.die("ok")).catch(console.log)
