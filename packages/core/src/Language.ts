import { pipe } from "@effect-ts/core/Function"

export interface HasName {
  readonly name?: string
}

export interface HasId {
  readonly id?: string
}

export interface Env {
  [k: string]: string | number | boolean | null | undefined
}

export interface HasEnv {
  readonly env?: Env
}

export interface IsConditional {
  readonly if?: string
}

export interface Monitored {
  continueOnError?: boolean | string
  timeoutMinutes?: number
}

export function monitor<T>(mon: Monitored) {
  return (self: T): T & Monitored => ({ ...self, ...mon })
}

export function when<T, Condition extends string>(condition: Condition) {
  return (self: T): T & IsConditional => ({ ...self, if: condition })
}

export function named<T, Name extends string>(name: Name) {
  return (self: T): T & HasName => ({ ...self, name })
}

export function withId<T, Id extends string>(id: Id) {
  return (self: T): T & HasId => ({ ...self, id })
}

export interface HasEvents {
  readonly on?: readonly OnEvent[]
}

export interface HasJobs {
  readonly jobs?: readonly Job[]
}

export type NeedsEvents = Required<HasEvents>
export type NeedsJobs = Required<HasJobs>

export interface Workflow extends HasName, HasEnv, NeedsEvents, NeedsJobs {}

export interface SourceEventArgs {
  readonly branches?: readonly string[]
  readonly tags?: readonly string[]
  readonly paths?: readonly string[]
}

interface SourceEvent {
  readonly args: SourceEventArgs
}

export class PushEvent implements SourceEvent {
  readonly _tag = "PUSH"
  constructor(readonly args: SourceEventArgs) {}
}

export class PREvent implements SourceEvent {
  readonly _tag = "PULL_REQUEST"
  constructor(readonly args: SourceEventArgs) {}
}

export type OnEvent = PushEvent | PREvent

export function workflow(name: string): Partial<Workflow> & HasName {
  return pipe({}, named(name))
}

export function on(event: OnEvent) {
  return (w: Partial<Workflow>): Partial<Workflow> & Pick<Workflow, "on"> => ({
    ...w,
    on: [...(w.on ?? []), event]
  })
}

export function env<T extends HasEnv>(key: string, value: string): (self: T) => T {
  return (self: T): T => ({ ...self, env: { ...self.env, [key]: value } })
}

export function withEnv<T extends HasEnv>(env: Env): (self: T) => T {
  return (self: T): T => ({ ...self, env: { ...self.env, ...env } })
}

export function onPush(args?: SourceEventArgs) {
  return on(new PushEvent(args ?? {}))
}

export function onPR(args?: SourceEventArgs) {
  return on(new PREvent(args ?? {}))
}

export interface WithValues {
  readonly args?: string
  readonly entrypoint?: string
  readonly params?: { [k: string]: string | number | boolean }
}

export interface HasValues {
  readonly with?: WithValues
}

export class JobStep
  implements HasId, HasName, Monitored, HasValues, HasEnv, IsConditional
{
  readonly name?: string
  readonly id?: string
  readonly env?: Env
  readonly if?: string
  continueOnError?: boolean | string
  timeoutMinutes?: number
  readonly with?: WithValues
}

export class UsesStep extends JobStep {
  readonly _tag = "USES"
  constructor(readonly action: string) {
    super()
  }
}

export interface RunStepData {
  readonly command: string
  readonly workingDir?: string
  readonly shell?: string
}

export class RunStep extends JobStep {
  readonly _tag = "RUN"
  constructor(readonly data: RunStepData) {
    super()
  }
}

export function uses(action: string): Step {
  return new UsesStep(action)
}

export function run(params: RunStepData): Step {
  return new RunStep(params)
}

export function withValues<T extends HasValues>({
  args,
  entrypoint,
  params
}: WithValues): (self: T) => T & HasValues {
  return (self: T): T & HasValues => ({
    ...self,
    with: { ...(self.with ?? {}), args, entrypoint, params }
  })
}

export type Step = UsesStep | RunStep

export interface Job extends HasName, HasId, HasEnv, IsConditional, Monitored {
  readonly needs?: readonly string[]
  readonly runsOn: string
  readonly steps: readonly Step[]
}

export function job(id: string): Partial<Job> & HasId {
  return { id }
}

export function needsJob(jobId: string) {
  return needJobs([jobId])
}

export function needJobs<T extends Partial<Job>>(jobIds: string[]) {
  return (self: T) => ({ ...self, needs: [...(self.needs ?? []), jobIds] })
}

export function runsOn<T extends Partial<Job>>(machine: string) {
  return (self: T): Partial<Job> & { runsOn: string } => ({
    ...self,
    runsOn: machine
  })
}

export function step<T extends Partial<Job>>(s: Step) {
  return (self: T) => ({ ...self, steps: [...(self.steps ?? []), s] })
}

export function steps<T extends Partial<Job>>(ss: Step[]) {
  return (self: T) => ({ ...self, steps: [...(self.steps ?? []), ...ss] })
}

export function jobs<T extends Partial<Workflow>>(js: Job[]) {
  return (self: T) => ({ ...self, jobs: [...(self.jobs ?? []), ...js] })
}
