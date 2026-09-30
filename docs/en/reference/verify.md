# `truss verify`

`truss verify` is TRUSS's deterministic quality-gate runner.

## Guarantees

- Loads and validates `.truss/config.yaml` before executing project commands.
- Runs the command list only after it has been approved for this project (see [Trust](#trust)).
- Executes `verification.commands` exactly in configured order.
- Runs commands sequentially from the project root.
- Stops on the first failing command (fail-fast).
- Preserves each command's stdout/stderr in the terminal.
- Records machine-readable evidence in `.truss/verification/latest.json`.
- Never reports success when no verification commands are configured.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Every configured verification command passed. |
| `1` | A verification command failed, could not be started, no commands are configured, or the command list is not trusted and was not approved. |
| `2` | TRUSS configuration is invalid. No project verification command is executed. |

## Trust

`verification.commands` run through your shell, so `truss verify` asks before running a list it has not seen for this project:

- The first time, and whenever the list changes, it prints the commands and asks `Run and trust these commands? [y/N]`. Approval is remembered.
- Without a terminal (CI, agents) it refuses and exits `1`, unless you pass `truss verify --trust` or set `TRUSS_TRUST=1`. Use these only after reading `.truss/config.yaml`.
- Approvals are stored per project path in `$TRUSS_HOME/trusted.json` (default `~/.config/truss/`, or `$XDG_CONFIG_HOME/truss/`), never in the repository.
- `truss init` trusts the default list it writes; adopted or edited configs need approval.
- `truss doctor` reports the current trust state.

See the trust model in [`SECURITY.md`](../../../SECURITY.md).

## Evidence

The local evidence file contains the ordered commands actually executed, their result, exit code/signal and duration. Because TRUSS is local tooling, `.truss/verification/` is ephemeral harness state rather than product source.
