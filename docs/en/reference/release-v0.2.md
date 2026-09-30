# TRUSS v0.2 release contract

This is the contract of the v0.2 line (0.2.0 and its patch releases). TRUSS v0.2 keeps the agent-driven model of [v0.1.0](release-v0.1.md) and adds the first **TRUSS-side enforcement** of engineering policy: opt-in gates in `truss verify` that check deterministic facts about a change. TRUSS still runs no coding agent itself.

## Stable scope

Everything guaranteed by the v0.1.0 contract, plus, since v0.1.0:

- **`truss verify` approval.** A new or changed `verification.commands` list must be approved before it runs, per project, outside the repository. Without a terminal it needs `--trust` or `TRUSS_TRUST=1`. See the [trust model](../../../SECURITY.md).
- **Tests-required gate** (`verification.tests_required: off | warn | block`): a change that touches source code without touching any test is reported or refused.
- **Tasks-complete gate** (`verification.tasks_complete: off | warn | block`): open tasks in the active OpenSpec change are reported or refused.
- **Lifecycle phase from task progress.** `truss status` / `truss continue` derive the phase from OpenSpec's task progress. A change is `complete` only when it has tasks and none are open.
- **Windows.** npm-installed OpenSpec and Graphify (`.cmd` shims) are launched without a shell.
- A stricter config parser, accent-safe change names, `NO_COLOR` / TTY-aware output, and atomic state writes.

Both gates default to `off`, so a project that changes nothing keeps its previous verification behavior.

## What the gates do not claim
They check that test files changed and that tasks are checked off. They do **not** prove tests were written first (TDD), that they cover the change, that they pass, or that checked-off tasks were really done. Those remain `verification.commands` and agent discipline. See the [enforcement model](enforcement.md).

## Compatibility
- Node.js: `>=20`; CI covers Node 20, 22 and 24 on Ubuntu, 20 and 24 on macOS, and 24 on Windows.
- Config schema: `version: 1`. The new options are additive; existing configs stay valid.
- OpenSpec: stable `>=1.0.0 <2.0.0`. A contract test runs the lifecycle against the real CLI (`@fission-ai/openspec@1`) in CI.
- Graphify: optional unless `integrations.graphify.required: true`.

## Behavior changes for existing projects
- `verify` asks for approval (see above).
- The config parser rejects syntax it never supported instead of accepting it silently; quote values that start with `& * ! | > [ {`.
- Change names drop accents (`Añadir política` becomes `anadir-politica`).
- `status` / `continue` report `implementation` (not `complete`) while tasks are open.
- `truss config` now lists the two new options with their defaults; the evidence file gains `testsRequired` / `tasksComplete` only when a gate is enabled.

## Distribution
Unchanged from v0.1: clone TRUSS into the host project's `.truss/` directory and ignore that directory in the host repository. TRUSS is updated explicitly with Git.

## Release gate
A v0.2.x release is ready only when:
1. `npm ci` succeeds.
2. `npm run ci` succeeds (syntax check, Biome lint and format check, and every test suite).
3. The coverage floor holds (`npm run test:coverage`).
4. All required CI jobs are green and the `Contract / real OpenSpec` job passes.
5. Documentation does not claim runtime orchestration that v0.2 does not provide.
6. Package/version metadata matches the release, everywhere it is written (see [Releasing](../development/releasing.md)).

## v0.3 boundary
Orchestration-driven TRUSS remains future work: runtime adapters, context resolution, automatic task execution/routing, isolated review, handoff automation and capability-aware execution. Those are not v0.2 guarantees.
