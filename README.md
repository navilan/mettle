# WIP

## Desire

```
 workflow("Lint, test, and build all projects)
 ['<||>'] on({ pull_request: { branches: [ "master" ]}})
 ['<||>'] env({})
 ['<||>'] job("test-common")
          .runs_on("ubuntu-latest")
          .uses_step("actions/checkout@v1").named("").with({})
          .run_step().having_env().at_dir().commands([]).named()

```
