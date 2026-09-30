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
| `graphify.enabled: false` | Graphify commands treat the capability as disabled; agent uses native discovery | TRUSS + AGENT |
| `graphify.enabled: true, required: false` | TRUSS reports Graphify readiness; missing/unready is non-blocking; agent may use native fallback | TRUSS + AGENT |
| `graphify.enabled: true, required: true` | `truss graphify` / `doctor` are blocking when unavailable/unready; agent must respect the requirement in implementation | TRUSS + AGENT |
| `components: {}` | Single workspace | TRUSS/AGENT, partial |
| define `components` | Enables component-aware scoping | TRUSS/AGENT, partial |

OpenSpec has no `enabled` or `required` switch: it is a required TRUSS foundation.
