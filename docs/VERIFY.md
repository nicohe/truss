# `truss verify`

`truss verify` is TRUSS's deterministic quality-gate runner.

## Guarantees

- Loads and validates `.truss/config.yaml` before executing project commands.
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
| `1` | A verification command failed, could not be started, or no commands are configured. |
| `2` | TRUSS configuration is invalid. No project verification command is executed. |

## Evidence

The local evidence file contains the ordered commands actually executed, their result, exit code/signal and duration. Because TRUSS is local tooling, `.truss/verification/` is ephemeral harness state rather than product source.
