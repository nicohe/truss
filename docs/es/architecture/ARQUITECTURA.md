# Arquitectura

```text
Usuario → TRUSS
          ├── policies
          ├── workflows
          ├── integrations
          └── runtime adapters → Claude Code / Codex / Devin / otros
```

Estado durable: spec/OpenSpec, Git, tests, ADRs cuando correspondan y docs estables. Estado efímero: índices, sesiones, checkpoints, handoffs, logs y cache.

```text
v0.2: Usuario → TRUSS policies/artifacts → coding agent
v0.3+: Usuario → TRUSS orchestrator → runtime adapter → coding agent
```
