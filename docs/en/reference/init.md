# `truss init`

`truss init` prepares a project to use TRUSS. It is idempotent and non-destructive: run it as often as you like.

```text
Config          ● created .truss/config.yaml
OpenSpec       ● initialized with --tools none
Git ignore      ● .truss/ ignored

TRUSS initialization verified.
```

## What it does

1. **Configuration.** Creates `.truss/config.yaml` from the TRUSS defaults if it does not exist. If it exists, it is validated and **adopted**, never overwritten. The project only ever gets its own files; the schema, skills, policies and workflows come from the [TRUSS installation](project-structure.md).
2. **OpenSpec.** Adopts an existing initialized OpenSpec project, or initializes a missing one with `openspec init <project> --tools none`, and only when a compatible OpenSpec CLI is available.
3. **Approval.** When `init` *creates* the configuration, it also approves the default `verification.commands` it just wrote, so the first `truss verify` needs no confirmation. An **adopted** configuration is not approved: its first `verify` asks (see [`truss verify`](verify.md#trust)).
4. **Git.** Inspects `.gitignore` and warns when `.truss/` is not ignored. It never rewrites `.gitignore`.

It does not create an `AGENTS.md`, install an agent, or change your Git history.

## Guarantees

- Existing `.truss/config.yaml` is validated and adopted; it is never overwritten. An invalid one stops `init` and is left untouched.
- If TRUSS cannot validate the configuration it just created (for example, an incomplete installation), the file is removed again: `init` never leaves a half-created config behind.
- Existing initialized OpenSpec projects are adopted without modification.
- Partial or legacy `openspec/` directories are preserved and require explicit user action.
- TRUSS never installs, upgrades or downgrades OpenSpec.
- Re-running `truss init` is safe: existing TRUSS config and OpenSpec project data remain unchanged.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | The project is initialized (created or adopted). |
| `1` | OpenSpec is missing, incompatible, in a partial or legacy state, or its initialization failed. The configuration may still have been created. |
| `2` | The configuration is invalid, or the TRUSS installation is incomplete. Nothing was overwritten. |

## Why `--tools none`?

TRUSS is runtime-agnostic. OpenSpec remains the required durable specification layer, while selection of Claude Code, Codex, Devin, Windsurf, or other OpenSpec runtime integrations remains an explicit project or user choice.
