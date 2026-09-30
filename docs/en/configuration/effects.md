# Configuration effects

> Canonical TRUSS documentation. This page answers: **what changes when I change a value?**

| Change | Effective behavior | v0.1 enforcement |
|---|---|---|
| `spec.mode: anchored` | Spec stays the permanent anchor; explicit reconciliation may evolve spec/tests/code | AGENT |
| `spec.mode: source` | Behavioral changes return to spec before implementation continues | AGENT |
| `spec.gherkin: true` | Prefer/expect Gherkin acceptance scenarios | AGENT |
| `spec.gherkin: false` | Structured non-Gherkin acceptance criteria allowed | AGENT |
| `spec.zone_guard: true` | Expect Spec Zone / Code Zone separation | AGENT / DECLARATIVE |
| `development.bdd: true` | `execute-change` applies acceptance RED → GREEN macro-loop | AGENT |
| `development.bdd: false` | BDD macro-loop is not mandatory | AGENT |
| `development.tdd: true` | `execute-change` applies RED → minimal GREEN → refactor | AGENT |
| `development.tdd: false` | TDD micro-loop is not mandatory | AGENT |
| change `verification.commands` | `truss verify` executes the new command list in order | TRUSS |
| `verification.tests_required: warn` | `truss verify` reports source changes that have no test change, then continues | TRUSS (presence check) |
| `verification.tests_required: block` | `truss verify` exits `1` before running commands when source changed without tests | TRUSS (presence check) |
| `verification.tasks_complete: warn` | `truss verify` lists the open tasks of the active OpenSpec change, then continues | TRUSS (progress check) |
| `verification.tasks_complete: block` | `truss verify` exits `1` before running commands while the active change has open tasks | TRUSS (progress check) |
| `verification.base_ref` / `source_paths` / `test_paths` | Change what the tests-required gate compares against and how it classifies files | TRUSS |
| `graphify.enabled: false` | Graphify commands treat the capability as disabled; agent uses native discovery | TRUSS + AGENT |
| `graphify.enabled: true, required: false` | TRUSS reports Graphify readiness; missing/unready is non-blocking; agent may use native fallback | TRUSS + AGENT |
| `graphify.enabled: true, required: true` | `truss graphify` / `doctor` are blocking when unavailable/unready; agent must respect the requirement in implementation | TRUSS + AGENT |
| `components: {}` | Single workspace | TRUSS/AGENT, partial |
| define `components` | Enables component-aware scoping | TRUSS/AGENT, partial |

OpenSpec has no `enabled` or `required` switch: it is a required TRUSS foundation.
