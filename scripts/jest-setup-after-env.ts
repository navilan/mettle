import { equals } from "@effect-ts/core/Structural"
import * as U from "jest-matcher-utils"

expect.extend({
  equals: (rec, act) => {
    return {
      message: () =>
        `expected:\n${U.printReceived(rec)}\nto equal:\n${U.printExpected(act)}`,
      pass: equals(rec, act)
    }
  }
})