# BDD and TDD

TRUSS asks agents to work in two nested loops. Both are *policies*, not commands and not skills: they live in `.truss/policies/` and are followed by the coding agent.

## The two loops

- **BDD is the macro-loop.** Express the externally observable behavior as a scenario and watch it fail (RED). Implement. Watch the scenario pass (GREEN). The scenario stays traceable to the OpenSpec change.
- **TDD is the micro-loop.** For the internals: write a focused failing test, make it pass with the minimum code, then refactor while the tests stay green.

Work is cut into **vertical slices**: the smallest piece that demonstrates behavior on its own. "The database", "the API" and "the tests" are horizontal layers; a slice that lets a user retry a failed request is vertical.

`development.bdd` and `development.tdd` (both `true` by default) turn the loops on. They are instructions to the agent; TRUSS does not orchestrate them in v0.2. Turning `bdd` off can be reasonable for refactors or tooling with no new observable behavior; it does not disable existing tests or `truss verify`.

## What TRUSS can check, and what it cannot

TRUSS cannot see whether a test was written before the code. It can check facts around it:

| Question | How | Status |
|---|---|---|
| Do the tests pass, and do lint, types and the build succeed? | `verification.commands` in `truss verify` | always enforced |
| Did the change touch any test at all? | `verification.tests_required: warn \| block` | opt-in |
| Are all the tasks checked off? | `verification.tasks_complete: warn \| block` | opt-in |
| Was each test written first? Does it really cover the change? | | **not checkable**; left to the agent and to review |

So `tests_required` is a floor, not proof of good testing: a change with a meaningless test passes it. Treat a report from it as a failed TDD step rather than something to silence. See [`truss verify`](../reference/verify.md#tests-required-gate) for how files are classified as source or tests.

## Where the rules live

- The policies: `.truss/policies/bdd.md` and `.truss/policies/tdd.md` in the TRUSS installation (see [project structure](../reference/project-structure.md)).
- The step-by-step workflow that applies them: [`execute-change`](../workflows/execute-change.md).
