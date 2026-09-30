# Skills de TRUSS

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/skills/overview.md).

TRUSS v0.2 incluye siete skills portables para agentes. Son contratos de instrucciones, no comandos de un vendor concreto: Claude Code, Codex, Devin u otro agente pueden leer la misma definición.

| Skill | Propósito | Cuándo usarla |
|---|---|---|
| grill-me | Descubrir requisitos y decisiones que faltan a partir de una idea o un cambio. | Una idea o un cambio poco claros, antes de escribir la spec. |
| grill-with-docs | Descubrir ambigüedades a partir de requisitos o documentación existentes. | Ya existen requisitos, propuestas, diagramas o ejemplos. |
| prototype | Resolver una incertidumbre técnica con un experimento acotado. | Antes de comprometer una decisión técnica incierta. |
| code-review | Revisión independiente sobre Spec, Standards y Risk. | Después de una implementación que pasa la verificación. |
| handoff | Transferir el estado vivo mínimo entre límites de contexto. | Un cambio de agente, runtime, sesión o reviewer. |
| writing-for-agents | Mantener pequeño y fiable el contexto del repositorio pensado para agentes. | `AGENTS.md`, specs, ADRs, workflows y documentación. |
| caveman | Comprimir la comunicación efímera del agente sin cambiar su significado. | Actualizaciones de estado, handoffs y mensajes operativos. |

No hace falta usar todas las skills en cada cambio: carga una skill cuando surja su situación y ninguna en caso contrario (consulta la [gestión de contexto](../concepts/context-management.md)). Para las dos skills de Grill y `prototype`, consulta [Descubrimiento](../workflows/discovery.md).

Las skills viven en `.truss/skills/*.SKILL.md` para que cualquier runtime lea la misma fuente. Los runtime adapters podrán exponer más adelante comandos nativos conservando estos contratos.

BDD, TDD, Spec-Anchored, Spec-as-Source, Verification y Review son policies, no skills. OpenSpec y Graphify son integrations. `execute-change` es el workflow central. Esta separación evita crear una skill para cada concepto: las skills son capacidades reutilizables, las policies establecen reglas, los workflows las coordinan y las integrations conectan herramientas externas.

En v0.2 las skills son archivos que el coding agent debe leer y aplicar; TRUSS todavía no controla el runtime. En v0.3+, los runtime adapters podrán cargar estas mismas skills y orquestar su ejecución sin cambiar su semántica.
