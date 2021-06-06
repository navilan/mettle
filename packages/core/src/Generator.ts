import * as A from "@effect-ts/core/Collections/Immutable/Array"
import * as D from "@effect-ts/core/Collections/Immutable/Dictionary"
import { flow, pipe } from "@effect-ts/core/Function"
import * as Y from "js-yaml"

import type * as L from "./Language"
import type { GithubAction } from "./schemas/github-action"

type EventDefinition = GithubAction["on"]
type Jobless = Omit<GithubAction, "jobs">
type EnvVars = GithubAction["env"]

function generateSourceEvent(event: L.OnEvent): EventDefinition {
  return { [event._tag.toLowerCase()]: { ...event.args } }
}

function generateEnv(env?: L.Env): EnvVars {
  const envFixed = env ?? {}
  return pipe(
    D.keys(envFixed),
    A.reduce({}, (coll, key) => {
      const val = envFixed[key]
      return val ? { ...coll, [key]: val } : coll
    })
  )
}

function generateWorkflow(workflow: Partial<L.Workflow>): Jobless {
  const events = pipe(
    workflow.on ?? [],
    A.map(generateSourceEvent),
    A.reduce({}, (defs: EventDefinition, def: EventDefinition) => ({
      ...defs,
      ...def
    }))
  )
  return {
    name: workflow.name,
    on: events,
    env: generateEnv(workflow.env)
  }
}

export function toYAML(opts?: Y.DumpOptions) {
  return flow(generateWorkflow, (def) =>
    Y.dump(def, {
      noRefs: true,
      ...opts
    })
  )
}
