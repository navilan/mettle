import { pipe } from "@effect-ts/core/Function"
import * as Y from "js-yaml"

import * as G from "../src/Generator"
import * as L from "../src/Language"

describe("workflow", () => {
  it("has name", () => {
    const name = "github action"
    const w = L.workflow(name)
    expect(w).toHaveProperty("name", name)
  })
  it("has single event", () => {
    const w = pipe(
      L.workflow("github action"),
      L.onPush({
        branches: ["master"]
      })
    )
    expect(w).toHaveProperty("on")
    expect(w.on).toHaveLength(1)
    expect(w.on[0]._tag).toEqual("PUSH")
    expect(w.on[0]).toHaveProperty("args")
    expect(w.on[0].args).toHaveProperty("branches")
    expect(w.on[0].args.branches).toHaveLength(1)
    expect(w.on[0].args?.branches?.[0]).toEqual("master")
  })
  it("has multiple events", () => {
    const w = pipe(
      L.workflow("github action"),
      L.onPush({
        branches: ["master"]
      }),
      L.onPR({
        tags: ["ci"]
      })
    )
    expect(w).toHaveProperty("on")
    expect(w.on).toHaveLength(2)
    expect(w.on[0]._tag).toEqual("PUSH")
    expect(w.on[0]).toHaveProperty("args")
    expect(w.on[0].args).toHaveProperty("branches")
    expect(w.on[0].args).not.toHaveProperty("tags")
    expect(w.on[0].args.branches).toHaveLength(1)
    expect(w.on[0].args?.branches?.[0]).toEqual("master")
    expect(w.on[1]._tag).toEqual("PULL_REQUEST")
    expect(w.on[1]).toHaveProperty("args")
    expect(w.on[1].args).not.toHaveProperty("branches")
    expect(w.on[1].args).toHaveProperty("tags")
    expect(w.on[1].args.tags).toHaveLength(1)
    expect(w.on[1].args?.tags?.[0]).toEqual("ci")
  })

  it("has one env", () => {
    const w = pipe(
      L.workflow("github action"),
      L.onPush({
        branches: ["master"]
      }),
      L.env("MY_SECRET", "MY_VALUE")
    )
    expect(w).toHaveProperty("env")
    expect(Object.keys(w.env ?? {}) || []).toHaveLength(1)
    expect(w.env?.["MY_SECRET"]).toEqual("MY_VALUE")
  })
  it("has two envs", () => {
    const w = pipe(
      L.workflow("github action"),
      L.onPush({
        branches: ["master"]
      }),
      L.env("MY_SECRET1", "MY_VALUE1"),
      L.env("MY_SECRET2", "MY_VALUE2")
    )
    expect(w).toHaveProperty("env")
    expect(Object.keys(w.env ?? {}) || []).toHaveLength(2)
    expect(w.env?.["MY_SECRET1"]).toEqual("MY_VALUE1")
    expect(w.env?.["MY_SECRET2"]).toEqual("MY_VALUE2")
  })
  it("has multiple envs", () => {
    const w = pipe(
      L.workflow("github action"),
      L.onPush({
        branches: ["master"]
      }),
      L.withEnv({
        MY_SECRET1: "MY_VALUE1",
        MY_SECRET2: "MY_VALUE2",
        MY_SECRET3: "MY_VALUE3"
      })
    )
    expect(w).toHaveProperty("env")
    expect(Object.keys(w.env ?? {}) || []).toHaveLength(3)
    expect(w.env?.["MY_SECRET1"]).toEqual("MY_VALUE1")
    expect(w.env?.["MY_SECRET2"]).toEqual("MY_VALUE2")
    expect(w.env?.["MY_SECRET3"]).toEqual("MY_VALUE3")
  })
  it("generates YAML", () => {
    const expected = {
      name: "github action",
      env: {
        MY_SECRET1: "MY_VALUE1",
        MY_SECRET2: "MY_VALUE2",
        MY_SECRET3: "MY_VALUE3",
        MY_SECRET4: "MY_VALUE4"
      },
      on: {
        push: { branches: ["master"] },
        pull_request: { tags: ["ci"] }
      },
      jobs: {
        lint: {
          "runs-on": "ubuntu-latest",
          services: {
            postgres: {
              image: "postgres:9.6",
              ports: ["5432:5432"],
              options:
                "--health-cmd pg_isready\n--health-interval 10s\n--health-timeout 5s\n--health-retries 5"
            }
          },
          steps: [
            {
              name: "Checkout",
              uses: "actions/checkout@v1"
            },
            {
              name: "Setup Node v12",
              uses: "actions/setup-node@v1",
              with: {
                "node-version": "12.x"
              }
            },
            {
              name: "Lint",
              run: "npm install -g yarn\nyarn\nyarn lint"
            }
          ]
        }
      }
    }
    const lintJob = expected.jobs["lint"]
    const w: L.Workflow = pipe(
      L.workflow(expected.name),
      L.onPush({
        ...expected.on.push
      }),
      L.onPR({
        ...expected.on.pull_request
      }),
      L.env("MY_SECRET1", "MY_VALUE1"),
      L.env("MY_SECRET2", "MY_VALUE2"),
      L.withEnv({
        MY_SECRET3: "MY_VALUE3",
        MY_SECRET4: "MY_VALUE4"
      }),
      L.jobs([
        pipe(
          L.job("lint"),
          L.service({
            id: "postgres",
            image: lintJob.services.postgres.image,
            options: lintJob.services.postgres.options,
            ports: lintJob.services.postgres.ports
          }),
          L.runsOn(lintJob["runs-on"]),
          L.steps([
            pipe(L.uses(lintJob.steps[0].uses ?? ""), L.named(lintJob.steps[0].name)),
            pipe(
              L.uses(lintJob.steps[1].uses ?? ""),
              L.named(lintJob.steps[1].name),
              L.withValues({ params: lintJob.steps[1].with ?? {} })
            ),
            pipe(
              L.run({
                command: lintJob.steps[2].run ?? ""
              }),
              L.named(lintJob.steps[2].name)
            )
          ])
        )
      ])
    )
    expect(pipe(w, G.toYAML({ sortKeys: true }))).toEqual(
      Y.dump(expected, { sortKeys: true })
    )
  })
})
