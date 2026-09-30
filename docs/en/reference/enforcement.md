# Enforcement model

> Canonical TRUSS documentation.

TRUSS v0.1 separates implemented guarantees from agent instructions and future adapter behavior. Read every behavioral claim using these labels.

| Label | Meaning in v0.1 |
|---|---|
| **[TRUSS]** | Enforced by executable TRUSS code and covered by automated tests where practical. |
| **[AGENT]** | Instruction/policy that the coding agent is expected to follow. TRUSS v0.1 does not technically force it. |
| **[ADAPTER]** | Requires a runtime-specific adapter/capability. v0.1 does not provide full runtime orchestration. |
| **[DECLARATIVE]** | Describes intended/project policy but is not technically enforced by TRUSS v0.1. |

## Guaranteed by TRUSS v0.1

**[TRUSS]** The CLI currently enforces or executes:

- configuration parsing, defaults and validation;
- OpenSpec CLI/project detection and supported-version checks;
- non-destructive/idempotent `truss init` behavior within its documented boundary;
- component path/scope resolution;
- Graphify status/update/bootstrap commands and blocking status when configured as required;
- `truss doctor` diagnostics and documented exit-code classes;
- sequential, fail-fast deterministic verification and local evidence;
- the opt-in tests-required gate of `truss verify` (`verification.tests_required`): source changed without any test change is reported (`warn`) or stops verification (`block`). It checks that test files changed, not that they were written first or are meaningful;
- OpenSpec-backed `new`, `status`, and next-action calculation for `continue`, with the phase (`spec` / `implementation` / `complete`) derived from OpenSpec's task progress;
- the opt-in tasks-complete gate of `truss verify` (`verification.tasks_complete`): open tasks in the active change are reported (`warn`) or stop verification (`block`). It checks that tasks are checked off, not that the work is real;
- local handoff scaffold creation and skill listing.

## Agent-enforced in v0.1

**[AGENT]** These remain instructions, not technical guarantees:

- Spec-Anchored / Spec-as-Source workflow discipline;
- Gherkin usage;
- BDD and TDD loops;
- reconciling implementation discoveries with the spec;
- deciding when Graphify is useful when it is optional;
- using native search/grep/LSP as the semantic fallback when Graphify is unavailable;
- code review quality and reviewer independence;
- moving durable handoff discoveries into OpenSpec/ADRs/docs;
- loading only minimal/relevant context.

## Adapter/future enforcement

**[ADAPTER]** Runtime-specific enforcement is not guaranteed by v0.1. This includes automatic coding-agent invocation, isolated reviewer contexts, subagent/team routing, write-zone enforcement, hooks, MCP orchestration, automatic worktree management, and capability-based runtime routing.

**[DECLARATIVE]** `spec.zone_guard` declares desired Spec Zone / Code Zone behavior in v0.1; it does not itself prevent writes.

## Important distinction: Graphify

**[TRUSS]** `graphify.required: true` is operationally blocking in `truss graphify` and `truss doctor` when Graphify is unavailable or not ready.

**[AGENT]** TRUSS v0.1 does not centrally wrap every possible workflow command, so the coding agent must still respect that required capability during agent-driven implementation. Optional native fallback is likewise an agent workflow behavior, not an automatic repository-search engine implemented by TRUSS.

## v0.1 boundary

```text
TRUSS executable guarantees
        +
agent-followed engineering policies
        +
OpenSpec / Git / tests
        ↓
TRUSS v0.1

Automatic runtime orchestration
        ↓
not a v0.1 guarantee
```
