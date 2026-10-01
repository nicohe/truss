# Use TRUSS in CI

Run `truss verify` in your pipeline so a pull request is checked with the same commands you run locally. Two things about TRUSS shape how: the project configuration is **not** in your repository, and `verify` refuses to run a command list nobody approved.

## What CI needs

- **TRUSS**, pinned to a release so the pipeline does not change under you.
- **Your configuration**, because `.truss/config.yaml` is local to each checkout and a fresh CI checkout does not have it. Keep a reference copy in the repository (for example `ci/truss-config.yaml`) and copy it into place. [ADR 0001](../development/decisions/0001-local-project-configuration.md) explains why.
- **Approval**, because there is no terminal to answer the prompt. Set `TRUSS_TRUST=1` (or pass `--trust`). Do it only for a command list a person has reviewed: the reference file, reviewed like any other change to the repository, is that review.
- **Full Git history**, only if you enable `verification.tests_required`, which compares the change with the base branch.
- **OpenSpec**, only if you enable `verification.tasks_complete`. Without it the check reports that it cannot evaluate and does not block.

## Example: GitHub Actions

```yaml
name: verify
on: pull_request

jobs:
  truss:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0   # tests_required compares with the base branch
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npm ci
      - run: git clone --depth 1 --branch v0.2.18 https://github.com/nicohe/truss.git .truss
      - run: cp ci/truss-config.yaml .truss/config.yaml
      - run: node .truss/bin/truss.mjs verify
        env:
          TRUSS_TRUST: "1"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: truss-evidence
          path: .truss/verification/latest.json
```

The job fails when `verify` exits with `1` or `2` (see the [exit codes](../reference/cli.md#exit-codes)). The last step keeps the [evidence](../reference/verify.md#evidence) of the run, including when it failed.

## Do not approve what you did not review

`TRUSS_TRUST=1` makes the commands in the copied file run with the job's permissions. Do not use it in a job that runs code from a pull request you have not reviewed, such as a workflow triggered by pull requests from forks that also copies a file the pull request can change. Read the [trust model](../../../SECURITY.md#trust-model).

## If it fails

| You see | What it means | What to do |
|---|---|---|
| `Not trusted; nothing was executed.` and exit code `1` | there is no terminal and no approval | set `TRUSS_TRUST: "1"` on the step, after reviewing the list |
| `TRUSS config not found: .truss/config.yaml` | the configuration was not copied | add the `cp` step before `verify` |
| `Tests required` with `could not evaluate` | the checkout is shallow, so there is no base branch to compare with | use `fetch-depth: 0` |
| `× failed [1/4] npm test --if-present` with `Could not read package.json` | the default commands assume a Node project | list your own commands in the reference file (see the [examples](../configuration/examples.md#a-project-that-is-not-node)) |
