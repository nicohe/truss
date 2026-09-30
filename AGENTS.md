# TRUSS Agent Guidance

- Read the active OpenSpec before implementing a significant change.
- Keep spec, code and tests aligned; never allow silent divergence.
- Prefer vertical behavioral slices.
- Use BDD for observable acceptance behavior and TDD for internal implementation.
- Run deterministic verification before declaring completion.
- Review against spec, engineering standards and risk.
- Keep durable knowledge in OpenSpec/tests/ADRs/docs; keep session state ephemeral.
- Use handoff only when agent, runtime, session or responsibility changes.
- Do not assume parallel-agent, worktree, hook, MCP or graph capabilities; detect them through the runtime adapter.

## TRUSS skills

Portable skill contracts live under `.truss/skills/`. Load skills on demand; do not preload all of them. `execute-change` is the central workflow. BDD/TDD/spec modes are policies, while OpenSpec/Graphify are integrations.

## Documentation pointers

Load documentation progressively; do not load the full docs tree by default.
- Configuration semantics: `docs/en/configuration/reference.md`
- Configuration effects: `docs/en/configuration/effects.md`
- Workflow overview: `docs/en/workflows/overview.md`
- Skills: `docs/en/skills/overview.md`
- Spanish translations: `docs/es/`
