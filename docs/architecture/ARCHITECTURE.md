# TRUSS Architecture

TRUSS is a portable engineering harness, not a replacement for coding agents or engineering tools.

```text
User intent
   │
   ▼
TRUSS Core
   ├── policies
   ├── workflows
   ├── integrations
   └── runtime adapters
        │
        ├── Claude Code
        ├── Codex
        ├── Devin
        └── other runtimes
```

## Durable state

- OpenSpec: expected behavior and change anchor.
- Git: implementation history.
- Tests: executable evidence.
- ADRs: durable architectural rationale when warranted.
- Project docs / AGENTS.md: stable operating context.

## Derived or ephemeral state

- Graph/code index.
- Sessions and checkpoints.
- Handoffs.
- Runtime logs/cache.

## Spec modes

Default: **Spec-Anchored**. Spec, code and tests may evolve during implementation, but divergence must be explicit and resolved.

Optional strict mode: **Spec-as-Source**. Behavioral changes begin in the spec; a zone guard can prevent editing spec and implementation in the same phase.

## Capability-driven runtimes

The core should ask for capabilities rather than vendor commands: isolated context, subagents, parallel agents, worktrees, hooks, MCP, code graph and handoff. Adapters translate those capabilities to each runtime. Missing optional capabilities must degrade gracefully.
