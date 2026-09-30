# TRUSS v0.1 documentation audit

> Historical document. It describes TRUSS the documentation of v0.1.0 and is kept for the record. For what holds today, see the [v0.2 release contract](release-v0.2.md) and the [enforcement model](enforcement.md).

Version audited: **0.1.0 stable**.

Purpose: prevent documentation from presenting agent policy or future runtime orchestration as an executable v0.1 guarantee.

Canonical enforcement definitions: [`enforcement.md`](enforcement.md).

## Audit result

- Executable CLI behavior is labeled/worded as **[TRUSS]** behavior.
- BDD, TDD, spec discipline, review quality, context discipline and optional Graphify fallback remain **[AGENT]** behavior.
- Runtime orchestration, isolated reviewers, automatic teams/subagents, hooks and zone-write controls remain **[ADAPTER]** / future behavior.
- `spec.zone_guard` remains **[DECLARATIVE]** in v0.1.
- Graphify documentation now reflects the implementation: required Graphify blocks `truss graphify` and `truss doctor`; agent-driven implementation still relies on the agent respecting that requirement.
- Getting-started documentation now matches the chosen project-local `.truss/` + host `.gitignore` distribution model and does not require a global `npm link` installation.
- CLI reference was checked against `bin/truss.mjs`; documented v0.1 commands exist. `truss review` is intentionally not documented as executable.

This audit is a release check, not a runtime enforcement mechanism. Future behavior changes must update both code/tests and the corresponding enforcement documentation.
