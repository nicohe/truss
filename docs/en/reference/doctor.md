# `truss doctor`

`truss doctor` is the local health check for a TRUSS workspace. It is read-only: it diagnoses setup and never installs, upgrades, initializes, reindexes, or rewrites project data. Run it whenever something behaves oddly, and after `truss init`.

```text
Core
  ● Node                   v24.12.0 (>=20 required)
  ● Git CLI                installed
  ● Git repository         work tree detected
  ● .truss ignore          .truss/ ignored
  ● Config                 .truss/config.yaml valid

Project
  ● Components             workspace:.

OpenSpec
  ● CLI                    v1.13.2
  ● Compatibility          compatible (>=1.0.0 <2.0.0)
  ● Project                openspec/config.yaml

Capabilities
  ○ Graphify               missing (optional; native fallback)
  ● Native search fallback filesystem / grep / runtime-native search
  ● Git worktrees          available through Git

Verification
  ● Commands               4 configured
  ● Tests required         off (not enforced)
  ● Tasks complete         off (not enforced)
  ● Trust                  commands approved for this project

TRUSS doctor passed. 1 optional warning(s).
```

## Symbols

- `●` pass: the condition is satisfied.
- `○` warning or skipped: work can continue. A skipped check means it could not run, usually because the configuration is invalid.
- `×` fail: a required condition is not satisfied.

## Checks

A check marked *required* makes `doctor` fail when it does not pass. The others only warn.

| Section | Check | Required | Passes when |
|---|---|---|---|
| Core | Node | yes | Node.js is 20 or newer |
| Core | Git CLI | yes | `git` is on `PATH` |
| Core | Git repository | yes | the directory is inside a Git work tree |
| Core | .truss ignore | no | Git ignores `.truss/` (warns otherwise) |
| Core | Config | yes | `.truss/config.yaml` exists and is valid; on failure the errors are listed |
| Project | Components | yes | every configured component resolves (skipped if the config is invalid) |
| Project | AGENTS.md, or AGENTS.md (component) | no | shown only when the effective guidance file exists and is empty: it is the component's own file, or the workspace one when the component has none. A component's empty file replaces the workspace one, so the agent gets no guidance. Add some, or remove the file; the `writing-for-agents` skill says what to put in it |
| OpenSpec | CLI | yes | an OpenSpec CLI is found |
| OpenSpec | Compatibility | yes | its version is within `>=1.0.0 <2.0.0` |
| OpenSpec | Project | yes | the directory has an initialized `openspec/` project |
| Capabilities | Graphify | only if `integrations.graphify.required: true` | Graphify is installed and its index is fresh |
| Capabilities | Native search fallback | no | always; informational |
| Capabilities | Git worktrees | no | Git is available |
| Verification | Commands | no | `verification.commands` is not empty |
| Verification | Package manager | no | shown only on a mismatch: a command starts with `npm`, and the project declares another manager in `package.json` (`packageManager`) or has another lockfile (`pnpm-lock.yaml`, `yarn.lock`, `bun.lock`). TRUSS never changes the list; it tells you to list that manager's commands |
| Verification | Tests required | no | always; shows the mode of [`verification.tests_required`](verify.md#tests-required-gate) |
| Verification | Tasks complete | no | always; shows the mode of [`verification.tasks_complete`](verify.md#tasks-complete-gate) |
| Verification | Trust | no | the current command list is [approved](verify.md#trust) for this project (shown only when commands are configured) |

Graphify is optional by default: when it is unavailable or its index is stale, `doctor` warns and TRUSS falls back to normal search. Only `required: true` turns that into a failure.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Every required check passed. Optional warnings may still be present. |
| `1` | One or more required setup checks failed. |
| `2` | The TRUSS configuration is invalid or cannot be loaded. |

`doctor` is intentionally diagnostic. Use the relevant explicit command to repair a condition: `truss init`, `truss graphify bootstrap`, or install what is missing (see [getting started](../getting-started.md#if-something-goes-wrong), and [troubleshooting](../guides/troubleshooting.md) for the messages of the other commands).
