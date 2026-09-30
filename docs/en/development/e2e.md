# End-to-End Tests

TRUSS v0.2 keeps an executable E2E suite under `test/e2e/`.

Run it with:

```bash
npm run test:e2e
```

The suite exercises the user-visible lifecycle across real TRUSS CLI processes and temporary Git workspaces. Unless a test says otherwise, external OpenSpec and Graphify executables are deterministic local fixtures: E2E tests never install, upgrade, or access the network.

Covered journeys:

1. New workspace: `init -> new -> continue(spec) -> planning complete -> continue(implementation) -> verify -> complete -> review/archive guidance`.
2. Existing OpenSpec project: `init` adopts durable OpenSpec data without overwriting it.
3. Graphify enabled later: a project can start with Graphify disabled, enable it as optional with native fallback, then become `ready` once a fresh graph exists.
4. Quick start: TRUSS cloned into the project as `.truss/` (the documented layout) and TRUSS installed in a separate directory both run `init`, `doctor` and `config`, and a broken installation fails clearly and leaves no half-created config behind. This is the test that would have caught a schema looked up in the wrong place.
5. Real OpenSpec contract (`real-openspec.e2e.test.mjs`): the lifecycle phases and the tasks-complete gate follow the task progress reported by the real OpenSpec CLI, not a fixture. It runs when a compatible `openspec` is on `PATH`, is skipped otherwise, and cannot be skipped in the `Contract / real OpenSpec` CI job (see [continuous integration](ci.md#contract-test-against-the-real-openspec)).

The E2E boundary intentionally stops before automatic agent execution and automatic OpenSpec archive. In v0.2 those remain agent/user-driven workflow steps; runtime orchestration belongs to v0.3.
