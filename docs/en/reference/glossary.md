> Canonical TRUSS documentation.

# Glossary

Terms are listed alphabetically.

- **Adapter:** a runtime-specific implementation, for example for Claude Code or Codex. Not part of the v0.2 core; see the [enforcement model](enforcement.md).
- **ADR (architecture decision record):** a short document that records one architectural decision and why it was made. Write one only when a decision deserves to outlive the change; [ADR 0001](../development/decisions/0001-local-project-configuration.md) is an example.
- **Agent:** the coding assistant that does the implementation work. TRUSS never runs one; it tells the agent what to do next.
- **Approval (trust):** your confirmation that a `verification.commands` list may run. It is stored per project and asked again when the list changes. See [`truss verify`](verify.md).
- **Change:** one unit of work tracked by OpenSpec, with a proposal, specs, a design and tasks. `truss new` creates it.
- **Component:** an addressable unit of a monorepo, declared under `components`.
- **Discovery:** the work before the spec, where an unclear idea becomes explicit decisions. See *Grill*.
- **Evidence:** the machine-readable record of a `truss verify` run, in `.truss/verification/latest.json`.
- **Fail-fast:** stopping at the first failure instead of running what remains. `truss verify` does it: a failing command ends the run.
- **Gate:** an opt-in check of `truss verify` that can report or refuse before any command runs: `tests_required` and `tasks_complete`.
- **Gherkin:** the Given / When / Then format for describing behavior as scenarios. `spec.gherkin` says whether acceptance behavior is expected in it.
- **Graphify:** an optional tool that maps code relationships. When missing, TRUSS falls back to native search.
- **Grill:** a guided round of questions that turns an unclear idea into explicit decisions, done with the `grill-me` or `grill-with-docs` skill. It is the main tool of *Discovery*; see [Discovery (Grill)](../workflows/discovery.md).
- **Handoff:** the minimal live state passed across a real boundary of context, agent, runtime or session.
- **Language of the artifacts:** the language you write specs, designs and tasks in. OpenSpec's keywords stay in English whatever it is (`SHALL`, `MUST`, `WHEN`, `THEN`, the `#### Scenario:` heading); TRUSS's own policies say RED, GREEN, refactor and *vertical slice*, and the Spanish docs keep those terms in English so a task and its policy use the same words.
- **Installation:** the copy of TRUSS itself (its code, schema, skills, policies and workflows), as opposed to the *project* it runs on. See [project structure](project-structure.md).
- **Integration:** an external capability TRUSS works with, such as OpenSpec or Graphify.
- **Merge-base:** the commit where your branch left the base branch. The tests-required gate compares your changes against it.
- **OpenSpec:** the required specification tool. TRUSS reads its state and never replaces it.
- **Phase:** where a change is: `spec` (planning artifacts missing), `implementation` (planned, tasks open) or `complete` (every task checked off).
- **Policy:** a behavioral rule an agent is asked to follow, for example BDD or TDD.
- **RED / GREEN:** in a test-first loop, RED is a test that fails because the behavior does not exist yet, and GREEN is the same test passing. Refactoring happens while it stays GREEN. See [BDD and TDD](../concepts/bdd-tdd.md).
- **Skill:** a reusable agent capability, such as `grill-me` or `code-review`.
- **Spec-Anchored / Spec-as-Source:** the two values of `spec.mode`. See [specification modes](../workflows/spec-modes.md).
- **Verification:** deterministic, executable evidence: the commands you configured, run in order.
- **Vertical slice:** the smallest piece of a change that demonstrates behavior on its own, from the outside in. "The database" is a horizontal layer; "a user can retry a failed request" is a vertical slice. See [BDD and TDD](../concepts/bdd-tdd.md).
- **Workflow:** a coordination of steps, skills and policies, such as [`execute-change`](../workflows/execute-change.md).
- **Zone guard:** the declared intent (`spec.zone_guard`) to keep spec work and code work apart. It does not itself prevent writes.
