import { pipe } from "@effect-ts/core/Function"

export interface HasName {
  readonly name?: string
}

export interface Env {
  [k: string]: string | number | boolean | null | undefined
}

export interface HasEnv {
  readonly env?: Env
}

export function named<T, Name extends string>(name: Name) {
  return (self: T): T & HasName => ({ ...self, name })
}

export interface Workflow extends HasName, HasEnv {
  readonly on: readonly OnEvent[]
}

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
