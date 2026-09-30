# CLI reference

TRUSS is a Node CLI. From a project, run it as `node .truss/bin/truss.mjs <command>` (or through an alias; see [getting started](../getting-started.md)). Commands act on the **current directory**, which must be the project root. The only flags that work with any command are `--help` and `--version`, described in [Getting help](#getting-help); the rest are the options listed below.

TRUSS v0.2 is primarily an agent-driven harness. The table shows which commands run deterministic checks and which only prepare or show state; none of them runs a coding agent.

| Command | What it does | Details |
|---|---|---|
| `truss init` | Creates `.truss/config.yaml` if missing (never overwrites it) and initializes or adopts OpenSpec | [`init`](init.md) |
| `truss doctor` | Read-only health check of the environment, config, OpenSpec and optional Graphify | [`doctor`](doctor.md) |
| `truss config` | Validates and prints the resolved configuration, with defaults applied | [validation](../configuration/validation.md) |
| `truss openspec` | Inspects the OpenSpec CLI, its version and the project | [OpenSpec detection](../integrations/openspec-detection.md) |
| `truss graphify [status\|update\|bootstrap]` | Inspects or refreshes the optional code graph | [Graphify lifecycle](../integrations/graphify-lifecycle.md) |
| `truss components [name]` | Resolves the configured components and their context | [components](components.md) |
| `truss new "Change name" [--component name]` | Creates an OpenSpec change and marks it active | [lifecycle](../workflows/lifecycle-commands.md) |
| `truss use <change> [--component name]` | Makes a change that is already open in OpenSpec the active one again | [lifecycle](../workflows/lifecycle-commands.md#truss-use) |
| `truss status` | Shows the active change, its phase, artifacts and task progress | [lifecycle](../workflows/lifecycle-commands.md) |
| `truss continue` | Prints the next action for the agent and the files to load | [lifecycle](../workflows/lifecycle-commands.md) |
| `truss verify [--trust]` | Runs `verification.commands` in order, stopping at the first failure; runs the opt-in checks first; asks before running a new or changed command list | [`verify`](verify.md) |
| `truss handoff` | Writes a short handoff note for the active change | [`handoff`](handoff.md) |
| `truss skills` | Lists the portable skills shipped with the installation | [skills](../skills/overview.md) |
| `truss version` | Prints the installed TRUSS version (`truss --version` and `truss -v` do the same) | |
| `truss help [command]` | Lists the commands, or explains one. Running `truss` with no command does the same as `truss help` | [getting help](#getting-help) |

## Getting help

```bash
node .truss/bin/truss.mjs help             # the command list (same as running truss with no command)
node .truss/bin/truss.mjs verify --help    # usage, options and exit codes of one command; it is not run
node .truss/bin/truss.mjs help verify      # the same
node .truss/bin/truss.mjs --version        # truss 0.2.12
```

`--help` never runs the command it is next to, so `truss verify --help` is always safe. A mistyped command fails with exit code `2`, so a script does not carry on as if it had worked, and suggests the closest name:

```text
× Unknown command "verfy".
Did you mean "verify"? Run "truss help" to list the commands.
```

## Options

| Option | On | Effect |
|---|---|---|
| `--component <name>` | `new`, `use` | `new` creates the change in a component declared under `components`; `use` looks for the change in that component's OpenSpec. An undeclared name fails with `Unknown component`. |
| `--trust` | `verify` | Approves the current `verification.commands` list without asking. Use it after reading the list. |
| `--help`, `-h` | any command | Shows the help of that command instead of running it. |
| `--version`, `-v` | in place of the command | Prints the installed version. |

## Exit codes

The same three values are used everywhere:

| Code | Meaning |
|---|---|
| `0` | The command did what it was asked. |
| `1` | A check or precondition failed: verification failed, a command list was not approved, OpenSpec is missing or incompatible, or a required capability is unavailable. |
| `2` | The configuration is invalid, or the command was used wrongly (for example, `new` without a title, or an unknown command, component or action). |

Per command:

- `init`: `1` when OpenSpec is missing, incompatible, partial or failed to initialize; `2` for an invalid config or an incomplete installation.
- `doctor`: `1` when a required check fails; `2` when the config is invalid.
- `verify`: `1` when a command fails, none are configured, the list is not approved, or a gate set to `block` refuses; `2` for an invalid config.
- `graphify update` / `bootstrap`: a failure is `1` only when Graphify is `required: true`, otherwise `0`.
- `new`, `status`, `continue`: `2` when the configuration is invalid or missing, or when the component is unknown (the errors are listed, as `config` and `verify` do); `1` when OpenSpec is missing, incompatible or not initialized.
- `use`: `1` when the change is not open (it does not exist, or it was archived) or OpenSpec is missing or incompatible; `2` when no change is named or the name is not a change id, the configuration is invalid or the component is unknown.
- `status`, `continue`, `handoff`: `2` when `.truss/state.json` is unreadable.

## Output

Output is plain text, colored only when it is going to an interactive terminal. `NO_COLOR` and `FORCE_COLOR` override that; see [environment variables](environment.md), which also lists the other variables TRUSS reads.

## Review

`code-review` exists as a skill and workflow in v0.2, but there is **no** executable `truss review` command. Runtime-driven review is part of later orchestration work.

## Canonical order

See the [change lifecycle](../workflows/lifecycle.md) for the order of commands, workflows and skills.

## Verification evidence

`truss verify` runs the verification commands sequentially and stops at the first failure. It writes the latest machine-readable result to `.truss/verification/latest.json`: the commands run, their status, exit code and duration, plus `testsRequired` and `tasksComplete` results when those checks are enabled. See [`truss verify`](verify.md#evidence).
