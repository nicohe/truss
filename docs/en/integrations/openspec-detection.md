# OpenSpec detection (TRUSS v0.1.9)

TRUSS treats OpenSpec as a required core dependency but does not own its lifecycle.

`truss openspec` detects two independent states:

1. **CLI** — whether `openspec` is on `PATH` and, when possible, the version reported by `openspec --version`.
2. **Project** — whether the current project has been initialized by OpenSpec.

## Project states

- `initialized`: `openspec/config.yaml` or `openspec/config.yml` exists.
- `legacy_or_partial`: the `openspec/` directory has `specs/` or `changes/`, but no project config.
- `directory_only`: `openspec/` exists without recognized initialization evidence.
- `not_initialized`: no `openspec/` directory exists.

OpenSpec's current `init` contract creates `openspec/config.yaml`, so TRUSS uses that file as the positive initialization marker. TRUSS does not modify, refresh, or overwrite OpenSpec during detection.

Compatibility policy is intentionally not evaluated in this step; version compatibility belongs to Step 6.

## Commands

```bash
truss openspec
truss doctor
```

`truss openspec` exits non-zero when the CLI is missing or the project is not recognized as initialized. `truss doctor` now reports these two checks separately.
