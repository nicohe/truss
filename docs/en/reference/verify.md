# `truss verify`

`truss verify` is TRUSS's deterministic verification runner: it runs your verification commands in order and, when enabled, two opt-in checks before them.

## Guarantees

- Loads and validates `.truss/config.yaml` before executing project commands.
- Runs the command list only after it has been approved for this project (see [Trust](#trust)).
- When `verification.tests_required` or `verification.tasks_complete` is not `off`, runs the [tests-required](#tests-required-gate) and [tasks-complete](#tasks-complete-gate) gates after the trust check and before any command.
- Executes `verification.commands` exactly in configured order.
- Runs commands sequentially from the project root.
- Stops on the first failing command (fail-fast).
- Preserves each command's stdout/stderr in the terminal.
- Records machine-readable evidence in `.truss/verification/latest.json`.
- Never reports success when no verification commands are configured.

## The command list

`truss init` writes `commands: []`: TRUSS does not guess your language or your tools. With an empty list `verify` prints `× no verification commands configured`, records `not_configured` and exits `1`; it never reports success without having run something. List your project's checks in `.truss/config.yaml`; see the [examples](../configuration/examples.md). In 0.2.20 and earlier the list started with four `npm` commands, and a configuration that omitted `verification.commands` fell back to them; now it falls back to the empty list.

Each command runs through your shell with your terminal attached (inherited standard input and output), so a command that waits for input or watches for file changes keeps `verify` waiting. Use the single-run form of your test runner, such as `vitest run` rather than `vitest`. A pnpm and Vitest example is in [the configuration examples](../configuration/examples.md#a-typescript-project-with-pnpm-and-vitest).

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Every configured verification command passed. |
| `1` | A verification command failed, could not be started, no commands are configured, the command list is not trusted and was not approved, or a `block` gate (`tests_required` / `tasks_complete`) found a problem. |
| `2` | TRUSS configuration is invalid. No project verification command is executed. |

## Trust

`verification.commands` run through your shell, so `truss verify` asks before running a list it has not seen for this project:

- The first time, and whenever the list changes, it prints the commands and asks `Run and trust these commands? [y/N]`. Approval is remembered.
- Without a terminal (CI, agents) it refuses and exits `1`, unless you pass `truss verify --trust` or set `TRUSS_TRUST=1`. Use these only after reading `.truss/config.yaml`.
- Approvals are stored per project path in `$TRUSS_HOME/trusted.json` (default `~/.config/truss/`, or `$XDG_CONFIG_HOME/truss/`), never in the repository.
- Every list needs approval the first time, including the one you write after `init`; there is nothing to approve while the list is empty.
- `truss doctor` reports the current trust state.

See the trust model in [`SECURITY.md`](../../../SECURITY.md), and [environment variables](environment.md) for `TRUSS_TRUST` and `TRUSS_HOME`.

## Tests-required gate

Opt-in with `verification.tests_required: warn | block` (default `off`). It answers one deterministic question from Git: **did the change touch source code without touching any test?**

```text
Tests required  block
  × missing tests source changed without any test change (base main @ 3f2a1bc)
    workspace:
      lib/retry.mjs
  Add or update tests, or lower verification.tests_required to warn/off.

Verification failed: tests are required. No command was executed.
```

- `warn` reports and continues. `block` exits `1` before running any command.
- The comparison is the working tree against the merge-base of `HEAD` and the base branch (`verification.base_ref`, auto-detected when unset). Committed, staged, unstaged and untracked files count; pure deletions do not require tests.
- It is evaluated per component, so a monorepo needs tests in each component it changed.
- It looks at the whole branch, not at each commit: a test changed in an earlier commit of the branch also satisfies a later commit that only changes code, and any test file of the component counts. For tests that exercise the code, add a coverage threshold to `verification.commands` (see the [configuration reference](../configuration/reference.md#verificationtests_required)).
- If it cannot decide (no Git work tree, no commits, no base branch, shallow clone), it says so and never blocks.
- It does **not** prove tests were written first, that they cover the change, or that they pass; `verification.commands` do the latter.

The result is stored under `testsRequired` in the evidence file. See [configuration reference](../configuration/reference.md#verificationtests_required) for how files are classified.

## Tasks-complete gate

Opt-in with `verification.tasks_complete: warn | block` (default `off`). It answers: **are all the tasks of the active OpenSpec change checked off?**

```text
Tasks complete  block
  × open tasks 2 of 3 task(s) still open in "add-retry"
      1.2 Add tests
      1.3 Update the docs
  Finish or check off these tasks, or lower verification.tasks_complete to warn/off.

Verification failed: the active change still has open tasks. No command was executed.
```

- The active change comes from `.truss/state.json`; progress comes from `openspec instructions apply` (the checkboxes of `tasks.md`).
- `warn` reports and continues; `block` exits `1` before running any command.
- With no active change, an unavailable or incompatible OpenSpec, or a `tasks.md` without tasks, it says so and never blocks. An active change that was archived with `openspec archive` is reported as such (`archived`, with where it went) and never blocks either: a finished change has no task progress to read.
- When both gates are enabled, both are reported and both are recorded; the first blocking one (tests, then tasks) names the reason.

The result is stored under `tasksComplete` in the evidence file.

## Evidence

The local evidence file contains the ordered commands actually executed, their result, exit code/signal and duration. Because TRUSS is local tooling, `.truss/verification/` is ephemeral harness state rather than product source.

A passing run also records `workingTree`: `{ "fingerprint": "…", "files": 172 }`, a hash of the content of the files Git sees, taken once the commands have finished. `.truss/` and any `openspec/` folder are left out, and so is what Git ignores. [`truss status`](../workflows/lifecycle-commands.md#truss-status) and `truss continue` compare it with the files now and print `○ stale` when they differ; see [ADR 0002](../development/decisions/0002-stale-evidence-warning.md). Beside it, `.truss/verification/working-tree.json` holds the path and content id of each file (no contents), so the warning can name what changed; without it the warning still appears, without names. Evidence from an earlier release has no `workingTree` and gives no warning.
