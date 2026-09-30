# OpenSpec

> Canonical TRUSS documentation.

OpenSpec is a **required foundation of TRUSS**, not an optional integration. It is developed at [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec), where the format of a change is documented. TRUSS does not implement a second specification format or silently fall back to another specification system.

## Ownership and lifecycle

OpenSpec remains independently owned and usable outside TRUSS. `truss init` must detect an existing OpenSpec installation/project before attempting setup.

- Existing compatible OpenSpec: reuse it; preserve all existing specs and changes.
- OpenSpec missing: initialize/setup OpenSpec before TRUSS workflows can run.
- Existing incompatible OpenSpec: report the incompatibility and stop; never upgrade silently.
- Existing OpenSpec data: never overwrite it as part of TRUSS initialization.

TRUSS may configure how it works with specifications through `spec.mode`, `spec.gherkin`, and `spec.zone_guard`, but OpenSpec itself is not enabled/disabled through `integrations`.
