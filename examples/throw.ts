import { seconds } from "@effect/data/Duration"
import * as Effect from "@effect/io/Effect"

Effect.runSync(Effect.sleep(seconds(10)))
