# Configuration reference

> Canonical TRUSS documentation.

Rule: **No configuration without semantics.** Every public option documents type, default, allowed values, effect, failure/fallback behavior, and enforcement owner.

## `version`
Type: integer. Default: `1`. Selects the TRUSS configuration schema version. Unsupported versions must fail validation. Enforcement: **TRUSS**.

## `spec.mode`
Type: enum. Default: `anchored`. Values: `anchored`, `source`.
- `anchored`: OpenSpec remains the permanent anchor; explicit reconciliation may evolve spec, tests and code together.
- `source`: OpenSpec is authoritative; behavioral changes return to the spec phase first.
Enforcement v0.1: **AGENT policy**. Target v0.2: **TRUSS + AGENT**.

## `spec.gherkin`
Type: boolean. Default: `true`. When true, observable acceptance behavior should be expressed as Gherkin scenarios where appropriate. When false, structured non-Gherkin acceptance criteria are allowed. Enforcement v0.1: **AGENT**.

## `spec.zone_guard`
Type: boolean. Default: `false`. When true, separate Spec Zone and Code Zone behavior is expected. Recommended mainly with `mode: source`. Enforcement v0.1: **AGENT/DECLARATIVE**; runtime enforcement is future work.

## `development.bdd`
Type: boolean. Default: `true`. Enables the BDD macro-loop in `execute-change`: acceptance behavior RED → implementation → acceptance GREEN. Enforcement v0.1: **AGENT**.

## `development.tdd`
Type: boolean. Default: `true`. Enables RED → minimal GREEN → refactor for implementation details. Enforcement v0.1: **AGENT**.

## `verification.commands`
Type: string array. Default: project starter commands. Commands are executed in order by `truss verify`; failure stops successful verification. Enforcement: **TRUSS**.

## `integrations.graphify.enabled`
Type: boolean. Default: `true`.
- `false`: TRUSS does not intentionally use Graphify; native code discovery is used.
- `true`: Graphify may be used for code relationships/impact analysis.
Enforcement v0.1: **TRUSS** for configured lifecycle/status commands; **AGENT** for deciding when optional Graphify should be used during implementation.

## `integrations.graphify.required`
Type: boolean. Default: `false`. Valid only when `enabled: true`.
- `false`: if Graphify is unavailable, use native search/grep/LSP/runtime exploration.
- `true`: Graphify is a project requirement. `truss graphify` and `truss doctor` report it as blocking when unavailable/unready.
Enforcement v0.1: **TRUSS** for those executable checks; **AGENT** must respect the requirement during agent-driven implementation. Full centralized workflow gating belongs to later orchestration.

`enabled: false` + `required: true` is invalid configuration.

## `components`
Type: map. Default: `{}`.
- `{}`: treat the repository as one workspace.
- entries: declare addressable units in a monorepo/workspace.

Example:
```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```
Each component key is a stable TRUSS identifier; `path` points to its repository-relative root. Component resolution may scope local guidance, code context, tests and OpenSpec work. Enforcement in v0.1: **TRUSS** validates and resolves component paths, local/workspace AGENTS guidance, OpenSpec scope, and common source/test roots. Deeper task orchestration belongs to v0.2.

## OpenSpec is not configurable as optional
OpenSpec is required by TRUSS and therefore does not appear under `integrations`. TRUSS must detect/reuse an existing compatible OpenSpec project or initialize it when absent; it must never silently replace existing OpenSpec data.

## Machine-readable schema

The v1 machine-readable contract lives at `.truss/schema/config.schema.json` and uses JSON Schema Draft 2020-12. It defines the supported object shape, field types, enum values, component structure, unknown-property policy, and the invalid `graphify.enabled: false` + `graphify.required: true` combination.

The schema is the structural contract. Actual YAML parsing, default application, diagnostics, and CLI enforcement are implemented in the configuration-validation step.
