> Canonical TRUSS documentation.

# Glossary

Terms are listed alphabetically.

- **Adapter:** a runtime-specific implementation, for example for Claude Code or Codex. Not part of the v0.2 core; see the [enforcement model](enforcement.md).
- **Agent:** the coding assistant that does the implementation work. TRUSS never runs one; it tells the agent what to do next.
- **Approval (trust):** your confirmation that a `verification.commands` list may run. It is stored per project and asked again when the list changes. See [`truss verify`](verify.md).
- **Change:** one unit of work tracked by OpenSpec, with a proposal, specs, a design and tasks. `truss new` creates it.
- **Component:** an addressable unit of a monorepo, declared under `components`.
- **Evidence:** the machine-readable record of a `truss verify` run, in `.truss/verification/latest.json`.
- **Gate:** an opt-in check of `truss verify` that can report or refuse before any command runs: `tests_required` and `tasks_complete`.
- **Graphify:** an optional tool that maps code relationships. When missing, TRUSS falls back to native search.
- **Handoff:** the minimal live state passed across a real boundary of context, agent, runtime or session.
- **Installation:** the copy of TRUSS itself (its code, schema, skills, policies and workflows), as opposed to the *project* it runs on. See [project structure](project-structure.md).
- **Integration:** an external capability TRUSS works with, such as OpenSpec or Graphify.
- **OpenSpec:** the required specification tool. TRUSS reads its state and never replaces it.
- **Phase:** where a change is: `spec` (planning artifacts missing), `implementation` (planned, tasks open) or `complete` (every task checked off).
- **Policy:** a behavioral rule an agent is asked to follow, for example BDD or TDD.
- **Skill:** a reusable agent capability, such as `grill-me` or `code-review`.
- **Spec-Anchored / Spec-as-Source:** the two values of `spec.mode`. See [specification modes](../workflows/spec-modes.md).
- **Verification:** deterministic, executable evidence: the commands you configured, run in order.
- **Workflow:** a coordination of steps, skills and policies, such as [`execute-change`](../workflows/execute-change.md).
- **Zone guard:** the declared intent (`spec.zone_guard`) to keep spec work and code work apart. It does not itself prevent writes.
