# Skills de TRUSS

TRUSS v0.1 incluye siete skills portables. Son contratos de instrucciones independientes del runtime: Claude Code, Codex, Devin u otro agente pueden leer la misma definición.

| Skill | Función | Uso típico |
|---|---|---|
| `grill-me` | Descubrir requisitos, restricciones y decisiones faltantes. | Idea/cambio ambiguo antes de escribir la spec. |
| `grill-with-docs` | Analizar documentación existente y preguntar solo lo no resuelto. | Ya existen requisitos, propuestas, diagramas o ejemplos. |
| `prototype` | Resolver una incertidumbre técnica con un experimento acotado. | Antes de comprometer una decisión técnica incierta. |
| `code-review` | Revisar Spec, Standards y Risk con contexto preferentemente fresco. | Después de una implementación verificable. |
| `handoff` | Transferir estado vivo mínimo entre contextos. | Cambio de agente, runtime, sesión o reviewer. |
| `writing-for-agents` | Diseñar documentación/contexto eficiente para agentes. | AGENTS.md, specs, ADRs, workflows y docs. |
| `caveman` | Comprimir comunicación efímera sin perder semántica. | Status, handoffs y mensajes operativos. |

## Qué NO es una skill

```text
Policies
├── Spec-Anchored
├── Spec-as-Source
├── BDD
├── TDD
├── Verification
└── Review

Integrations
├── OpenSpec
└── Graphify

Workflows
├── Grill
├── execute-change
├── Code Review
└── Handoff
```

Esta separación evita crear una skill para cada concepto. Las skills son capacidades reutilizables; las policies establecen reglas; los workflows las coordinan; las integrations conectan herramientas externas.

## v0.1

Las skills son archivos que el coding agent debe leer y aplicar. TRUSS no controla todavía el runtime automáticamente.

## v0.2+

Los runtime adapters podrán cargar/inyectar estas mismas skills y orquestar su ejecución sin cambiar su semántica.
