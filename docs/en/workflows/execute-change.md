# execute-change

> Canonical TRUSS documentation.

`execute-change` is TRUSS's central implementation workflow. It takes an already-defined OpenSpec change and drives it from **specified** to **implemented, evidenced, verified, and reviewed**.

OpenSpec defines **what** must change. `execute-change` coordinates **how the change is carried through engineering work**.

## Inputs

- active OpenSpec change: proposal, specs, design and tasks;
- root/component `AGENTS.md` guidance;
- configured TRUSS policies;
- next ready vertical task;
- minimal relevant code/documentation context;
- Graphify impact/context when enabled and available;
- relevant ADRs when they exist.

## Flow

1. Resolve and read the active OpenSpec change.
2. Confirm the change is sufficiently defined; use Grill if material ambiguity remains.
3. Select the smallest ready demonstrable vertical slice.
4. Resolve only the context required for that slice.
5. If BDD is enabled, establish the observable acceptance behavior and RED state when applicable.
6. If TDD is enabled, use RED → minimal GREEN → refactor for implementation details.
7. Keep code, tests and OpenSpec aligned according to `spec.mode`.
8. Make the acceptance behavior GREEN.
9. Update tasks and durable evidence explicitly.
10. Run configured deterministic verification.
11. Run Code Review against Spec, Standards and Risk.
12. Create a Handoff only when context, responsibility, session or runtime changes.
13. Continue with the next ready task or finish the change.

## v0.1 enforcement

In v0.1, `execute-change` is an **instruction contract** followed by the coding agent. TRUSS directly executes deterministic verification, while BDD/TDD/spec behavior is primarily agent-enforced. Runtime orchestration is planned for v0.2.

## Not a skill

`execute-change` is a workflow/orchestrator. It can invoke skills, apply policies and consume integrations; it is not itself a skill.
