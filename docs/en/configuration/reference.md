# Configuration reference

> Canonical TRUSS documentation.

Rule: **No configuration without semantics.** Every public option documents type, default, allowed values, effect, failure/fallback behavior, and enforcement owner.

## `version`
Type: integer. Default: `1`. Selects the TRUSS configuration schema version. Unsupported versions must fail validation. Enforcement: **TRUSS**.

## `spec.mode`
Type: enum. Default: `anchored`. Values: `anchored`, `source`.
- `anchored`: OpenSpec remains the permanent anchor; explicit reconciliation may evolve spec, tests and code together.
- `source`: OpenSpec is authoritative; behavioral changes return to the spec phase first.
Enforcement v0.2: **AGENT policy**. Target v0.3: **TRUSS + AGENT**.

## `spec.gherkin`
Type: boolean. Default: `true`. When true, observable acceptance behavior should be expressed as Gherkin scenarios where appropriate. When false, structured non-Gherkin acceptance criteria are allowed. Enforcement v0.2: **AGENT**.

## `spec.zone_guard`
Type: boolean. Default: `false`. When true, separate Spec Zone and Code Zone behavior is expected. Recommended mainly with `mode: source`. Enforcement v0.2: **AGENT/DECLARATIVE**; runtime enforcement is future work.

## `development.bdd`
Type: boolean. Default: `true`. Enables the BDD macro-loop in `execute-change`: acceptance behavior RED → implementation → acceptance GREEN. Enforcement v0.2: **AGENT**.

## `development.tdd`
Type: boolean. Default: `true`. Enables RED → minimal GREEN → refactor for implementation details. Enforcement v0.2: **AGENT**. TRUSS can additionally check that a change touched tests at all: see `verification.tests_required`.

## `verification.commands`
Type: string array. Default: `npm test --if-present`, `npm run lint --if-present`, `npm run typecheck --if-present` and `npm run build --if-present`. Commands are executed in order by `truss verify`; failure stops successful verification. The default list suits a Node project: without a `package.json`, `npm` fails on the first command, so other projects should list their own checks (see the [examples](examples.md#a-project-that-is-not-node)). Enforcement: **TRUSS**.

## `verification.tests_required`
Type: enum. Default: `off`. Values: `off`, `warn`, `block`. Controls the **tests-required gate** of `truss verify`: did the change touch source code without touching any test?
- `off`: the gate does not run.
- `warn`: `truss verify` prints which source files changed without tests and continues; the exit code is unaffected.
- `block`: the same report, but `truss verify` stops with exit `1` **before running any command** and records the result in `.truss/verification/latest.json`.

The gate compares the working tree with the merge-base of `HEAD` and the base branch (see `base_ref`): committed, staged, unstaged and untracked files all count; pure deletions do not require tests. Changes are grouped **per component** (or as one workspace when `components` is empty), so a monorepo needs tests in each component it changed. Only files with a code extension count as source or test; docs, JSON, lockfiles and fixtures are ignored. A file is a test when it sits under a test directory or is named `*.test.*`, `*.spec.*` or `*_test.*`; it is source when it sits under a source directory and is not a test.

If it cannot decide (not a Git work tree, no commits, no base branch, a shallow clone without the merge-base, an unresolvable component) it reports why and does **not** block.

Limits: it proves that test files changed, not that tests were written first (TDD), that they exercise the change, or that they pass. Passing tests remain the job of `verification.commands`. Enforcement: **TRUSS** for the presence check; **AGENT** for BDD/TDD discipline itself.

## `verification.tasks_complete`
Type: enum. Default: `off`. Values: `off`, `warn`, `block`. Controls the **tasks-complete gate** of `truss verify`: are all the tasks of the active OpenSpec change checked off?
- `off`: the gate does not run.
- `warn`: `truss verify` lists the open tasks and continues.
- `block`: the same report, but `truss verify` stops with exit `1` **before running any command** and records the result in `.truss/verification/latest.json`.

The active change is the one in `.truss/state.json` (created by `truss new`). Progress is what OpenSpec reports through `openspec instructions apply` (the checkboxes of `tasks.md`). If there is no active change, OpenSpec is unavailable or incompatible, the active change was archived, or `tasks.md` has no tasks, the gate says so and does **not** block.

Use `warn` while working (verification often runs mid-implementation) and `block` where a finished change is required. It checks that tasks are *checked off*, not that they were really done. Enforcement: **TRUSS** for the check; **AGENT** for actually doing and checking off the work.

## `verification.base_ref`
Type: string. Default: unset (auto-detect). Git ref the change is compared with. When unset TRUSS tries `origin/HEAD`, `origin/main`, `origin/master`, `main`, then `master`. Set it for other branching models (for example `develop` or `release/1.x`). An unknown ref makes the gate report "cannot evaluate" without blocking. Only used when `tests_required` is not `off`. Enforcement: **TRUSS**.

## `verification.source_paths` and `verification.test_paths`
Type: string arrays. Default: unset (use the detected directories). Repository-relative directory prefixes that replace the detected ones. Detected source directories are `src`, `app`, `apps`, `lib`, `packages`; test directories are `test`, `tests`, `__tests__`, `spec` (each relative to the component root, and only if it exists). Set them when your layout differs, for example `source_paths: [server]` and `test_paths: [checks]`. Only used when `tests_required` is not `off`. Enforcement: **TRUSS**.

## `integrations.graphify.enabled`
Type: boolean. Default: `true`.
- `false`: TRUSS does not intentionally use Graphify; native code discovery is used.
- `true`: Graphify may be used for code relationships/impact analysis.
Enforcement v0.2: **TRUSS** for configured lifecycle/status commands; **AGENT** for deciding when optional Graphify should be used during implementation.

## `integrations.graphify.required`
Type: boolean. Default: `false`. Valid only when `enabled: true`.
- `false`: if Graphify is unavailable, use native search/grep/LSP/runtime exploration.
- `true`: Graphify is a project requirement. `truss graphify` and `truss doctor` report it as blocking when unavailable/unready.
Enforcement v0.2: **TRUSS** for those executable checks; **AGENT** must respect the requirement during agent-driven implementation. Full centralized workflow gating belongs to later orchestration.

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
Each component key is a stable TRUSS identifier; `path` points to its repository-relative root. Component resolution may scope local guidance, code context, tests and OpenSpec work. Enforcement in v0.2: **TRUSS** validates and resolves component paths, local/workspace AGENTS guidance, OpenSpec scope, and common source/test roots. Deeper task orchestration belongs to v0.3.

## OpenSpec is not configurable as optional
OpenSpec is required by TRUSS and therefore does not appear under `integrations`. TRUSS must detect/reuse an existing compatible OpenSpec project or initialize it when absent; it must never silently replace existing OpenSpec data.

## Machine-readable schema

The v1 machine-readable contract lives at `.truss/schema/config.schema.json` and uses JSON Schema Draft 2020-12. It defines the supported object shape, field types, enum values, component structure, unknown-property policy, and the invalid `graphify.enabled: false` + `graphify.required: true` combination.

The schema is the structural contract. YAML parsing, default application, diagnostics and CLI enforcement are implemented in `lib/config.mjs`; see [configuration validation](validation.md).
