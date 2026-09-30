# OpenSpec detection

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

Detection does not judge the version. Whether the installed version is supported is a separate question, described in the [compatibility contract](openspec-compatibility.md).

## Commands

```bash
truss openspec
truss doctor
```

`truss openspec` exits non-zero when the CLI is missing or the project is not recognized as initialized. `truss doctor` reports these two checks separately (`CLI` and `Project`) and the version check as `Compatibility`.
