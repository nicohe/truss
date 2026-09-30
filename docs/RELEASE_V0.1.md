# TRUSS v0.1.0 release contract

TRUSS v0.1.0 is the first stable baseline of the agent-driven harness.

## Stable scope

TRUSS itself guarantees:
- configuration parsing, defaults, schema validation, and invalid-combination checks;
- OpenSpec detection, supported-version checks, safe adoption/initialization, and lifecycle state integration;
- component path/scope resolution;
- Graphify diagnostics/lifecycle commands and blocking behavior when required;
- project diagnostics through `truss doctor`;
- deterministic, sequential, fail-fast verification with local machine-readable evidence;
- active-change lifecycle helpers: `new`, `status`, `continue`, and `handoff`;
- permanent unit, integration, E2E, and CI gates.

The coding agent remains responsible for non-deterministic engineering work such as Grill, Spec-Anchored discipline, BDD/TDD execution strategy, implementation, and code-review reasoning.

## Compatibility

- Node.js: `>=20`.
- Config schema: `version: 1`.
- OpenSpec: stable `>=1.0.0 <2.0.0`.
- Graphify: optional unless `integrations.graphify.required: true`.

## Distribution

For v0.1, clone TRUSS into the host project's `.truss/` directory and ignore that directory in the host repository. TRUSS is updated explicitly with Git; it is not silently updated by the host project.

## Release gate

A v0.1.0 release is ready only when:
1. `npm ci` succeeds.
2. `npm run check` succeeds.
3. `npm test` succeeds.
4. Documentation does not claim runtime orchestration that v0.1 does not provide.
5. Package/version metadata is `0.1.0`.
6. The release archive passes ZIP integrity validation.

## v0.2 boundary

v0.2 may make TRUSS orchestration-driven by adding runtime adapters, context resolution, automatic task execution/routing, isolated review, handoff automation, and capability-aware execution. Those are not v0.1 guarantees.
