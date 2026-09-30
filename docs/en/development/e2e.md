# End-to-End Tests

TRUSS v0.2 keeps an executable E2E suite under `test/e2e/`.

Run it with:

```bash
npm run test:e2e
```

The suite exercises the user-visible lifecycle across real TRUSS CLI processes and temporary Git workspaces. External OpenSpec and Graphify executables are deterministic local fixtures: E2E tests never install, upgrade, or access the network.

Covered journeys:

1. New workspace: `init -> new -> continue(spec) -> planning complete -> continue(implementation) -> verify -> complete -> review/archive guidance`.
2. Existing OpenSpec project: `init` adopts durable OpenSpec data without overwriting it.
3. Graphify enabled later: a project can start with Graphify disabled, enable it as optional with native fallback, then become `ready` once a fresh graph exists.

The E2E boundary intentionally stops before automatic agent execution and automatic OpenSpec archive. In v0.2 those remain agent/user-driven workflow steps; runtime orchestration belongs to v0.3.
