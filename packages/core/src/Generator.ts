import * as A from "@effect-ts/core/Collections/Immutable/Array"
import { flow, pipe } from "@effect-ts/core/Function"
import { matchTag } from "@effect-ts/core/Utils"
import * as Y from "js-yaml"

import type * as L from "./Language"
import type { GithubAction } from "./schemas/github-action"

type ArrayElement<ArrayType> = ArrayType extends readonly (infer ElementType)[]
  ? ElementType
  : never

type EventDefinition = Extract<GithubAction["on"], { [k: string]: unknown }>
type Jobs = GithubAction["jobs"]
type Job = Jobs[keyof Jobs]
type Steps = Job["steps"]
type Step = ArrayElement<Steps>

function generateSourceEvent(event: L.OnEvent): EventDefinition {
  return { [event._tag.toLowerCase()]: { ...event.args } }
}

function generateX<A, B, X>(
  key: keyof A,
  obj: A,
  options?: {
    newKey?: string
    transform?: (a: A, key: keyof A) => X
  }
) {
  const { newKey, transform } = options ?? {}
  const trans = transform ? transform(obj, key) : obj[key]
  const extra = obj[key] ? { [newKey ?? key]: trans } : {}
  return (self: B) => ({ ...self, ...extra })
}

function generateId<T extends L.HasId>(idMaybe: T) {
  return generateX("id", idMaybe)
}

function generateName<T extends L.HasName>(nameMaybe: T) {
  return generateX("name", nameMaybe)
}

function generateValues<T extends L.HasValues>(valuesMaybe: T) {
  return generateX("with", valuesMaybe, {
    transform: ({ with: values }: T) => ({
      args: values?.args,
      entrypoint: values?.entrypoint,
      ...values?.params
    })
  })
}

function generateEnv<T extends L.HasEnv>(envMaybe: T) {
  return generateX("env", envMaybe)
}

function generateIf<T extends L.IsConditional>(ifMaybe: T) {
  return generateX("if", ifMaybe)
}

function generateMonitored<T extends L.Monitored, B>(
  monitored: T
): (b: B) => B & {
  "continue-on-error"?: boolean
  "timeout-minutes"?: number
} {
  return flow(
    generateX("continueOnError", monitored, {
      newKey: "continue-on-error"
    }),
    generateX("timeoutMinutes", monitored, {
      newKey: "timeout-minutes"
    })
  )
}

function generateRunsOn<B>(
  job: Partial<L.Job>
): (self: B) => B & { "runs-on": string } {
  // @ts-expect-error
  return generateX("runsOn", job, { newKey: "runs-on" })
}

function generateStepCommand(step: L.Step) {
  return pipe(
    step,
    matchTag({
      RUN: (runStep) =>
        pipe(
          {},
          generateX("data", runStep, {
            newKey: "run",
            transform: () => runStep.data.command
          }),
          generateX("data", runStep, {
            newKey: "working-dir",
            transform: () => runStep.data.workingDir
          }),
          generateX("data", runStep, {
            newKey: "shell",
            transform: () => runStep.data.shell
          })
        ),
      USES: (usesStep) => pipe({}, generateX("action", usesStep, { newKey: "uses" }))
    })
  )
}

function generateStep(step: L.Step): Step {
  const jobStep = step as L.JobStep
  return pipe(
    generateStepCommand(step),
    generateName(jobStep),
    generateId(jobStep),
    generateIf(jobStep),
    generateValues(jobStep),
    generateMonitored(jobStep),
    generateEnv(jobStep)
  )
}

function generateSteps<T extends Partial<Job>>(
  job: L.Job
): (self: T) => T & { steps: Step[] } {
  // @ts-expect-error
  return generateX("steps", job, {
    transform: (job: L.Job) => pipe(job.steps, A.map(generateStep))
  })
}

function generateJob(job: L.Job): Job {
  return pipe(
    {},
    generateName(job),
    generateIf(job),
    generateMonitored(job),
    generateEnv(job),
    generateX("needs", job),
    generateSteps(job),
    generateRunsOn(job) // TODO: why is the ordering important
  )
}

type NeedsJobs = {
  jobs: {
    [jobId: string]: Job
  }
}

function makeJobs(workflow: L.Workflow) {
  return pipe(
    workflow.jobs,
    A.reduce({}, (col, job) => ({
      ...col,
      [job.id ?? ""]: generateJob(job)
    }))
  )
}

function generateJobs<B>(workflow: L.Workflow): (self: B) => B & NeedsJobs {
  // @ts-expect-error
  return generateX("jobs", workflow, { transform: makeJobs })
}

function transformEvents<T extends L.HasEvents>(obj: T): EventDefinition {
  return pipe(
    obj.on ?? [],
    A.map(generateSourceEvent),
    A.reduce({}, (defs: EventDefinition, def: EventDefinition) => ({
      ...defs,
      ...def
    }))
  )
}

function generateEvents<B, T extends L.HasEvents>(
  withOn: T
): (b: B) => B & { on: EventDefinition } {
  //@ts-expect-error
  return generateX("on", withOn, {
    transform: transformEvents
  })
}

function generateWorkflow(workflow: L.Workflow): GithubAction {
  return pipe(
    {},
    generateName(workflow),
    generateEnv(workflow),
    generateEvents(workflow),
    generateJobs(workflow)
  )
}

export function toYAML(opts?: Y.DumpOptions) {
  return flow(generateWorkflow, (def) =>
    Y.dump(def, {
      noRefs: true,
      ...opts
    })
  )
}
