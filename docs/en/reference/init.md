# `truss init`

`truss init` is idempotent and non-destructive.

## Guarantees

- Existing `.truss/config.yaml` is validated and adopted; it is never overwritten.
- Missing `.truss/config.yaml` is created from TRUSS defaults.
- Existing initialized OpenSpec projects are adopted without modification.
- A missing OpenSpec project is initialized only when a compatible OpenSpec CLI is available.
- TRUSS runs `openspec init <project> --tools none` so OpenSpec creates its durable project structure without installing runtime-specific assistant files.
- Partial or legacy `openspec/` directories are preserved and require explicit user action.
- TRUSS never upgrades or downgrades OpenSpec.
- Re-running `truss init` is safe: existing TRUSS config and OpenSpec project data remain unchanged.
- `.gitignore` is inspected but not rewritten. TRUSS warns when `.truss/` is not ignored.

## Failure behavior

`truss init` stops when configuration is invalid, OpenSpec is missing/incompatible, OpenSpec initialization fails, or existing OpenSpec data is ambiguous. Existing user data is not replaced to make initialization succeed.

## Why `--tools none`?

TRUSS is runtime-agnostic. OpenSpec remains the required durable specification layer, while selection of Claude Code, Codex, Devin, Windsurf, or other OpenSpec runtime integrations remains an explicit project/user choice.
