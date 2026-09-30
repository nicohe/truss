# Cómo usar las skills en TRUSS v0.1

No hace falta invocar todas las skills en cada cambio.

```text
Idea clara ───────────────────────────────┐
Idea ambigua → grill-me ─────────────────┤
Docs ambiguos → grill-with-docs ─────────┤
Bloqueo técnico → prototype ─────────────┤
                                         ↓
                                      OpenSpec
                                         ↓
                                   execute-change
                                  BDD + TDD policies
                                         ↓
                                    Verification
                                         ↓
                                    code-review
                                         ↓
                         handoff solo si cambia contexto
```

`writing-for-agents` y `caveman` son transversales. El primero optimiza conocimiento durable; el segundo comunicación efímera.

## Ejemplo con un coding agent

```text
Use TRUSS for the active change.
Read AGENTS.md, .truss/config.yaml, the active spec,
.truss/workflows/execute-change.md and only the skills required by the workflow.
Do not load every skill unless it is relevant.
```

La última regla es importante para mantener bajo el consumo de contexto.
