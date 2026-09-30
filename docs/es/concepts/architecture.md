# Arquitectura de TRUSS

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/concepts/architecture.md).

TRUSS es un harness de ingeniería portable, no un reemplazo de los coding agents ni de las herramientas de ingeniería.

```text
Intención del usuario
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
        └── otros runtimes
```

## Estado durable

- OpenSpec: comportamiento esperado y ancla del cambio.
- Git: historial de implementación.
- Tests: evidencia ejecutable.
- ADRs: justificación arquitectónica durable cuando corresponde.
- Documentación del proyecto / AGENTS.md: contexto operativo estable.

## Estado derivado o efímero

- Grafo / índice de código.
- Sesiones y checkpoints.
- Handoffs.
- Logs y caché del runtime.

## Modos de spec

Por defecto: **Spec-Anchored**. La spec, el código y los tests pueden evolucionar durante la implementación, pero toda divergencia debe ser explícita y resolverse.

Modo estricto opcional: **Spec-as-Source**. Los cambios de comportamiento empiezan en la spec; un zone guard puede impedir editar la spec y la implementación en la misma fase.

## Runtimes guiados por capacidades

El core debe pedir capacidades en lugar de comandos de un vendor: contexto aislado, subagentes, agentes en paralelo, worktrees, hooks, MCP, grafo de código y handoff. Los adapters traducen esas capacidades a cada runtime. Las capacidades opcionales que falten deben degradarse con elegancia.
