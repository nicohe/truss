# CLI reference

TRUSS v0.1 is primarily an agent-driven/declarative harness. The table below distinguishes commands that execute behavior from commands that only prepare or expose state.

| Command | v0.1 behavior | Next step |
|---|---|---|
| `truss init` | Creates `.truss/config.yaml` if missing; does not overwrite it | `truss doctor` |
| `truss doctor` | Checks Node, Git, TRUSS config, required OpenSpec CLI/project, and optional Graphify availability | Resolve required failures |
| `truss config` | Validates and prints resolved configuration | Fix configuration errors if any |
| `truss openspec` | Inspects OpenSpec CLI/project and compatibility | Resolve incompatibility if any |
| `truss graphify [status|update|bootstrap]` | Inspects or refreshes the code graph | Use fallback when optional |
| `truss components [name]` | Resolves configured components and context | Use resolved scope |
| `truss new "Change name" [--component name]` | Creates an OpenSpec change scaffold and marks it active | Discovery/refine spec |
| `truss status` | Displays active change and phase | Continue current phase |
| `truss continue` | Prints the active OpenSpec and instructs the agent to continue the first incomplete task | Agent follows `execute-change` |
| `truss verify` | Actually executes `verification.commands` in order and stops on first failure | Review if green |
| `truss handoff` | Writes a concise handoff file for the active change | Use only on context transition |
| `truss skills` | Lists installed portable TRUSS skills | Load only relevant skill |

## Review

`code-review` exists as a skill/workflow in v0.1, but the starter CLI does **not** currently implement an executable `truss review` command. Runtime-driven review is part of later orchestration work. Documentation must not imply otherwise.

## Canonical order

See [Change lifecycle](../workflows/lifecycle.md) for CLI + OpenSpec + workflow + skill ordering.

### Verification evidence

`truss verify` runs gates sequentially and fail-fast. Exit `0` means every configured gate passed; `1` means verification failed or no gates are configured; `2` means invalid TRUSS configuration. The latest machine-readable result is written to `.truss/verification/latest.json`.
