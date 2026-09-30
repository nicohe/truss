# OpenSpec foundation

OpenSpec is required by TRUSS. It is not an optional integration and has no `enabled`/`required` switch in `.truss/config.yaml`.

TRUSS must reuse a compatible OpenSpec project when one already exists and must preserve its existing specifications. If OpenSpec is missing, it must be set up before TRUSS change workflows are considered ready. TRUSS must not silently upgrade an incompatible OpenSpec installation or overwrite existing OpenSpec data.

v0.1 note: `truss init`, `truss openspec`, and `truss doctor` detect and validate the OpenSpec CLI/project. `truss init` adopts an existing compatible project or initializes a missing project with the existing compatible CLI. TRUSS never installs, upgrades, or downgrades the OpenSpec CLI automatically.
